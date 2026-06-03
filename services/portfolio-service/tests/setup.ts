import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { beforeAll, afterAll, afterEach } from 'vitest';

// Component tests bring their own MongoDB container and need exclusive
// control of the default mongoose connection. They set USE_TESTCONTAINERS=1
// to opt out of the in-memory mongo lifecycle this file installs.
const useTestcontainers = process.env['USE_TESTCONTAINERS'] === '1';

let mongod: MongoMemoryServer;

beforeAll(async () => {
  if (useTestcontainers) return;
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  if (useTestcontainers) return;
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongod.stop();
});

afterEach(async () => {
  if (useTestcontainers) return;
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    if (collection) {
      await collection.deleteMany({});
    }
  }
});
