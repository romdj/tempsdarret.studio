import fastify from 'fastify';
import mongoose from 'mongoose';
import { Kafka } from 'kafkajs';
import { KafkaConsumer } from '@tempsdarret/shared/messaging';
import { appConfig } from './config/app.config';
import { InvitationHandlers } from './handlers/invitation.handlers';
import { MagicLinkHandlers } from './handlers/magic-link.handlers';
import { InvitationService, UserCreatedEvent, UserVerifiedEvent } from './services/invitation.service';
import { MagicLinkService } from './services/magic-link.service';
import { InvitationRepository } from './persistence/invitation.repository';
import { MagicLinkRepository } from './persistence/magic-link.repository';
import { KafkaEventPublisher } from './shared/messaging/event-publisher';
import { registerInvitationRoutes } from './handlers/invitation.routes';
import { registerMagicLinkRoutes } from './handlers/magic-link.routes';

async function start(): Promise<void> {
  const app = fastify({ logger: true });
  const kafka = new Kafka({ clientId: appConfig.serviceName, brokers: appConfig.kafkaBrokers });
  const eventPublisher = new KafkaEventPublisher(kafka);

  try {
    // Infrastructure
    await mongoose.connect(appConfig.mongoUri);
    await eventPublisher.connect();

    // Dependencies
    const invitationRepository = new InvitationRepository();
    const magicLinkRepository = new MagicLinkRepository();
    const invitationService = new InvitationService(invitationRepository, magicLinkRepository, eventPublisher);
    const magicLinkService = new MagicLinkService(magicLinkRepository, eventPublisher);

    // HTTP routes
    registerInvitationRoutes(app, new InvitationHandlers(invitationService));
    registerMagicLinkRoutes(app, new MagicLinkHandlers(magicLinkService));

    // Consume user.created / user.verified → generate magic link + invitation.created
    const consumer = new KafkaConsumer(kafka, appConfig.serviceName, {
      'user.created': async (event) => {
        await invitationService.handleUserCreatedEvent(event as unknown as UserCreatedEvent);
      },
      'user.verified': async (event) => {
        await invitationService.handleUserVerifiedEvent(event as unknown as UserVerifiedEvent);
      }
    });
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
