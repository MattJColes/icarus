import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: '.vite/renderer/main_window',
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          // Keep assets at the root level for easier access in Electron
          const info = assetInfo.name.split('.');
          const extType = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
            return `[name][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@features': resolve(__dirname, './src/features'),
      '@hooks': resolve(__dirname, './src/hooks'),
      '@theme': resolve(__dirname, './src/theme'),
      '@shared': resolve(__dirname, './src/shared'),
      '@services': resolve(__dirname, './src/services'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});