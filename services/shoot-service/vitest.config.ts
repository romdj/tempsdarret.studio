import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
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