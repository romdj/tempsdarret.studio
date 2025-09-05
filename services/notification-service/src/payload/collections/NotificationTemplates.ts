import type { CollectionConfig } from 'payload/types';

export const NotificationTemplates: CollectionConfig = {
  slug: 'notification-templates',
  admin: {
    useAsTitle: 'name',
    group: 'Templates',
    defaultColumns: ['name', 'type', 'channel', 'isActive', 'updatedAt'],
    preview: (doc) => {
      return `${process.env.PAYLOAD_SERVER_URL}/api/notification-templates/${doc.id}/preview`;
    },
  },
  access: {
    read: () => true, // Templates are read by the notification service
    create: ({ req: { user } }) => user?.role === 'admin' || user?.role === 'editor',
    update: ({ req: { user } }) => user?.role === 'admin' || user?.role === 'editor',
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'Human-readable name for this template (e.g., "Magic Link Invitation")',
      },
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Magic Link', value: 'magic-link' },
        { label: 'Photos Ready', value: 'photos-ready' },
        { label: 'Shoot Update', value: 'shoot-update' },
        { label: 'Reminder', value: 'reminder' },
        { label: 'Welcome', value: 'welcome' },
        { label: 'Shoot Confirmation', value: 'shoot-confirmation' },
      ],
      admin: {
        description: 'Template type that determines when this template is used',
      },
    },
    {
      name: 'channel',
      type: 'select',
      required: true,
      options: [
        { label: 'Email', value: 'email' },
        { label: 'SMS', value: 'sms' },
        { label: 'Slack', value: 'slack' },
        { label: 'WhatsApp', value: 'whatsapp' },
        { label: 'Push Notification', value: 'push' },
      ],
      admin: {
        description: 'Communication channel for this template',
      },
    },
    {
      name: 'language',
      type: 'select',
      required: true,
      defaultValue: 'en',
      options: [
        { label: 'English', value: 'en' },
        { label: 'French', value: 'fr' },
        { label: 'Spanish', value: 'es' },
        { label: 'German', value: 'de' },
      ],
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Only active templates will be used for notifications',
      },
    },
    {
      name: 'priority',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Template priority for selection when multiple templates match (higher = preferred)',
      },
    },
    {
      name: 'templates',
      type: 'group',
      fields: [
        {
          name: 'subject',
          type: 'text',
          admin: {
            condition: (data) => data.channel === 'email',
            description: 'Email subject line (supports Handlebars variables like {{clientName}})',
          },
        },
        {
          name: 'text',
          type: 'textarea',
          required: true,
          admin: {
            description: 'Plain text version of the template (supports Handlebars variables)',
            rows: 8,
          },
        },
        {
          name: 'html',
          type: 'richText',
          admin: {
            condition: (data) => data.channel === 'email',
            description: 'HTML version for email templates (supports Handlebars variables)',
          },
        },
      ],
    },
    {
      name: 'variables',
      type: 'array',
      admin: {
        description: 'Variables that can be used in this template',
      },
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
          admin: {
            description: 'Variable name (e.g., "clientName")',
          },
        },
        {
          name: 'description',
          type: 'text',
          required: true,
          admin: {
            description: 'Human-readable description of this variable',
          },
        },
        {
          name: 'type',
          type: 'select',
          required: true,
          defaultValue: 'string',
          options: [
            { label: 'String', value: 'string' },
            { label: 'Number', value: 'number' },
            { label: 'Boolean', value: 'boolean' },
            { label: 'Date', value: 'date' },
            { label: 'URL', value: 'url' },
          ],
        },
        {
          name: 'required',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'Whether this variable must be provided',
          },
        },
        {
          name: 'defaultValue',
          type: 'text',
          admin: {
            description: 'Default value if not provided (optional)',
          },
        },
      ],
    },
    {
      name: 'settings',
      type: 'group',
      fields: [
        {
          name: 'fromName',
          type: 'text',
          admin: {
            condition: (data) => data.channel === 'email',
            description: 'Override default from name for this template',
          },
        },
        {
          name: 'fromEmail',
          type: 'email',
          admin: {
            condition: (data) => data.channel === 'email',
            description: 'Override default from email for this template',
          },
        },
        {
          name: 'replyTo',
          type: 'email',
          admin: {
            condition: (data) => data.channel === 'email',
            description: 'Reply-to email address',
          },
        },
        {
          name: 'trackOpens',
          type: 'checkbox',
          defaultValue: true,
          admin: {
            condition: (data) => data.channel === 'email',
            description: 'Track when recipients open this email',
          },
        },
        {
          name: 'trackClicks',
          type: 'checkbox',
          defaultValue: true,
          admin: {
            condition: (data) => data.channel === 'email',
            description: 'Track when recipients click links in this email',
          },
        },
      ],
    },
    {
      name: 'testData',
      type: 'json',
      admin: {
        description: 'Sample data for testing this template (JSON format)',
        components: {
          Field: '@payloadcms/richtext-slate#JSONField',
        },
      },
    },
    {
      name: 'notes',
      type: 'richText',
      admin: {
        description: 'Internal notes about this template (not visible to end users)',
      },
    },
  ],
  indexes: [
    {
      fields: {
        type: 1,
        channel: 1,
        language: 1,
        isActive: 1,
      },
      options: {
        unique: false,
      },
    },
    {
      fields: {
        isActive: 1,
        priority: -1,
      },
    },
  ],
  hooks: {
    beforeValidate: [
      ({ data }) => {
        // Ensure templates object has required fields based on channel
        if (data?.channel === 'email' && data?.templates) {
          if (!data.templates.subject) {
            throw new Error('Email templates must have a subject line');
          }
        }
        return data;
      },
    ],
    afterChange: [
      ({ doc, operation }) => {
        // Log template changes for audit trail
        console.log(`Template ${doc.name} was ${operation}d at ${new Date().toISOString()}`);
      },
    ],
  ],
  versions: {
    drafts: true,
    max: 10,
  },
  timestamps: true,
};