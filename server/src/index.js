/**
 * Entry point.
 *
 * Deliberately built the way the curriculum says a small Express API should be:
 * validated config, an ordered middleware pipeline, routers per concern, a
 * single error translator at the end, and a graceful shutdown.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import { validateContent } from '@jstrain/content';
import { createStore } from './store.js';
import { createApiRouter } from './routes/api.js';

const here = path.dirname(fileURLToPath(import.meta.url));

const config = readConfig();

const contentReport = validateContent();
console.log(
  `[content] ${contentReport.counts.questions} questions across ${contentReport.counts.modules} modules in ${contentReport.counts.stages} stages.`,
);

const store = await createStore({ dataDir: config.dataDir });
console.log(`[store] using the ${store.backend} backend at ${config.dataDir}`);

// A brand-new install should be usable immediately rather than showing an
// empty profile picker.
if (store.listProfiles().length === 0) {
  const profile = store.createProfile('Me');
  console.log(`[store] created the default profile "${profile.name}"`);
}

const app = express();
app.disable('x-powered-by');

app.use(express.json({ limit: '64kb' }));
app.use(cors({ origin: config.corsOrigins, credentials: true }));
if (config.env !== 'test') app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));

app.get('/api/health', (req, res) => {
  res.json({
    data: {
      status: 'ok',
      env: config.env,
      storeBackend: store.backend,
      content: contentReport.counts,
      uptimeSeconds: Math.round(process.uptime()),
    },
  });
});

app.use('/api', createApiRouter({ store }));

// In production the built client is served from the same origin, which removes
// CORS from the picture entirely.
if (config.serveClient) {
  const clientDist = path.resolve(here, '../../client/dist');
  app.use(express.static(clientDist));
  app.get(/^(?!\/api\/).*/, (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.use((req, res) => {
  res.status(404).json({ error: { code: 'not_found', message: `No route for ${req.method} ${req.path}` } });
});

// Four parameters: this is how Express recognises error middleware.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status ?? 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    error: {
      code: err.code ?? 'internal_error',
      // Never hand a 5xx message to the client: it can carry file paths,
      // dependency versions or query text.
      message: status >= 500 ? 'Something went wrong.' : err.message,
    },
  });
});

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

function readConfig() {
  const env = process.env.NODE_ENV ?? 'development';
  const port = Number(process.env.PORT ?? 3001);
  if (!Number.isInteger(port) || port <= 0) {
    // Fail at boot rather than on the first request.
    throw new Error(`PORT must be a positive integer, got "${process.env.PORT}"`);
  }
  return {
    env,
    port,
    dataDir: process.env.DATA_DIR ?? path.resolve(here, '../data'),
    corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://localhost:4173')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    serveClient: process.env.SERVE_CLIENT === 'true' || env === 'production',
  };
}
