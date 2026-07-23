import { defineConfig } from 'vitest/config';

/**
 * In-process E2E config: boots the real services inside the test process and
 * drives them over a real Kafka + Mongo (no API gateway, no docker-compose
 * app containers). Deliberately has NO setupFiles — unlike vitest.config.ts,
 * it must not pull in the gateway-oriented e2e-setup.ts.
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
  }
});
