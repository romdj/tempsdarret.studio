/**
 * Kafka Event Consumer
 * Consumes events that trigger email notifications
 */

import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { 
  ConsumedEvent, 
  CONSUMED_EVENT_TYPES,
  InvitationCreatedEvent,
  ShootCompletedEvent,
  ShootUpdatedEvent,
  MagicLinkExpiringEvent
} from '../shared/contracts/notifications.events.js';
import { EmailService } from '../services/EmailService.js';
import { generateId } from '../shared/utils/id.js';

export class EventConsumer {
  private readonly consumer: Consumer;
  private isRunning = false;

  constructor(
    private readonly kafka: Kafka,
    private readonly emailService: EmailService
  ) {
    this.consumer = this.kafka.consumer({ 
      groupId: 'notification-service',
      sessionTimeout: 30000,
      rebalanceTimeout: 60000,
    });
  }

  async start(): Promise<void> {
    if (this.isRunning) {return;}

    await this.consumer.connect();
    console.log('📧 Notification service event consumer connected to Kafka');

    // Subscribe to topics that trigger notifications
    await this.consumer.subscribe({
      topics: [
        'invites',
        'shoots', 
        'magic-links'
      ],
      fromBeginning: false,
    });

    await this.consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        await this.handleMessage(payload);
      },
    });

    this.isRunning = true;
    console.log('📧 Notification service is now consuming events...');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {return;}

    await this.consumer.disconnect();
    this.isRunning = false;
    console.log('📧 Notification service event consumer stopped');
  }

  private async handleMessage(payload: EachMessagePayload): Promise<void> {
    const { topic, message } = payload;
    
    try {
      if (!message.value) {
        console.warn(`Received empty message from topic ${topic}`);
        return;
      }

      const eventData = JSON.parse(message.value.toString()) as ConsumedEvent;
      
      console.log(`📧 Processing event: ${eventData.eventType} from topic ${topic}`);

      switch (eventData.eventType) {
        case CONSUMED_EVENT_TYPES.INVITATION_CREATED:
          await this.handleInvitationCreated(eventData as InvitationCreatedEvent);
          break;
          
        case CONSUMED_EVENT_TYPES.SHOOT_COMPLETED:
          await this.handleShootCompleted(eventData as ShootCompletedEvent);
          break;
          
        case CONSUMED_EVENT_TYPES.SHOOT_UPDATED:
          await this.handleShootUpdated(eventData as ShootUpdatedEvent);
          break;
          
        case CONSUMED_EVENT_TYPES.MAGIC_LINK_EXPIRING:
          await this.handleMagicLinkExpiring(eventData as MagicLinkExpiringEvent);
          break;
          
        default:
          console.log(`📧 Unhandled event type: ${eventData.eventType}`);
      }

    } catch (error) {
      console.error(`Error processing message from topic ${topic}:`, error);
      
      // In production, you might want to implement dead letter queue logic here
      // For now, we'll just log the error and continue
    }
  }

  private async handleInvitationCreated(event: InvitationCreatedEvent): Promise<void> {
    console.log(`📧 Sending magic link email to ${event.clientEmail} for shoot ${event.shootId}`);

    await this.emailService.sendMagicLinkEmail({
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
        eventLocation: event.shootDetails.eventLocation,
      },
      shootId: event.shootId,
      correlationId: event.invitationId,
    });
  }

  private async handleShootCompleted(event: ShootCompletedEvent): Promise<void> {
    console.log(`📧 Sending photos ready notification to ${event.clientEmail} for shoot ${event.shootId}`);
    
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
        eventDate: event.shootDetails.eventDate,
      },
      shootId: event.shootId,
      correlationId: generateId(),
    });
  }

  private async handleShootUpdated(event: ShootUpdatedEvent): Promise<void> {
    console.log(`📧 Sending shoot update notification to ${event.clientEmail} for shoot ${event.shootId}`);
    
    await this.emailService.sendShootUpdateEmail({
      recipientEmail: event.clientEmail,
      recipientName: event.clientName,
      variables: {
        clientName: event.clientName ?? 'Valued Client',
        eventName: event.updateDetails.eventName,
        updateMessage: event.updateDetails.updateMessage,
        projectUrl: event.projectUrl,
        photographerName: event.updateDetails.photographerName,
        updateDate: new Date().toLocaleDateString(),
      },
      shootId: event.shootId,
      correlationId: generateId(),
    });
  }

  private async handleMagicLinkExpiring(event: MagicLinkExpiringEvent): Promise<void> {
    console.log(`📧 Sending expiration reminder to ${event.clientEmail} for shoot ${event.shootId}`);
    
    await this.emailService.sendReminderEmail({
      recipientEmail: event.clientEmail,
      recipientName: event.clientName,
      variables: {
        clientName: event.clientName ?? 'Valued Client',
        eventName: `Shoot ${event.shootId}`, // We'll need to enhance this with actual event name
        expirationDate: event.expirationDate,
        magicLinkUrl: event.magicLinkUrl,
        photographerName: 'Your Photographer', // We'll need to enhance this
      },
      shootId: event.shootId,
      correlationId: event.invitationId,
    });
  }

  get status(): { isRunning: boolean; consumerGroupId: string } {
    return {
      isRunning: this.isRunning,
      consumerGroupId: 'notification-service',
    };
  }
}