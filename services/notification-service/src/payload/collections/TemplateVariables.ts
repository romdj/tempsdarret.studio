import type { CollectionConfig } from 'payload/types';

export const TemplateVariables: CollectionConfig = {
  slug: 'template-variables',
  admin: {
    useAsTitle: 'name',
    group: 'Templates',
    defaultColumns: ['name', 'type', 'category', 'updatedAt'],
  },
  access: {
    read: () => true,
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
        description: 'Variable name used in templates (e.g., "clientName")',
      },
      validate: (value) => {
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
          return 'Variable name must start with a letter or underscore and contain only letters, numbers, and underscores';
        }
        return true;
      },
    },
    {
      name: 'displayName',
      type: 'text',
      required: true,
      admin: {
        description: 'Human-readable name for this variable',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      required: true,
      admin: {
        description: 'Detailed description of what this variable represents',
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
        { label: 'Email', value: 'email' },
        { label: 'Phone', value: 'phone' },
      ],
    },
    {
      name: 'category',
      type: 'select',
      required: true,
      options: [
        { label: 'Client Information', value: 'client' },
        { label: 'Shoot Details', value: 'shoot' },
        { label: 'Photographer Info', value: 'photographer' },
        { label: 'System Generated', value: 'system' },
        { label: 'Business Info', value: 'business' },
        { label: 'Custom', value: 'custom' },
      ],
      admin: {
        description: 'Category to help organize variables',
      },
    },
    {
      name: 'required',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Whether this variable must always be provided',
      },
    },
    {
      name: 'defaultValue',
      type: 'text',
      admin: {
        description: 'Default value if not provided (optional)',
      },
    },
    {
      name: 'validation',
      type: 'group',
      fields: [
        {
          name: 'pattern',
          type: 'text',
          admin: {
            description: 'Regular expression pattern for validation (optional)',
          },
        },
        {
          name: 'minLength',
          type: 'number',
          min: 0,
          admin: {
            condition: (data) => data.type === 'string',
            description: 'Minimum string length',
          },
        },
        {
          name: 'maxLength',
          type: 'number',
          min: 1,
          admin: {
            condition: (data) => data.type === 'string',
            description: 'Maximum string length',
          },
        },
        {
          name: 'min',
          type: 'number',
          admin: {
            condition: (data) => data.type === 'number',
            description: 'Minimum numeric value',
          },
        },
        {
          name: 'max',
          type: 'number',
          admin: {
            condition: (data) => data.type === 'number',
            description: 'Maximum numeric value',
          },
        },
      ],
    },
    {
      name: 'examples',
      type: 'array',
      admin: {
        description: 'Example values to help template creators',
      },
      fields: [
        {
          name: 'value',
          type: 'text',
          required: true,
        },
        {
          name: 'description',
          type: 'text',
          admin: {
            description: 'Description of when this example would be used',
          },
        },
      ],
    },
    {
      name: 'isDeprecated',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Mark as deprecated to discourage use in new templates',
      },
    },
    {
      name: 'replacedBy',
      type: 'relationship',
      relationTo: 'template-variables',
      admin: {
        condition: (data) => data.isDeprecated,
        description: 'Variable that should be used instead of this deprecated one',
      },
    },
    {
      name: 'notes',
      type: 'richText',
      admin: {
        description: 'Additional notes for template creators',
      },
    },
  ],
  indexes: [
    {
      fields: {
        category: 1,
        name: 1,
      },
    },
    {
      fields: {
        required: 1,
        isDeprecated: 1,
      },
    },
  ],
  hooks: {
    beforeChange: [
      ({ data }) => {
        // Ensure variable name follows naming conventions
        if (data?.name) {
          data.name = data.name.trim();
        }
        return data;
      },
    ],
  },
  timestamps: true,
};