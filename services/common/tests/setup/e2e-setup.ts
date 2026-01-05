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
    inviteService: process.env.INVITE_SERVICE_URL || 'http://localhost:3003',
    portfolioService: process.env.PORTFOLIO_SERVICE_URL || 'http://localhost:3004',
    shootService: process.env.SHOOT_SERVICE_URL || 'http://localhost:3005',
    fileService: process.env.FILE_SERVICE_URL || 'http://localhost:3006',
    notificationService: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3007'
  }
};

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
    await testEnv.kafkaConsumer.connect();
    console.log('✅ Kafka connected');

    // Subscribe to all relevant topics for event collection
    await testEnv.kafkaConsumer.subscribe({
      topics: ['shoots', 'users', 'invites', 'notifications'],
      fromBeginning: false
    });

    // Start consuming events for test verification
    void testEnv.kafkaConsumer.run({
      eachMessage: async ({ topic, message }) => {
        const event = JSON.parse(message.value?.toString() || '{}');
        testEnv.eventCollector.push({
          topic,
          timestamp: Date.now(),
          ...event
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
  const servicesToCheck = [
    { name: 'Shoot Service', url: `${config.services.shootService}/health` },
    { name: 'User Service', url: `${config.services.userService}/health` },
    { name: 'Invite Service', url: `${config.services.inviteService}/health` },
    { name: 'Notification Service', url: `${config.services.notificationService}/health` }
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
 * Helper: Clean test database collections
 */
export async function cleanDatabase() {
  if (!testEnv.mongoClient) return;

  const databases = [
    'user-service',
    'shoot-service',
    'invite-service',
    'notification-service',
    'portfolio-service',
    'file-service'
  ];

  for (const dbName of databases) {
    try {
      const db = testEnv.mongoClient.db(dbName);
      const collections = await db.listCollections().toArray();

      for (const collection of collections) {
        await db.collection(collection.name).deleteMany({});
      }
    } catch (error) {
      console.warn(`Warning: Failed to clean database ${dbName}:`, error);
    }
  }
}

// Auto-setup and teardown hooks
// Note: These run automatically when vitest loads this setup file
if (typeof beforeAll !== 'undefined') {
  beforeAll(async () => {
    await setup();
  });
}

if (typeof afterAll !== 'undefined') {
  afterAll(async () => {
    await teardown();
  });
}
