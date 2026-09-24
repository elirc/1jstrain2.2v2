import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.js'],
    // Separate processes: better-sqlite3 is a native module and every suite
    // opens real files in a temp directory.
    pool: 'forks',
    // Streaks and due dates are local-calendar logic. Pin a zone with DST so
    // the DST tests mean the same thing on every machine and in CI;
    // test/srs.test.js asserts this took effect.
    env: { TZ: 'America/Los_Angeles' },
    // The seeded property tests in srs.test.js run thousands of scheduler
    // steps; on a loaded machine they can exceed the 5 s default.
    testTimeout: 30_000,
  },
});
