import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 60000, // 1 minute timeout for individual tests
    hookTimeout: 60000, // 1 minute timeout for beforeAll/afterAll hooks
    // Several test files spin up their own MongoMemoryServer (src/server.ts's
    // connectMongo('memory') path). Vitest's default parallel file execution
    // races those instances on the same cached mongod binary download/lock
    // (~/.cache/mongodb-binaries/*.lock), which only surfaces when an
    // unscoped run (test:coverage, plain `test`) executes multiple of those
    // files together — the scoped CI jobs (test:unit/component/contract/
    // integration) each run in isolation and never hit it. Serializing file
    // execution trades some speed for not racing that lock.
    fileParallelism: false,
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        'src/main.ts',
        'src/index.ts',
        '**/*.d.ts'
      ]
    }
  },
  resolve: {
    alias: {
      '@tempsdarret/shared': path.resolve(__dirname, '../../packages/shared/src')
    }
  }
});