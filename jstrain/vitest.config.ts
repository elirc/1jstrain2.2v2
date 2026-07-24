import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// When JSTRAIN_SOLUTIONS=1, every `@ex/...` import resolves to the reference
// solutions instead of your work-in-progress files. That is how
// `npm run verify:solutions` proves the tests themselves are solvable.
const useSolutions = process.env.JSTRAIN_SOLUTIONS === '1';
const root = useSolutions ? './solutions' : './exercises';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@ex': fileURLToPath(new URL(root, import.meta.url)),
    },
  },
  test: {
    // Node is the default because it boots in milliseconds; only the suites
    // that render components need a fake browser.
    environment: 'node',
    environmentMatchGlobs: [
      ['tests/react/**', 'jsdom'],
      ['tests/capstone/**', 'jsdom'],
    ],
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{js,ts,tsx}'],
    typecheck: {
      include: ['tests/**/*.test-d.ts'],
      tsconfig: useSolutions ? './tsconfig.solutions.json' : './tsconfig.json',
    },
  },
});
