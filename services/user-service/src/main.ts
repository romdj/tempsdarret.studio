import fastify from 'fastify';
import mongoose from 'mongoose';
import { Kafka } from 'kafkajs';
import { appConfig } from './config/app.config';
import { UserHandlers } from './handlers/user.handlers';
import { UserService, ShootCreatedEvent } from './services/user.service';
import { UserRepository } from './persistence/user.repository';
import { KafkaEventPublisher } from './shared/messaging/event-publisher';
import { KafkaConsumer } from './shared/messaging/kafka-consumer';
import { ShootCreatedConsumer } from './events/consumers/shoot-created.consumer';
import { registerUserRoutes } from './handlers/user.routes';

async function start(): Promise<void> {
  const app = fastify({ logger: true });
  const kafka = new Kafka({ clientId: appConfig.serviceName, brokers: appConfig.kafkaBrokers });
  const eventPublisher = new KafkaEventPublisher(kafka);

  try {
    // Infrastructure
    await mongoose.connect(appConfig.mongoUri);
    await eventPublisher.connect();

    // Dependencies
    const userRepository = new UserRepository();
    const userService = new UserService(userRepository, eventPublisher);
    const userHandlers = new UserHandlers(userService);

    // HTTP routes
    registerUserRoutes(app, userHandlers);

    // Consume shoot.created → create/verify client user (sequence diagram step 2)
    const shootCreatedConsumer = new ShootCreatedConsumer(userService);
    const consumer = new KafkaConsumer(kafka, appConfig.serviceName, {
      'shoot.created': (event) => shootCreatedConsumer.handle(event as unknown as ShootCreatedEvent)
    });
    await consumer.start(['shoots']);

    await app.listen({ port: appConfig.port, host: appConfig.host });

    // eslint-disable-next-line no-console
    console.log(`${appConfig.serviceName} running on http://${appConfig.host}:${appConfig.port}`);

    const shutdown = async (): Promise<void> => {
      await consumer.stop();
      await eventPublisher.disconnect();
      await mongoose.disconnect();
      await app.close();
      process.exit(0);
    };
    process.on('SIGINT', () => { void shutdown(); });
    process.on('SIGTERM', () => { void shutdown(); });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error starting user-service:', error);
    process.exit(1);
  }
}

void start();
