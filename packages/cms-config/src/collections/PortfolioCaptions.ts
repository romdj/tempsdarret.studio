import type { CollectionConfig } from 'payload';
import { adminOnly } from '../access/admin-only';
import { publishedOrAdmin } from '../access/published-or-admin';

export const PortfolioCaptions: CollectionConfig = {
  slug: 'portfolio-captions',
  admin: {
    useAsTitle: 'slug',
    description:
      'Long-form captions and copy for portfolio entries. Optionally tied to a shoot by id (shoot data lives in shoot-service, not the CMS).',
    defaultColumns: ['slug', 'title', 'updatedAt'],
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
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'URL-safe identifier the frontend uses to fetch this caption.',
      },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      localized: true,
    },
    {
      name: 'description',
      type: 'richText',
      localized: true,
    },
    {
      name: 'shootId',
      type: 'text',
      admin: {
        description:
          'Optional foreign key to shoot-service. Cross-service link; CMS does not validate referential integrity.',
      },
    },
  ],
};
