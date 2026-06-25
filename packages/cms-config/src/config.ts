import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildConfig } from 'payload';
import { mongooseAdapter } from '@payloadcms/db-mongodb';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import sharp from 'sharp';
import { collections } from './collections/index.js';
import { localization } from './localization.js';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

const secret = process.env.PAYLOAD_SECRET ?? '';
const mongoUri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/tempsdarret-cms';

export const config = buildConfig({
  secret,
  serverURL: process.env.PAYLOAD_PUBLIC_SERVER_URL ?? 'http://localhost:3001',
  admin: {
    user: 'admin-users',
  },
  editor: lexicalEditor(),
  db: mongooseAdapter({ url: mongoUri }),
  collections,
  localization,
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, '../generated/payload-types.ts'),
  },
});

export default config;
