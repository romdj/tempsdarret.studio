/**
 * Jest Global Teardown
 * Cleanup test environment and resources
 */

export default async (): Promise<void> => {
  console.log('🧪 Cleaning up global test environment...');

  // Cleanup any global resources here
  // For example: close database connections, cleanup temp files, etc.

  // Reset environment variables
  delete process.env.RESEND_API_KEY;
  delete process.env.MONGODB_URI;
  delete process.env.REDIS_URL;

  console.log('✅ Global test environment cleanup complete');
};