import type { CollectionConfig } from 'payload';
import { adminOnly } from '../access/admin-only';

export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    description:
      'CMS-managed uploads: marketing imagery, illustrations, document attachments. Photography deliverables live in file-service, not here.',
  },
  access: {
    read: () => true,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  upload: {
    mimeTypes: ['image/*', 'application/pdf'],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      localized: true,
      admin: {
        description: 'Alt text for accessibility. Required for any image used on public pages.',
      },
    },
  ],
};
