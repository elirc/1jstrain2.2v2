export {}; // makes this file a module, so top-level await is allowed

// Only the React/capstone-UI suites run in a DOM environment (see
// `environmentMatchGlobs` in vitest.config.ts). The plain JS and TS suites run
// in Node, which starts much faster — so load the DOM helpers lazily.
if (typeof document !== 'undefined') {
  await import('@testing-library/jest-dom/vitest');
  const { cleanup } = await import('@testing-library/react');
  const { afterEach } = await import('vitest');
  afterEach(() => {
    cleanup();
  });
}
