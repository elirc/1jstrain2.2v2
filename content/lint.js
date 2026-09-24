/**
 * Content lints, run by validateContent().
 *
 * Two severities: `problems` fail validation (the server refuses to start),
 * `warnings` are printed but do not block. Every rule here exists because the
 * existing content broke it at least once — see upskilling/04-journal J11, J34.
 *
 * The authoring-quality checks (answer-position and length tells, boolean
 * balance, duplicate prompts, unknown code languages, primer and objective
 * shape) are warnings only: they run at every server boot, and boot must never
 * fail on a judgement call. `npm run check:content -- --strict` fails on them.
 * Thresholds live in LIMITS; journal J03 explains where each one comes from.
 */

/**
 * A `why`, `ask` or `prompt` that names a choice by position ("the second
 * option", "option 3") is wrong as soon as choices are shuffled on serve.
 */
export const POSITION_WORDS =
  /\b(first|second|third|fourth|last) (option|choice|answer|one)\b|\boption [A-D1-4]\b|\bchoice [A-D1-4]\b/i;

/** Authoring-quality thresholds. Every one produces a warning, never a problem. */
export const LIMITS = {
  // Correct-answer position over the whole curriculum. With four choices chance
  // is 25%; above 40% "always pick B" becomes a strategy again.
  maxGlobalPositionShare: 0.4,
  minGlobalPositionSample: 20,
  // True/false over the whole curriculum: the rarer answer must be at least 30%.
  minBooleanMinority: 0.3,
  minBooleanSample: 10,
  // "The longest choice is the answer" (J34). Per module, over mcq/output.
  maxLongestShare: 0.5,
  minLongestSample: 8,
  minPrimerWords: 300,
  maxPrimerWords: 1800,
  minObjectives: 3,
  maxObjectives: 6,
};

/**
 * Code languages an author may write. The first group is what
 * client/src/components/Code.tsx highlights (KEYWORDS plus ALIASES there); the
 * second renders deliberately as plain text. Anything else is probably a typo.
 */
export const KNOWN_LANGS = new Set([
  ...['js', 'jsx', 'ts', 'tsx', 'json', 'csharp', 'sql', 'bash'],
  ...[
    'javascript',
    'mjs',
    'cjs',
    'node',
    'typescript',
    'sh',
    'shell',
    'zsh',
    'console',
    'cs',
    'c#',
    'postgres',
    'sqlite',
  ],
  ...['text', 'css', 'html', 'http', 'yaml', 'xml', 'ini', 'diff', 'dockerfile', 'toml'],
]);

const norm = (text = '') => text.toLowerCase().replace(/\s+/g, ' ').trim();
const pct = (share) => `${Math.round(share * 100)}%`;

/** True when the key of an mcq/output question is strictly longer than every distractor. */
export function uniquelyLongest(q) {
  const lengths = q.choices.map((c) => c.text.length);
  return lengths.every((length, i) => i === q.answer || length < lengths[q.answer]);
}

/** The inline tokenizer the client's Markdown renderer uses (Markdown.tsx). */
const INLINE = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*\n]+\*)/g;

/** Remove fenced code blocks so their contents are not linted as prose. */
function withoutFences(text) {
  const out = [];
  let inFence = false;
  for (const line of text.replace(/\r\n/g, '\n').split('\n')) {
    if (line.trimStart().startsWith('```')) {
      inFence = !inFence;
      out.push('');
      continue;
    }
    out.push(inFence ? '' : line);
  }
  return out;
}

/** Bold tokens (as the renderer would parse them) that contain a backtick. */
export function boldWithBacktick(text) {
  const joined = withoutFences(text).join('\n');
  const found = [];
  for (const m of joined.matchAll(INLINE)) {
    if (m[0].startsWith('**') && m[0].includes('`')) found.push(m[0]);
  }
  return found;
}

/**
 * Markdown the renderer does not support: links, images, blockquotes,
 * horizontal rules and nested (indented) list items. Returns descriptions.
 */
