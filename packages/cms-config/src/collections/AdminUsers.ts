import type { CollectionConfig } from 'payload';

export const AdminUsers: CollectionConfig = {
  slug: 'admin-users',
  auth: true,
  admin: {
    useAsTitle: 'email',
    description: 'Editors who can manage CMS content and email templates.',
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  fields: [
    {
      name: 'displayName',
      type: 'text',
      required: true,
    },
  ],
};
