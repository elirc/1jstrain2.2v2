#!/usr/bin/env node
// upskilling/_tools/register-status.mjs
//
// Sets the Status column of every F-xx and M-xx row in
// upskilling/10-findings-register.md from the journal, so that nobody marks a
// row closed by hand.
//
//   closed (Jnn, ...)   every J number in the row's Owner cell is a landed entry
//                        that lists the row under `closes:`, and together they
//                        close all of it (one closes it outright, or two or more
//                        close complementary parts);
//   partial (Jnn, ...)  at least one landed entry lists the row, but an owner
//                        entry has not landed or every landed entry says "part";
//   open                no landed entry lists the row.
//
// Front matter `closes:` decides WHICH rows an entry touches. The entry's byline
// ("Closes F-07 (server half), ...", line ~14) decides HOW MUCH: a qualifier that
// says "part" or "half" is partial, unless it starts with "rest" or "with Jnn".
// Entries that are `draft` or `in review` never close anything.
//
// Usage (from the repo root):
//   node upskilling/_tools/register-status.mjs          rewrite the Status cells
//   node upskilling/_tools/register-status.mjs --check  do not write; exit 1 if the
//        register disagrees with the entries, if an entry closes an id the register
//        does not have, or if a row that is not closed (or is closed by two or more
//        entries) is missing from the latest "## Reconciliation" section.
// No dependencies; Node 20+.

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const upskilling = resolve(here, '..');
const journalDir = join(upskilling, '04-journal');
const registerPath = join(upskilling, '10-findings-register.md');
const checkOnly = process.argv.includes('--check');

const problems = [];

// ---------- entries ----------

function frontMatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(text);
  if (!m) return null;
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z_]+)\s*:\s*(.*)$/.exec(line);
    if (!kv) continue;
    const v = kv[2].trim();
    data[kv[1]] =
      v.startsWith('[') && v.endsWith(']')
        ? v
            .slice(1, -1)
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : v.replace(/^(['"])(.*)\1$/, '$2');
  }
  return data;
}

/** Map of row id -> 'full' | 'part', from the "Closes ..." byline. */
function bylineScope(text) {
  const line = text.split(/\r?\n/).find((l) => /^Closes\s/.test(l));
  const scope = new Map();
  if (!line) return scope;
  const closes = line.replace(/^Closes\s+/, '').split(' · ')[0];
  for (const m of closes.matchAll(/\b([FM]-\d{2})\b(?:\s*\(([^)]*)\))?/g)) {
    const q = (m[2] ?? '').trim();
    const full = !q || /^rest\b/i.test(q) || /^with J\d+/i.test(q) || !/\b(part|half)\b/i.test(q);
    scope.set(m[1], full ? 'full' : 'part');
  }
  return scope;
}

const jNumber = (f) => Number(/^J(\d+)/.exec(f)[1]);
const entries = readdirSync(journalDir)
  .filter((f) => /^J\d{2,3}[a-z]?-.+\.md$/.test(f))
  .sort((a, b) => jNumber(a) - jNumber(b) || a.localeCompare(b))
  .map((file) => {
    const text = readFileSync(join(journalDir, file), 'utf8');
    const fm = frontMatter(text) ?? {};
    if (!fm.id) problems.push(`${file}: no front matter id`);
    const closes = Array.isArray(fm.closes) ? fm.closes : [];
    const scope = bylineScope(text);
    for (const id of scope.keys()) {
      if (!closes.includes(id)) {
        problems.push(`${file}: the byline closes ${id} but front matter "closes:" does not list it`);
      }
    }
    return { id: fm.id, file, status: fm.status, closes, scope };
  });

// ---------- register ----------

const ROW = /^\|\s*([FM]-\d{2})\s*\|/;
const TAIL = /\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|\s*$/; // Owner, Status (neither contains a pipe)

const original = readFileSync(registerPath, 'utf8');
const eol = original.includes('\r\n') ? '\r\n' : '\n';
const lines = original.split(/\r?\n/);
const rows = new Map();

