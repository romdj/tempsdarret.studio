import { buildConfig } from 'payload';
import { mongooseAdapter } from '@payloadcms/db-mongodb';

// Import collections
import { NotificationTemplates } from './collections/NotificationTemplates.js';
import { TemplateVariables } from './collections/TemplateVariables.js';
import { NotificationChannels } from './collections/NotificationChannels.js';

// Local-API-only config: no `admin` block (no @payloadcms/next installed,
// so there is no admin UI to log in to) and no `users` collection (that
// existed solely for Payload's own admin auth, unrelated to the platform's
// real user-service). See ADR-031 for the full rationale.
export default buildConfig({
  secret: process.env.PAYLOAD_SECRET ?? 'your-secret-here',
  collections: [
    NotificationTemplates,
    TemplateVariables,
    NotificationChannels,
  ],
  db: mongooseAdapter({
    url: process.env.MONGODB_URI ?? 'mongodb://localhost/notification-templates',
  }),
});
