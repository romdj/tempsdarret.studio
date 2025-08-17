import { MongoDBContainer } from '@testcontainers/mongodb';
import { KafkaContainer } from '@testcontainers/kafka';
import { beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { Kafka } from 'kafkajs';
import type { StartedTestContainer } from 'testcontainers';

export interface ComponentTestContext {
  mongoUri: string;
  kafkaBrokers: string[];
  kafka: Kafka;
}

let mongoContainer: StartedTestContainer;
let kafkaContainer: StartedTestContainer;
let context: ComponentTestContext;

export async function setupComponentTests(): Promise<ComponentTestContext> {
  // Start MongoDB container
  console.log('🐋 Starting MongoDB container...');
  mongoContainer = await new MongoDBContainer('mongo:7')
    .withStartupTimeout(60000)
    .start();

  const mongoUri = mongoContainer.getConnectionString();
  console.log(`✅ MongoDB running at: ${mongoUri}`);

  // Start Kafka container
  console.log('🐋 Starting Kafka container...');
  kafkaContainer = await new KafkaContainer('confluentinc/cp-kafka:7.4.0')
    .withStartupTimeout(60000)
    .start();

  const kafkaBrokers = [`${kafkaContainer.getHost()}:${kafkaContainer.getMappedPort(9093)}`];
  console.log(`✅ Kafka running at: ${kafkaBrokers[0]}`);

  // Setup Kafka client
  const kafka = new Kafka({
    clientId: 'shoot-service-component-test',
    brokers: kafkaBrokers,
  });

  // Create Kafka topics
  const admin = kafka.admin();
  await admin.connect();
  try {
    await admin.createTopics({
      topics: [
        { topic: 'shoots', numPartitions: 1 },
        { topic: 'invitations', numPartitions: 1 }
      ]
    });
    console.log('✅ Kafka topics created');
  } catch (error) {
    // Topics may already exist, ignore
  }
  await admin.disconnect();

  context = {
    mongoUri,
    kafkaBrokers,
    kafka
  };

  return context;
}

export async function teardownComponentTests(): Promise<void> {
  console.log('🧹 Cleaning up component test infrastructure...');
  
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  
  await mongoContainer?.stop();
  await kafkaContainer?.stop();
  
  console.log('✅ Component test cleanup complete');
}

export function getComponentTestContext(): ComponentTestContext {
  if (!context) {
    throw new Error('Component test context not initialized. Call setupComponentTests() first.');
  }
  return context;
}