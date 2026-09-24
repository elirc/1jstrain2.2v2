#!/usr/bin/env node
/**
 * Curriculum statistics: per-module counts by type and difficulty, where the
 * answers sit, and the tells a test-wise learner could exploit.
 *
 *   npm run stats -w content          (or: node tools/stats.mjs from content/)
 *   node tools/stats.mjs --json       machine-readable
 *
 * "Uniquely longest" = the correct choice of an mcq/output question is
 * strictly longer than every distractor. Authors should aim well under 40%.
 */
import { questions, modules, stages } from '../index.js';

const JSON_OUT = process.argv.includes('--json');
const TYPES = ['mcq', 'output', 'multi', 'order', 'boolean', 'short'];
const single = (q) => q.type === 'mcq' || q.type === 'output';

function uniquelyLongest(q) {
  const lens = q.choices.map((c) => c.text.length);
  const mine = lens[q.answer];
  return lens.every((l, i) => i === q.answer || l < mine);
}

function summarise(list) {
  const byType = Object.fromEntries(TYPES.map((t) => [t, 0]));
  const byD = { 1: 0, 2: 0, 3: 0 };
  const index = {};
  let longest = 0;
  let singles = 0;
  let trues = 0;
  let bools = 0;
  let multiFirst = 0;
  let multis = 0;
  for (const q of list) {
    byType[q.type]++;
    byD[q.difficulty]++;
    if (single(q)) {
      singles++;
      index[q.answer] = (index[q.answer] ?? 0) + 1;
      if (uniquelyLongest(q)) longest++;
    } else if (q.type === 'boolean') {
      bools++;
      if (q.answer === true) trues++;
    } else if (q.type === 'multi') {
      multis++;
      if (q.answer.includes(0)) multiFirst++;
    }
  }
  const maxIndexShare = singles ? Math.max(...Object.values(index)) / singles : 0;
  return {
    total: list.length,
    byType,
    byD,
    singles,
    index,
    maxIndexShare,
    longest,
    longestShare: singles ? longest / singles : 0,
    bools,
    trues,
    multis,
    multiFirst,
  };
}

const pct = (x) => `${Math.round(x * 100)}%`;
const fmtIndex = (idx) =>
  Object.keys(idx)
    .sort()
    .map((k) => `${k}:${idx[k]}`)
    .join(' ');

const moduleOrder = stages.flatMap((s) => s.modules);
const ordered = [...modules].sort((a, b) => moduleOrder.indexOf(a.id) - moduleOrder.indexOf(b.id));
const rows = ordered.map((m) => ({ id: m.id, ...summarise(questions.filter((q) => q.moduleId === m.id)) }));
const overall = summarise(questions);

if (JSON_OUT) {
  console.log(JSON.stringify({ overall, modules: rows }, null, 2));
} else {
  const head = [
    'module',
    'n',
    'mcq',
    'out',
    'mul',
    'ord',
    'bool',
    'short',
    'd1',
    'd2',
    'd3',
    'answer index',
    'max',
    'longest',
    'T/F',
  ];
  const body = rows.map((r) => [
    r.id,
    r.total,
    r.byType.mcq,
    r.byType.output,
    r.byType.multi,
    r.byType.order,
    r.byType.boolean,
    r.byType.short,
    r.byD[1],
    r.byD[2],
    r.byD[3],
    fmtIndex(r.index),
    pct(r.maxIndexShare),
    `${r.longest}/${r.singles}`,
    `${r.trues}/${r.bools - r.trues}`,
  ]);
  const all = [head, ...body].map((row) => row.map(String));
  const widths = head.map((_, c) => Math.max(...all.map((row) => row[c].length)));
  for (const [i, row] of all.entries()) {
    console.log(
      row.map((cell, c) => (c === 0 || c === 11 ? cell.padEnd(widths[c]) : cell.padStart(widths[c]))).join('  '),
    );
    if (i === 0) console.log(widths.map((w) => '-'.repeat(w)).join('  '));
  }
  const o = overall;
  console.log('');
  console.log(`questions: ${o.total} in ${modules.length} modules`);
  console.log(`by type: ${TYPES.map((t) => `${t} ${o.byType[t]}`).join(', ')}`);
  console.log(`by difficulty: d1 ${o.byD[1]}, d2 ${o.byD[2]}, d3 ${o.byD[3]}`);
  console.log(`mcq/output answer index: ${fmtIndex(o.index)} (max share ${pct(o.maxIndexShare)} of ${o.singles})`);
  console.log(`correct choice uniquely longest: ${o.longest}/${o.singles} (${pct(o.longestShare)})`);
  console.log(`booleans: ${o.trues} true / ${o.bools - o.trues} false`);
  console.log(`multi questions whose key includes index 0: ${o.multiFirst}/${o.multis}`);
  if (o.maxIndexShare > 0.4) console.log('WARNING: one answer index holds more than 40% of mcq/output answers');
}
