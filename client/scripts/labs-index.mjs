#!/usr/bin/env node
/**
 * Counts the numbered problems in every jstrain exercise file and writes
 * `client/src/labs.generated.json`, which the Code labs page reads instead of
 * hard-coding counts that drift (they had: see journal J44).
 *
 * A problem is a `PROBLEM <n>` marker; each distinct number counts once per
 * file. Run by `prebuild` and `pretest`. When `../jstrain` is absent (a
 * checkout without the problem set) it leaves the committed JSON untouched and
 * exits 0, so a build never fails for the lack of a sibling folder.
 */

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const exercises = join(here, '..', '..', 'jstrain', 'exercises');
const out = join(here, '..', 'src', 'labs.generated.json');

if (!existsSync(exercises)) {
  console.log(`labs-index: ${exercises} not found; keeping the committed labs.generated.json.`);
  process.exit(0);
}

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const files = {};
for (const file of walk(exercises).sort()) {
  if (!/\.(m?[jt]sx?)$/.test(file)) continue;
  const numbers = new Set();
  for (const match of readFileSync(file, 'utf8').matchAll(/PROBLEM (\d+)/g)) numbers.add(match[1]);
  files[relative(exercises, file).split(sep).join('/')] = numbers.size;
}

const next = `${JSON.stringify({ source: 'jstrain/exercises', files }, null, 2)}\n`;
const previous = existsSync(out) ? readFileSync(out, 'utf8') : '';
if (next !== previous) {
  writeFileSync(out, next);
  console.log(`labs-index: wrote ${Object.keys(files).length} files to src/labs.generated.json.`);
} else {
  console.log('labs-index: counts unchanged.');
}
