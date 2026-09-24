/**
 * Graceful shutdown, apart from the signals that trigger it.
 *
 * Signals cannot be delivered to a Node process on Windows from a test, so
 * the part that matters — the order: stop accepting connections, drop idle
 * keep-alive sockets, close the store (SQLite checkpoints its WAL), exit —
 * lives here with its dependencies injected, and index.js only wires signals
 * to it.
 */

/**
 * @param {object} deps
 * @param {{ close: (cb: (err?: Error) => void) => void, closeIdleConnections?: () => void }} deps.server
 * @param {{ close: () => void }} deps.store
 * @param {(code: number) => void} [deps.exit]
 * @param {{ log: (...a: any[]) => void, error: (...a: any[]) => void }} [deps.log]
 * @param {number} [deps.timeoutMs]  how long to wait for in-flight requests
 * @param {typeof setTimeout} [deps.setTimer]
 * @returns {(reason: string, code?: number) => boolean}  true when this call started the shutdown
 */
export function createShutdown({
  server,
  store,
  exit = (code) => process.exit(code),
  log = console,
  timeoutMs = 5000,
  setTimer = setTimeout,
}) {
  // Single-flight: a second Ctrl+C while closing must not run this twice.
  let stopping = false;
  return function shutdown(reason, code = 0) {
    if (stopping) return false;
    stopping = true;
    log.log(`\n[server] ${reason}, shutting down`);

    // The store is closed after the server stops taking requests, so no
    // answer is half-written. Both the clean path and the timeout reach
    // finish(); whichever comes first wins.
    let finished = false;
    const finish = (exitCode) => {
      if (finished) return;
      finished = true;
      try {
        store.close();
      } catch (err) {
        log.error('[store] close failed', err);
      }
      exit(exitCode);
    };

    server.close(() => finish(code));
    // Keep-alive connections would otherwise hold close() open.
    server.closeIdleConnections?.();
    const timer = setTimer(() => finish(1), timeoutMs);
    timer?.unref?.();
    return true;
  };
}
