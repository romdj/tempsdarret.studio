/**
 * Jest Test Setup
 * Global test configuration and utilities for notification service
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

// Global test variables
declare global {
  var __MONGO_URI__: string;
  var __MONGO_DB_NAME__: string;
}

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  // Start in-memory MongoDB for integration tests
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Set global variables for tests
  global.__MONGO_URI__ = mongoUri;
  global.__MONGO_DB_NAME__ = mongoServer.instanceInfo?.dbName || 'test';
  
  // Connect to the in-memory database
  await mongoose.connect(mongoUri);
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.MONGODB_URI = mongoUri;
  process.env.RESEND_API_KEY = 'test-key-resend';
  process.env.KAFKA_BROKERS = 'localhost:9092';
  process.env.REDIS_URL = 'redis://localhost:6379';
  
  console.log('🧪 Test environment initialized');
});

afterAll(async () => {
  // Close database connection
  await mongoose.connection.close();
  
  // Stop in-memory MongoDB
  if (mongoServer) {
    await mongoServer.stop();
  }
  
  console.log('🧪 Test environment cleaned up');
});

beforeEach(async () => {
  // Clear all collections before each test
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

// Custom Jest matchers for notification service
expect.extend({
  toBeValidEmail(received: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = emailRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid email`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid email`,
        pass: false,
      };
    }
  },
  
  toBeValidEventType(received: string) {
    const validEventTypes = [
      'invitation.created',
      'shoot.completed', 
      'shoot.updated',
      'magic.link.expiring',
      'email.sent',
      'email.failed',
      'email.delivered'
    ];
    
    const pass = validEventTypes.includes(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid event type`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid event type`,
        pass: false,
      };
    }
  },

  toBeValidNotificationChannel(received: string) {
    const validChannels = ['email', 'slack', 'sms', 'whatsapp', 'push'];
    const pass = validChannels.includes(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid notification channel`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid notification channel`,
        pass: false,
      };
    }
  },

  toHaveRenderedTemplate(received: any) {
    const hasRequiredFields = received && 
      typeof received.text === 'string' &&
      received.text.length > 0 &&
      received.variables &&
      typeof received.variables === 'object';
    
    if (hasRequiredFields) {
      return {
        message: () => `expected object not to be a valid rendered template`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected object to be a valid rendered template with text and variables`,
        pass: false,
      };
    }
  }
});

// Add type definitions for custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidEmail(): R;
      toBeValidEventType(): R;
      toBeValidNotificationChannel(): R;
      toHaveRenderedTemplate(): R;
    }
  }
}