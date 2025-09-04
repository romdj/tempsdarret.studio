/**
 * Event Consumer Integration Tests
 * End-to-end testing of Kafka event consumption and notification processing
 */

import { EventConsumer } from '../../src/events/EventConsumer.js';
import { EmailRepository } from '../../src/services/repositories/EmailRepository.js';
import { TemplateService } from '../../src/services/TemplateService.js';
import { MultiChannelNotificationService } from '../../src/services/repositories/NotificationRepository.js';
import {
  InvitationCreatedEvent,
  ShootCompletedEvent,
  ShootUpdatedEvent,
  MagicLinkExpiringEvent,
  CONSUMED_EVENT_TYPES
} from '../../src/shared/contracts/notifications.events.js';
import { 
  invitationCreatedEvent,
  shootCompletedEvent,
  shootUpdatedEvent,
  magicLinkExpiringEvent,
  EventFactory
} from '../fixtures/events.js';
import { mockResend, setupResendMock } from '../mocks/resend.js';

// Mock Kafka and external services
const mockKafka = {
  consumer: jest.fn(),
};

const mockConsumer = {
  connect: jest.fn(),
  subscribe: jest.fn(),
  run: jest.fn(),
  disconnect: jest.fn(),
};

jest.mock('kafkajs', () => ({
  Kafka: jest.fn().mockImplementation(() => mockKafka),
}));

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => mockResend),
}));

// Mock Email Service for testing
class MockEmailService {
  async sendMagicLinkEmail(params: any): Promise<void> {
    console.log('📧 Mock: Sending magic link email', params);
  }

  async sendPhotosReadyEmail(params: any): Promise<void> {
    console.log('📧 Mock: Sending photos ready email', params);
  }

  async sendShootUpdateEmail(params: any): Promise<void> {
    console.log('📧 Mock: Sending shoot update email', params);
  }

  async sendReminderEmail(params: any): Promise<void> {
    console.log('📧 Mock: Sending reminder email', params);
  }
}

