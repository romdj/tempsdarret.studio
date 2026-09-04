import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 60000,
    hookTimeout: 60000,
    // tests/support/test-infra.ts drives a single global mongoose
    // connection (src/config/database.ts's connect/disconnect). Vitest's
    // default parallel file execution lets one file's afterAll disconnect
    // race another file's still-running queries under an unscoped run
    // (test:coverage, plain `test`) -> "Connection operation buffering
    // timed out" (CI run 33916206430). The scoped CI jobs (test:unit/
    // component/integration) never hit this, each runs in its own isolated
    // job. Same fix as user-service/invitation-service/shoot-service.
    fileParallelism: false,
    coverage: {
      provider: 'v8',
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
