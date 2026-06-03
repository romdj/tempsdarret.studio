import { MongoDBContainer, StartedMongoDBContainer } from '@testcontainers/mongodb';
import { KafkaContainer, StartedKafkaContainer } from '@testcontainers/kafka';
import mongoose from 'mongoose';
import { Kafka } from 'kafkajs';

export interface ComponentTestContext {
  mongoUri: string;
  kafkaBrokers: string[];
  kafka: Kafka;
}

let mongoContainer: StartedMongoDBContainer;
let kafkaContainer: StartedKafkaContainer;
let context: ComponentTestContext;

export async function setupComponentTests(): Promise<ComponentTestContext> {
  // eslint-disable-next-line no-console
  console.log('🐋 Starting MongoDB container...');
  mongoContainer = await new MongoDBContainer('mongo:7')
    .withStartupTimeout(60000)
    .start();

  const mongoUri = mongoContainer.getConnectionString();
  // eslint-disable-next-line no-console
  console.log(`✅ MongoDB running at: ${mongoUri}`);

  // eslint-disable-next-line no-console
  console.log('🐋 Starting Kafka container...');
  kafkaContainer = await new KafkaContainer('confluentinc/cp-kafka:7.4.0')
    .withStartupTimeout(60000)
    .start();

  const kafkaBrokers = [`${kafkaContainer.getHost()}:${kafkaContainer.getMappedPort(9093)}`];
  // eslint-disable-next-line no-console
  console.log(`✅ Kafka running at: ${kafkaBrokers[0]}`);

  const kafka = new Kafka({
    clientId: 'portfolio-service-component-test',
    brokers: kafkaBrokers,
  });

  // Pre-create the topics this service publishes to (matches asyncapi.yaml channels).
  const admin = kafka.admin();
  await admin.connect();
  try {
    await admin.createTopics({
      topics: [
        { topic: 'portfolios', numPartitions: 1 },
        { topic: 'galleries', numPartitions: 1 }
      ]
    });
    // eslint-disable-next-line no-console
    console.log('✅ Kafka topics created');
  } catch {
    // Topics may already exist; safe to ignore.
  }
  await admin.disconnect();

  context = { mongoUri, kafkaBrokers, kafka };
  return context;
}

export async function teardownComponentTests(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log('🧹 Cleaning up component test infrastructure...');

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  await mongoContainer?.stop();
  await kafkaContainer?.stop();

  // eslint-disable-next-line no-console
  console.log('✅ Component test cleanup complete');
}

export function getComponentTestContext(): ComponentTestContext {
  if (!context) {
    throw new Error('Component test context not initialized. Call setupComponentTests() first.');
  }
  return context;
}
