/**
 * TemplateService Unit Tests
 * Testing template compilation, rendering, and Handlebars integration
 */

import { TemplateService } from '../../../src/services/TemplateService.js';
import {
  NotificationTemplate,
  RenderedTemplate,
  NotificationChannel,
  TemplateType
} from '../../../src/shared/contracts/notifications.types.js';

describe('TemplateService', () => {
  let templateService: TemplateService;

  beforeEach(() => {
    templateService = new TemplateService();
  });

  afterEach(() => {
    templateService.clearCache();
  });

  describe('constructor', () => {
    it('should initialize with empty cache', () => {
      const stats = templateService.getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.keys).toEqual([]);
    });

    it('should register Handlebars helpers', () => {
      // Test that helpers are available by using them
      const template: NotificationTemplate = {
        id: 'test-template',
        name: 'Test Template',
        type: 'magic-link',
        channel: 'email',
        templates: {
          text: 'Date: {{formatDate testDate}}',
        },
        variables: [],
        settings: {},
        isActive: true,
        language: 'en',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const variables = {
        testDate: new Date('2024-09-15T10:30:00Z'),
      };

      // Should not throw when using helper
      expect(async () => {
        await templateService.renderTemplate(template, variables);
      }).not.toThrow();
    });
  });

  describe('getTemplate', () => {
    it('should return magic-link email template', async () => {
      const template = await templateService.getTemplate('magic-link', 'email');
      
      expect(template).toBeDefined();
      expect(template?.type).toBe('magic-link');
      expect(template?.channel).toBe('email');
      expect(template?.templates.subject).toContain('{{eventName}}');
      expect(template?.templates.text).toContain('{{clientName}}');
      expect(template?.templates.html).toContain('<h1>');
    });

    it('should return photos-ready email template', async () => {
      const template = await templateService.getTemplate('photos-ready', 'email');
      
      expect(template).toBeDefined();
      expect(template?.type).toBe('photos-ready');
      expect(template?.templates.subject).toContain('{{eventType}}');
      expect(template?.templates.html).toContain('{{totalPhotoCount}}');
    });

    it('should return null for unsupported template type', async () => {
      const template = await templateService.getTemplate('unsupported' as TemplateType, 'email');
      
      expect(template).toBeNull();
    });

    it('should return null for unsupported channel', async () => {
      const template = await templateService.getTemplate('magic-link', 'unsupported' as NotificationChannel);
      
      expect(template).toBeNull();
    });

    it('should include proper variable definitions', async () => {
      const template = await templateService.getTemplate('magic-link', 'email');
      
      expect(template?.variables).toBeDefined();
      expect(template?.variables.length).toBeGreaterThan(0);
      
      const requiredVariables = template?.variables.filter(v => v.required) || [];
      expect(requiredVariables.length).toBeGreaterThan(0);
      
      const clientNameVar = template?.variables.find(v => v.name === 'clientName');
      expect(clientNameVar).toBeDefined();
      expect(clientNameVar?.required).toBe(true);
      expect(clientNameVar?.type).toBe('string');
    });
  });

  describe('renderTemplate', () => {
    let magicLinkTemplate: NotificationTemplate;
    let templateVariables: Record<string, any>;

    beforeEach(async () => {
      magicLinkTemplate = (await templateService.getTemplate('magic-link', 'email'))!;
      templateVariables = {
        clientName: 'John Smith',
        eventName: 'Wedding Photography',
        magicLinkUrl: 'https://gallery.example.com/access/abc123',
        expirationDate: '2024-09-22',
        photographerName: 'Emma Photography',
        photographerEmail: 'emma@photography.com',
        eventDate: '2024-09-15',
        eventLocation: 'Central Park',
      };
    });

    it('should render text template correctly', async () => {
      const rendered = await templateService.renderTemplate(magicLinkTemplate, templateVariables);
      
      expect(rendered).toHaveRenderedTemplate();
      expect(rendered.text).toContain('John Smith');
      expect(rendered.text).toContain('Wedding Photography');
      expect(rendered.text).toContain('https://gallery.example.com/access/abc123');
      expect(rendered.text).toContain('Emma Photography');
    });

    it('should render HTML template correctly', async () => {
      const rendered = await templateService.renderTemplate(magicLinkTemplate, templateVariables);
      
      expect(rendered.html).toBeDefined();
      expect(rendered.html).toContain('<h1>');
      expect(rendered.html).toContain('John Smith');
      expect(rendered.html).toContain('Wedding Photography');
      expect(rendered.html).toContain('href="https://gallery.example.com/access/abc123"');
    });

    it('should render subject correctly', async () => {
      const rendered = await templateService.renderTemplate(magicLinkTemplate, templateVariables);
      
      expect(rendered.subject).toBeDefined();
      expect(rendered.subject).toContain('Wedding Photography');
    });

    it('should inline CSS in HTML templates', async () => {
      const rendered = await templateService.renderTemplate(magicLinkTemplate, templateVariables);
      
      expect(rendered.html).toBeDefined();
      // CSS should be inlined (juice library functionality)
      expect(rendered.html).toContain('style=');
    });

    it('should handle missing optional variables gracefully', async () => {
      const minimalVariables = {
        clientName: 'John Smith',
        eventName: 'Wedding',
        magicLinkUrl: 'https://gallery.example.com/access/abc123',
        expirationDate: '2024-09-22',
        photographerName: 'Emma Photography',
        photographerEmail: 'emma@photography.com',
        // eventDate and eventLocation omitted
      };

      const rendered = await templateService.renderTemplate(magicLinkTemplate, minimalVariables);
      
      expect(rendered.text).toContain('John Smith');
      expect(rendered.html).toBeDefined();
    });

    it('should apply default values for missing variables', async () => {
      const templateWithDefaults: NotificationTemplate = {
        ...magicLinkTemplate,
        variables: [
          ...magicLinkTemplate.variables,
          {
            name: 'customMessage',
            description: 'Custom message',
            type: 'string',
            required: false,
            defaultValue: 'Thank you for choosing our services!',
          },
        ],
        templates: {
          ...magicLinkTemplate.templates,
          text: magicLinkTemplate.templates.text + '\n\n{{customMessage}}',
        },
      };

      const rendered = await templateService.renderTemplate(templateWithDefaults, templateVariables);
      
      expect(rendered.text).toContain('Thank you for choosing our services!');
      expect(rendered.variables.customMessage).toBe('Thank you for choosing our services!');
    });

    it('should add utility variables', async () => {
      const rendered = await templateService.renderTemplate(magicLinkTemplate, templateVariables);
      
      expect(rendered.variables.currentDate).toBeDefined();
      expect(rendered.variables.currentYear).toBeDefined();
      expect(rendered.variables.currentTime).toBeDefined();
    });

    it('should cache compiled templates', async () => {
      // First render
      await templateService.renderTemplate(magicLinkTemplate, templateVariables);
      
      const statsAfterFirst = templateService.getCacheStats();
      expect(statsAfterFirst.size).toBe(1);
      expect(statsAfterFirst.keys).toContain('magic-link_email');
      
      // Second render should use cache
      await templateService.renderTemplate(magicLinkTemplate, templateVariables);
      
      const statsAfterSecond = templateService.getCacheStats();
      expect(statsAfterSecond.size).toBe(1); // No additional entries
    });

    it('should handle template compilation errors', async () => {
      const invalidTemplate: NotificationTemplate = {
        ...magicLinkTemplate,
        templates: {
          text: 'Invalid template {{unclosedTag',
          subject: 'Test',
        },
      };

      await expect(
        templateService.renderTemplate(invalidTemplate, templateVariables)
      ).rejects.toThrow(/Template rendering failed/);
    });
  });

  describe('getAllTemplates', () => {
    it('should return all templates when no channel specified', async () => {
      const templates = await templateService.getAllTemplates();
      
      expect(templates.length).toBeGreaterThan(0);
      
      const emailTemplates = templates.filter(t => t.channel === 'email');
      const slackTemplates = templates.filter(t => t.channel === 'slack');
      const smsTemplates = templates.filter(t => t.channel === 'sms');
      
      expect(emailTemplates.length).toBeGreaterThan(0);
      expect(slackTemplates.length).toBeGreaterThan(0);
      expect(smsTemplates.length).toBeGreaterThan(0);
    });

    it('should filter templates by channel', async () => {
      const emailTemplates = await templateService.getAllTemplates('email');
      
      expect(emailTemplates.length).toBeGreaterThan(0);
      expect(emailTemplates.every(t => t.channel === 'email')).toBe(true);
    });

    it('should return empty array for unsupported channel', async () => {
      const templates = await templateService.getAllTemplates('unsupported' as NotificationChannel);
      
      expect(templates).toEqual([]);
    });

    it('should include all expected template types', async () => {
      const templates = await templateService.getAllTemplates('email');
      
      const templateTypes = templates.map(t => t.type);
      expect(templateTypes).toContain('magic-link');
      expect(templateTypes).toContain('photos-ready');
    });
  });

  describe('Handlebars helpers', () => {
    let testTemplate: NotificationTemplate;

    beforeEach(() => {
      testTemplate = {
        id: 'test-helpers',
        name: 'Test Helpers',
        type: 'magic-link',
        channel: 'email',
        templates: {
          text: '', // Will be set per test
        },
        variables: [],
        settings: {},
        isActive: true,
        language: 'en',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });

    it('should format dates correctly', async () => {
      testTemplate.templates.text = 'Event date: {{formatDate eventDate}}';
      
      const variables = {
        eventDate: new Date('2024-09-15T10:30:00Z'),
      };

      const rendered = await templateService.renderTemplate(testTemplate, variables);
      
      expect(rendered.text).toContain('Event date: ');
      expect(rendered.text).toContain('9/15/2024'); // Formatted date
    });

    it('should handle conditional rendering with ifEquals', async () => {
      testTemplate.templates.text = '{{#ifEquals eventType "wedding"}}Special wedding message{{else}}Regular message{{/ifEquals}}';
      
      const weddingVariables = { eventType: 'wedding' };
      const rendered1 = await templateService.renderTemplate(testTemplate, weddingVariables);
      expect(rendered1.text).toBe('Special wedding message');
      
      const corporateVariables = { eventType: 'corporate' };
      const rendered2 = await templateService.renderTemplate(testTemplate, corporateVariables);
      expect(rendered2.text).toBe('Regular message');
    });

    it('should capitalize strings correctly', async () => {
      testTemplate.templates.text = 'Event type: {{capitalize eventType}}';
      
      const variables = { eventType: 'wedding photography' };

      const rendered = await templateService.renderTemplate(testTemplate, variables);
      
      expect(rendered.text).toBe('Event type: Wedding photography');
    });

    it('should pluralize correctly', async () => {
      testTemplate.templates.text = 'You have {{totalPhotos}} {{pluralize totalPhotos "photo" "photos"}}';
      
      const singlePhoto = { totalPhotos: 1 };
      const rendered1 = await templateService.renderTemplate(testTemplate, singlePhoto);
      expect(rendered1.text).toBe('You have 1 photo');
      
      const multiplePhotos = { totalPhotos: 5 };
      const rendered2 = await templateService.renderTemplate(testTemplate, multiplePhotos);
      expect(rendered2.text).toBe('You have 5 photos');
    });

    it('should handle empty or undefined values in helpers', async () => {
      testTemplate.templates.text = 'Name: {{capitalize clientName}}';
      
      const emptyVariables = { clientName: '' };
      const rendered1 = await templateService.renderTemplate(testTemplate, emptyVariables);
      expect(rendered1.text).toBe('Name: ');
      
      const undefinedVariables = {};
      const rendered2 = await templateService.renderTemplate(testTemplate, undefinedVariables);
      expect(rendered2.text).toBe('Name: ');
    });
  });

  describe('cache management', () => {
    it('should clear cache correctly', async () => {
      const template = (await templateService.getTemplate('magic-link', 'email'))!;
      await templateService.renderTemplate(template, {});
      
      expect(templateService.getCacheStats().size).toBe(1);
      
      templateService.clearCache();
      
      expect(templateService.getCacheStats().size).toBe(0);
    });

    it('should track cache keys correctly', async () => {
      const template1 = (await templateService.getTemplate('magic-link', 'email'))!;
      const template2 = (await templateService.getTemplate('photos-ready', 'email'))!;
      
      await templateService.renderTemplate(template1, {});
      await templateService.renderTemplate(template2, {});
      
      const stats = templateService.getCacheStats();
      expect(stats.size).toBe(2);
      expect(stats.keys).toContain('magic-link_email');
      expect(stats.keys).toContain('photos-ready_email');
    });

    it('should reuse cache for same template type/channel', async () => {
      const template = (await templateService.getTemplate('magic-link', 'email'))!;
      
      // Render same template with different variables
      await templateService.renderTemplate(template, { clientName: 'John' });
      await templateService.renderTemplate(template, { clientName: 'Jane' });
      
      const stats = templateService.getCacheStats();
      expect(stats.size).toBe(1); // Only one cache entry
    });
  });

  describe('template variable validation', () => {
    it('should include required variable in template definition', async () => {
      const template = await templateService.getTemplate('magic-link', 'email');
      
      const requiredVars = template?.variables.filter(v => v.required) || [];
      const varNames = requiredVars.map(v => v.name);
      
      expect(varNames).toContain('clientName');
      expect(varNames).toContain('eventName');
      expect(varNames).toContain('magicLinkUrl');
      expect(varNames).toContain('photographerName');
    });

    it('should include variable type information', async () => {
      const template = await templateService.getTemplate('photos-ready', 'email');
      
      const photoCountVar = template?.variables.find(v => v.name === 'totalPhotoCount');
      expect(photoCountVar?.type).toBe('number');
      
      const galleryUrlVar = template?.variables.find(v => v.name === 'galleryUrl');
      expect(galleryUrlVar?.type).toBe('url');
    });

    it('should include variable descriptions', async () => {
      const template = await templateService.getTemplate('magic-link', 'email');
      
      const variables = template?.variables || [];
      expect(variables.every(v => v.description.length > 0)).toBe(true);
    });
  });

  describe('error scenarios', () => {
    it('should handle template rendering with missing required variables', async () => {
      const template = (await templateService.getTemplate('magic-link', 'email'))!;
      
      // Provide minimal variables (missing some required ones)
      const incompleteVariables = {
        clientName: 'John Smith',
        // Missing eventName, magicLinkUrl, etc.
      };

      const rendered = await templateService.renderTemplate(template, incompleteVariables);
      
      // Should still render but may have empty values where variables are missing
      expect(rendered.text).toContain('John Smith');
      expect(rendered.html).toBeDefined();
    });

    it('should handle malformed template gracefully', async () => {
      const malformedTemplate: NotificationTemplate = {
        id: 'malformed',
        name: 'Malformed Template',
        type: 'magic-link',
        channel: 'email',
        templates: {
          text: 'Hello {{#if unclosed condition}',
        },
        variables: [],
        settings: {},
        isActive: true,
        language: 'en',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await expect(
        templateService.renderTemplate(malformedTemplate, {})
      ).rejects.toThrow();
    });
  });
});