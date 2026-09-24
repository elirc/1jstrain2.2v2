/**
 * Fails if the built client bundle contains the content package, which would
 * mean every answer key ships to the browser (ADR-0002). ESLint's answer-key
 * guard stops the import; this proves the result, after `npm run build`.
 *
 *   node .github/scripts/answer-key-leak.mjs [client/dist/assets]
 *
 * Needles: two messages that exist only in content/schema.js, plus a plain-text
 * run taken from each question's `why`, which the client never receives
 * outside an answer response. Deriving them from the content means a rewritten
 * explanation cannot silently weaken the check.
 */

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { questions } from '../../content/index.js';

const dir = path.resolve(process.argv[2] ?? 'client/dist/assets');
const files = readdirSync(dir).filter((f) => f.endsWith('.js'));
if (!files.length) {
  console.error(`answer-key-leak: no .js files in ${dir}; run \`npm run build\` first`);
  process.exit(1);
}
const bundle = files.map((f) => readFileSync(path.join(dir, f), 'utf8')).join('\n');

// The longest run of characters that survives any JS string escaping.
const plainRun = (text) => (text.match(/[A-Za-z0-9 ,.]{30,}/g) ?? []).sort((a, b) => b.length - a.length)[0];

const needles = ['duplicate question id', 'missing explanation ("why")'];
for (const q of questions) {
  const run = plainRun(q.why);
  if (run) needles.push(run.trim());
}

const hits = needles.filter((n) => bundle.includes(n));
if (hits.length) {
  console.error(`::error::@jstrain/content was bundled into the client (${hits.length} match(es)), e.g. "${hits[0]}"`);
  process.exit(1);
}
console.log(`answer-key-leak: ${files.length} bundle file(s) clean against ${needles.length} needles`);
