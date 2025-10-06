import payload from 'payload';
import { NotificationTemplate, TemplateType, NotificationChannel } from '../shared/contracts/notifications.types.js';

export interface PayloadTemplate {
  id: string;
  name: string;
  type: TemplateType;
  channel: NotificationChannel;
  language: string;
  isActive: boolean;
  priority: number;
  templates: {
    subject?: string;
    text: string;
    html?: string;
  };
  variables: {
    name: string;
    description: string;
    type: string;
    required: boolean;
    defaultValue?: string;
  }[];
  settings: {
    fromName?: string;
    fromEmail?: string;
    replyTo?: string;
    trackOpens?: boolean;
    trackClicks?: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PayloadChannelConfig {
  id: string;
  name: string;
  channel: NotificationChannel;
  isEnabled: boolean;
  priority: number;
  configuration: Record<string, unknown>;
  rateLimits: {
    enabled: boolean;
    maxPerMinute: number;
    maxPerHour: number;
    maxPerDay: number;
  };
  retryPolicy: {
    maxAttempts: number;
    initialDelay: number;
    backoffMultiplier: number;
    maxDelay: number;
  };
  webhooks: {
    enabled: boolean;
    endpoint?: string;
    secret?: string;
  };
}

/**
 * Payload CMS client for managing notification templates and configurations
 */
export class PayloadClient {
  private initialized = false;


  /**
   * Initialize Payload CMS connection
   */
  async initialize(): Promise<void> {
    if (this.initialized) {return;}

    try {
      // Initialize Payload without Express (for API access only)
      await payload.init({
        secret: process.env.PAYLOAD_SECRET ?? 'your-secret-here',
        local: true, // Use local API instead of HTTP requests
      });
      
      this.initialized = true;
      console.log('✅ Payload CMS client initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Payload CMS client:', error);
      throw error;
    }
  }

  /**
   * Get notification template by type and channel
   */
  async getTemplate(
    type: TemplateType, 
    channel: NotificationChannel,
    language = 'en'
  ): Promise<NotificationTemplate | null> {
    await this.initialize();

    try {
      const result = await payload.find({
        collection: 'notification-templates',
        where: {
          and: [
            { type: { equals: type } },
            { channel: { equals: channel } },
            { language: { equals: language } },
            { isActive: { equals: true } },
          ],
        },
        sort: '-priority', // Get highest priority first
        limit: 1,
      });

      if (result.docs.length === 0) {
        return null;
      }

      const doc = result.docs[0] as PayloadTemplate;
      return this.convertToNotificationTemplate(doc);
    } catch (error) {
      console.error(`Failed to get template ${type}/${channel}:`, error);
      return null;
    }
  }

  /**
   * Get all active templates for a specific channel
   */
  async getTemplatesByChannel(channel: NotificationChannel): Promise<NotificationTemplate[]> {
    await this.initialize();

    try {
      const result = await payload.find({
        collection: 'notification-templates',
        where: {
          and: [
            { channel: { equals: channel } },
            { isActive: { equals: true } },
          ],
        },
        sort: '-priority',
        limit: 100,
      });

      return result.docs.map(doc => this.convertToNotificationTemplate(doc as PayloadTemplate));
    } catch (error) {
      console.error(`Failed to get templates for channel ${channel}:`, error);
      return [];
    }
  }

  /**
   * Get channel configuration
   */
  async getChannelConfig(channel: NotificationChannel): Promise<PayloadChannelConfig | null> {
    await this.initialize();

    try {
      const result = await payload.find({
        collection: 'notification-channels',
        where: {
          and: [
            { channel: { equals: channel } },
            { isEnabled: { equals: true } },
          ],
        },
        limit: 1,
      });

      if (result.docs.length === 0) {
        return null;
      }

      return result.docs[0] as PayloadChannelConfig;
    } catch (error) {
      console.error(`Failed to get channel config for ${channel}:`, error);
      return null;
    }
  }

  /**
   * Get all template variables for reference
   */
  async getTemplateVariables(): Promise<{
    name: string;
    displayName: string;
    description: string;
    type: string;
    category: string;
    required: boolean;
    defaultValue?: string;
  }[]> {
    await this.initialize();

    try {
      const result = await payload.find({
        collection: 'template-variables',
        where: {
          isDeprecated: { not_equals: true },
        },
        sort: 'category,name',
        limit: 1000,
      });

      return result.docs.map(doc => ({
        name: doc.name,
        displayName: doc.displayName,
        description: doc.description,
        type: doc.type,
        category: doc.category,
        required: doc.required,
        defaultValue: doc.defaultValue,
      }));
    } catch (error) {
      console.error('Failed to get template variables:', error);
      return [];
    }
  }

  /**
   * Create or update a template (for programmatic template management)
   */
  async upsertTemplate(templateData: Partial<PayloadTemplate>): Promise<NotificationTemplate | null> {
    await this.initialize();

    try {
      // Check if template already exists
      const existing = await payload.find({
        collection: 'notification-templates',
        where: {
          and: [
            { type: { equals: templateData.type } },
            { channel: { equals: templateData.channel } },
            { language: { equals: templateData.language ?? 'en' } },
          ],
        },
        limit: 1,
      });

      let result;
      if (existing.docs.length > 0) {
        // Update existing template
        result = await payload.update({
          collection: 'notification-templates',
          id: existing.docs[0].id,
          data: templateData,
        });
      } else {
        // Create new template
        result = await payload.create({
          collection: 'notification-templates',
          data: {
            ...templateData,
            isActive: templateData.isActive ?? true,
            priority: templateData.priority ?? 0,
            language: templateData.language ?? 'en',
          },
        });
      }

      return this.convertToNotificationTemplate(result as PayloadTemplate);
    } catch (error) {
      console.error('Failed to upsert template:', error);
      return null;
    }
  }

  /**
   * Convert Payload template document to NotificationTemplate
   */
  private convertToNotificationTemplate(doc: PayloadTemplate): NotificationTemplate {
    return {
      id: doc.id,
      name: doc.name,
      type: doc.type,
      channel: doc.channel,
      templates: {
        subject: doc.templates.subject,
        text: doc.templates.text,
        html: doc.templates.html,
      },
      variables: doc.variables.map(v => ({
        name: v.name,
        description: v.description,
        type: v.type,
        required: v.required,
        defaultValue: v.defaultValue,
      })),
      settings: doc.settings || {},
      isActive: doc.isActive,
      language: doc.language,
      createdAt: new Date(doc.createdAt),
      updatedAt: new Date(doc.updatedAt),
    };
  }

  /**
   * Health check - verify Payload connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.initialize();
      
      // Try to query templates collection
      await payload.find({
        collection: 'notification-templates',
        limit: 1,
      });
      
      return true;
    } catch (error) {
      console.error('Payload health check failed:', error);
      return false;
    }
  }

  /**
   * Get cache statistics (for monitoring)
   */
  getCacheStats(): { initialized: boolean; collections: string[] } {
    return {
      initialized: this.initialized,
      collections: ['notification-templates', 'template-variables', 'notification-channels'],
    };
  }
}