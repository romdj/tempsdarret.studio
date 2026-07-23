import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { Kafka } from 'kafkajs';
import { appConfig } from './config/app.config';
import { UserService, shootCreatedEventSchema } from './services/user.service';
import { UserRepository } from './persistence/user.repository';
import { KafkaEventPublisher } from './shared/messaging/event-publisher';
import { KafkaConsumer, type EventHandler } from '@tempsdarret/shared/messaging';
import { ShootCreatedConsumer } from './events/consumers/shoot-created.consumer';
import { createServer } from './server';

/**
 * Boots the user-service: connects Kafka + Mongo, wires the HTTP app and the
 * `shoot.created` consumer, and starts listening. Returns a `stop` handle so
 * tests (e.g. the in-process E2E harness) can boot and tear it down without
 * touching the shared mongoose connection. Does NOT disconnect mongoose —
 * the caller owns that, since multiple in-process services share it.
 */
export async function startService(): Promise<{ stop: () => Promise<void> }> {
  const kafka = new Kafka({ clientId: appConfig.serviceName, brokers: appConfig.kafkaBrokers });
  const eventPublisher = new KafkaEventPublisher(kafka);

  await eventPublisher.connect();

  const userRepository = new UserRepository();
  const userService = new UserService(userRepository, eventPublisher);

  // HTTP app (owns the MongoDB connection via mongoUrl)
  const app = await createServer({
    logger: true,
    mongoUrl: appConfig.mongoUri,
    userService
  });

  // Consume shoot.created → create/verify client user (sequence diagram step 2).
  const shootCreatedConsumer = new ShootCreatedConsumer(userService);
  const handlers: Record<string, EventHandler> = {
    'shoot.created': (event) => shootCreatedConsumer.handle(shootCreatedEventSchema.parse(event))
  };
  const consumer = new KafkaConsumer(kafka, appConfig.serviceName, handlers);
  await consumer.start(['shoots']);

  await app.listen({ port: appConfig.port, host: appConfig.host });

  // eslint-disable-next-line no-console
  console.log(`${appConfig.serviceName} running on http://${appConfig.host}:${appConfig.port}`);

  return {
    stop: async (): Promise<void> => {
      await consumer.stop();
      await eventPublisher.disconnect();
      await app.close();
    }
  };
}

// Only boot when run as the entrypoint, not when imported by the E2E harness.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startService()
    .then(({ stop }) => {
      const shutdown = async (): Promise<void> => {
        await stop();
        await mongoose.disconnect();
        process.exit(0);
      };
      process.on('SIGINT', () => { void shutdown(); });
      process.on('SIGTERM', () => { void shutdown(); });
    })
    .catch((error: unknown) => {
      // eslint-disable-next-line no-console
      console.error('Error starting user-service:', error);
      process.exit(1);
    });
}
