/**
 * Notification Repository Interface
 * Abstraction layer for different notification channels
 */

import {
  NotificationMessage,
  NotificationRepository,
  SendResult,
  DeliveryStatus,
  NotificationChannel
} from '../../shared/contracts/notifications.types.js';

// Abstract base class for notification repositories
export abstract class BaseNotificationRepository implements NotificationRepository {
  protected channel: NotificationChannel;

  constructor(channel: NotificationChannel) {
    this.channel = channel;
  }

  abstract send(message: NotificationMessage): Promise<SendResult>;
  abstract getDeliveryStatus(messageId: string): Promise<DeliveryStatus>;
  abstract updateDeliveryStatus(messageId: string, status: DeliveryStatus, details?: any): Promise<void>;

  // Common validation logic
  protected validateMessage(message: NotificationMessage): void {
    if (message.channel !== this.channel) {
      throw new Error(`Message channel ${message.channel} doesn't match repository channel ${this.channel}`);
    }

    // Validate recipient based on channel
    switch (this.channel) {
      case 'email':
        if (!message.recipient.email) {
          throw new Error('Email address is required for email notifications');
        }
        break;
      case 'sms':
      case 'whatsapp':
        if (!message.recipient.phone) {
          throw new Error('Phone number is required for SMS/WhatsApp notifications');
        }
        break;
      case 'slack':
        if (!message.recipient.slackUserId && !message.recipient.email) {
          throw new Error('Slack user ID or email is required for Slack notifications');
        }
        break;
    }
  }

  // Common error handling
  protected handleProviderError(error: any): SendResult {
    console.error(`${this.channel} provider error:`, error);
    
    return {
      success: false,
      error: {
        code: error.code || 'PROVIDER_ERROR',
        message: error.message || `Failed to send ${this.channel} notification`,
        retryable: this.isRetryableError(error),
      }
    };
  }

  // Determine if an error is retryable
  protected isRetryableError(error: any): boolean {
    // Common retryable HTTP status codes
    const retryableStatuses = [429, 500, 502, 503, 504];
    
    if (error.status && retryableStatuses.includes(error.status)) {
      return true;
    }
    
    // Network/connection errors are usually retryable
    if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      return true;
    }
    
    return false;
  }

  // Format variables for template rendering
  protected formatVariables(variables: Record<string, any>): Record<string, any> {
    const formatted: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(variables)) {
      if (value instanceof Date) {
        formatted[key] = value.toLocaleDateString();
        formatted[`${key}_time`] = value.toLocaleString();
      } else if (typeof value === 'number') {
        formatted[key] = value.toString();
        formatted[`${key}_formatted`] = value.toLocaleString();
      } else {
        formatted[key] = value;
      }
    }
    
    return formatted;
  }

  getChannel(): NotificationChannel {
    return this.channel;
  }
}

// Repository factory interface
export interface NotificationRepositoryFactory {
  getRepository(channel: NotificationChannel): NotificationRepository;
  getSupportedChannels(): NotificationChannel[];
}

// Multi-channel notification service
export class MultiChannelNotificationService {
  private repositories: Map<NotificationChannel, NotificationRepository> = new Map();

  constructor(private factory: NotificationRepositoryFactory) {}

  // Register a repository for a specific channel
  registerRepository(channel: NotificationChannel, repository: NotificationRepository): void {
    this.repositories.set(channel, repository);
    console.log(`📡 Registered ${channel} notification repository`);
  }

  // Send notification via specific channel
  async send(message: NotificationMessage): Promise<SendResult> {
    const repository = this.repositories.get(message.channel);
    
    if (!repository) {
      return {
        success: false,
        error: {
          code: 'CHANNEL_NOT_SUPPORTED',
          message: `Notification channel ${message.channel} is not supported`,
          retryable: false,
        }
      };
    }

    try {
      return await repository.send(message);
    } catch (error) {
      console.error(`Failed to send ${message.channel} notification:`, error);
      return {
        success: false,
        error: {
          code: 'SEND_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          retryable: true,
        }
      };
    }
  }

  // Send notification to multiple channels
  async sendMultiChannel(
    baseMessage: Omit<NotificationMessage, 'channel'>,
    channels: NotificationChannel[]
  ): Promise<Map<NotificationChannel, SendResult>> {
    const results = new Map<NotificationChannel, SendResult>();
    
    // Send to all channels in parallel
    const promises = channels.map(async (channel) => {
      const message: NotificationMessage = {
        ...baseMessage,
        channel,
        id: `${baseMessage.id}_${channel}`,
      };
      
      const result = await this.send(message);
      results.set(channel, result);
      return { channel, result };
    });

    await Promise.allSettled(promises);
    return results;
  }

  // Get delivery status from specific channel
  async getDeliveryStatus(channel: NotificationChannel, messageId: string): Promise<DeliveryStatus> {
    const repository = this.repositories.get(channel);
    
    if (!repository) {
      throw new Error(`Notification channel ${channel} is not supported`);
    }

    return await repository.getDeliveryStatus(messageId);
  }

  // Get supported channels
  getSupportedChannels(): NotificationChannel[] {
    return Array.from(this.repositories.keys());
  }

  // Health check for all repositories
  async healthCheck(): Promise<Map<NotificationChannel, boolean>> {
    const health = new Map<NotificationChannel, boolean>();
    
    for (const [channel, repository] of this.repositories) {
      try {
        // Try to get status for a non-existent message to test connectivity
        await repository.getDeliveryStatus('health-check');
        health.set(channel, true);
      } catch (error) {
        console.warn(`Health check failed for ${channel}:`, error);
        health.set(channel, false);
      }
    }
    
    return health;
  }
}