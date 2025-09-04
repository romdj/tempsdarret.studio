/**
 * Jest Global Setup
 * Initialize test environment and external dependencies
 */

export default async (): Promise<void> => {
  console.log('🧪 Setting up global test environment...');

  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error'; // Minimize console output during tests
  
  // Mock external service configurations
  process.env.RESEND_API_KEY = 'test-resend-key-global';
  process.env.MONGODB_URI = 'mongodb://localhost/test';
  process.env.REDIS_URL = 'redis://localhost:6379/15'; // Use test database
  process.env.KAFKA_BROKERS = 'localhost:9092';
  process.env.KAFKA_CLIENT_ID = 'notification-service-test';
  
  // Notification service specific settings
  process.env.DEFAULT_FROM_EMAIL = 'test@tempsdarret.com';
  process.env.DEFAULT_FROM_NAME = 'Temps D\'arrêt Photography (Test)';
  process.env.TEMPLATE_CACHE_SIZE = '100';
  process.env.MAX_RETRY_ATTEMPTS = '3';
  process.env.NOTIFICATION_TIMEOUT = '5000';

  console.log('✅ Global test environment setup complete');
};