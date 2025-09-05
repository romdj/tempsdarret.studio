import type { CollectionConfig } from 'payload/types';

export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    useAPIKey: true,
    tokenExpiration: 7200, // 2 hours
  },
  admin: {
    useAsTitle: 'email',
    group: 'Admin',
  },
  access: {
    read: ({ req: { user } }) => {
      if (user?.role === 'admin') return true;
      return {
        id: {
          equals: user?.id,
        },
      };
    },
    create: ({ req: { user } }) => user?.role === 'admin',
    update: ({ req: { user } }) => {
      if (user?.role === 'admin') return true;
      return {
        id: {
          equals: user?.id,
        },
      };
    },
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  fields: [
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'editor',
      options: [
        {
          label: 'Admin',
          value: 'admin',
        },
        {
          label: 'Editor',
          value: 'editor',
        },
        {
          label: 'Viewer',
          value: 'viewer',
        },
      ],
      admin: {
        description: 'Admin: Full access, Editor: Can edit templates, Viewer: Read-only access',
      },
    },
    {
      name: 'firstName',
      type: 'text',
      required: true,
    },
    {
      name: 'lastName',
      type: 'text',
      required: true,
    },
    {
      name: 'displayName',
      type: 'text',
      admin: {
        description: 'How this user should be displayed in the admin interface',
      },
      hooks: {
        beforeChange: [
          ({ data }) => {
            if (!data?.displayName && data?.firstName && data?.lastName) {
              return `${data.firstName} ${data.lastName}`;
            }
            return data?.displayName;
          },
        ],
      },
    },
  ],
  hooks: {
    beforeChange: [
      ({ data }) => {
        // Ensure display name is set
        if (!data?.displayName && data?.firstName && data?.lastName) {
          data.displayName = `${data.firstName} ${data.lastName}`;
        }
        return data;
      },
    ],
  },
  timestamps: true,
};