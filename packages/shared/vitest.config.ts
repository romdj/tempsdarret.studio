import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      // No coverage config existed before, so this package relied entirely
      // on Vitest's default reporter set (text/html/clover/json) - no lcov,
      // so it never produced an lcov.info for Sonar to read despite
      // test:coverage running successfully.
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        'test/',
        'tests/',
        '**/*.d.ts'
      ]
    }
  }
});
