import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { Kafka } from 'kafkajs';
import { KafkaConsumer, type EventHandler } from '@tempsdarret/shared/messaging';
import { appConfig } from './config/app.config';
import {
  InvitationService,
  userCreatedEventSchema,
  userVerifiedEventSchema
} from './services/invitation.service';
import { InvitationRepository } from './persistence/invitation.repository';
import { MagicLinkRepository } from './persistence/magic-link.repository';
import { KafkaEventPublisher } from './shared/messaging/event-publisher';
import { createServer } from './server';

/**
 * Boots the invitation-service: connects Kafka + Mongo, wires the HTTP app and
 * the user.created / user.verified consumer, and starts listening. Returns a
 * `stop` handle for tests. Does NOT disconnect mongoose — the caller owns that,
 * since multiple in-process services share the connection.
 */
export async function startService(): Promise<{ stop: () => Promise<void> }> {
  const kafka = new Kafka({ clientId: appConfig.serviceName, brokers: appConfig.kafkaBrokers });
  const eventPublisher = new KafkaEventPublisher(kafka);

  await mongoose.connect(appConfig.mongoUri);
  await eventPublisher.connect();

  // HTTP app (routes wired against the real Kafka-backed publisher)
  const app = await createServer({ logger: true, eventPublisher });

  // Consume user.created / user.verified → generate magic link + invitation.created.
  const invitationService = new InvitationService(
    new InvitationRepository(),
    new MagicLinkRepository(),
    eventPublisher
  );
  const handlers: Record<string, EventHandler> = {
    'user.created': async (event) => {
      await invitationService.handleUserCreatedEvent(userCreatedEventSchema.parse(event));
    },
    'user.verified': async (event) => {
      await invitationService.handleUserVerifiedEvent(userVerifiedEventSchema.parse(event));
    }
  };
  const consumer = new KafkaConsumer(kafka, appConfig.serviceName, handlers);
  await consumer.start(['users']);

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
      console.error('Error starting invitation-service:', error);
      process.exit(1);
    });
}
