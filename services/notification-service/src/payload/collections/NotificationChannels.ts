import type { CollectionConfig } from 'payload/types';

export const NotificationChannels: CollectionConfig = {
  slug: 'notification-channels',
  admin: {
    useAsTitle: 'name',
    group: 'Configuration',
    defaultColumns: ['name', 'channel', 'isEnabled', 'updatedAt'],
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => user?.role === 'admin',
    update: ({ req: { user } }) => user?.role === 'admin',
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      admin: {
        description: 'Human-readable name for this channel configuration',
      },
    },
    {
      name: 'channel',
      type: 'select',
      required: true,
      unique: true,
      options: [
        { label: 'Email', value: 'email' },
        { label: 'SMS', value: 'sms' },
        { label: 'Slack', value: 'slack' },
        { label: 'WhatsApp', value: 'whatsapp' },
        { label: 'Push Notification', value: 'push' },
      ],
      admin: {
        description: 'Communication channel type',
      },
    },
    {
      name: 'isEnabled',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Whether this channel is available for sending notifications',
      },
    },
    {
      name: 'priority',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Channel priority for multi-channel sends (higher = preferred)',
      },
    },
    {
      name: 'configuration',
      type: 'group',
      fields: [
        // Email configuration
        {
          name: 'defaultFromName',
          type: 'text',
          admin: {
            condition: (data) => data.channel === 'email',
            description: 'Default sender name for email notifications',
          },
        },
        {
          name: 'defaultFromEmail',
          type: 'email',
          admin: {
            condition: (data) => data.channel === 'email',
            description: 'Default sender email address',
          },
        },
        {
          name: 'defaultReplyTo',
          type: 'email',
          admin: {
            condition: (data) => data.channel === 'email',
            description: 'Default reply-to email address',
          },
        },
        {
          name: 'trackOpens',
          type: 'checkbox',
          defaultValue: true,
          admin: {
            condition: (data) => data.channel === 'email',
            description: 'Track email opens by default',
          },
        },
        {
          name: 'trackClicks',
          type: 'checkbox',
          defaultValue: true,
          admin: {
            condition: (data) => data.channel === 'email',
            description: 'Track email clicks by default',
          },
        },
        
        // SMS configuration
        {
          name: 'defaultFromNumber',
          type: 'text',
          admin: {
            condition: (data) => data.channel === 'sms',
            description: 'Default sender phone number for SMS',
          },
        },
        
        // Slack configuration
        {
          name: 'defaultChannel',
          type: 'text',
          admin: {
            condition: (data) => data.channel === 'slack',
            description: 'Default Slack channel (e.g., #notifications)',
          },
        },
        {
          name: 'botName',
          type: 'text',
          admin: {
            condition: (data) => data.channel === 'slack',
            description: 'Bot display name in Slack',
          },
        },
        
        // WhatsApp configuration
        {
          name: 'businessAccountId',
          type: 'text',
          admin: {
            condition: (data) => data.channel === 'whatsapp',
            description: 'WhatsApp Business Account ID',
          },
        },
        
        // Push notification configuration
        {
          name: 'defaultIcon',
          type: 'text',
          admin: {
            condition: (data) => data.channel === 'push',
            description: 'Default notification icon URL',
          },
        },
        {
          name: 'defaultSound',
          type: 'select',
          options: [
            { label: 'Default', value: 'default' },
            { label: 'Silent', value: 'silent' },
            { label: 'Custom', value: 'custom' },
          ],
          admin: {
            condition: (data) => data.channel === 'push',
            description: 'Default notification sound',
          },
        },
      ],
    },
    {
      name: 'rateLimits',
      type: 'group',
      fields: [
        {
          name: 'enabled',
          type: 'checkbox',
          defaultValue: true,
          admin: {
            description: 'Enable rate limiting for this channel',
          },
        },
        {
          name: 'maxPerMinute',
          type: 'number',
          defaultValue: 60,
          min: 1,
          admin: {
            condition: (data) => data.rateLimits?.enabled,
            description: 'Maximum notifications per minute',
          },
        },
        {
          name: 'maxPerHour',
          type: 'number',
          defaultValue: 1000,
          min: 1,
          admin: {
            condition: (data) => data.rateLimits?.enabled,
            description: 'Maximum notifications per hour',
          },
        },
        {
          name: 'maxPerDay',
          type: 'number',
          defaultValue: 10000,
          min: 1,
          admin: {
            condition: (data) => data.rateLimits?.enabled,
            description: 'Maximum notifications per day',
          },
        },
      ],
    },
    {
      name: 'retryPolicy',
      type: 'group',
      fields: [
        {
          name: 'maxAttempts',
          type: 'number',
          defaultValue: 3,
          min: 1,
          max: 10,
          admin: {
            description: 'Maximum retry attempts for failed sends',
          },
        },
        {
          name: 'initialDelay',
          type: 'number',
          defaultValue: 1000,
          min: 100,
          admin: {
            description: 'Initial retry delay in milliseconds',
          },
        },
        {
          name: 'backoffMultiplier',
          type: 'number',
          defaultValue: 2,
          min: 1,
          admin: {
            description: 'Backoff multiplier for retry delays',
          },
        },
        {
          name: 'maxDelay',
          type: 'number',
          defaultValue: 30000,
          min: 1000,
          admin: {
            description: 'Maximum retry delay in milliseconds',
          },
        },
      ],
    },
    {
      name: 'webhooks',
      type: 'group',
      fields: [
        {
          name: 'enabled',
          type: 'checkbox',
          defaultValue: true,
          admin: {
            description: 'Enable delivery status webhooks',
          },
        },
        {
          name: 'endpoint',
          type: 'text',
          admin: {
            condition: (data) => data.webhooks?.enabled,
            description: 'Webhook endpoint URL for delivery status updates',
          },
          validate: (value, { data }) => {
            if (data?.webhooks?.enabled && !value) {
              return 'Webhook endpoint is required when webhooks are enabled';
            }
            if (value && !/^https?:\/\/.+/.test(value)) {
              return 'Webhook endpoint must be a valid URL';
            }
            return true;
          },
        },
        {
          name: 'secret',
          type: 'text',
          admin: {
            condition: (data) => data.webhooks?.enabled,
            description: 'Secret key for webhook signature validation',
          },
        },
      ],
    },
    {
      name: 'healthCheck',
      type: 'group',
      fields: [
        {
          name: 'enabled',
          type: 'checkbox',
          defaultValue: true,
          admin: {
            description: 'Enable health monitoring for this channel',
          },
        },
        {
          name: 'interval',
          type: 'number',
          defaultValue: 300000, // 5 minutes
          min: 60000, // 1 minute
          admin: {
            condition: (data) => data.healthCheck?.enabled,
            description: 'Health check interval in milliseconds',
          },
        },
        {
          name: 'timeout',
          type: 'number',
          defaultValue: 10000,
          min: 1000,
          admin: {
            condition: (data) => data.healthCheck?.enabled,
            description: 'Health check timeout in milliseconds',
          },
        },
      ],
    },
    {
      name: 'notes',
      type: 'richText',
      admin: {
        description: 'Configuration notes and documentation',
      },
    },
  ],
  indexes: [
    {
      fields: {
        channel: 1,
      },
      options: {
        unique: true,
      },
    },
    {
      fields: {
        isEnabled: 1,
        priority: -1,
      },
    },
  ],
  hooks: {
    beforeValidate: [
      ({ data }) => {
        // Validate required configuration based on channel type
        if (data?.channel === 'email' && data?.isEnabled) {
          if (!data?.configuration?.defaultFromEmail) {
            throw new Error('Email channel requires a default from email address');
          }
        }
        return data;
      },
    ],
  },
  timestamps: true,
};