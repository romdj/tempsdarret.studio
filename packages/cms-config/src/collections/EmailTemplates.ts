import type { CollectionConfig } from 'payload';
import { adminOnly } from '../access/admin-only';
import { publishedOrAdmin } from '../access/published-or-admin';

export const EmailTemplates: CollectionConfig = {
  slug: 'email-templates',
  admin: {
    useAsTitle: 'key',
    description:
      'Transactional email templates rendered by notification-service via Handlebars. The key is the stable identifier consumers reference (e.g. invite-client, magic-link, gallery-ready).',
    defaultColumns: ['key', 'subject', 'updatedAt'],
  },
  access: {
    read: publishedOrAdmin,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  versions: {
    drafts: true,
  },
  fields: [
    {
      name: 'key',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'Stable identifier used by notification-service to look up this template.',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      admin: {
        description: 'Editor-facing notes: when is this sent, who receives it, what triggers it.',
      },
    },
    {
      name: 'subject',
      type: 'text',
      required: true,
      localized: true,
    },
    {
      name: 'body',
      type: 'code',
      required: true,
      localized: true,
      admin: {
        language: 'handlebars',
        description: 'Handlebars template. Use {{variable}} placeholders; see variablesExample below.',
      },
    },
    {
      name: 'variablesExample',
      type: 'json',
      admin: {
        description: 'Sample data shape passed to Handlebars at render time. Documentation only.',
      },
    },
  ],
};
