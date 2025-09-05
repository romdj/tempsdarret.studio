import { buildConfig } from 'payload/config';
import { mongooseAdapter } from '@payloadcms/db-mongodb';
import { webpackBundler } from '@payloadcms/bundler-webpack';
import { slateEditor } from '@payloadcms/richtext-slate';
import path from 'path';

// Import collections
import { NotificationTemplates } from './collections/NotificationTemplates.js';
import { TemplateVariables } from './collections/TemplateVariables.js';
import { NotificationChannels } from './collections/NotificationChannels.js';
import { Users } from './collections/Users.js';

export default buildConfig({
  admin: {
    user: Users.slug,
    bundler: webpackBundler(),
    meta: {
      titleSuffix: '- Notification Templates',
      favicon: '/assets/favicon.ico',
      ogImage: '/assets/og-image.jpg',
    },
  },
  editor: slateEditor({}),
  collections: [
    Users,
    NotificationTemplates,
    TemplateVariables,
    NotificationChannels,
  ],
  typescript: {
    outputFile: path.resolve(__dirname, 'payload-types.ts'),
  },
  graphQL: {
    schemaOutputFile: path.resolve(__dirname, 'generated-schema.graphql'),
  },
  db: mongooseAdapter({
    url: process.env.MONGODB_URI || 'mongodb://localhost/notification-templates',
  }),
  serverURL: process.env.PAYLOAD_SERVER_URL || 'http://localhost:3001',
  cors: [
    'http://localhost:3000', // Frontend
    'http://localhost:3001', // Payload admin
  ],
  csrf: [
    'http://localhost:3000',
    'http://localhost:3001',
  ],
  plugins: [],
  rateLimit: {
    trustProxy: true,
    window: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs
    skip: (req) => {
      // Skip rate limiting for internal service calls
      return req.headers['x-internal-service'] === 'notification-service';
    },
  },
});