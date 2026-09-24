/**
 * The Express app, without a port.
 *
 * `createApp()` takes everything from outside — the store, the config, the
 * clock and the random source — so tests can build a real app against a temp
 * store, `listen(0)` and use plain `fetch`, and move time forward without
 * touching the system clock. index.js is the only place that reads the
 * environment, opens the real store and listens.
 */

import fs from 'node:fs';
import path from 'node:path';

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import { ERROR_CODES } from './errors.js';
import { createApiRouter } from './routes/api.js';

export const JSON_LIMIT = '64kb';
export const IMPORT_LIMIT = '10mb';

/**
 * @param {object} deps
 * @param {any} deps.store
 * @param {ReturnType<typeof import('./config.js').readConfig>} deps.config
 * @param {{ counts: Record<string, number> }} deps.contentReport
 * @param {() => Date} [deps.now]
 * @param {() => number} [deps.rng]
 */
export function createApp({ store, config, contentReport, now = () => new Date(), rng = Math.random }) {
  const app = express();
  app.disable('x-powered-by');

  // CORS first, so even a request that fails body parsing carries the headers
  // and the browser reports the real 400 instead of a CORS error. No
  // `credentials`: nothing here uses cookies.
  app.use(cors({ origin: config.corsOrigins }));
  if (config.env !== 'test') app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));

  // The import route needs a bigger body than everything else. It has to be
  // mounted before the global parser: once that one has rejected (413) or
  // parsed a body, a later parser never sees it.
  app.post('/api/profiles/import', express.json({ limit: IMPORT_LIMIT }));
  app.use(express.json({ limit: JSON_LIMIT }));

  app.get('/api/health', (req, res) => {
    res.json({
      data: {
        status: 'ok',
        env: config.env,
        storeBackend: store.backend,
        storeFallbackReason: store.fallbackReason ?? null,
        schemaVersion: store.schemaVersion,
        content: contentReport.counts,
        uptimeSeconds: Math.round(process.uptime()),
      },
    });
  });

  app.use('/api', createApiRouter({ store, now, rng }));

  // In production the built client is served from the same origin, which
  // removes CORS from the picture entirely.
  if (config.serveClient) {
    const clientDist = config.clientDist;
    const indexHtml = path.join(clientDist, 'index.html');
    if (!fs.existsSync(indexHtml)) {
      console.warn(`[server] SERVE_CLIENT is on but ${indexHtml} does not exist; run "npm run build" first.`);
    } else {
      app.use(express.static(clientDist));
      // Client-side routes get index.html; `/api` itself and anything that
      // looks like a file (a stale hashed asset after a rebuild) must 404
      // instead of being answered with HTML the browser would try to run.
      app.get(/^(?!\/api(\/|$)).*/, (req, res, next) => {
        if (path.extname(req.path) || !req.accepts('html')) return next();
        res.sendFile(indexHtml);
      });
    }
  }

  app.use((req, res) => {
    res.status(404).json({ error: { code: 'not_found', message: `No route for ${req.method} ${req.path}` } });
  });

  // Four parameters: this is how Express recognises error middleware.
  app.use((err, req, res, next) => {
    const { status, body } = toErrorResponse(err);
    if (status >= 500) console.error(err);
    if (res.headersSent) return next(err);
    res.status(status).json(body);
  });

  return app;
}

/**
 * The single error translator. Codes pass through only from the allowlist;
 * body-parser failures are recognised by `err.type`; everything else becomes a
 * generic message so file paths and library internals never reach a client.
 */
export function toErrorResponse(err) {
  let status = Number(err?.status ?? err?.statusCode) || 500;
  if (status < 400 || status > 599) status = 500;

  let code;
  let message = err?.message ?? 'Something went wrong.';
  if (err?.type === 'entity.parse.failed') {
    status = 400;
    code = 'invalid_json';
    message = 'The request body is not valid JSON.';
  } else if (err?.type === 'entity.too.large') {
    status = 413;
    code = 'payload_too_large';
    message = `The request body is over the ${formatLimit(err.limit ?? 0)} limit.`;
  } else if (status >= 500) {
    code = 'internal_error';
    // Never hand a 5xx message to the client: it can carry file paths,
    // dependency versions or query text.
    message = 'Something went wrong.';
  } else if (ERROR_CODES.includes(err?.code)) {
    code = err.code;
  } else if (status === 404) {
    code = 'not_found';
    message = 'Not found.';
  } else {
    code = 'validation_failed';
    message = 'The request could not be processed.';
  }

  return {
    status,
    body: {
      error: { code, message, ...(err?.details && ERROR_CODES.includes(err?.code) ? { details: err.details } : {}) },
    },
  };
}

/** body-parser reports its limit in bytes; "10 MB" reads better than "10240 kB". */
function formatLimit(bytes) {
  return bytes >= 1024 * 1024 ? `${Math.round(bytes / (1024 * 1024))} MB` : `${Math.round(bytes / 1024)} kB`;
}
