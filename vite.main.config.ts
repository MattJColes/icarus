import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'electron/main.ts'),
      formats: ['cjs'],
      fileName: () => 'main.js',
    },
    rollupOptions: {
      external: ['electron', 'path', 'fs', 'url', 'child_process', 'crypto', 'os'],
    },
    outDir: '.vite/build',
  },
  resolve: {
    alias: {
      '@main': resolve(__dirname, './electron'),
      '@shared': resolve(__dirname, './src/shared'),
    },
  },
});