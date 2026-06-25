import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'access/index': 'src/access/index.ts',
    'collections/index': 'src/collections/index.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  target: 'node24',
  outDir: 'dist',
  splitting: false,
  sourcemap: true,
  treeshake: true,
});