// Only the tables under "## The register" are rows; later sections quote ids too.
const tableStart = lines.findIndex((l) => /^## The register\b/.test(l));
const tableEnd = lines.findIndex((l, i) => i > tableStart && /^## /.test(l));
if (tableStart === -1) problems.push('register: no "## The register" section');

lines.forEach((line, i) => {
  if (i <= tableStart || (tableEnd !== -1 && i >= tableEnd)) return;
  const id = ROW.exec(line)?.[1];
  if (!id) return;
  const tail = TAIL.exec(line);
  if (!tail) {
    problems.push(`register row ${id}: cannot find the Owner and Status cells`);
    return;
  }
  if (rows.has(id)) problems.push(`register: ${id} appears twice`);
  rows.set(id, { i, owner: tail[1], status: tail[2] });
});

for (const e of entries) {
  for (const id of e.closes) {
    if (!rows.has(id)) problems.push(`${e.file}: closes ${id}, which is not a row in the register`);
  }
}

function computeStatus(id, owner) {
  const touching = entries.filter((e) => e.closes.includes(id));
  const landed = touching.filter((e) => e.status === 'landed');
  const pending = touching.filter((e) => e.status !== 'landed');
  if (landed.length === 0) return { status: 'open', landed, pending };
  const required = [...owner.matchAll(/\bJ\d{2,3}[a-z]?\b/g)].map((m) => m[0]);
  const covered = required.every((j) => landed.some((e) => e.id === j));
  const whole = landed.some((e) => (e.scope.get(id) ?? 'full') === 'full') || landed.length >= 2;
  const ids = landed.map((e) => e.id).join(', ');
  return { status: covered && whole ? `closed (${ids})` : `partial (${ids})`, landed, pending };
}

const results = new Map();
for (const [id, row] of rows) {
  const r = computeStatus(id, row.owner);
  results.set(id, r);
  if (row.status !== r.status) {
    if (checkOnly) problems.push(`register row ${id}: status is "${row.status}", the entries say "${r.status}"`);
    lines[row.i] = lines[row.i].replace(TAIL, (_m, ownerCell) => `| ${ownerCell} | ${r.status} |`);
  }
}

// ---------- the latest reconciliation section explains every row that is not simply closed ----------

const recStarts = lines.flatMap((l, i) => (/^## Reconciliation \d{4}-\d{2}-\d{2}/.test(l) ? [i] : []));
if (recStarts.length === 0) {
  problems.push('register: no "## Reconciliation YYYY-MM-DD" section');
} else {
  const start = recStarts[recStarts.length - 1];
  const next = lines.findIndex((l, i) => i > start && /^## /.test(l));
  const section = lines.slice(start, next === -1 ? undefined : next).join('\n');
  for (const [id, r] of results) {
    const needsReason = !r.status.startsWith('closed') || r.landed.length >= 2;
    if (needsReason && !new RegExp(`\\b${id}\\b`).test(section)) {
      problems.push(`register: ${id} is "${r.status}" but the latest reconciliation section does not mention it`);
    }
  }
}

// ---------- output ----------

const count = (prefix) => [...results.values()].filter((r) => r.status.startsWith(prefix)).length;
const summary = `${rows.size} rows: ${count('closed')} closed, ${count('partial')} partial, ${count('open')} open`;

if (checkOnly) {
  console.log(`checked upskilling/10-findings-register.md (${summary})`);
} else {
  const text = lines.join(eol);
  if (text !== original) writeFileSync(registerPath, text);
  console.log(`${text === original ? 'unchanged' : 'wrote'} upskilling/10-findings-register.md (${summary})`);
}
for (const [id, r] of results) {
  if (r.status.startsWith('closed') && r.landed.length < 2) continue;
  const pending = r.pending.map((e) => `${e.id} ${e.status}`).join(', ');
  console.log(`  ${id}  ${r.status}${pending ? `  [not landed: ${pending}]` : ''}`);
}

if (problems.length) {
  console.error(`\n${problems.length} problem${problems.length === 1 ? '' : 's'}:`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log('ok');
