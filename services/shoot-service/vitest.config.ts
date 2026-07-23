import { defineConfig } from 'vitest/config';
import path from 'path';

// Two projects so the tiers own their database lifecycle independently:
// - `default` shares an in-memory MongoDB via tests/setup.ts.
// - `component` owns a real testcontainer connection (started inside the suite),
//   so it must NOT run the global mongo setup — that caused a double connect and
//   an authenticated-teardown failure.
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 60000,
    hookTimeout: 60000,
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        'src/main.ts',
        'src/index.ts',
        '**/*.d.ts'
      ]
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'default',
          include: [
            'tests/unit/**/*.test.ts',
            'tests/services/**/*.test.ts',
            'tests/contract/**/*.test.ts',
            'tests/integration/**/*.test.ts'
          ],
          setupFiles: ['./tests/setup.ts']
        }
      },
      {
        extends: true,
        test: {
          name: 'component',
          include: ['tests/component/**/*.test.ts'],
          testTimeout: 120000,
          hookTimeout: 120000
        }
      }
    ]
  },
  resolve: {
    alias: {
      '@tempsdarret/shared': path.resolve(__dirname, '../../packages/shared/src')
    }
  }
});
