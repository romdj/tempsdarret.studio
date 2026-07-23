import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts']
    // Note: performance tests (tests/performance/**) are timing-based and
    // intentionally excluded from the default gate (pre-commit/pre-push/CI)
    // via `--exclude` on the `test`/`test:unit` scripts below, not here, so
    // `pnpm test:perf` (plain `vitest run tests/performance`) can still run
    // them on demand.
  }
});
