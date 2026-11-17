import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root,
  plugins: [
    react(),
    legacy({
      targets: [
        'iOS >= 10',
        'Safari >= 10',
        'Chrome >= 55',
        'Firefox >= 55',
        'Edge >= 15',
        'not IE 11',
      ],
      modernPolyfills: true,
    }),
  ],
  server: {
    port: 5173,
    host: '127.0.0.1',
    proxy: {
      '/api': 'http://127.0.0.1:4000',
      '/uploads': 'http://127.0.0.1:4000',
    },
  },
  build: {
    outDir: path.join(root, 'dist'),
    emptyOutDir: true,
    // Keep the modern bundle runnable on older Safari/Chrome, not just the
    // newest "baseline" browsers. The legacy plugin covers pre-module engines.
    target: ['safari12', 'chrome64', 'firefox60', 'edge79'],
    cssTarget: ['safari12', 'chrome64'],
  },
});

