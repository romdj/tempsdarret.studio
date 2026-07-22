/**
 * E2E Test Environment Setup
 *
 * Provides global setup and utilities for E2E tests that mirror sequence diagrams.
 * Connects to services running via docker-compose for integration testing.
 */

import { MongoClient } from 'mongodb';
import { Kafka, Consumer, Producer, Admin } from 'kafkajs';
import axios, { AxiosInstance } from 'axios';

// Service connection configuration
const config = {
  apiGateway: process.env.API_GATEWAY_URL || 'http://localhost:8000',
  mongodb: process.env.MONGODB_URI || 'mongodb://admin:admin_password@localhost:27017',
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9093').split(','),
    clientId: 'e2e-tests'
  },
  services: {
    userService: process.env.USER_SERVICE_URL || 'http://localhost:3002',
    inviteService: process.env.INVITATION_SERVICE_URL || 'http://localhost:3003',
    portfolioService: process.env.PORTFOLIO_SERVICE_URL || 'http://localhost:3004',
    shootService: process.env.SHOOT_SERVICE_URL || 'http://localhost:3005',
    fileService: process.env.FILE_SERVICE_URL || 'http://localhost:3006',
    notificationService: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3007'
  }
};

// Kafka topics used across the event chain. Pre-created in setup so neither the
// services nor the test consumer trigger auto-creation rebalances.
const E2E_TOPICS = ['shoots', 'users', 'invitations', 'notifications', 'magic-links'];

// Non-application databases that must never be wiped during cleanup.
const SYSTEM_DATABASES = new Set(['admin', 'local', 'config']);

// Global test environment state
export const testEnv = {
  mongoClient: null as MongoClient | null,
  kafka: null as Kafka | null,
  kafkaAdmin: null as Admin | null,
  kafkaProducer: null as Producer | null,
  kafkaConsumer: null as Consumer | null,
  eventCollector: [] as any[],
  httpClients: {
    apiGateway: null as AxiosInstance | null,
    userService: null as AxiosInstance | null,
    inviteService: null as AxiosInstance | null,
    shootService: null as AxiosInstance | null,
    notificationService: null as AxiosInstance | null
  }
};

/**
 * Global setup - runs once before all tests
 */
export async function setup() {
  console.log('🔧 Setting up E2E test environment...');

  try {
    // Initialize MongoDB connection
    testEnv.mongoClient = new MongoClient(config.mongodb);
    await testEnv.mongoClient.connect();
    console.log('✅ MongoDB connected');

    // Initialize Kafka
    testEnv.kafka = new Kafka(config.kafka);
    testEnv.kafkaAdmin = testEnv.kafka.admin();
    testEnv.kafkaProducer = testEnv.kafka.producer();
    testEnv.kafkaConsumer = testEnv.kafka.consumer({
      groupId: 'e2e-tests-consumer'
    });

    await testEnv.kafkaAdmin.connect();
    await testEnv.kafkaProducer.connect();

    // Pre-create the topics (idempotent) so subscribing/producing never triggers
    // auto-creation, which caused consumer-group rebalance storms in real runs.
    await testEnv.kafkaAdmin.createTopics({
      waitForLeaders: true,
      topics: E2E_TOPICS.map(topic => ({ topic, numPartitions: 1, replicationFactor: 1 }))
    });

    await testEnv.kafkaConsumer.connect();
    console.log('✅ Kafka connected');

    // Subscribe to all relevant topics for event collection.
    // The invitation service owns the 'invitations' topic (see architecture ADRs).
    await testEnv.kafkaConsumer.subscribe({
      topics: ['shoots', 'users', 'invitations', 'notifications'],
      fromBeginning: false
    });

    // Start consuming events for test verification. Some producers (shoot-service)
    // wrap the payload in an { eventType, data: {...} } envelope while others emit
    // flat events; flatten `data` so assertions see a uniform, flat shape — the
    // same normalization the runtime KafkaConsumer applies.
    void testEnv.kafkaConsumer.run({
      eachMessage: async ({ topic, message }) => {
        const raw = JSON.parse(message.value?.toString() || '{}');
        const { data, ...envelope } = raw;
        testEnv.eventCollector.push({
          topic,
          collectedAt: Date.now(),
          ...envelope,
          ...(data ?? {})
        });
      }
    });

    console.log('✅ Kafka event collector started');

    // Initialize HTTP clients
    testEnv.httpClients.apiGateway = axios.create({
      baseURL: config.apiGateway,
      timeout: 10000
    });

    testEnv.httpClients.userService = axios.create({
      baseURL: config.services.userService,
      timeout: 5000
    });

    testEnv.httpClients.inviteService = axios.create({
      baseURL: config.services.inviteService,
      timeout: 5000
    });

    testEnv.httpClients.shootService = axios.create({
      baseURL: config.services.shootService,
      timeout: 5000
    });

    testEnv.httpClients.notificationService = axios.create({
      baseURL: config.services.notificationService,
      timeout: 5000
    });

    console.log('✅ HTTP clients initialized');

    // Verify services are healthy
    await waitForServices();
    console.log('✅ All services ready');

    console.log('✅ E2E test environment ready');
  } catch (error) {
    console.error('❌ E2E setup failed:', error);
    await teardown();
    throw error;
  }
}

