import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 10000,
    hookTimeout: 60000, // 1 minute for beforeAll/afterAll
    // See user-service/vitest.config.ts: src/server.ts's connectMongo('memory')
    // path races multiple MongoMemoryServer instances on the shared cached
    // mongod binary lock when files run in parallel (only hit by unscoped
    // runs like test:coverage — the scoped CI jobs stay isolated per-job).
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        'vitest.config.ts',
        'tests/setup.ts'
      ]
    }
  },
  resolve: {
    alias: {
      '@tempsdarret/shared': path.resolve(__dirname, '../../packages/shared/src')
    }
  }
});
