/**
 * Configuration, read once at boot and validated there, so a typo in an
 * environment variable fails the start-up rather than the first request.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * Load server/.env if there is one (Node >= 20.12, no dotenv). Values already
 * in the environment win, so `PORT=4000 npm run dev` still overrides the file.
 */
export function loadEnvFile(file = path.resolve(here, '../.env')) {
  try {
    process.loadEnvFile(file);
    return true;
  } catch {
    return false;
  }
}

export function readConfig(env = process.env) {
  const nodeEnv = env.NODE_ENV ?? 'development';

  const port = Number(env.PORT ?? 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`PORT must be an integer from 1 to 65535, got "${env.PORT}"`);
  }

  // Loopback by default: the API has no authentication (a profile id is a
  // "who is sitting here" switch), so it must not be reachable from the LAN
  // unless someone deliberately sets HOST=0.0.0.0.
  const host = env.HOST?.trim() || '127.0.0.1';

  // Tri-state: explicit true/false wins, otherwise on in production only.
  let serveClient = nodeEnv === 'production';
  if (env.SERVE_CLIENT !== undefined && env.SERVE_CLIENT !== '') {
    if (!['true', 'false'].includes(env.SERVE_CLIENT)) {
      throw new Error(`SERVE_CLIENT must be "true" or "false", got "${env.SERVE_CLIENT}"`);
    }
    serveClient = env.SERVE_CLIENT === 'true';
  }

  return {
    env: nodeEnv,
    host,
    port,
    // Relative to server/, whatever the working directory: `npm -w server` runs
    // in server/, `node server/src/index.js` runs at the root, and both must
    // find the same database. Absolute paths stay absolute.
    dataDir: path.resolve(here, '..', env.DATA_DIR || 'data'),
    corsOrigins: (
      env.CORS_ORIGINS ?? 'http://localhost:5173,http://localhost:4173,http://127.0.0.1:5173,http://127.0.0.1:4173'
    )
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    serveClient,
    clientDist: path.resolve(here, '../../client/dist'),
  };
}