/**
 * Global teardown - runs once after all tests
 */
export async function teardown() {
  console.log('🧹 Tearing down E2E test environment...');

  try {
    if (testEnv.kafkaConsumer) {
      await testEnv.kafkaConsumer.disconnect();
    }
    if (testEnv.kafkaProducer) {
      await testEnv.kafkaProducer.disconnect();
    }
    if (testEnv.kafkaAdmin) {
      await testEnv.kafkaAdmin.disconnect();
    }
    if (testEnv.mongoClient) {
      await testEnv.mongoClient.close();
    }
    console.log('✅ E2E test environment cleaned up');
  } catch (error) {
    console.error('⚠️  Teardown error:', error);
  }
}

/**
 * Wait for all services to be healthy
 */
async function waitForServices(maxAttempts = 30, delayMs = 1000) {
  // Notification-service is a consumer-only worker with no HTTP server, so it has
  // no /health endpoint. Its liveness is verified implicitly: the scenario-1 test
  // waits for the `invitation.sent` event it publishes, which fails loudly if it
  // is down. Only the HTTP-serving services are health-checked here.
  const servicesToCheck = [
    { name: 'Shoot Service', url: `${config.services.shootService}/health` },
    { name: 'User Service', url: `${config.services.userService}/health` },
    { name: 'Invite Service', url: `${config.services.inviteService}/health` }
  ];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const results = await Promise.allSettled(
      servicesToCheck.map(async (service) => {
        const response = await axios.get(service.url, { timeout: 2000 });
        return { name: service.name, healthy: response.status === 200 };
      })
    );

    const allHealthy = results.every(
      (result) => result.status === 'fulfilled' && result.value.healthy
    );

    if (allHealthy) {
      return;
    }

    if (attempt < maxAttempts) {
      console.log(`⏳ Waiting for services... (attempt ${attempt}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw new Error('Services failed to become healthy within timeout');
}

/**
 * Helper: Wait for a specific event type
 */
export async function waitForEvent(
  topic: string,
  eventType: string | string[],
  timeoutMs: number = 5000
): Promise<any> {
  const eventTypes = Array.isArray(eventType) ? eventType : [eventType];
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      const matchingEvent = testEnv.eventCollector.find(
        (event) => event.topic === topic && eventTypes.includes(event.eventType)
      );

      if (matchingEvent) {
        clearInterval(interval);
        resolve(matchingEvent);
      } else if (Date.now() - startTime > timeoutMs) {
        clearInterval(interval);
        reject(new Error(
          `Timeout waiting for event: ${eventTypes.join(' or ')} on topic ${topic}`
        ));
      }
    }, 100);
  });
}

/**
 * Helper: Clear collected events (for test isolation)
 */
export function clearEvents() {
  testEnv.eventCollector = [];
}

/**
 * Helper: Get all collected events
 */
export function getAllEvents() {
  return [...testEnv.eventCollector];
}

/**
 * Helper: wipe every application database.
 *
 * Discovers databases at runtime rather than hardcoding names, so it is robust
 * to service DB-naming differences across environments (compose vs the service
 * registry). Safe because the E2E infra is a disposable, dedicated Mongo.
 */
export async function cleanDatabase() {
  if (!testEnv.mongoClient) return;

  try {
    const { databases } = await testEnv.mongoClient.db().admin().listDatabases();
    for (const { name } of databases) {
      if (SYSTEM_DATABASES.has(name)) continue;
      const db = testEnv.mongoClient.db(name);
      const collections = await db.listCollections().toArray();
      await Promise.all(
        collections.map(collection => db.collection(collection.name).deleteMany({}))
      );
    }
  } catch (error) {
    console.warn('Warning: Failed to clean databases:', error);
  }
}

// Auto-setup and teardown hooks
// Note: These run automatically when vitest loads this setup file
if (typeof beforeAll !== 'undefined') {
  beforeAll(async () => {
    await setup();
  });
}

// Reset all state BEFORE each test (not after) so every test starts from a clean
// slate regardless of whether the previous test passed, failed, or crashed — a
// beforeEach always runs, an afterEach may be skipped on a hard failure.
if (typeof beforeEach !== 'undefined') {
  beforeEach(async () => {
    await cleanDatabase();
    clearEvents();
  });
}

if (typeof afterAll !== 'undefined') {
  afterAll(async () => {
    await teardown();
  });
}
