import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 60000, // 60 seconds for E2E tests
    hookTimeout: 120000, // 2 minutes for setup/teardown
    setupFiles: ['./setup/e2e-setup.ts'],
    include: [
      'e2e/**/*.e2e.test.ts'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['e2e/**/*.ts'],
      exclude: [
        'setup/**/*',
        '**/*.d.ts',
        'vitest.config.ts'
      ]
    },
    // Sequence-based test organization
    reporters: ['verbose'],
    outputFile: {
      junit: './reports/e2e-results.xml'
    }
  }
});