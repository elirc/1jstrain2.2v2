import { describe, expect, it } from 'vitest';
import { validateContent } from '@jstrain/content';

import { createApp } from '../src/app.js';
import { createShutdown } from '../src/lifecycle.js';
import { backends, testConfig } from './helpers.js';

const quiet = { log: () => {}, error: () => {} };

/** A server double that records the order of calls and lets the test decide when close() completes. */
function fakeServer(events) {
  let onClosed;
  return {
    close: (cb) => {
      events.push('server.close');
      onClosed = cb;
    },
    closeIdleConnections: () => events.push('closeIdleConnections'),
    finishClosing: () => onClosed?.(),
  };
}

describe('createShutdown', () => {
  it('stops the server, drops idle sockets, closes the store, then exits with the given code — in that order', () => {
    const events = [];
    const server = fakeServer(events);
    const store = { close: () => events.push('store.close') };
    const exit = (code) => events.push(`exit(${code})`);
    const shutdown = createShutdown({ server, store, exit, log: quiet, setTimer: () => ({ unref() {} }) });

    expect(shutdown('SIGINT received')).toBe(true);
    // The store must not close while requests may still be in flight.
    expect(events).toEqual(['server.close', 'closeIdleConnections']);
    server.finishClosing();
    expect(events).toEqual(['server.close', 'closeIdleConnections', 'store.close', 'exit(0)']);
  });

  it('is single-flight: a second signal while closing does nothing', () => {
    const events = [];
    const server = fakeServer(events);
    const shutdown = createShutdown({
      server,
      store: { close: () => events.push('store.close') },
      exit: () => events.push('exit'),
      log: quiet,
      setTimer: () => ({ unref() {} }),
    });
    expect(shutdown('SIGINT received')).toBe(true);
    expect(shutdown('SIGINT received')).toBe(false);
    expect(shutdown('SIGTERM received')).toBe(false);
    expect(events.filter((e) => e === 'server.close')).toHaveLength(1);
  });

  it('when the server never finishes closing, the timeout still closes the store and exits 1 — once', () => {
    const events = [];
    const server = fakeServer(events);
    let fire;
    const setTimer = (fn) => {
      fire = fn;
      return { unref: () => events.push('unref') };
    };
    const shutdown = createShutdown({
      server,
      store: { close: () => events.push('store.close') },
      exit: (c) => events.push(`exit(${c})`),
      log: quiet,
      setTimer,
    });
    shutdown('SIGTERM received');
    expect(events).toContain('unref');
    fire();
    expect(events.slice(-2)).toEqual(['store.close', 'exit(1)']);
    // A late server close after the timeout must not close or exit again.
    server.finishClosing();
    expect(events.filter((e) => e.startsWith('exit'))).toEqual(['exit(1)']);
  });

  it('a store that throws on close does not prevent the exit', () => {
    const events = [];
    const server = fakeServer(events);
    const errors = [];
    const shutdown = createShutdown({
      server,
      store: {
        close: () => {
          throw new Error('disk gone');
        },
      },
      exit: (c) => events.push(`exit(${c})`),
      log: { log: () => {}, error: (...a) => errors.push(a) },
      setTimer: () => ({ unref() {} }),
    });
    shutdown('SIGINT received', 3);
    server.finishClosing();
    expect(events.at(-1)).toBe('exit(3)');
    expect(errors[0][1].message).toBe('disk gone');
  });

  describe.each(backends)('against a real listening app on %s', (backend, make) => {
    it('closes the port and the store; later writes are refused and the port is free', async () => {
      const ctx = await make();
      try {
        const app = createApp({ store: ctx.store, config: testConfig(), contentReport: validateContent() });
        const server = await new Promise((resolve) => {
          const s = app.listen(0, '127.0.0.1', () => resolve(s));
        });
        const base = `http://127.0.0.1:${server.address().port}`;
        // A keep-alive connection that would otherwise hold close() open.
        expect((await fetch(`${base}/api/health`)).status).toBe(200);

        const code = await new Promise((resolve) => {
          createShutdown({ server, store: ctx.store, exit: resolve, log: quiet, timeoutMs: 2000 })('test');
        });
        expect(code).toBe(0);
        expect(server.listening).toBe(false);
        await expect(fetch(`${base}/api/health`)).rejects.toThrow();
        // The store is closed: SQLite throws on a closed handle, JSON refuses writes.
        expect(() => ctx.store.createProfile('late')).toThrow();
      } finally {
        try {
          ctx.cleanup();
        } catch {
          /* the store may already be closed; the directory removal is what matters */
        }
      }
    });
  });
});
