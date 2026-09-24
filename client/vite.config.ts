/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * The dev server proxies /api to the Express app, so the browser only ever
 * makes same-origin requests and CORS never enters the picture locally — the
 * same arrangement production uses, where the API serves the built client.
 *
 * The target is the IPv4 loopback literal, not `localhost`: the server binds
 * 127.0.0.1 by default, and `localhost` may resolve to ::1 first.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.API_URL ?? 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    restoreMocks: true,
    testTimeout: 20_000,
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
