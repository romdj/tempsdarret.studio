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

async function start(): Promise<void> {
  const kafka = new Kafka({ clientId: appConfig.serviceName, brokers: appConfig.kafkaBrokers });
  const eventPublisher = new KafkaEventPublisher(kafka);

  try {
    // Infrastructure
    await mongoose.connect(appConfig.mongoUri);
    await eventPublisher.connect();

    // HTTP app (routes wired against the real Kafka-backed publisher)
    const app = await createServer({ logger: true, eventPublisher });

    // Consume user.created / user.verified → generate magic link + invitation.created.
    // Each event is validated at the boundary (schema.parse) before handling.
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
    console.error('Error starting invitation-service:', error);
    process.exit(1);
  }
}

void start();
