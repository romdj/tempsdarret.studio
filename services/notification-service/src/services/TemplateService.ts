/**
 * Template Service
 * Manages notification templates with Payload CMS integration
 */

import Handlebars from 'handlebars';
import juice from 'juice';
import {
  NotificationTemplate,
  TemplateRepository,
  RenderedTemplate,
  NotificationChannel,
  TemplateType
} from '../shared/contracts/notifications.types.js';

export interface PayloadTemplate {
  id: string;
  name: string;
  type: TemplateType;
  channel: NotificationChannel;
  subject?: string;
  textContent: string;
  htmlContent?: string;
  variables: Array<{
    name: string;
    description: string;
    type: string;
    required: boolean;
    defaultValue?: any;
  }>;
  isActive: boolean;
  language: string;
  createdAt: string;
  updatedAt: string;
}

export class TemplateService implements TemplateRepository {
  private compiledTemplates: Map<string, {
    subject?: HandlebarsTemplateDelegate;
    text: HandlebarsTemplateDelegate;
    html?: HandlebarsTemplateDelegate;
  }> = new Map();

  constructor() {
    this.registerHandlebarsHelpers();
    console.log('📄 Template service initialized');
  }

  async getTemplate(type: TemplateType, channel: NotificationChannel): Promise<NotificationTemplate | null> {
    try {
      // TODO: Replace with actual Payload CMS API call
      // const response = await payload.find({
      //   collection: 'notification-templates',
      //   where: {
      //     type: { equals: type },
      //     channel: { equals: channel },
      //     isActive: { equals: true }
      //   }
      // });

      // For now, return mock templates
      const mockTemplate = this.getMockTemplate(type, channel);
      return mockTemplate;

    } catch (error) {
      console.error(`Failed to get template ${type}/${channel}:`, error);
      return null;
    }
  }

