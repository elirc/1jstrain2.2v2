/**
 * Entry point.
 *
 * Deliberately built the way the curriculum says a small Express API should be:
 * validated config, an app factory with its dependencies passed in (app.js),
 * one place that opens resources, and a graceful shutdown that closes them in
 * order.
 */

import { validateContent } from '@jstrain/content';
import { createApp } from './app.js';
import { loadEnvFile, readConfig } from './config.js';
import { createShutdown } from './lifecycle.js';
import { createStore } from './store.js';

if (loadEnvFile()) console.log('[config] loaded server/.env');
const config = readConfig();

const contentReport = validateContent();
console.log(
  `[content] ${contentReport.counts.questions} questions across ${contentReport.counts.modules} modules in ${contentReport.counts.stages} stages.`,
);

const store = await createStore({ dataDir: config.dataDir });
console.log(`[store] using the ${store.backend} backend (schema v${store.schemaVersion}) at ${config.dataDir}`);

// A brand-new install should be usable immediately rather than showing an
// empty profile picker.
if (store.listProfiles().length === 0) {
  const profile = store.createProfile('Me');
  console.log(`[store] created the default profile "${profile.name}"`);
}

const app = createApp({ store, config, contentReport });

const server = app.listen(config.port, config.host, () => {
  const shown = config.host.includes(':') ? `[${config.host}]` : config.host;
  console.log(`[server] listening on http://${shown}:${config.port}`);
});
server.on('error', (err) => {
  console.error(`[server] could not listen on ${config.host}:${config.port}: ${err.message}`);
  store.close();
  process.exit(1);
});

// Stop taking requests, then close the store (SQLite checkpoints its WAL),
// then exit; the 5 s fallback closes the store too. See lifecycle.js.
const shutdown = createShutdown({ server, store });

// SIGBREAK is Ctrl+Break on Windows.
for (const signal of ['SIGINT', 'SIGTERM', 'SIGBREAK']) {
  process.on(signal, () => shutdown(`${signal} received`));
}
