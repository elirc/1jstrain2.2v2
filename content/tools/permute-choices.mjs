#!/usr/bin/env node
/**
 * One-off: deterministically permute the `choices` of every `mcq`, `output` and
 * `multi` question and remap `answer`, rewriting content/questions/*.js in place.
 *
 * Why: the original 389 single-answer questions had 363 answers at index 1
 * (see upskilling/04-journal J34). The server now shuffles choices on serve,
 * so this is belt and braces — it also fixes the authored order that the
 * module-page preview and any export show.
 *
 * How: the shuffle is seeded by the question id, so a re-run on the same
 * source gives the same result. The rewrite operates on source text, one
 * `q({ ... })` block at a time: the string tokens inside the `choices: [...]`
 * literal are reordered in their existing slots (so line breaks, indentation
 * and quote style survive), and the `answer:` literal is replaced. A block is
 * skipped and reported if its array does not round-trip exactly (e.g. string
 * concatenation inside the array).
 *
 * Usage (from content/):
 *   node tools/permute-choices.mjs --dry   # report what would change
 *   node tools/permute-choices.mjs         # rewrite the files, then verify
 *
 * Do NOT re-run it casually after authors have written new questions: it is
 * deterministic per id, but running it twice permutes twice.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const contentDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const questionsDir = path.join(contentDir, 'questions');
const DRY = process.argv.includes('--dry');
const TYPES = new Set(['mcq', 'output', 'multi']);

/** cyrb53: a small, well-distributed string hash. */
function hash(str, seed = 0) {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/** mulberry32 PRNG. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** perm[newIndex] = oldIndex, Fisher–Yates seeded by the question id. */
export function permutationFor(id, n) {
  const next = rng(hash(`stack-ready:${id}`));
  const perm = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  return perm;
}

function scanString(text, i) {
  const quote = text[i];
  let j = i + 1;
  while (j < text.length) {
    if (text[j] === '\\') {
      j += 2;
      continue;
    }
    if (text[j] === quote) return j + 1;
    if (quote !== '`' && (text[j] === '\n' || text[j] === '\r')) throw new Error('newline in string');
    j++;
  }
  throw new Error('unterminated string');
}

/** Scan `[ 'a', "b", ... ]`; every item must be a single string literal. */
function scanStringArray(text, i) {
  if (text[i] !== '[') throw new Error('choices is not an array literal');
  let j = i + 1;
  const items = [];
  for (;;) {
    while (/\s/.test(text[j])) j++;
    if (text[j] === ']') return { end: j + 1, items };
    if (!["'", '"'].includes(text[j])) throw new Error(`unexpected token ${JSON.stringify(text[j])} in choices`);
    const start = j;
    j = scanString(text, j);
    items.push({ start, end: j });
    while (/\s/.test(text[j])) j++;
    if (text[j] === ',') j++;
    else if (text[j] !== ']') throw new Error(`unexpected token ${JSON.stringify(text[j])} after a choice`);
  }
}

const evalLiteral = (src) => new Function(`return (${src});`)();

function fieldAt(text, from, to, field) {
  const re = new RegExp(`\\n(\\s+)${field}: `, 'g');
  re.lastIndex = from;
  const m = re.exec(text);
  if (!m || m.index > to) return null;
  return m.index + m[0].length;
}

function scanAnswer(text, i) {
  if (text[i] === '[') return text.indexOf(']', i) + 1;
  let j = i;
  while (/[0-9]/.test(text[j])) j++;
  return j;
}

/** Load the curriculum in a fresh process so edits on disk are seen. */
function snapshot() {
  const url = pathToFileURL(path.join(contentDir, 'index.js')).href;
  const code = `const m = await import(${JSON.stringify(url)});
process.stdout.write(JSON.stringify(m.questions.map((q) => ({ id: q.id, type: q.type, answer: q.answer, choices: q.choices?.map((c) => c.text) }))));`;
  const out = execFileSync(process.execPath, ['--input-type=module', '-e', code], {
    encoding: 'utf8',
    maxBuffer: 64 << 20,
  });
  return new Map(JSON.parse(out).map((q) => [q.id, q]));
}

const before = snapshot();
const skipped = [];
let permuted = 0;
let unchanged = 0;

for (const file of fs
  .readdirSync(questionsDir)
  .filter((f) => f.endsWith('.js'))
  .sort()) {
  const full = path.join(questionsDir, file);
  let text = fs.readFileSync(full, 'utf8');
  const blocks = [...text.matchAll(/\n(\s+)q\(\{\r?\n\s+id: '([^']+)',/g)];
  // Edit from the last block backwards so earlier offsets stay valid.
  for (let b = blocks.length - 1; b >= 0; b--) {
    const m = blocks[b];
    const id = m[2];
    const q = before.get(id);
    if (!q || !TYPES.has(q.type)) continue;
    const start = m.index;
    const end = text.indexOf(`\n${m[1]}}),`, start);
    try {
      const cAt = fieldAt(text, start, end, 'choices');
      const aAt = fieldAt(text, start, end, 'answer');
      if (cAt == null || aAt == null) throw new Error('choices/answer not found');
      const { items, end: cEnd } = scanStringArray(text, cAt);
      const tokens = items.map((it) => text.slice(it.start, it.end));
      const values = tokens.map(evalLiteral);
      if (JSON.stringify(values) !== JSON.stringify(q.choices)) throw new Error('choices do not round-trip');
      const aEnd = scanAnswer(text, aAt);
      const answerSrc = text.slice(aAt, aEnd);
      if (
        JSON.stringify(evalLiteral(answerSrc)) !==
          JSON.stringify(q.type === 'multi' ? [...q.answer].sort((x, y) => x - y) : q.answer) &&
        !(
          q.type === 'multi' &&
          JSON.stringify([...evalLiteral(answerSrc)].sort((x, y) => x - y)) === JSON.stringify(q.answer)
        )
      ) {
        throw new Error('answer does not round-trip');
      }

      const perm = permutationFor(id, tokens.length);
      if (perm.every((old, i) => old === i)) {
        unchanged++;
        continue;
      }
      const newPos = new Map(perm.map((old, i) => [old, i]));
      const newAnswer =
        q.type === 'multi'
          ? `[${q.answer
              .map((a) => newPos.get(a))
              .sort((x, y) => x - y)
              .join(', ')}]`
          : String(newPos.get(q.answer));

      // Rebuild the array source: same separators, tokens in the new order.
      let arraySrc = text.slice(cAt, items[0].start);
      perm.forEach((old, i) => {
        arraySrc += tokens[old];
        arraySrc += text.slice(items[i].end, i + 1 < items.length ? items[i + 1].start : cEnd);
      });
      // answer comes after choices in every block; replace it first.
      if (aAt < cEnd) throw new Error('answer precedes choices');
      text = text.slice(0, aAt) + newAnswer + text.slice(aEnd);
      text = text.slice(0, cAt) + arraySrc + text.slice(cEnd);
      permuted++;
    } catch (e) {
      skipped.push(`${id}: ${e.message}`);
    }
  }
  if (!DRY) fs.writeFileSync(full, text);
}

console.log(
  `${DRY ? '[dry] would permute' : 'permuted'} ${permuted} questions; ${unchanged} drew the identity permutation`,
);
if (skipped.length) console.log(`skipped (left untouched):\n  ${skipped.join('\n  ')}`);

if (!DRY) {
  const after = snapshot();
  const problems = [];
  for (const [id, q] of before) {
    const n = after.get(id);
    if (!n) {
      problems.push(`${id} disappeared`);
      continue;
    }
    if (!TYPES.has(q.type)) {
      if (JSON.stringify(q) !== JSON.stringify(n)) problems.push(`${id} (${q.type}) changed`);
      continue;
    }
    if ([...q.choices].sort().join('\u0000') !== [...n.choices].sort().join('\u0000'))
      problems.push(`${id} choice texts changed`);
    const key = (x) => (x.type === 'multi' ? x.answer.map((i) => x.choices[i]).sort() : [x.choices[x.answer]]);
    if (JSON.stringify(key(q)) !== JSON.stringify(key(n))) problems.push(`${id} correct choice text changed`);
  }
  if (problems.length) {
    console.error(`VERIFY FAILED:\n  ${problems.join('\n  ')}`);
    process.exit(1);
  }
  console.log(`verified: ${before.size} questions, every key still points at the same choice text`);
}
