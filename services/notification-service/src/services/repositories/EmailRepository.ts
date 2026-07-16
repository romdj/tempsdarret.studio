/**
 * Resend.dev Email Repository Implementation
 * Handles email notifications using Resend service
 */

import { Resend, type CreateEmailOptions } from 'resend';
import {
  NotificationMessage,
  SendResult,
  DeliveryStatus,
  Attachment
} from '../../shared/contracts/notifications.types.js';
import { BaseNotificationRepository } from './NotificationRepository.js';

export interface ResendConfig {
  apiKey: string;
  defaultFromEmail: string;
  defaultFromName: string;
}

export class EmailRepository extends BaseNotificationRepository {
  private readonly resend: Resend;
  private readonly config: ResendConfig;

  constructor(config: ResendConfig) {
    super('email');
    this.config = config;
    this.resend = new Resend(config.apiKey);
    
    console.log('📧 Email repository initialized with Resend.dev');
  }

  async send(message: NotificationMessage): Promise<SendResult> {
    this.validateMessage(message);

    if (!message.recipient.email) {
      return {
        success: false,
        error: {
          code: 'MISSING_EMAIL',
          message: 'Recipient email address is required',
          retryable: false,
        }
      };
    }

    try {
      const emailData = this.prepareEmailData(message);
      
      console.log(`📧 Sending email to ${message.recipient.email} (${message.templateType})`);
      
      const result = await this.resend.emails.send(emailData);
      
      if (result.error) {
        return this.handleProviderError(result.error);
      }

      return {
        success: true,
        messageId: result.data?.id,
      };

    } catch (error) {
      return this.handleProviderError(error);
    }
  }

  async getDeliveryStatus(messageId: string): Promise<DeliveryStatus> {
    try {
      // Note: Resend doesn't provide a direct status endpoint in their current API
      // This would typically be implemented via webhooks
      // For now, we'll return a basic status
      
      const email = await this.resend.emails.get(messageId);
      
      if (email.error) {
        console.warn(`Failed to get email status for ${messageId}:`, email.error);
        return 'failed';
      }

      // Map Resend status to our internal status
      // This is a simplified mapping - Resend's actual status values may differ
      switch (email.data?.last_event) {
        case 'delivered':
          return 'delivered';
        case 'bounced':
          return 'bounced';
        default:
          return 'sent'; // Default to sent if we got a response
      }

    } catch (error) {
      console.error(`Error getting delivery status for ${messageId}:`, error);
      return 'failed';
    }
  }

  async updateDeliveryStatus(messageId: string, status: DeliveryStatus, details?: unknown): Promise<void> {
    // This would typically be called from webhook handlers
    // For now, we'll just log the status update
    console.log(`📧 Email ${messageId} status updated to: ${status}`, details);
    
    // In a production system, you'd update your database here
    // await this.updateMessageStatus(messageId, status, details);
  }

  private prepareEmailData(message: NotificationMessage): CreateEmailOptions {
    const recipientEmail = message.recipient.email;
    if (!recipientEmail) {
      throw new Error('Recipient email is required');
    }

    // Send from the app's verified sender; the photographer (if known) is the
    // reply-to so clients can respond to them directly.
    const fromName = (message.variables.photographerName as string | undefined) ?? this.config.defaultFromName;
    const photographerEmail = message.variables.photographerEmail as string | undefined;

    const tags: { name: string; value: string }[] = [
      { name: 'template', value: message.templateType },
      { name: 'priority', value: message.priority },
    ];
    if (message.metadata.shootId) {
      tags.push({ name: 'shoot', value: message.metadata.shootId });
    }

    return {
      from: `${fromName} <${this.config.defaultFromEmail}>`,
      to: [recipientEmail],
      subject: message.content.subject ?? this.getDefaultSubject(message.templateType),
      html: message.content.html,
      text: message.content.message,
      headers: {
        'X-Notification-ID': message.id,
        'X-Template-Type': message.templateType,
        'X-Shoot-ID': message.metadata.shootId ?? '',
        'X-Correlation-ID': message.metadata.correlationId ?? '',
      },
      tags,
      ...(photographerEmail ? { reply_to: photographerEmail } : {}),
      ...(message.content.attachments?.length
        ? { attachments: message.content.attachments.map(this.convertAttachment) }
        : {}),
    };
  }

  private convertAttachment(attachment: Attachment): { filename: string; content: string | Buffer; content_type: string } {
    return {
      filename: attachment.filename,
      content: attachment.content,
      content_type: attachment.contentType,
    };
  }

  private getDefaultSubject(templateType: string): string {
    const subjects = {
      'magic-link': '🔗 Access Your Photo Gallery',
      'photos-ready': '📸 Your Photos Are Ready!',
      'shoot-update': '📝 Project Update',
      'reminder': '⏰ Gallery Access Reminder',
      'welcome': '👋 Welcome to Your Gallery',
    };

    return subjects[templateType as keyof typeof subjects] || 'Notification';
  }

  // Webhook handler for Resend delivery events
  async handleWebhook(event: { type: string; data?: { email_id?: string } }): Promise<void> {
    const { type, data } = event;
    
    if (!data?.email_id) {
      console.warn('Received webhook event without email_id');
      return;
    }

    let status: DeliveryStatus;
    
    switch (type) {
      case 'email.sent':
        status = 'sent';
        break;
      case 'email.delivered':
        status = 'delivered';
        break;
      case 'email.bounced':
        status = 'bounced';
        break;
      case 'email.complaint':
        status = 'failed';
        break;
      default:
        console.log(`Unhandled webhook event type: ${type}`);
        return;
    }

    await this.updateDeliveryStatus(data.email_id, status, data);
    
    // Publish delivery status event to Kafka
    // This would be handled by an EventPublisher service
    console.log(`📧 Email delivery event: ${data.email_id} -> ${status}`);
  }

  // Validate email configuration
  async validateConfiguration(): Promise<boolean> {
    try {
      // Test API key by attempting to list domains
      const domains = await this.resend.domains.list();
      
      if (domains.error) {
        console.error('Resend API key validation failed:', domains.error);
        return false;
      }

      console.log('📧 Resend configuration validated successfully');
      return true;

    } catch (error) {
      console.error('Failed to validate Resend configuration:', error);
      return false;
    }
  }

  // Get email statistics
  async getStats(): Promise<Record<string, unknown>> {
    try {
      // Note: This would require additional Resend API endpoints for analytics
      // For now, return basic info
      return {
        provider: 'resend',
        configured: true,
        defaultFrom: this.config.defaultFromEmail,
      };
    } catch (error) {
      console.error('Failed to get email stats:', error);
      return {
        provider: 'resend',
        configured: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}