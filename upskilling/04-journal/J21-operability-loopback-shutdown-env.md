---
id: J21
title: Bind to loopback, close the store on shutdown, and load .env
area: server
closes: [F-21, F-22, M-04, M-15, M-09]
ladder: [B15, B16]
adrs: [0006 amended]
status: landed
---

# Bind to loopback, close the store on shutdown, and load .env

Date 2026-09-24 · Author Claude (server implementer) · Area server · Commit uncommitted working tree (baseline 6f1bf43)
Closes F-21, F-22, M-04, M-15 (the `.env` and `DATA_DIR` part; the Node floor and `allowScripts` are J02's), M-09 (unassigned; taken here) · Ladder B15, B16 · ADRs 0006 amended (this entry: the condition the header depends on is now enforced by default)

## Symptom

Four operational traps, each reproduced at `6f1bf43`:

- **Anyone on the network can use the API.** `netstat` showed `0.0.0.0:3998` (server review). There is no authentication (ADR-0006), so a laptop on café Wi-Fi exposes `DELETE /api/profiles/:id` and `POST /api/progress/reset` to the room.
- **Shutdown never closes the store.** Ctrl+C runs `server.close(() => process.exit(0))`. SQLite is never checkpointed, and `progress.db-wal` (177 kB in the review) lingers. The 5-second timeout exits 1 without closing anything.
- **`server/.env.example` says "Copy to .env", and nothing reads `.env`.** Its `DATA_DIR=./data` would resolve against the working directory, which is `server/` under `npm -w` but the repo root under `node server/src/index.js`.
- **The last profile can be deleted** (M-09). The running app then has no profile until a restart, and the client shows "Picking your questions" forever.

## Root cause

`server/src/index.js › app.listen (L87–97 @ 6f1bf43)`
```js
const server = app.listen(config.port, () => {
  console.log(`[server] listening on http://localhost:${config.port}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    console.log(`\n[server] ${signal} received, shutting down`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000).unref();
  });
}
```

`server/src/index.js › readConfig (L99–116 @ 6f1bf43)` reads `process.env` only. `PORT=70000` passes its check, and `SERVE_CLIENT=false` cannot turn the client off in production. `server/src/routes/api.js › deleteProfile (L36–39 @ 6f1bf43)` has no guard. `cors({ …, credentials: true })` enables a mode nothing uses (F-22). The invariant, from ADR-0006: *the header is a "who is sitting here" switch, which is safe only if nobody else can reach the port.* The code did not meet its own condition.

## Options

| | Option | What it costs | Why (not) |
|---|---|---|---|
| A | Do nothing | Nothing | The ADR's safety condition stays false by default. |
| B | Add real authentication | A login flow | Wrong-sized for one learner on one machine (B15). |
| C | A `Host` allowlist middleware (DNS rebinding) | ~6 lines | Useful, and not in this release (CONTRACT §Decisions). Loopback is the larger hole. |
| D | `HOST` defaulting to `127.0.0.1`; single-flight shutdown that closes the server, then the store; `process.loadEnvFile`; `DATA_DIR` relative to `server/`; `409 last_profile` | ~60 lines | **Chosen.** |

## Decision and trade-off

I chose D. `HOST=0.0.0.0` is still available, deliberately and documented. Shutdown is single-flight (a second Ctrl+C is ignored). It listens for `SIGINT`, `SIGTERM` and `SIGBREAK` (Ctrl+Break on Windows), stops accepting connections, closes idle keep-alive sockets, then calls `store.close()`, which runs `wal_checkpoint(TRUNCATE)`. The 5-second fallback also closes the store. `.env` is loaded with Node's built-in `process.loadEnvFile`, with no dotenv. Real environment variables win over the file; I checked that (`PORT=9` in the shell beat `PORT=1` in the file). Deleting the only profile answers `409 last_profile`.

What it costs: the Vite dev proxy has to target `http://127.0.0.1:3001`, because `localhost` can resolve to `::1` first and would miss an IPv4-only listener. That is the client's `vite.config.ts`, which I do not own. It is listed as a follow-up for the client implementer. Revisit loopback if the app is ever deployed for more than one learner: that is when ADR-0006's header stops being enough and real authentication starts.

## The change

`server/src/config.js` (new): `readConfig(env)` (HOST, PORT 1–65535, tri-state `SERVE_CLIENT`, `DATA_DIR` resolved against `server/`) and `loadEnvFile()`. `server/src/index.js`: `listen(port, host)`, `shutdown()`, a listen-error handler that closes the store. `server/src/app.js`: `cors` without `credentials`, before the body parser. `server/src/routes/profiles.js`: the 409. `server/.env.example` documents `HOST` and the new `DATA_DIR` rule.

After, `server/src/index.js` (working tree):
```js
  server.close(() => finish(code));
  // Keep-alive connections would otherwise hold close() open.
  server.closeIdleConnections?.();
  setTimeout(() => finish(1), 5000).unref();
```

## Verification

1. `server/test/http.test.js` › `readConfig` › *binds loopback by default, validates PORT and parses SERVE_CLIENT as a tri-state*, and *resolves a relative DATA_DIR against server/, not the working directory*. At the baseline, `readConfig` is not exported and has no `host`.
2. `server/test/store.test.js` › *close() checkpoints the WAL, so no -wal/-shm files are left behind*: after `close()` the directory holds only `progress.db`.
3. `server/test/http.test.js` › *deleting the last profile → 409 last_profile; with two, 204*.
4. Manual: `PORT=3997 DATA_DIR=<scratch> node src/index.js`, then `netstat -ano | grep 3997` → `TCP 127.0.0.1:3997 … LISTENING`. A hard kill (`Stop-Process -Force`) leaves `-wal`/`-shm` as expected, and the next `createStore` replays and checkpoints them.

## What a senior reviewer would ask

- *Can you test the signal path on Windows?* Not reliably: Node emulates `SIGINT` only from a console Ctrl+C. What is tested is the part that matters, `store.close()`. The handler around it is ten lines.
- *Why not handle `uncaughtException`?* A process in an unknown state should die. The WAL replays on the next open, so a crash loses nothing that was committed.
- *Does `loadEnvFile` override a variable set in the shell?* No. I verified that ordering before relying on it, because the README promises it.

## The junior version of this fix

`app.listen(port, 'localhost')`. It reads as loopback, and it passes review. On a machine where `localhost` resolves to `::1` it binds IPv6 only, and the Vite proxy (still targeting `localhost`, which Node may resolve to `127.0.0.1`) gets `ECONNREFUSED` on some machines and not others. The explicit `127.0.0.1` on both sides is the point.

## Follow-ups

- [ ] Client: Vite proxy target `http://127.0.0.1:3001` → client implementer (CONTRACT §13)
- [ ] `Host` allowlist against DNS rebinding → not in this release

## Update 2026-09-24

`shutdown()` moved out of `index.js` into `server/src/lifecycle.js › createShutdown({ server, store, exit, log, timeoutMs, setTimer })`, so the answer above about the signal path on Windows no longer means the ordering is untested. `server/test/lifecycle.test.js` asserts server close → idle sockets dropped → store closed → exit, single flight, the timeout closing the store and exiting 1 exactly once (the original could call `finish()` twice when the server closed after the timeout, harmless only because `process.exit` never returns), and a real `listen(0)` app whose store refuses writes after shutdown, on both backends. `index.js` keeps only the signal wiring; the "After" snippet above now lives in `lifecycle.js`.
