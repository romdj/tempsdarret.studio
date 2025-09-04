/**
 * Jest Test Setup
 * Global test configuration and utilities
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import fs from 'fs/promises';
import path from 'path';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  // Start in-memory MongoDB for integration tests
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Connect to the in-memory database
  await mongoose.connect(mongoUri);
  
  // Create test storage directory
  const testStoragePath = path.join(process.cwd(), 'test-storage');
  try {
    await fs.mkdir(testStoragePath, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.STORAGE_BASE_PATH = testStoragePath;
  process.env.MONGODB_URI = mongoUri;
});

afterAll(async () => {
  // Clean up test storage directory
  const testStoragePath = path.join(process.cwd(), 'test-storage');
  try {
    await fs.rmdir(testStoragePath, { recursive: true });
  } catch (error) {
    // Directory might not exist or cleanup failed
    console.warn('Failed to cleanup test storage:', error);
  }
  
  // Close database connection
  await mongoose.connection.close();
  
  // Stop in-memory MongoDB
  if (mongoServer) {
    await mongoServer.stop();
  }
});

afterEach(async () => {
  // Clean up database between tests
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});