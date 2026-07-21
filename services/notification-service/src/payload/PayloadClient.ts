import { NotificationTemplate, TemplateType, NotificationChannel } from '../shared/contracts/notifications.types.js';
import {
  payloadTemplateSchema,
  payloadChannelConfigSchema,
  payloadTemplateVariableSchema,
  type PayloadTemplate,
  type PayloadChannelConfig
} from './payload-schemas.js';

/**
 * Payload CMS client for managing notification templates and configurations.
 *
 * `payload` is imported lazily (dynamic import in initialize) so that merely
 * constructing this client does not pull in the heavy Payload/sharp dependency
 * tree. Callers fall back to built-in templates when the CMS is unavailable,
 * so the notification runtime works without Payload configured.
 */
export class PayloadClient {
  private initialized = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private payload: any = null;

  /**
   * Initialize Payload CMS connection (lazy dynamic import)
   */
  async initialize(): Promise<void> {
    if (this.initialized) {return;}

    try {
      const payloadModule = await import('payload');
      this.payload = payloadModule.default ?? payloadModule;

      // Initialize Payload without Express (for API access only)
      await this.payload.init({
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
      const result = await this.payload.find({
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

      const doc = payloadTemplateSchema.parse(result.docs[0]);
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
      const result = await this.payload.find({
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

      return result.docs.map((doc: unknown) => this.convertToNotificationTemplate(payloadTemplateSchema.parse(doc)));
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
      const result = await this.payload.find({
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

      return payloadChannelConfigSchema.parse(result.docs[0]);
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
      const result = await this.payload.find({
        collection: 'template-variables',
        where: {
          isDeprecated: { not_equals: true },
        },
        sort: 'category,name',
        limit: 1000,
      });

      return result.docs.map((doc: unknown) => payloadTemplateVariableSchema.parse(doc));
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
      const existing = await this.payload.find({
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
        result = await this.payload.update({
          collection: 'notification-templates',
          id: existing.docs[0].id,
          data: templateData,
        });
      } else {
        // Create new template
        result = await this.payload.create({
          collection: 'notification-templates',
          data: {
            ...templateData,
            isActive: templateData.isActive ?? true,
            priority: templateData.priority ?? 0,
            language: templateData.language ?? 'en',
          },
        });
      }

      return this.convertToNotificationTemplate(payloadTemplateSchema.parse(result));
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
      settings: doc.settings ? { email: doc.settings } : {},
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
      await this.payload.find({
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