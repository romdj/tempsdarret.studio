import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 30000,
    hookTimeout: 60000,
    // tests/setup.ts's beforeAll calls MongoMemoryServer.create() per test
    // file. Vitest's default parallel file execution lets multiple files
    // race on the same cached mongod binary download/lock
    // (~/.cache/mongodb-binaries/*.lock) - same root cause already fixed
    // for user-service/invitation-service/shoot-service (cb759a1) and
    // portfolio-service (7c5a43f). Missed this one because it isn't
    // test:coverage that triggers it here - file-service's test:unit
    // itself is scoped to two directories (tests/services + tests/handlers)
    // so it already runs multiple files together. Only surfaced in CI (run
    // 33918820213), not locally, because CI always starts with a cold
    // mongodb-binaries cache - the race needs a concurrent *download*, and
    // a locally-warm cache mostly just starts already-downloaded binaries.
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        'src/main.ts',
        'src/server.ts',
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
