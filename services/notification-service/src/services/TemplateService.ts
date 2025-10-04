/**
 * Template Service with Payload CMS Integration
 * Manages notification templates using Payload CMS as the data source
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
import { PayloadClient } from '../payload/PayloadClient.js';

export class TemplateService implements TemplateRepository {
  private compiledTemplates: Map<string, {
    subject?: HandlebarsTemplateDelegate;
    text: HandlebarsTemplateDelegate;
    html?: HandlebarsTemplateDelegate;
  }> = new Map();
  
  private payloadClient: PayloadClient;

  constructor() {
    this.payloadClient = new PayloadClient();
    this.registerHandlebarsHelpers();
    console.log('📄 Template service initialized with Payload CMS integration');
  }

  async getTemplate(type: TemplateType, channel: NotificationChannel): Promise<NotificationTemplate | null> {
    try {
      const template = await this.payloadClient.getTemplate(type, channel);
      return template;
    } catch (error) {
      console.error(`Failed to get template ${type}/${channel}:`, error);
      return null;
    }
  }

  async renderTemplate(template: NotificationTemplate, variables: Record<string, any>): Promise<RenderedTemplate> {
    try {
      const cacheKey = `${template.id}-${template.updatedAt?.getTime()}`;
      
      // Get or compile templates
      let compiled = this.compiledTemplates.get(cacheKey);
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
        
        this.compiledTemplates.set(cacheKey, compiled);
      }

      // Prepare variables with defaults and utilities
      const preparedVariables = this.prepareVariables(template, variables);
      
      // Validate required variables
      this.validateRequiredVariables(template, preparedVariables);

      // Render templates
      const rendered: RenderedTemplate = {
        text: compiled.text(preparedVariables),
        variables: preparedVariables,
      };

      if (compiled.subject) {
        rendered.subject = compiled.subject(preparedVariables);
      }

      if (compiled.html) {
        const htmlContent = compiled.html(preparedVariables);
        // Inline CSS for email compatibility
        rendered.html = juice(htmlContent);
      }

      return rendered;
    } catch (error) {
      console.error('Template rendering failed:', error);
      throw new Error(`Template rendering failed: ${error}`);
    }
  }

  async getAllTemplates(channel?: NotificationChannel): Promise<NotificationTemplate[]> {
    try {
      if (channel) {
        // Get templates for specific channel
        return await this.payloadClient.getTemplatesByChannel(channel);
      } else {
        // Get templates for all channels
        const channels: NotificationChannel[] = ['email', 'slack', 'sms'];
        const templates: NotificationTemplate[] = [];
        
        for (const ch of channels) {
          const channelTemplates = await this.payloadClient.getTemplatesByChannel(ch);
          templates.push(...channelTemplates);
        }
        
        return templates;
      }
    } catch (error) {
      console.error('Failed to get all templates:', error);
      return [];
    }
  }

  private prepareVariables(template: NotificationTemplate, variables: Record<string, any>): Record<string, any> {
    const prepared: Record<string, any> = { ...variables };

    // Apply default values for missing variables
    for (const variable of template.variables) {
      if (!(variable.name in prepared) && variable.defaultValue) {
        prepared[variable.name] = variable.defaultValue;
      }
    }

    // Add utility variables
    prepared.currentDate = new Date().toLocaleDateString();
    prepared.currentYear = new Date().getFullYear();
    prepared.currentTime = new Date().toLocaleTimeString();

    return prepared;
  }

  private validateRequiredVariables(template: NotificationTemplate, variables: Record<string, any>): void {
    const missing = template.variables
      .filter(v => v.required && !(v.name in variables))
      .map(v => v.name);

    if (missing.length > 0) {
      throw new Error(`Missing required variables: ${missing.join(', ')}`);
    }
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

    // URL helper
    Handlebars.registerHelper('urlEncode', (str: string) => {
      return encodeURIComponent(str || '');
    });

    // Safe HTML helper
    Handlebars.registerHelper('safeHtml', (str: string) => {
      return new Handlebars.SafeString(str || '');
    });

    console.log('📄 Handlebars helpers registered');
  }

  // Clear compiled template cache
  clearCache(): void {
    this.compiledTemplates.clear();
    console.log('📄 Template cache cleared');
  }

  // Health check for Payload CMS connection
  async healthCheck(): Promise<boolean> {
    return this.payloadClient.healthCheck();
  }

  // Get template variables from Payload CMS
  async getTemplateVariables() {
    return this.payloadClient.getTemplateVariables();
  }

  // Get cache statistics
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.compiledTemplates.size,
      keys: Array.from(this.compiledTemplates.keys()),
    };
  }
}