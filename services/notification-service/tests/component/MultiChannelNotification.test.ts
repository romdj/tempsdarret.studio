/**
 * Multi-Channel Notification Component Tests
 * Testing the orchestration of notifications across multiple channels
 */

import {
  MultiChannelNotificationService,
  BaseNotificationRepository
} from '../../src/services/repositories/NotificationRepository.js';
import { EmailRepository } from '../../src/services/repositories/EmailRepository.js';
import { SlackRepository } from '../../src/services/repositories/SlackRepository.js';
import { SmsRepository } from '../../src/services/repositories/SmsRepository.js';
import {
  NotificationMessage,
  NotificationChannel,
  TemplateType,
  SendResult,
  DeliveryStatus
} from '../../src/shared/contracts/notifications.types.js';
import { mockResend, setupResendMock } from '../mocks/resend.mock.js';

// Mock all repository implementations
jest.mock('../../src/services/repositories/EmailRepository.js');
jest.mock('../../src/services/repositories/SlackRepository.js');
jest.mock('../../src/services/repositories/SmsRepository.js');
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => mockResend)
}));

describe('MultiChannelNotificationService', () => {
  let multiChannelService: MultiChannelNotificationService;
  let mockEmailRepo: jest.Mocked<EmailRepository>;
  let mockSlackRepo: jest.Mocked<SlackRepository>;
  let mockSmsRepo: jest.Mocked<SmsRepository>;

  beforeEach(() => {
    // Create factory mock
    const mockFactory = {
      getRepository: jest.fn(),
      getSupportedChannels: jest.fn().mockReturnValue(['email', 'slack', 'sms']),
    };

    multiChannelService = new MultiChannelNotificationService(mockFactory);

    // Create mocked repositories
    mockEmailRepo = {
      send: jest.fn(),
      getDeliveryStatus: jest.fn(),
      updateDeliveryStatus: jest.fn(),
      getChannel: jest.fn().mockReturnValue('email'),
      validateConfiguration: jest.fn(),
      handleWebhook: jest.fn(),
      getStats: jest.fn(),
    } as any;

    mockSlackRepo = {
      send: jest.fn(),
      getDeliveryStatus: jest.fn(),
      updateDeliveryStatus: jest.fn(),
      getChannel: jest.fn().mockReturnValue('slack'),
      sendToChannel: jest.fn(),
      sendDirectMessage: jest.fn(),
    } as any;

    mockSmsRepo = {
      send: jest.fn(),
      getDeliveryStatus: jest.fn(),
      updateDeliveryStatus: jest.fn(),
      getChannel: jest.fn().mockReturnValue('sms'),
    } as any;

    // Register repositories
    multiChannelService.registerRepository('email', mockEmailRepo);
    multiChannelService.registerRepository('slack', mockSlackRepo);
    multiChannelService.registerRepository('sms', mockSmsRepo);

    // Reset mocks
    setupResendMock.reset();
  });

  describe('repository registration', () => {
    it('should register repositories for different channels', () => {
      const supportedChannels = multiChannelService.getSupportedChannels();
      
      expect(supportedChannels).toContain('email');
      expect(supportedChannels).toContain('slack');
      expect(supportedChannels).toContain('sms');
    });

    it('should log registration', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const newService = new MultiChannelNotificationService({
        getRepository: jest.fn(),
        getSupportedChannels: jest.fn(),
      });
      
      newService.registerRepository('whatsapp', mockSmsRepo);
      
      expect(consoleSpy).toHaveBeenCalledWith('📡 Registered whatsapp notification repository');
      consoleSpy.mockRestore();
    });
  });

  describe('single channel notifications', () => {
    let baseMessage: NotificationMessage;

    beforeEach(() => {
      baseMessage = {
        id: 'msg_123',
        channel: 'email',
        templateType: 'magic-link',
        priority: 'normal',
        recipient: {
          email: 'client@example.com',
          name: 'John Smith',
        },
        content: {
          subject: 'Access Your Photos',
          message: 'Your photos are ready!',
        },
        variables: {
          clientName: 'John Smith',
          eventName: 'Wedding',
        },
        delivery: {
          status: 'queued',
          attempts: 0,
          maxAttempts: 3,
        },
        metadata: {
          shootId: 'shoot_123',
          sourceEvent: 'invitation.created',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });

    it('should send email notification successfully', async () => {
      mockEmailRepo.send.mockResolvedValueOnce({
        success: true,
        messageId: 'email_123',
      });

      const result = await multiChannelService.send(baseMessage);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('email_123');
      expect(mockEmailRepo.send).toHaveBeenCalledWith(baseMessage);
    });

    it('should send slack notification successfully', async () => {
      const slackMessage = { ...baseMessage, channel: 'slack' as NotificationChannel };
      
      mockSlackRepo.send.mockResolvedValueOnce({
        success: true,
        messageId: 'slack_123',
      });

      const result = await multiChannelService.send(slackMessage);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('slack_123');
      expect(mockSlackRepo.send).toHaveBeenCalledWith(slackMessage);
    });

    it('should send SMS notification successfully', async () => {
      const smsMessage = { 
        ...baseMessage, 
        channel: 'sms' as NotificationChannel,
        recipient: { phone: '+1234567890', name: 'John Smith' }
      };
      
      mockSmsRepo.send.mockResolvedValueOnce({
        success: true,
        messageId: 'sms_123',
      });

      const result = await multiChannelService.send(smsMessage);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('sms_123');
      expect(mockSmsRepo.send).toHaveBeenCalledWith(smsMessage);
    });

    it('should handle unsupported channel', async () => {
      const unsupportedMessage = { 
        ...baseMessage, 
        channel: 'carrier_pigeon' as NotificationChannel 
      };

      const result = await multiChannelService.send(unsupportedMessage);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CHANNEL_NOT_SUPPORTED');
      expect(result.error?.retryable).toBe(false);
    });

    it('should handle repository send failures', async () => {
      mockEmailRepo.send.mockRejectedValueOnce(new Error('Email service down'));

      const result = await multiChannelService.send(baseMessage);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SEND_FAILED');
      expect(result.error?.retryable).toBe(true);
    });
  });

  describe('multi-channel notifications', () => {
    let baseMessage: Omit<NotificationMessage, 'channel'>;

    beforeEach(() => {
      baseMessage = {
        id: 'msg_multi_123',
        templateType: 'shoot-update',
        priority: 'high',
        recipient: {
          email: 'client@example.com',
          phone: '+1234567890',
          slackUserId: 'U123456',
          name: 'John Smith',
        },
        content: {
          subject: 'Project Update',
          message: 'Your photos have been updated!',
        },
        variables: {
          clientName: 'John Smith',
          updateMessage: 'New photos added',
        },
        delivery: {
          status: 'queued',
          attempts: 0,
          maxAttempts: 3,
        },
        metadata: {
          shootId: 'shoot_123',
          sourceEvent: 'shoot.updated',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });

    it('should send to multiple channels successfully', async () => {
      mockEmailRepo.send.mockResolvedValueOnce({ success: true, messageId: 'email_123' });
      mockSlackRepo.send.mockResolvedValueOnce({ success: true, messageId: 'slack_123' });
      mockSmsRepo.send.mockResolvedValueOnce({ success: true, messageId: 'sms_123' });

      const channels: NotificationChannel[] = ['email', 'slack', 'sms'];
      const results = await multiChannelService.sendMultiChannel(baseMessage, channels);

      expect(results.size).toBe(3);
      expect(results.get('email')?.success).toBe(true);
      expect(results.get('slack')?.success).toBe(true);
      expect(results.get('sms')?.success).toBe(true);
    });

    it('should handle partial failures in multi-channel send', async () => {
      mockEmailRepo.send.mockResolvedValueOnce({ success: true, messageId: 'email_123' });
      mockSlackRepo.send.mockRejectedValueOnce(new Error('Slack API down'));
      mockSmsRepo.send.mockResolvedValueOnce({ success: true, messageId: 'sms_123' });

      const channels: NotificationChannel[] = ['email', 'slack', 'sms'];
      const results = await multiChannelService.sendMultiChannel(baseMessage, channels);

      expect(results.size).toBe(3);
      expect(results.get('email')?.success).toBe(true);
      expect(results.get('slack')?.success).toBe(false);
      expect(results.get('sms')?.success).toBe(true);
    });

    it('should create unique message IDs for each channel', async () => {
      mockEmailRepo.send.mockImplementation(async (msg) => {
        expect(msg.id).toBe('msg_multi_123_email');
        return { success: true, messageId: 'email_123' };
      });

      mockSlackRepo.send.mockImplementation(async (msg) => {
        expect(msg.id).toBe('msg_multi_123_slack');
        return { success: true, messageId: 'slack_123' };
      });

      const channels: NotificationChannel[] = ['email', 'slack'];
      await multiChannelService.sendMultiChannel(baseMessage, channels);

      expect(mockEmailRepo.send).toHaveBeenCalledTimes(1);
      expect(mockSlackRepo.send).toHaveBeenCalledTimes(1);
    });

    it('should handle empty channel array', async () => {
      const results = await multiChannelService.sendMultiChannel(baseMessage, []);

      expect(results.size).toBe(0);
    });

    it('should send to channels in parallel', async () => {
      let emailStartTime: number;
      let slackStartTime: number;
      const delay = 100;

      mockEmailRepo.send.mockImplementation(async () => {
        emailStartTime = Date.now();
        await new Promise(resolve => setTimeout(resolve, delay));
        return { success: true, messageId: 'email_123' };
      });

      mockSlackRepo.send.mockImplementation(async () => {
        slackStartTime = Date.now();
        await new Promise(resolve => setTimeout(resolve, delay));
        return { success: true, messageId: 'slack_123' };
      });

      const startTime = Date.now();
      await multiChannelService.sendMultiChannel(baseMessage, ['email', 'slack']);
      const endTime = Date.now();

      // Should take roughly the delay time, not 2x delay (parallel execution)
      expect(endTime - startTime).toBeLessThan(delay * 1.5);
      expect(Math.abs(emailStartTime! - slackStartTime!)).toBeLessThan(50); // Started nearly simultaneously
    });
  });

  describe('delivery status tracking', () => {
    it('should get delivery status from correct repository', async () => {
      mockEmailRepo.getDeliveryStatus.mockResolvedValueOnce('delivered');
      
      const status = await multiChannelService.getDeliveryStatus('email', 'msg_123');
      
      expect(status).toBe('delivered');
      expect(mockEmailRepo.getDeliveryStatus).toHaveBeenCalledWith('msg_123');
    });

    it('should throw error for unsupported channel in status check', async () => {
      await expect(
        multiChannelService.getDeliveryStatus('unsupported' as NotificationChannel, 'msg_123')
      ).rejects.toThrow('Notification channel unsupported is not supported');
    });

    it('should handle status check failures gracefully', async () => {
      mockSlackRepo.getDeliveryStatus.mockRejectedValueOnce(new Error('Status check failed'));
      
      await expect(
        multiChannelService.getDeliveryStatus('slack', 'msg_123')
      ).rejects.toThrow('Status check failed');
    });
  });

  describe('health checks', () => {
    it('should perform health check on all repositories', async () => {
      mockEmailRepo.getDeliveryStatus.mockResolvedValueOnce('failed');
      mockSlackRepo.getDeliveryStatus.mockResolvedValueOnce('failed');
      mockSmsRepo.getDeliveryStatus.mockRejectedValueOnce(new Error('Service down'));

      const health = await multiChannelService.healthCheck();

      expect(health.size).toBe(3);
      expect(health.get('email')).toBe(true);
      expect(health.get('slack')).toBe(true);
      expect(health.get('sms')).toBe(false);
    });

    it('should log health check failures', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      mockEmailRepo.getDeliveryStatus.mockRejectedValueOnce(new Error('Connection failed'));
      
      await multiChannelService.healthCheck();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Health check failed for email:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle all repositories failing health check', async () => {
      mockEmailRepo.getDeliveryStatus.mockRejectedValueOnce(new Error('Email down'));
      mockSlackRepo.getDeliveryStatus.mockRejectedValueOnce(new Error('Slack down'));
      mockSmsRepo.getDeliveryStatus.mockRejectedValueOnce(new Error('SMS down'));

      const health = await multiChannelService.healthCheck();

      expect(health.size).toBe(3);
      expect(Array.from(health.values()).every(status => !status)).toBe(true);
    });
  });

  describe('priority handling', () => {
    it('should preserve message priority across channels', async () => {
      const urgentMessage: NotificationMessage = {
        id: 'urgent_msg',
        channel: 'email',
        templateType: 'reminder',
        priority: 'urgent',
        recipient: { email: 'client@example.com' },
        content: { message: 'Urgent notification' },
        variables: {},
        delivery: { status: 'queued', attempts: 0, maxAttempts: 3 },
        metadata: { sourceEvent: 'magic.link.expiring' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockEmailRepo.send.mockImplementation(async (msg) => {
        expect(msg.priority).toBe('urgent');
        return { success: true, messageId: 'email_urgent' };
      });

      await multiChannelService.send(urgentMessage);

      expect(mockEmailRepo.send).toHaveBeenCalledWith(
        expect.objectContaining({ priority: 'urgent' })
      );
    });

    it('should handle different priority levels', async () => {
      const priorities: Array<NotificationMessage['priority']> = ['low', 'normal', 'high', 'urgent'];

      for (const priority of priorities) {
        const message: NotificationMessage = {
          id: `msg_${priority}`,
          channel: 'email',
          templateType: 'magic-link',
          priority,
          recipient: { email: 'client@example.com' },
          content: { message: 'Test message' },
          variables: {},
          delivery: { status: 'queued', attempts: 0, maxAttempts: 3 },
          metadata: { sourceEvent: 'test' },
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockEmailRepo.send.mockResolvedValueOnce({ success: true });
        
        await multiChannelService.send(message);
        
        expect(mockEmailRepo.send).toHaveBeenLastCalledWith(
          expect.objectContaining({ priority })
        );
      }
    });
  });

  describe('error scenarios', () => {
    it('should handle repository initialization failures', () => {
      expect(() => {
        multiChannelService.registerRepository('email', null as any);
      }).not.toThrow(); // Should handle gracefully
    });

    it('should handle malformed messages', async () => {
      const malformedMessage = {
        id: 'malformed',
        // Missing required fields
      } as NotificationMessage;

      mockEmailRepo.send.mockRejectedValueOnce(new Error('Invalid message format'));

      const result = await multiChannelService.send(malformedMessage);

      expect(result.success).toBe(false);
      expect(result.error?.retryable).toBe(true);
    });

    it('should handle concurrent multi-channel failures', async () => {
      mockEmailRepo.send.mockRejectedValueOnce(new Error('Email failed'));
      mockSlackRepo.send.mockRejectedValueOnce(new Error('Slack failed'));
      mockSmsRepo.send.mockRejectedValueOnce(new Error('SMS failed'));

      const baseMessage: Omit<NotificationMessage, 'channel'> = {
        id: 'multi_fail',
        templateType: 'magic-link',
        priority: 'normal',
        recipient: { email: 'test@example.com' },
        content: { message: 'test' },
        variables: {},
        delivery: { status: 'queued', attempts: 0, maxAttempts: 3 },
        metadata: { sourceEvent: 'test' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const results = await multiChannelService.sendMultiChannel(
        baseMessage, 
        ['email', 'slack', 'sms']
      );

      expect(results.size).toBe(3);
      expect(Array.from(results.values()).every(r => !r.success)).toBe(true);
    });
  });

  describe('message metadata preservation', () => {
    it('should preserve metadata across multi-channel sends', async () => {
      const baseMessage: Omit<NotificationMessage, 'channel'> = {
        id: 'metadata_test',
        templateType: 'magic-link',
        priority: 'normal',
        recipient: { email: 'test@example.com' },
        content: { message: 'test' },
        variables: { testVar: 'testValue' },
        delivery: { status: 'queued', attempts: 0, maxAttempts: 3 },
        metadata: {
          shootId: 'shoot_metadata_123',
          correlationId: 'corr_metadata_456',
          sourceEvent: 'invitation.created',
          userId: 'user_789',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockEmailRepo.send.mockImplementation(async (msg) => {
        expect(msg.metadata).toEqual(baseMessage.metadata);
        expect(msg.variables).toEqual(baseMessage.variables);
        return { success: true };
      });

      mockSlackRepo.send.mockImplementation(async (msg) => {
        expect(msg.metadata).toEqual(baseMessage.metadata);
        expect(msg.variables).toEqual(baseMessage.variables);
        return { success: true };
      });

      await multiChannelService.sendMultiChannel(baseMessage, ['email', 'slack']);

      expect(mockEmailRepo.send).toHaveBeenCalledTimes(1);
      expect(mockSlackRepo.send).toHaveBeenCalledTimes(1);
    });
  });
});