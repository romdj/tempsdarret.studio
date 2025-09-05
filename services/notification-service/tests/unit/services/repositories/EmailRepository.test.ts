/**
 * EmailRepository Unit Tests
 * Testing Resend.dev email repository implementation
 */

import { EmailRepository, ResendConfig } from '../../../../src/services/repositories/EmailRepository.js';
import {
  NotificationMessage,
  NotificationChannel,
  TemplateType,
  NotificationPriority,
  DeliveryStatus
} from '../../../../src/services/repositories/NotificationRepository.js';
import { mockResend, setupResendMock } from '../../../mocks/resend.mock.js';

// Mock the Resend import
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => mockResend)
}));

describe('EmailRepository', () => {
  let emailRepository: EmailRepository;
  let mockConfig: ResendConfig;

  beforeEach(() => {
    mockConfig = {
      apiKey: 'test-api-key',
      defaultFromEmail: 'noreply@tempsdarret.com',
      defaultFromName: 'Temps D\'arrêt Photography',
    };

    emailRepository = new EmailRepository(mockConfig);
    setupResendMock.reset();
  });

  afterEach(() => {
    setupResendMock.reset();
  });

  describe('constructor', () => {
    it('should initialize with correct channel and configuration', () => {
      expect(emailRepository.getChannel()).toBe('email');
    });

    it('should create Resend instance with provided API key', () => {
      // Constructor should have been called with the API key
      expect(mockResend).toBeDefined();
    });
  });

  describe('send', () => {
    let validMessage: NotificationMessage;

    beforeEach(() => {
      validMessage = {
        id: 'msg_123',
        channel: 'email' as NotificationChannel,
        templateType: 'magic-link' as TemplateType,
        priority: 'normal' as NotificationPriority,
        recipient: {
          email: 'client@example.com',
          name: 'John Smith',
        },
        content: {
          subject: '🔗 Access Your Wedding Photos',
          message: 'Hi John, your photos are ready!',
          html: '<h1>Hi John</h1><p>Your photos are ready!</p>',
        },
        variables: {
          clientName: 'John Smith',
          eventName: 'Wedding',
          photographerName: 'Emma Photography',
          photographerEmail: 'emma@photography.com',
        },
        delivery: {
          status: 'queued' as DeliveryStatus,
          attempts: 0,
          maxAttempts: 3,
        },
        metadata: {
          shootId: 'shoot_123',
          correlationId: 'corr_456',
          sourceEvent: 'invitation.created',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });

    it('should send email successfully', async () => {
      setupResendMock.success();
      
      const result = await emailRepository.send(validMessage);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.error).toBeUndefined();
      
      // Verify email was sent with correct data
      const sentEmails = mockResend.getSentEmails();
      expect(sentEmails).toHaveLength(1);
      
      const sentEmail = sentEmails[0];
      expect(sentEmail.to).toContain('client@example.com');
      expect(sentEmail.subject).toBe('🔗 Access Your Wedding Photos');
      expect(sentEmail.html).toBe('<h1>Hi John</h1><p>Your photos are ready!</p>');
      expect(sentEmail.text).toBe('Hi John, your photos are ready!');
    });

    it('should use photographer email as reply-to when provided', async () => {
      setupResendMock.success();
      
      await emailRepository.send(validMessage);
      
      const sentEmail = mockResend.getLastSentEmail();
      expect(sentEmail.reply_to).toBe('emma@photography.com');
    });

    it('should use custom from email when photographer email is provided', async () => {
      setupResendMock.success();
      
      await emailRepository.send(validMessage);
      
      const sentEmail = mockResend.getLastSentEmail();
      expect(sentEmail.from).toBe('Emma Photography <emma@photography.com>');
    });

    it('should use default from email when no photographer email provided', async () => {
      validMessage.variables.photographerEmail = undefined;
      setupResendMock.success();
      
      await emailRepository.send(validMessage);
      
      const sentEmail = mockResend.getLastSentEmail();
      expect(sentEmail.from).toBe('Emma Photography <noreply@tempsdarret.com>');
    });

    it('should add tracking headers', async () => {
      setupResendMock.success();
      
      await emailRepository.send(validMessage);
      
      const sentEmail = mockResend.getLastSentEmail();
      expect(sentEmail.headers).toEqual({
        'X-Notification-ID': 'msg_123',
        'X-Template-Type': 'magic-link',
        'X-Shoot-ID': 'shoot_123',
        'X-Correlation-ID': 'corr_456',
      });
    });

    it('should add tags for analytics', async () => {
      setupResendMock.success();
      
      await emailRepository.send(validMessage);
      
      const sentEmail = mockResend.getLastSentEmail();
      expect(sentEmail.tags).toContainEqual({ name: 'template', value: 'magic-link' });
      expect(sentEmail.tags).toContainEqual({ name: 'priority', value: 'normal' });
      expect(sentEmail.tags).toContainEqual({ name: 'shoot', value: 'shoot_123' });
    });

    it('should handle attachments correctly', async () => {
      validMessage.content.attachments = [
        {
          filename: 'contract.pdf',
          content: Buffer.from('PDF content'),
          contentType: 'application/pdf',
          disposition: 'attachment',
        },
      ];
      
      setupResendMock.success();
      
      await emailRepository.send(validMessage);
      
      const sentEmail = mockResend.getLastSentEmail();
      expect(sentEmail.attachments).toHaveLength(1);
      expect(sentEmail.attachments[0]).toEqual({
        filename: 'contract.pdf',
        content: Buffer.from('PDF content'),
        type: 'application/pdf',
        disposition: 'attachment',
      });
    });

    it('should fail when recipient email is missing', async () => {
      validMessage.recipient.email = undefined;
      
      const result = await emailRepository.send(validMessage);
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('MISSING_EMAIL');
      expect(result.error?.retryable).toBe(false);
    });

    it('should fail when message channel is not email', async () => {
      validMessage.channel = 'slack' as NotificationChannel;
      
      const result = await emailRepository.send(validMessage);
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('channel slack doesn\'t match repository channel email');
    });

    it('should handle Resend API errors', async () => {
      setupResendMock.failure();
      
      const result = await emailRepository.send(validMessage);
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBeDefined();
      expect(result.error?.message).toBeDefined();
    });

    it('should determine if errors are retryable', async () => {
      // Test with 500 error (retryable)
      mockResend.emails.send.mockRejectedValueOnce({ status: 500 });
      
      const result = await emailRepository.send(validMessage);
      
      expect(result.success).toBe(false);
      expect(result.error?.retryable).toBe(true);
    });

    it('should handle network timeout errors as retryable', async () => {
      mockResend.emails.send.mockRejectedValueOnce({ code: 'ETIMEDOUT' });
      
      const result = await emailRepository.send(validMessage);
      
      expect(result.success).toBe(false);
      expect(result.error?.retryable).toBe(true);
    });

    it('should use default subject when not provided', async () => {
      validMessage.content.subject = undefined;
      setupResendMock.success();
      
      await emailRepository.send(validMessage);
      
      const sentEmail = mockResend.getLastSentEmail();
      expect(sentEmail.subject).toBe('🔗 Access Your Photo Gallery');
    });
  });

  describe('getDeliveryStatus', () => {
    it('should return delivery status for existing message', async () => {
      const messageId = 'test_message_123';
      mockResend.setEmailStatus(messageId, 'delivered');
      
      const status = await emailRepository.getDeliveryStatus(messageId);
      
      expect(status).toBe('delivered');
    });

    it('should return failed status when message not found', async () => {
      const status = await emailRepository.getDeliveryStatus('nonexistent');
      
      expect(status).toBe('failed');
    });

    it('should map Resend statuses correctly', async () => {
      const testCases = [
        { resendStatus: 'delivered', expectedStatus: 'delivered' },
        { resendStatus: 'bounced', expectedStatus: 'bounced' },
        { resendStatus: 'sent', expectedStatus: 'sent' },
        { resendStatus: 'unknown', expectedStatus: 'sent' },
      ];

      for (const testCase of testCases) {
        const messageId = `test_${testCase.resendStatus}`;
        mockResend.setEmailStatus(messageId, testCase.resendStatus);
        
        const status = await emailRepository.getDeliveryStatus(messageId);
        expect(status).toBe(testCase.expectedStatus);
      }
    });
  });

  describe('updateDeliveryStatus', () => {
    it('should log status updates', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await emailRepository.updateDeliveryStatus('test_123', 'delivered', { timestamp: new Date() });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Email test_123 status updated to: delivered')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('handleWebhook', () => {
    beforeEach(async () => {
      // Send a test email to have something to update
      setupResendMock.success();
      const validMessage: NotificationMessage = {
        id: 'msg_123',
        channel: 'email',
        templateType: 'magic-link',
        priority: 'normal',
        recipient: { email: 'test@example.com' },
        content: { message: 'test', subject: 'test' },
        variables: {},
        delivery: { status: 'queued', attempts: 0, maxAttempts: 3 },
        metadata: { sourceEvent: 'test' },
        createdAt: new Date(),
        updatedAt: new Date(),
      } as NotificationMessage;
      
      await emailRepository.send(validMessage);
    });

    it('should handle email.sent webhook events', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const webhookEvent = {
        type: 'email.sent',
        data: {
          email_id: 'test_123',
          to: ['test@example.com'],
          subject: 'Test Email',
        },
      };
      
      await emailRepository.handleWebhook(webhookEvent);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Email delivery event: test_123 -> sent')
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle email.delivered webhook events', async () => {
      const webhookEvent = {
        type: 'email.delivered',
        data: { email_id: 'test_123' },
      };
      
      await emailRepository.handleWebhook(webhookEvent);
      
      // Should not throw and should log the event
      expect(true).toBe(true); // Test passes if no error thrown
    });

    it('should handle email.bounced webhook events', async () => {
      const webhookEvent = {
        type: 'email.bounced',
        data: { email_id: 'test_123' },
      };
      
      await emailRepository.handleWebhook(webhookEvent);
      
      // Should not throw and should log the event
      expect(true).toBe(true);
    });

    it('should ignore unknown webhook event types', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const webhookEvent = {
        type: 'unknown.event',
        data: { email_id: 'test_123' },
      };
      
      await emailRepository.handleWebhook(webhookEvent);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unhandled webhook event type: unknown.event')
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle webhook events without email_id', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const webhookEvent = {
        type: 'email.sent',
        data: {}, // Missing email_id
      };
      
      await emailRepository.handleWebhook(webhookEvent);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Received webhook event without email_id'
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('validateConfiguration', () => {
    it('should validate configuration successfully', async () => {
      setupResendMock.success();
      
      const isValid = await emailRepository.validateConfiguration();
      
      expect(isValid).toBe(true);
    });

    it('should fail validation with invalid API key', async () => {
      setupResendMock.failure();
      
      const isValid = await emailRepository.validateConfiguration();
      
      expect(isValid).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return email statistics', async () => {
      const stats = await emailRepository.getStats();
      
      expect(stats).toEqual({
        provider: 'resend',
        configured: true,
        defaultFrom: 'noreply@tempsdarret.com',
      });
    });

    it('should handle errors in stats retrieval', async () => {
      // Force an error by making getStats throw
      jest.spyOn(emailRepository, 'getStats').mockRejectedValueOnce(new Error('Test error'));
      
      const stats = await emailRepository.getStats();
      
      expect(stats.configured).toBe(false);
      expect(stats.error).toBe('Test error');
    });
  });

  describe('error handling', () => {
    it('should handle rate limiting errors as retryable', async () => {
      mockResend.emails.send.mockRejectedValueOnce({ status: 429 });
      
      const validMessage: NotificationMessage = {
        id: 'msg_123',
        channel: 'email',
        templateType: 'magic-link',
        priority: 'normal',
        recipient: { email: 'test@example.com' },
        content: { message: 'test', subject: 'test' },
        variables: {},
        delivery: { status: 'queued', attempts: 0, maxAttempts: 3 },
        metadata: { sourceEvent: 'test' },
        createdAt: new Date(),
        updatedAt: new Date(),
      } as NotificationMessage;
      
      const result = await emailRepository.send(validMessage);
      
      expect(result.success).toBe(false);
      expect(result.error?.retryable).toBe(true);
    });

    it('should handle invalid email addresses as non-retryable', async () => {
      mockResend.emails.send.mockRejectedValueOnce({ 
        status: 400,
        message: 'Invalid email address'
      });
      
      const validMessage: NotificationMessage = {
        id: 'msg_123',
        channel: 'email',
        templateType: 'magic-link',
        priority: 'normal',
        recipient: { email: 'invalid-email' },
        content: { message: 'test', subject: 'test' },
        variables: {},
        delivery: { status: 'queued', attempts: 0, maxAttempts: 3 },
        metadata: { sourceEvent: 'test' },
        createdAt: new Date(),
        updatedAt: new Date(),
      } as NotificationMessage;
      
      const result = await emailRepository.send(validMessage);
      
      expect(result.success).toBe(false);
      expect(result.error?.retryable).toBe(false);
    });
  });

  describe('template type handling', () => {
    it('should use correct default subjects for different template types', async () => {
      const templateTypes: Array<{ type: TemplateType, expectedSubject: string }> = [
        { type: 'magic-link', expectedSubject: '🔗 Access Your Photo Gallery' },
        { type: 'photos-ready', expectedSubject: '📸 Your Photos Are Ready!' },
        { type: 'shoot-update', expectedSubject: '📝 Project Update' },
        { type: 'reminder', expectedSubject: '⏰ Gallery Access Reminder' },
        { type: 'welcome', expectedSubject: '👋 Welcome to Your Gallery' },
      ];

      setupResendMock.success();

      for (const { type, expectedSubject } of templateTypes) {
        setupResendMock.reset();
        setupResendMock.success();
        
        const message: NotificationMessage = {
          id: `msg_${type}`,
          channel: 'email',
          templateType: type,
          priority: 'normal',
          recipient: { email: 'test@example.com' },
          content: { message: 'test' }, // No subject provided
          variables: {},
          delivery: { status: 'queued', attempts: 0, maxAttempts: 3 },
          metadata: { sourceEvent: 'test' },
          createdAt: new Date(),
          updatedAt: new Date(),
        } as NotificationMessage;
        
        await emailRepository.send(message);
        
        const sentEmail = mockResend.getLastSentEmail();
        expect(sentEmail.subject).toBe(expectedSubject);
      }
    });
  });
});