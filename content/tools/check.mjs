#!/usr/bin/env node
/**
 * `npm run check:content`: validate the curriculum exactly as the server does
 * at boot, then print the counts and a warning summary.
 *
 *   node content/tools/check.mjs            problems fail (exit 1), warnings print
 *   node content/tools/check.mjs --strict   warnings fail too
 *
 * validateContent() throws on problems (the same list that stops the server
 * from starting) and console.warns each warning; this wrapper only adds the
 * exit code, so there is one set of rules, in content/index.js and lint.js.
 */
import { validateContent } from '../index.js';

const strict = process.argv.includes('--strict');

let result;
try {
  result = validateContent();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const { counts, warnings } = result;
const tracks = Object.entries(counts)
  .filter(([key]) => key.startsWith('track:'))
  .map(([key, n]) => `${key.slice(6)} ${n}`)
  .join(', ');
console.log(
  `${counts.questions} questions, ${counts.modules} modules, ${counts.stages} stages, ${counts.tracks} tracks (${tracks})`,
);
console.log(`${warnings.length} warning(s)${strict ? ' (strict: warnings fail)' : ''}`);
process.exit(strict && warnings.length ? 1 : 0);
