import mongoose from 'mongoose';
import { Kafka } from 'kafkajs';
import { appConfig } from './config/app.config';
import { UserService, shootCreatedEventSchema } from './services/user.service';
import { UserRepository } from './persistence/user.repository';
import { KafkaEventPublisher } from './shared/messaging/event-publisher';
import { KafkaConsumer, type EventHandler } from '@tempsdarret/shared/messaging';
import { ShootCreatedConsumer } from './events/consumers/shoot-created.consumer';
import { createServer } from './server';

async function start(): Promise<void> {
  const kafka = new Kafka({ clientId: appConfig.serviceName, brokers: appConfig.kafkaBrokers });
  const eventPublisher = new KafkaEventPublisher(kafka);

  try {
    // Infrastructure
    await eventPublisher.connect();

    // Dependencies
    const userRepository = new UserRepository();
    const userService = new UserService(userRepository, eventPublisher);

    // HTTP app (owns the MongoDB connection via mongoUrl)
    const app = await createServer({
      logger: true,
      mongoUrl: appConfig.mongoUri,
      userService
    });

    // Consume shoot.created → create/verify client user (sequence diagram step 2).
    // The event is validated at the boundary (schema.parse) before handling.
    const shootCreatedConsumer = new ShootCreatedConsumer(userService);
    const handlers: Record<string, EventHandler> = {
      'shoot.created': (event) => shootCreatedConsumer.handle(shootCreatedEventSchema.parse(event))
    };
    const consumer = new KafkaConsumer(kafka, appConfig.serviceName, handlers);
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
