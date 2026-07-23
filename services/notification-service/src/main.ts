/**
 * Notification Service entrypoint.
 *
 * Consumes invitation/shoot events and sends the corresponding emails via
 * Resend, then publishes delivery events (e.g. invitation.sent). Kafka plumbing
 * uses the shared KafkaConsumer/KafkaEventPublisher; business logic lives in
 * NotificationEventHandler.
 */

import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { Kafka } from 'kafkajs';
import { KafkaConsumer, KafkaEventPublisher, type EventHandler } from '@tempsdarret/shared/messaging';
import { appConfig } from './config/app.config.js';
import { TemplateService } from './services/TemplateService.js';
import { EmailRepository } from './services/repositories/EmailRepository.js';
import { EmailService } from './services/EmailService.js';
import { NotificationEventHandler } from './events/NotificationEventHandler.js';
import {
  invitationCreatedEventSchema,
  shootCompletedEventSchema,
  shootUpdatedEventSchema,
  magicLinkExpiringEventSchema
} from './shared/contracts/notifications.events.js';

/**
 * Boots the notification-service: connects Kafka + Mongo and wires the
 * invitation/shoot event consumer (no HTTP listener). Returns a `stop` handle
 * for tests. Does NOT disconnect mongoose — the caller owns that, since
 * multiple in-process services share the connection.
 */
export async function startService(): Promise<{ stop: () => Promise<void> }> {
  const kafka = new Kafka({ clientId: appConfig.serviceName, brokers: appConfig.kafkaBrokers });
  const eventPublisher = new KafkaEventPublisher(kafka);

  await mongoose.connect(appConfig.mongoUri);
  await eventPublisher.connect();

  const templateService = new TemplateService();
  const emailRepository = new EmailRepository(appConfig.resend);
  const emailService = new EmailService(templateService, emailRepository);
  const handler = new NotificationEventHandler(emailService, eventPublisher);

  // Consume invitation/shoot events → send email + publish delivery events.
  const handlers: Record<string, EventHandler> = {
    'invitation.created': (event) => handler.handleInvitationCreated(invitationCreatedEventSchema.parse(event)),
    'shoot.completed': (event) => handler.handleShootCompleted(shootCompletedEventSchema.parse(event)),
    'shoot.updated': (event) => handler.handleShootUpdated(shootUpdatedEventSchema.parse(event)),
    'magic.link.expiring': (event) => handler.handleMagicLinkExpiring(magicLinkExpiringEventSchema.parse(event))
  };
  const consumer = new KafkaConsumer(kafka, appConfig.serviceName, handlers);
  await consumer.start(['invitations', 'shoots', 'magic-links']);

  // eslint-disable-next-line no-console
  console.log(`${appConfig.serviceName} consuming events on port ${appConfig.port}`);

  return {
    stop: async (): Promise<void> => {
      await consumer.stop();
      await eventPublisher.disconnect();
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
      console.error('Error starting notification-service:', error);
      process.exit(1);
    });
}
