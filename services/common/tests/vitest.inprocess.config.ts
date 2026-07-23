import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * In-process E2E config: boots the real services inside the test process and
 * drives them over a real Kafka + Mongo (no API gateway, no docker-compose
 * app containers). Deliberately has NO setupFiles — unlike vitest.config.ts,
 * it must not pull in the gateway-oriented e2e-setup.ts.
 *
 * Aliases `@tempsdarret/shared` to its SOURCE (mirroring every service's own
 * vitest.config.ts) so the booted services resolve it without a built `dist/`.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['e2e-inprocess/**/*.e2e.test.ts'],
    testTimeout: 60000,
    hookTimeout: 120000,
    // One service stack per file; never run these in parallel against the
    // shared broker/db.
    fileParallelism: false,
    pool: 'forks'
  },
  resolve: {
    alias: {
      '@tempsdarret/shared': path.resolve(__dirname, '../../../packages/shared/src')
    }
  }
});