describe('EventConsumer Integration Tests', () => {
  let eventConsumer: EventConsumer;
  let mockEmailService: MockEmailService;
  let messageHandlers: Map<string, Function>;

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();
    setupResendMock.reset();
    setupResendMock.success();

    // Setup Kafka consumer mock
    mockKafka.consumer.mockReturnValue(mockConsumer);
    mockConsumer.connect.mockResolvedValue(undefined);
    mockConsumer.subscribe.mockResolvedValue(undefined);
    mockConsumer.disconnect.mockResolvedValue(undefined);

    // Store message handlers for testing
    messageHandlers = new Map();
    mockConsumer.run.mockImplementation(({ eachMessage }: any) => {
      messageHandlers.set('eachMessage', eachMessage);
      return Promise.resolve();
    });

    // Create mock email service
    mockEmailService = new MockEmailService();
    jest.spyOn(mockEmailService, 'sendMagicLinkEmail');
    jest.spyOn(mockEmailService, 'sendPhotosReadyEmail');
    jest.spyOn(mockEmailService, 'sendShootUpdateEmail');
    jest.spyOn(mockEmailService, 'sendReminderEmail');

    // Create event consumer
    eventConsumer = new EventConsumer(mockKafka as any, mockEmailService as any);
  });

  afterEach(async () => {
    if (eventConsumer.status.isRunning) {
      await eventConsumer.stop();
    }
  });

  describe('consumer initialization', () => {
    it('should initialize consumer with correct configuration', async () => {
      await eventConsumer.start();

      expect(mockKafka.consumer).toHaveBeenCalledWith({
        groupId: 'notification-service',
        sessionTimeout: 30000,
        rebalanceTimeout: 60000,
      });

      expect(mockConsumer.connect).toHaveBeenCalled();
      expect(mockConsumer.subscribe).toHaveBeenCalledWith({
        topics: ['invites', 'shoots', 'magic-links'],
        fromBeginning: false,
      });
      expect(mockConsumer.run).toHaveBeenCalled();
    });

    it('should update running status correctly', async () => {
      expect(eventConsumer.status.isRunning).toBe(false);

      await eventConsumer.start();
      expect(eventConsumer.status.isRunning).toBe(true);

      await eventConsumer.stop();
      expect(eventConsumer.status.isRunning).toBe(false);
    });

    it('should not start multiple times', async () => {
      await eventConsumer.start();
      await eventConsumer.start(); // Second start should be ignored

      expect(mockConsumer.connect).toHaveBeenCalledTimes(1);
    });

    it('should handle stop when not running', async () => {
      await eventConsumer.stop(); // Should not throw

      expect(mockConsumer.disconnect).not.toHaveBeenCalled();
    });
  });

  describe('invitation.created event processing', () => {
    beforeEach(async () => {
      await eventConsumer.start();
    });

    it('should process invitation created event successfully', async () => {
      const messageHandler = messageHandlers.get('eachMessage');
      expect(messageHandler).toBeDefined();

      const kafkaMessage = {
        topic: 'invites',
        partition: 0,
        message: {
          value: Buffer.from(JSON.stringify(invitationCreatedEvent)),
          offset: '123',
        },
      };

      await messageHandler(kafkaMessage);

      expect(mockEmailService.sendMagicLinkEmail).toHaveBeenCalledWith({
        recipientEmail: invitationCreatedEvent.clientEmail,
        recipientName: invitationCreatedEvent.clientName,
        variables: {
          clientName: invitationCreatedEvent.clientName,
          eventName: invitationCreatedEvent.shootDetails.eventName,
          magicLinkUrl: invitationCreatedEvent.magicLinkUrl,
          expirationDate: invitationCreatedEvent.expirationDate,
          photographerName: invitationCreatedEvent.shootDetails.photographerName,
          photographerEmail: invitationCreatedEvent.shootDetails.photographerEmail,
          eventDate: invitationCreatedEvent.shootDetails.eventDate,
          eventLocation: invitationCreatedEvent.shootDetails.eventLocation,
        },
        shootId: invitationCreatedEvent.shootId,
        correlationId: invitationCreatedEvent.invitationId,
      });
    });

    it('should handle invitation with minimal data', async () => {
      const minimalInvitation = EventFactory.createInvitation({
        clientName: undefined,
        shootDetails: {
          ...invitationCreatedEvent.shootDetails,
          eventDate: undefined,
          eventLocation: undefined,
        },
      });

      const messageHandler = messageHandlers.get('eachMessage');
      const kafkaMessage = {
        topic: 'invites',
        partition: 0,
        message: {
          value: Buffer.from(JSON.stringify(minimalInvitation)),
        },
      };

      await messageHandler(kafkaMessage);

      expect(mockEmailService.sendMagicLinkEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientEmail: minimalInvitation.clientEmail,
          recipientName: undefined,
          variables: expect.objectContaining({
            clientName: 'Valued Client', // Default fallback
            eventDate: undefined,
            eventLocation: undefined,
          }),
        })
      );
    });

    it('should log processing of invitation events', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const messageHandler = messageHandlers.get('eachMessage');
      const kafkaMessage = {
        topic: 'invites',
        partition: 0,
        message: {
          value: Buffer.from(JSON.stringify(invitationCreatedEvent)),
        },
      };

      await messageHandler(kafkaMessage);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`📧 Processing event: ${CONSUMED_EVENT_TYPES.INVITATION_CREATED}`)
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          `📧 Sending magic link email to ${invitationCreatedEvent.clientEmail} for shoot ${invitationCreatedEvent.shootId}`
        )
      );

      consoleSpy.mockRestore();
    });
  });

  describe('shoot.completed event processing', () => {
    beforeEach(async () => {
      await eventConsumer.start();
    });

    it('should process shoot completed event successfully', async () => {
      const messageHandler = messageHandlers.get('eachMessage');
      const kafkaMessage = {
        topic: 'shoots',
        partition: 0,
        message: {
          value: Buffer.from(JSON.stringify(shootCompletedEvent)),
        },
      };

      await messageHandler(kafkaMessage);

      expect(mockEmailService.sendPhotosReadyEmail).toHaveBeenCalledWith({
        recipientEmail: shootCompletedEvent.clientEmail,
        recipientName: shootCompletedEvent.clientName,
        variables: {
          clientName: shootCompletedEvent.clientName,
          eventName: shootCompletedEvent.shootDetails.eventName,
          eventType: shootCompletedEvent.shootDetails.eventType,
          totalPhotoCount: shootCompletedEvent.shootDetails.totalPhotoCount,
          galleryUrl: shootCompletedEvent.galleryUrl,
          photographerName: shootCompletedEvent.shootDetails.photographerName,
          eventDate: shootCompletedEvent.shootDetails.eventDate,
        },
        shootId: shootCompletedEvent.shootId,
        correlationId: expect.any(String),
      });
    });

    it('should handle different event types (portrait, corporate, wedding)', async () => {
      const eventTypes = ['portrait', 'corporate', 'wedding'];

      for (const eventType of eventTypes) {
        const customEvent = EventFactory.createShootCompleted({
          shootDetails: {
            ...shootCompletedEvent.shootDetails,
            eventType,
            eventName: `${eventType} Session`,
          },
        });

        const messageHandler = messageHandlers.get('eachMessage');
        const kafkaMessage = {
          topic: 'shoots',
          partition: 0,
          message: {
            value: Buffer.from(JSON.stringify(customEvent)),
          },
        };

        jest.clearAllMocks();
        await messageHandler(kafkaMessage);

        expect(mockEmailService.sendPhotosReadyEmail).toHaveBeenCalledWith(
          expect.objectContaining({
            variables: expect.objectContaining({
              eventType,
              eventName: `${eventType} Session`,
            }),
          })
        );
      }
    });

    it('should handle large photo counts correctly', async () => {
      const largeShoot = EventFactory.createShootCompleted({
        shootDetails: {
          ...shootCompletedEvent.shootDetails,
          totalPhotoCount: 1500,
          eventName: 'Large Wedding',
        },
      });

      const messageHandler = messageHandlers.get('eachMessage');
      const kafkaMessage = {
        topic: 'shoots',
        partition: 0,
        message: {
          value: Buffer.from(JSON.stringify(largeShoot)),
        },
      };

      await messageHandler(kafkaMessage);

      expect(mockEmailService.sendPhotosReadyEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            totalPhotoCount: 1500,
          }),
        })
      );
    });
  });

  describe('shoot.updated event processing', () => {
    beforeEach(async () => {
      await eventConsumer.start();
    });

    it('should process shoot updated event successfully', async () => {
      const messageHandler = messageHandlers.get('eachMessage');
      const kafkaMessage = {
        topic: 'shoots',
        partition: 0,
        message: {
          value: Buffer.from(JSON.stringify(shootUpdatedEvent)),
        },
      };

      await messageHandler(kafkaMessage);

      expect(mockEmailService.sendShootUpdateEmail).toHaveBeenCalledWith({
        recipientEmail: shootUpdatedEvent.clientEmail,
        recipientName: shootUpdatedEvent.clientName,
        variables: {
          clientName: shootUpdatedEvent.clientName,
          eventName: shootUpdatedEvent.updateDetails.eventName,
          updateMessage: shootUpdatedEvent.updateDetails.updateMessage,
          projectUrl: shootUpdatedEvent.projectUrl,
          photographerName: shootUpdatedEvent.updateDetails.photographerName,
          updateDate: expect.any(String), // Generated current date
        },
        shootId: shootUpdatedEvent.shootId,
        correlationId: expect.any(String),
      });
    });

    it('should handle urgent updates', async () => {
      const urgentUpdate = EventFactory.createShootUpdate({
        updateDetails: {
          ...shootUpdatedEvent.updateDetails,
          updateMessage: 'URGENT: Please download your photos within 24 hours.',
        },
      });

      const messageHandler = messageHandlers.get('eachMessage');
      const kafkaMessage = {
        topic: 'shoots',
        partition: 0,
        message: {
          value: Buffer.from(JSON.stringify(urgentUpdate)),
        },
      };

      await messageHandler(kafkaMessage);

      expect(mockEmailService.sendShootUpdateEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            updateMessage: 'URGENT: Please download your photos within 24 hours.',
          }),
        })
      );
    });
  });

  describe('magic.link.expiring event processing', () => {
    beforeEach(async () => {
      await eventConsumer.start();
    });

    it('should process magic link expiring event successfully', async () => {
      const messageHandler = messageHandlers.get('eachMessage');
      const kafkaMessage = {
        topic: 'magic-links',
        partition: 0,
        message: {
          value: Buffer.from(JSON.stringify(magicLinkExpiringEvent)),
        },
      };

      await messageHandler(kafkaMessage);

      expect(mockEmailService.sendReminderEmail).toHaveBeenCalledWith({
        recipientEmail: magicLinkExpiringEvent.clientEmail,
        recipientName: magicLinkExpiringEvent.clientName,
        variables: {
          clientName: magicLinkExpiringEvent.clientName,
          eventName: `Shoot ${magicLinkExpiringEvent.shootId}`, // Default formatting
          expirationDate: magicLinkExpiringEvent.expirationDate,
          magicLinkUrl: magicLinkExpiringEvent.magicLinkUrl,
          photographerName: 'Your Photographer', // Default value
        },
        shootId: magicLinkExpiringEvent.shootId,
        correlationId: magicLinkExpiringEvent.invitationId,
      });
    });

    it('should handle soon-expiring links (24 hours)', async () => {
      const soonExpiring = EventFactory.createExpiring({
        expirationDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

      const messageHandler = messageHandlers.get('eachMessage');
      const kafkaMessage = {
        topic: 'magic-links',
        partition: 0,
        message: {
          value: Buffer.from(JSON.stringify(soonExpiring)),
        },
      };

      await messageHandler(kafkaMessage);

      expect(mockEmailService.sendReminderEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            expirationDate: soonExpiring.expirationDate,
          }),
        })
      );
    });
  });

  describe('error handling', () => {
    beforeEach(async () => {
      await eventConsumer.start();
    });

    it('should handle empty message gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const messageHandler = messageHandlers.get('eachMessage');
      const kafkaMessage = {
        topic: 'invites',
        partition: 0,
        message: {
          value: null, // Empty message
        },
      };

      await messageHandler(kafkaMessage);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Received empty message from topic invites'
      );
      expect(mockEmailService.sendMagicLinkEmail).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle malformed JSON in message', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const messageHandler = messageHandlers.get('eachMessage');
      const kafkaMessage = {
        topic: 'invites',
        partition: 0,
        message: {
          value: Buffer.from('invalid json{'),
        },
      };

      await messageHandler(kafkaMessage);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error processing message from topic invites:',
        expect.any(Error)
      );
      expect(mockEmailService.sendMagicLinkEmail).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should handle unknown event types', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const unknownEvent = {
        eventType: 'unknown.event.type',
        data: 'some data',
        timestamp: new Date().toISOString(),
      };

      const messageHandler = messageHandlers.get('eachMessage');
      const kafkaMessage = {
        topic: 'invites',
        partition: 0,
        message: {
          value: Buffer.from(JSON.stringify(unknownEvent)),
        },
      };

      await messageHandler(kafkaMessage);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('📧 Unhandled event type: unknown.event.type')
      );

      consoleSpy.mockRestore();
    });

    it('should handle email service failures', async () => {
      jest.spyOn(mockEmailService, 'sendMagicLinkEmail').mockRejectedValueOnce(
        new Error('Email service unavailable')
      );

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const messageHandler = messageHandlers.get('eachMessage');
      const kafkaMessage = {
        topic: 'invites',
        partition: 0,
        message: {
          value: Buffer.from(JSON.stringify(invitationCreatedEvent)),
        },
      };

      await messageHandler(kafkaMessage);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error processing message from topic invites:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should continue processing after errors', async () => {
      // First message fails
      jest.spyOn(mockEmailService, 'sendMagicLinkEmail')
        .mockRejectedValueOnce(new Error('Service failure'))
        .mockResolvedValueOnce(undefined); // Second call succeeds

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const messageHandler = messageHandlers.get('eachMessage');

      // Process first message (fails)
      const failingMessage = {
        topic: 'invites',
        partition: 0,
        message: {
          value: Buffer.from(JSON.stringify(invitationCreatedEvent)),
        },
      };

      await messageHandler(failingMessage);

      expect(consoleErrorSpy).toHaveBeenCalled();

      // Process second message (succeeds)
      const successMessage = {
        topic: 'invites',
        partition: 0,
        message: {
          value: Buffer.from(JSON.stringify(EventFactory.createInvitation({
            invitationId: 'inv_success',
          }))),
        },
      };

      jest.clearAllMocks();
      await messageHandler(successMessage);

      expect(mockEmailService.sendMagicLinkEmail).toHaveBeenCalledTimes(1);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('consumer lifecycle', () => {
    it('should handle connection failures gracefully', async () => {
      mockConsumer.connect.mockRejectedValueOnce(new Error('Connection failed'));

      await expect(eventConsumer.start()).rejects.toThrow('Connection failed');
      expect(eventConsumer.status.isRunning).toBe(false);
    });

    it('should handle subscription failures', async () => {
      mockConsumer.subscribe.mockRejectedValueOnce(new Error('Subscription failed'));

      await expect(eventConsumer.start()).rejects.toThrow('Subscription failed');
    });

    it('should handle disconnection failures gracefully', async () => {
      await eventConsumer.start();
      
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      mockConsumer.disconnect.mockRejectedValueOnce(new Error('Disconnect failed'));

      await expect(eventConsumer.stop()).rejects.toThrow('Disconnect failed');

      consoleLogSpy.mockRestore();
    });

    it('should provide correct status information', () => {
      const status = eventConsumer.status;
      
      expect(status.consumerGroupId).toBe('notification-service');
      expect(typeof status.isRunning).toBe('boolean');
    });
  });

  describe('high-volume event processing', () => {
    beforeEach(async () => {
      await eventConsumer.start();
    });

    it('should handle rapid event processing', async () => {
      const messageHandler = messageHandlers.get('eachMessage');
      const eventCount = 10;
      
      // Create multiple events
      const events = Array.from({ length: eventCount }, (_, i) => 
        EventFactory.createInvitation({
          invitationId: `inv_batch_${i}`,
          shootId: `shoot_batch_${i}`,
          clientEmail: `client${i}@example.com`,
        })
      );

      // Process all events
      const promises = events.map(async (event, index) => {
        const kafkaMessage = {
          topic: 'invites',
          partition: index % 3, // Distribute across partitions
          message: {
            value: Buffer.from(JSON.stringify(event)),
          },
        };

        return messageHandler(kafkaMessage);
      });

      await Promise.all(promises);

      expect(mockEmailService.sendMagicLinkEmail).toHaveBeenCalledTimes(eventCount);
    });
  });
});