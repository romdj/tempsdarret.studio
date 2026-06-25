import type { CollectionConfig } from 'payload';
import { adminOnly } from '../access/admin-only.js';
import { publishedOrAdmin } from '../access/published-or-admin.js';

export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: {
    useAsTitle: 'slug',
    description:
      'Standalone marketing pages (about, services, contact intros). Body is rich text; can evolve to block-based layouts later.',
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
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      localized: true,
    },
    {
      name: 'body',
      type: 'richText',
      localized: true,
    },
    {
      name: 'seoDescription',
      type: 'textarea',
      localized: true,
      admin: {
        description: 'Short summary used for meta description and social previews.',
      },
    },
  ],
};