export function unsupportedMarkdown(text) {
  const issues = [];
  withoutFences(text).forEach((line, n) => {
    const prose = line.replace(/`[^`]*`/g, '``');
    const where = `line ${n + 1}: ${line.trim().slice(0, 60)}`;
    if (/!\[[^\]]*\]\([^)]*\)/.test(prose)) issues.push(`image (${where})`);
    else if (/\[[^\]]+\]\([^)]+\)/.test(prose)) issues.push(`link (${where})`);
    if (/^\s*>/.test(line)) issues.push(`blockquote (${where})`);
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) issues.push(`horizontal rule (${where})`);
    if (/^\s{2,}([-*]|\d+\.)\s+/.test(line)) issues.push(`nested list item (${where})`);
  });
  return issues;
}

/**
 * Lint every question and primer.
 * @param {import('./types.d.ts').Module[]} modules
 * @param {import('./types.d.ts').Question[]} questions
 * @param {(moduleId: string) => import('./types.d.ts').Question[]} questionsByModule
 */
export function lintContent(modules, questions, questionsByModule) {
  const problems = [];
  const warnings = [];
  const seenWithCode = new Map(); // prompt + code -> first id
  const seenBare = new Map(); // prompt of a question with no code -> first id

  for (const q of questions) {
    if (q.code && !KNOWN_LANGS.has(q.lang))
      warnings.push(`question ${q.id} code lang "${q.lang}" is not a known language`);

    // Prompts like "What does this log?" repeat legitimately, so a duplicate is
    // the same prompt with the same code, or the same prompt with no code at all.
    const key = q.code ? `${norm(q.prompt)}\u0000${norm(q.code)}` : norm(q.prompt);
    const seen = q.code ? seenWithCode : seenBare;
    const first = seen.get(key);
    if (first) {
      const other = questions.find((x) => x.id === first);
      const where = other?.moduleId === q.moduleId ? 'in the same module' : `in ${other?.moduleId}`;
      warnings.push(`question ${q.id} repeats the prompt${q.code ? ' and code' : ''} of ${first} (${where})`);
    } else seen.set(key, q.id);

    for (const field of ['prompt', 'why', 'ask']) {
      const text = q[field];
      if (!text) continue;
      const m = POSITION_WORDS.exec(text);
      if (m) problems.push(`question ${q.id} ${field} refers to a choice by position ("${m[0]}")`);
    }
    if (q.type === 'output' && !q.code) problems.push(`question ${q.id} is type "output" but has no code`);

    const texts = [q.prompt, q.why, q.ask ?? '', ...(q.choices ?? []).map((c) => c.text)];
    for (const text of texts) {
      for (const bold of boldWithBacktick(text)) {
        problems.push(
          `question ${q.id} has code inside bold; keep code spans outside bold so content renders the same everywhere: ${bold}`,
        );
      }
    }
  }

  for (const m of modules) {
    for (const bold of boldWithBacktick(m.primer)) {
      problems.push(`module ${m.id} primer has code inside bold: ${bold}`);
    }
    for (const issue of unsupportedMarkdown(m.primer)) {
      problems.push(`module ${m.id} primer uses unsupported markdown: ${issue}`);
    }

    const words = m.primer.split(/\s+/).filter(Boolean).length;
    if (words < LIMITS.minPrimerWords || words > LIMITS.maxPrimerWords) {
      warnings.push(`module ${m.id} primer is ${words} words (want ${LIMITS.minPrimerWords}-${LIMITS.maxPrimerWords})`);
    }
    if (!/^##\s/m.test(m.primer)) warnings.push(`module ${m.id} primer has no ## headings`);
    for (const [, lang] of m.primer.matchAll(/^\s*```(\S+)/gm)) {
      if (!KNOWN_LANGS.has(lang.toLowerCase()))
        warnings.push(`module ${m.id} primer fence lang "${lang}" is not a known language`);
    }
    const objectives = m.objectives?.length ?? 0;
    if (objectives < LIMITS.minObjectives || objectives > LIMITS.maxObjectives) {
      warnings.push(
        `module ${m.id} has ${objectives} objectives (want ${LIMITS.minObjectives}-${LIMITS.maxObjectives})`,
      );
    }

    const deck = questionsByModule(m.id);
    const single = deck.filter((q) => q.type === 'mcq' || q.type === 'output');
    if (single.length >= LIMITS.minLongestSample) {
      const longest = single.filter(uniquelyLongest).length;
      if (longest / single.length > LIMITS.maxLongestShare) {
        warnings.push(
          `module ${m.id}: the key is the uniquely longest choice in ${longest}/${single.length} mcq/output questions; lengthen the distractors`,
        );
      }
    }
    if (single.length >= 4) {
      const byIndex = new Map();
      for (const q of single) byIndex.set(q.answer, (byIndex.get(q.answer) ?? 0) + 1);
      for (const [index, count] of byIndex) {
        if (count / single.length > 0.5) {
          warnings.push(`module ${m.id}: ${count}/${single.length} mcq/output answers sit at index ${index}`);
        }
      }
    }
    const booleans = deck.filter((q) => q.type === 'boolean');
    if (booleans.length >= 5) {
      const trues = booleans.filter((q) => q.answer === true).length;
      const share = Math.max(trues, booleans.length - trues) / booleans.length;
      if (share > 0.8) {
        warnings.push(`module ${m.id}: ${Math.round(share * 100)}% of its ${booleans.length} booleans share one value`);
      }
    }
  }

  const single = questions.filter((q) => q.type === 'mcq' || q.type === 'output');
  if (single.length >= LIMITS.minGlobalPositionSample) {
    const byIndex = new Map();
    for (const q of single) byIndex.set(q.answer, (byIndex.get(q.answer) ?? 0) + 1);
    for (const [index, count] of byIndex) {
      if (count / single.length > LIMITS.maxGlobalPositionShare) {
        warnings.push(
          `curriculum: ${count}/${single.length} (${pct(count / single.length)}) mcq/output answers sit at index ${index}`,
        );
      }
    }
  }

  const booleans = questions.filter((q) => q.type === 'boolean');
  if (booleans.length >= LIMITS.minBooleanSample) {
    const trues = booleans.filter((q) => q.answer === true).length;
    const minority = Math.min(trues, booleans.length - trues) / booleans.length;
    if (minority < LIMITS.minBooleanMinority) {
      warnings.push(
        `curriculum: booleans are ${trues} true / ${booleans.length - trues} false; the rarer answer should be at least ${pct(LIMITS.minBooleanMinority)}`,
      );
    }
  }

  return { problems, warnings };
}
