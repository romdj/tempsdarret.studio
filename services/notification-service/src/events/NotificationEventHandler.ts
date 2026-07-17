/**
 * Notification Event Handlers
 *
 * Business handlers for the events that trigger notifications. Kafka plumbing
 * lives in main.ts via the shared KafkaConsumer, which dispatches each event
 * type to the matching handler here.
 */

import {
  InvitationCreatedEvent,
  ShootCompletedEvent,
  ShootUpdatedEvent,
  MagicLinkExpiringEvent
} from '../shared/contracts/notifications.events.js';
import { EmailService } from '../services/EmailService.js';
import { EventPublisher } from '@tempsdarret/shared/messaging';
import { generateId } from '../shared/utils/id.js';

const NOTIFICATIONS_TOPIC = 'notifications';

export class NotificationEventHandler {
  constructor(
    private readonly emailService: EmailService,
    private readonly eventPublisher: EventPublisher
  ) {}

  // Scenario 1: invitation.created → send the magic-link email, then publish
  // invitation.sent so the invitation flow can be tracked end-to-end.
  async handleInvitationCreated(event: InvitationCreatedEvent): Promise<void> {
    const result = await this.emailService.sendMagicLinkEmail({
      recipientEmail: event.clientEmail,
      recipientName: event.clientName,
      variables: {
        clientName: event.clientName ?? 'Valued Client',
        eventName: event.shootDetails.eventName,
        magicLinkUrl: event.magicLinkUrl,
        expirationDate: event.expirationDate,
        photographerName: event.shootDetails.photographerName,
        photographerEmail: event.shootDetails.photographerEmail,
        eventDate: event.shootDetails.eventDate,
        eventLocation: event.shootDetails.eventLocation
      },
      shootId: event.shootId,
      correlationId: event.invitationId
    });

    await this.eventPublisher.publish(
      NOTIFICATIONS_TOPIC,
      {
        eventType: 'invitation.sent',
        invitationId: event.invitationId,
        email: event.clientEmail,
        shootId: event.shootId,
        sentAt: new Date().toISOString(),
        status: result.success ? 'sent' : 'failed'
      },
      event.invitationId
    );
  }

  async handleShootCompleted(event: ShootCompletedEvent): Promise<void> {
    await this.emailService.sendPhotosReadyEmail({
      recipientEmail: event.clientEmail,
      recipientName: event.clientName,
      variables: {
        clientName: event.clientName ?? 'Valued Client',
        eventName: event.shootDetails.eventName,
        eventType: event.shootDetails.eventType,
        totalPhotoCount: event.shootDetails.totalPhotoCount,
        galleryUrl: event.galleryUrl,
        photographerName: event.shootDetails.photographerName,
        eventDate: event.shootDetails.eventDate
      },
      shootId: event.shootId,
      correlationId: generateId()
    });
  }

  async handleShootUpdated(event: ShootUpdatedEvent): Promise<void> {
    await this.emailService.sendShootUpdateEmail({
      recipientEmail: event.clientEmail,
      recipientName: event.clientName,
      variables: {
        clientName: event.clientName ?? 'Valued Client',
        eventName: event.updateDetails.eventName,
        updateMessage: event.updateDetails.updateMessage,
        projectUrl: event.projectUrl,
        photographerName: event.updateDetails.photographerName,
        updateDate: new Date().toLocaleDateString()
      },
      shootId: event.shootId,
      correlationId: generateId()
    });
  }

  async handleMagicLinkExpiring(event: MagicLinkExpiringEvent): Promise<void> {
    await this.emailService.sendReminderEmail({
      recipientEmail: event.clientEmail,
      recipientName: event.clientName,
      variables: {
        clientName: event.clientName ?? 'Valued Client',
        eventName: `Shoot ${event.shootId}`,
        expirationDate: event.expirationDate,
        magicLinkUrl: event.magicLinkUrl,
        photographerName: 'Your Photographer'
      },
      shootId: event.shootId,
      correlationId: event.invitationId
    });
  }
}
