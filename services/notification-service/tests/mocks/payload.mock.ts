/**
 * Payload CMS Mock for Testing
 * Provides mock implementation of Payload CMS for isolated testing
 */

import { jest } from '@jest/globals';
import { NotificationTemplate, TemplateType, NotificationChannel } from '../../src/shared/contracts/notifications.types.js';

export interface MockPayloadTemplate {
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
  variables: Array<{
    name: string;
    description: string;
    type: string;
    required: boolean;
    defaultValue?: string;
  }>;
  settings: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

class MockPayloadCMS {
  private templates: Map<string, MockPayloadTemplate> = new Map();
  private channels: Map<string, any> = new Map();
  private variables: Map<string, any> = new Map();
  
  // Mock Payload operations
  find = jest.fn(async ({ collection, where, sort, limit }: any) => {
    if (collection === 'notification-templates') {
      let templates = Array.from(this.templates.values());
      
      // Apply filters
      if (where?.and) {
        templates = templates.filter(template => {
          return where.and.every((condition: any) => {
            const [field, filter] = Object.entries(condition)[0];
            const [operator, value] = Object.entries(filter as any)[0];
            
            switch (operator) {
              case 'equals':
                return template[field as keyof MockPayloadTemplate] === value;
              case 'not_equals':
                return template[field as keyof MockPayloadTemplate] !== value;
              default:
                return true;
            }
          });
        });
      }
      
      // Apply sorting
      if (sort === '-priority') {
        templates.sort((a, b) => b.priority - a.priority);
      }
      
      // Apply limit
      if (limit && limit < templates.length) {
        templates = templates.slice(0, limit);
      }
      
      return { docs: templates };
    }
    
    if (collection === 'notification-channels') {
      return { docs: Array.from(this.channels.values()) };
    }
    
    if (collection === 'template-variables') {
      return { docs: Array.from(this.variables.values()) };
    }
    
    return { docs: [] };
  });

  create = jest.fn(async ({ collection, data }: any) => {
    const id = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const doc = { id, ...data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    
    if (collection === 'notification-templates') {
      this.templates.set(id, doc);
    } else if (collection === 'notification-channels') {
      this.channels.set(id, doc);
    } else if (collection === 'template-variables') {
      this.variables.set(id, doc);
    }
    
    return doc;
  });

  update = jest.fn(async ({ collection, id, data }: any) => {
    if (collection === 'notification-templates' && this.templates.has(id)) {
      const existing = this.templates.get(id)!;
      const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
      this.templates.set(id, updated);
      return updated;
    }
    
    throw new Error('Document not found');
  });

  findByID = jest.fn(async ({ collection, id }: any) => {
    if (collection === 'notification-templates') {
      return this.templates.get(id) || null;
    }
    return null;
  });

  init = jest.fn(async () => {
    console.log('Mock Payload CMS initialized');
  });

  logger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  // Mock data management
  seedMockTemplate(template: Partial<MockPayloadTemplate>) {
    const id = template.id || `mock_${Date.now()}`;
    const mockTemplate: MockPayloadTemplate = {
      id,
      name: template.name || 'Test Template',
      type: template.type || 'magic-link',
      channel: template.channel || 'email',
      language: template.language || 'en',
      isActive: template.isActive ?? true,
      priority: template.priority || 0,
      templates: template.templates || {
        text: 'Test template content',
        subject: 'Test Subject',
      },
      variables: template.variables || [],
      settings: template.settings || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    this.templates.set(id, mockTemplate);
    return mockTemplate;
  }

  seedMockChannel(channel: any) {
    const id = channel.id || `channel_${Date.now()}`;
    const mockChannel = { id, ...channel };
    this.channels.set(id, mockChannel);
    return mockChannel;
  }

  seedMockVariable(variable: any) {
    const id = variable.id || `var_${Date.now()}`;
    const mockVariable = { id, ...variable };
    this.variables.set(id, mockVariable);
    return mockVariable;
  }

  reset() {
    this.templates.clear();
    this.channels.clear();
    this.variables.clear();
    jest.clearAllMocks();
  }

  // Default test templates
  seedDefaultTemplates() {
    this.seedMockTemplate({
      id: 'magic-link-email',
      name: 'Magic Link Email',
      type: 'magic-link',
      channel: 'email',
      templates: {
        subject: '🔗 Access Your {{eventName}} Photos',
        text: `Hi {{clientName}},
Your photos from {{eventName}} are ready.
Access: {{magicLinkUrl}}
Expires: {{formatDate expirationDate}}
Best regards, {{photographerName}}`,
        html: `<h1>Photos Ready!</h1><p>Hi {{clientName}}, your {{eventName}} photos are ready!</p>`,
      },
      variables: [
        { name: 'clientName', description: 'Client name', type: 'string', required: true },
        { name: 'eventName', description: 'Event name', type: 'string', required: true },
        { name: 'magicLinkUrl', description: 'Gallery URL', type: 'url', required: true },
        { name: 'expirationDate', description: 'Expiration date', type: 'date', required: true },
        { name: 'photographerName', description: 'Photographer name', type: 'string', required: true },
      ],
    });

    this.seedMockTemplate({
      id: 'photos-ready-email',
      name: 'Photos Ready Email',
      type: 'photos-ready',
      channel: 'email',
      templates: {
        subject: '📸 Your {{eventName}} photos are ready!',
        text: `Hello {{clientName}}, your {{totalPhotoCount}} photos are ready at {{galleryUrl}}`,
        html: `<h1>Photos Ready!</h1><p>{{totalPhotoCount}} photos available</p>`,
      },
      variables: [
        { name: 'clientName', description: 'Client name', type: 'string', required: true },
        { name: 'eventName', description: 'Event name', type: 'string', required: true },
        { name: 'totalPhotoCount', description: 'Photo count', type: 'number', required: true },
        { name: 'galleryUrl', description: 'Gallery URL', type: 'url', required: true },
      ],
    });
  }
}

// Export singleton instance
export const mockPayload = new MockPayloadCMS();

// Jest mock for payload module
export const mockPayloadModule = mockPayload;

// Setup helper
export const setupPayloadMock = {
  reset: () => mockPayload.reset(),
  seedDefaults: () => mockPayload.seedDefaultTemplates(),
  seedTemplate: (template: Partial<MockPayloadTemplate>) => mockPayload.seedMockTemplate(template),
  seedChannel: (channel: any) => mockPayload.seedMockChannel(channel),
  getInstance: () => mockPayload,
};