  async renderTemplate(template: NotificationTemplate, variables: Record<string, any>): Promise<RenderedTemplate> {
    const templateKey = `${template.type}_${template.channel}`;
    
    try {
      // Get or compile templates
      let compiled = this.compiledTemplates.get(templateKey);
      
      if (!compiled) {
        compiled = {
          text: Handlebars.compile(template.templates.text),
        };
        
        if (template.templates.subject) {
          compiled.subject = Handlebars.compile(template.templates.subject);
        }
        
        if (template.templates.html) {
          compiled.html = Handlebars.compile(template.templates.html);
        }
        
        this.compiledTemplates.set(templateKey, compiled);
      }

      // Prepare variables with defaults
      const templateVariables = this.prepareVariables(template, variables);
      
      // Render templates
      const rendered: RenderedTemplate = {
        text: compiled.text(templateVariables),
        variables: templateVariables,
      };

      if (compiled.subject) {
        rendered.subject = compiled.subject(templateVariables);
      }

      if (compiled.html) {
        const htmlContent = compiled.html(templateVariables);
        // Inline CSS for email compatibility
        rendered.html = juice(htmlContent);
      }

      return rendered;

    } catch (error) {
      console.error(`Failed to render template ${templateKey}:`, error);
      throw new Error(`Template rendering failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getAllTemplates(channel?: NotificationChannel): Promise<NotificationTemplate[]> {
    try {
      // TODO: Replace with actual Payload CMS API call
      // const response = await payload.find({
      //   collection: 'notification-templates',
      //   where: channel ? { channel: { equals: channel } } : undefined
      // });

      // For now, return mock templates
      const allTypes: TemplateType[] = ['magic-link', 'photos-ready', 'shoot-update', 'reminder', 'welcome'];
      const channels = channel ? [channel] : (['email', 'slack', 'sms'] as NotificationChannel[]);
      
      const templates: NotificationTemplate[] = [];
      
      for (const type of allTypes) {
        for (const ch of channels) {
          const template = this.getMockTemplate(type, ch);
          if (template) {
            templates.push(template);
          }
        }
      }

      return templates;

    } catch (error) {
      console.error('Failed to get all templates:', error);
      return [];
    }
  }

  private prepareVariables(template: NotificationTemplate, variables: Record<string, any>): Record<string, any> {
    const prepared: Record<string, any> = { ...variables };

    // Apply default values for missing variables
    for (const variable of template.variables) {
      if (!(variable.name in prepared) && variable.defaultValue !== undefined) {
        prepared[variable.name] = variable.defaultValue;
      }
    }

    // Add utility variables
    prepared.currentDate = new Date().toLocaleDateString();
    prepared.currentYear = new Date().getFullYear();
    prepared.currentTime = new Date().toLocaleTimeString();

    return prepared;
  }

  private registerHandlebarsHelpers(): void {
    // Date formatting helper
    Handlebars.registerHelper('formatDate', (date: string | Date) => {
      const d = typeof date === 'string' ? new Date(date) : date;
      return d.toLocaleDateString();
    });

    // Conditional helper
    Handlebars.registerHelper('ifEquals', function(arg1: any, arg2: any, options: any) {
      return (arg1 === arg2) ? options.fn(this) : options.inverse(this);
    });

    // Capitalize helper
    Handlebars.registerHelper('capitalize', (str: string) => {
      return str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '';
    });

    // Pluralize helper
    Handlebars.registerHelper('pluralize', (count: number, singular: string, plural: string) => {
      return count === 1 ? singular : plural;
    });

    console.log('📄 Handlebars helpers registered');
  }

  // Mock template data (to be replaced with Payload CMS)
  private getMockTemplate(type: TemplateType, channel: NotificationChannel): NotificationTemplate | null {
    const templates: Record<string, Record<string, Partial<NotificationTemplate>>> = {
      'magic-link': {
        'email': {
          id: 'magic-link-email',
          name: 'Magic Link Email',
          type: 'magic-link',
          channel: 'email',
          templates: {
            subject: '🔗 Access Your {{eventName}} Photos',
            text: `Hi {{clientName}},

Your photos from {{eventName}} are ready for viewing and download.

Access your gallery: {{magicLinkUrl}}

This link will expire on {{formatDate expirationDate}}.

If you have any questions, simply reply to this email.

Best regards,
{{photographerName}}`,
            html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your Photos Are Ready</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #007cba; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Your {{eventName}} Photos Are Ready! 📸</h1>
    </div>
    
    <p>Hi {{clientName}},</p>
    
    <p>Great news! Your photos from <strong>{{eventName}}</strong> have been processed and are now available for viewing and download.</p>
    
    <div style="text-align: center;">
      <a href="{{magicLinkUrl}}" class="button">View Your Photos</a>
    </div>
    
    <p><strong>Important:</strong> This link will expire on {{formatDate expirationDate}}.</p>
    
    {{#if eventDate}}
    <p><em>Event Date: {{formatDate eventDate}}</em></p>
    {{/if}}
    
    {{#if eventLocation}}
    <p><em>Location: {{eventLocation}}</em></p>
    {{/if}}
    
    <div class="footer">
      <p>If you have any questions, simply reply to this email.</p>
      <p>Best regards,<br>{{photographerName}}</p>
    </div>
  </div>
</body>
</html>
            `
          },
          variables: [
            { name: 'clientName', description: 'Client full name', type: 'string', required: true },
            { name: 'eventName', description: 'Name of the event/shoot', type: 'string', required: true },
            { name: 'magicLinkUrl', description: 'Secure gallery access URL', type: 'url', required: true },
            { name: 'expirationDate', description: 'Link expiration date', type: 'date', required: true },
            { name: 'photographerName', description: 'Photographer name', type: 'string', required: true },
            { name: 'photographerEmail', description: 'Photographer email', type: 'string', required: false },
            { name: 'eventDate', description: 'Date of the event', type: 'date', required: false },
            { name: 'eventLocation', description: 'Event location', type: 'string', required: false },
          ],
          isActive: true,
          language: 'en',
        }
      },
      'photos-ready': {
        'email': {
          id: 'photos-ready-email',
          name: 'Photos Ready Email',
          type: 'photos-ready',
          channel: 'email',
          templates: {
            subject: '📸 Your {{eventType}} photos are ready!',
            text: `Hello {{clientName}},

Great news! All your photos from {{eventName}} have been processed and are now available for download.

Gallery highlights:
• {{totalPhotoCount}} high-quality images
• Full resolution downloads available
• Professional editing complete

Access your gallery: {{galleryUrl}}

Thank you for choosing us for your special day!

{{photographerName}}`,
            html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your Photos Are Ready</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .highlight { background-color: #f0f8ff; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .button { display: inline-block; padding: 12px 24px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📸 Your {{capitalize eventType}} Photos Are Ready!</h1>
    
    <p>Hello {{clientName}},</p>
    
    <p>Great news! All your photos from <strong>{{eventName}}</strong> have been processed and are now available for download.</p>
    
    <div class="highlight">
      <h3>Gallery Highlights:</h3>
      <ul>
        <li><strong>{{totalPhotoCount}}</strong> {{pluralize totalPhotoCount 'high-quality image' 'high-quality images'}}</li>
        <li>Full resolution downloads available</li>
        <li>Professional editing complete</li>
      </ul>
    </div>
    
    <div style="text-align: center;">
      <a href="{{galleryUrl}}" class="button">Access Your Gallery</a>
    </div>
    
    <p>Thank you for choosing us for your special day!</p>
    
    <p>Best regards,<br>{{photographerName}}</p>
  </div>
</body>
</html>
            `
          },
          variables: [
            { name: 'clientName', description: 'Client full name', type: 'string', required: true },
            { name: 'eventName', description: 'Name of the event', type: 'string', required: true },
            { name: 'eventType', description: 'Type of event (wedding, portrait, etc.)', type: 'string', required: true },
            { name: 'totalPhotoCount', description: 'Number of photos in gallery', type: 'number', required: true },
            { name: 'galleryUrl', description: 'Gallery access URL', type: 'url', required: true },
            { name: 'photographerName', description: 'Photographer name', type: 'string', required: true },
            { name: 'eventDate', description: 'Date of the event', type: 'date', required: false },
          ],
          isActive: true,
          language: 'en',
        }
      }
    };

    const template = templates[type]?.[channel];
    if (!template) return null;

    return {
      ...template,
      settings: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    } as NotificationTemplate;
  }

  // Clear compiled template cache
  clearCache(): void {
    this.compiledTemplates.clear();
    console.log('📄 Template cache cleared');
  }

  // Get cache statistics
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.compiledTemplates.size,
      keys: Array.from(this.compiledTemplates.keys()),
    };
  }
}