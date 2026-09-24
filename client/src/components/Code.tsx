import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * A deliberately small syntax highlighter.
 *
 * Pulling in Prism or Shiki would add far more to the bundle than this feature
 * is worth, and the snippets here are short. It tokenises comments, strings,
 * numbers and keywords in one pass — enough to make code readable, and honest
 * about not being a parser. The one hard rule, pinned by a test over every
 * snippet in the curriculum: joining the tokens gives back the source exactly.
 */

const JS_KEYWORDS =
  'const let var function return if else for while of in new class extends async await try catch finally throw typeof instanceof null undefined true false this import export from default switch case break continue delete void yield do super';

const TS_KEYWORDS = `${JS_KEYWORDS} implements interface type enum keyof infer readonly satisfies as public private protected abstract declare namespace never unknown any string number boolean object symbol bigint`;

const KEYWORDS: Record<string, string[]> = {
  js: JS_KEYWORDS.split(' '),
  ts: TS_KEYWORDS.split(' '),
  csharp:
    'using namespace class struct record interface enum public private protected internal static readonly const void var new return if else for foreach while do switch case break continue try catch finally throw async await this base override virtual abstract sealed partial null true false is as in out ref params get set init where select from orderby group by join let string int long decimal double float bool object dynamic Task List Dictionary IEnumerable IQueryable yield lock nameof required with when'.split(
      ' ',
    ),
  sql: 'SELECT FROM WHERE JOIN LEFT RIGHT INNER OUTER FULL CROSS ON GROUP BY HAVING ORDER LIMIT OFFSET INSERT INTO VALUES UPDATE SET DELETE CREATE TABLE ALTER DROP INDEX AS AND OR NOT NULL IS IN EXISTS BETWEEN LIKE DISTINCT UNION ALL CASE WHEN THEN ELSE END WITH RETURNING PRIMARY KEY FOREIGN REFERENCES UNIQUE CHECK DEFAULT COUNT SUM AVG MIN MAX COALESCE OVER PARTITION ROW_NUMBER DESC ASC CONFLICT BEGIN COMMIT ROLLBACK TRANSACTION'.split(
    ' ',
  ),
  bash: 'npm npx node dotnet git cd export echo run install ci curl if then else fi for do done case esac'.split(' '),
};
KEYWORDS.jsx = KEYWORDS.js;
KEYWORDS.tsx = KEYWORDS.ts;
KEYWORDS.json = ['true', 'false', 'null'];

const ALIASES: Record<string, string> = {
  javascript: 'js',
  mjs: 'js',
  cjs: 'js',
  node: 'js',
  typescript: 'ts',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  console: 'bash',
  cs: 'csharp',
  'c#': 'csharp',
  postgres: 'sql',
  sqlite: 'sql',
};

const LANG_NAME: Record<string, string> = {
  js: 'JavaScript',
  jsx: 'JavaScript (JSX)',
  ts: 'TypeScript',
  tsx: 'TypeScript (TSX)',
  json: 'JSON',
  csharp: 'C#',
  sql: 'SQL',
  bash: 'shell',
  text: 'plain text',
};

/** Maps an authored fence tag onto a language this tokenizer knows, or `text`. */
export function normalizeLang(lang: string | undefined): string {
  const raw = (lang ?? '').trim().toLowerCase();
  const resolved = ALIASES[raw] ?? raw;
  return KEYWORDS[resolved] ? resolved : 'text';
}

export type TokenKind = 'kw' | 'str' | 'com' | 'num';
export type Token = { text: string; kind?: TokenKind };

const NUMBER = /(?:0[xX][\da-fA-F_]+|0[bB][01_]+|(?:\d[\d_]*(?:\.\d[\d_]*)?|\.\d[\d_]*)(?:[eE][+-]?\d+)?)[a-zA-Z]*/y;
const IDENT = /[A-Za-z_$][\w$]*/y;
/** After one of these (or at line start) a `/` begins a regex literal, not a division. */
const REGEX_PRECEDERS = new Set(['(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', '\n', '']);

export function tokenize(source: string, rawLang: string): Token[] {
  const lang = normalizeLang(rawLang);
  if (lang === 'text') return source ? [{ text: source }] : [];

  const keywords = new Set(KEYWORDS[lang]);
  const isSql = lang === 'sql';
  const isBash = lang === 'bash';
  const isCLike = !isSql && !isBash;
  const isJsFamily = lang === 'js' || lang === 'ts' || lang === 'jsx' || lang === 'tsx';

  const tokens: Token[] = [];
  const push = (text: string, kind?: TokenKind) => {
    if (!text) return;
    const last = tokens[tokens.length - 1];
    // Merge runs of plain text so a snippet is a handful of nodes, not one per character.
    if (!kind && last && !last.kind) last.text += text;
    else tokens.push(kind ? { text, kind } : { text });
  };
  /** The last non-space character emitted, for the regex-or-division decision. */
  const previousSignificant = (): string => {
    for (let t = tokens.length - 1; t >= 0; t -= 1) {
      const trimmed = tokens[t].text.replace(/[ \t]+$/, '');
      if (trimmed) return tokens[t].kind ? 'x' : trimmed[trimmed.length - 1];
    }
    return '';
  };
  const lineEnd = (from: number) => {
    const end = source.indexOf('\n', from);
    return end === -1 ? source.length : end;
  };

  let i = 0;
  while (i < source.length) {
    const char = source[i];
    const next = source[i + 1];

    // Line comments: // in C-like languages, -- in SQL, # in shell (only at a
    // word boundary, so `$#`, `${#a}` and `url#frag` survive).
    const lineComment =
      (isCLike && char === '/' && next === '/') ||
      (isSql && char === '-' && next === '-') ||
      (isBash && char === '#' && (i === 0 || /\s/.test(source[i - 1])));
    if (lineComment) {
      const stop = lineEnd(i);
      push(source.slice(i, stop), 'com');
      i = stop;
      continue;
    }

    if (!isBash && char === '/' && next === '*') {
      const end = source.indexOf('*/', i + 2);
      const stop = end === -1 ? source.length : end + 2;
      push(source.slice(i, stop), 'com');
      i = stop;
      continue;
    }

    // C# verbatim (@"…", only "" escapes) and raw ("""…""") strings.
    if (lang === 'csharp' && char === '@' && next === '"') {
      let j = i + 2;
      while (j < source.length) {
        if (source[j] === '"' && source[j + 1] === '"') j += 2;
        else if (source[j] === '"') break;
        else j += 1;
      }
      push(source.slice(i, Math.min(j + 1, source.length)), 'str');
      i = j + 1;
      continue;
    }
    if (lang === 'csharp' && source.startsWith('"""', i)) {
      const end = source.indexOf('"""', i + 3);
      const stop = end === -1 ? source.length : end + 3;
      push(source.slice(i, stop), 'str');
      i = stop;
      continue;
    }

    if (char === '"' || char === "'" || (char === '`' && isJsFamily)) {
      // Only template literals span lines; an unterminated ' or " stops at the
      // newline, so JSX text like <p>Don't</p> cannot colour the rest green.
      let j = i + 1;
      while (j < source.length && source[j] !== char) {
        if (char !== '`' && source[j] === '\n') break;
        if (source[j] === '\\' && !isSql) j += 1;
        j += 1;
      }
      const stop = source[j] === char ? j + 1 : Math.min(j, source.length);
      push(source.slice(i, stop), 'str');
      i = stop;
      continue;
    }

    // Regex literals in the JS family.
    if (isJsFamily && char === '/' && next !== '/' && next !== '*' && REGEX_PRECEDERS.has(previousSignificant())) {
      let j = i + 1;
      let inClass = false;
      while (j < source.length && source[j] !== '\n') {
        if (source[j] === '\\') j += 1;
        else if (source[j] === '[') inClass = true;
        else if (source[j] === ']') inClass = false;
        else if (source[j] === '/' && !inClass) break;
        j += 1;
      }
      if (source[j] === '/') {
        j += 1;
        while (j < source.length && /[a-z]/.test(source[j])) j += 1;
        push(source.slice(i, j), 'str');
        i = j;
        continue;
      }
    }

    const prev = source[i - 1] ?? '';
    if (/[\d.]/.test(char) && !/[\w$]/.test(prev) && (char !== '.' || /\d/.test(next ?? ''))) {
      NUMBER.lastIndex = i;
      const match = NUMBER.exec(source);
      if (match && match[0]) {
        push(match[0], 'num');
        i += match[0].length;
        continue;
      }
    }

    IDENT.lastIndex = i;
    const ident = /[A-Za-z_$]/.test(char) ? IDENT.exec(source) : null;
    if (ident) {
      const word = ident[0];
      const isKeyword = isSql ? keywords.has(word.toUpperCase()) : keywords.has(word);
      push(word, isKeyword ? 'kw' : undefined);
      i += word.length;
      continue;
    }

    push(char);
    i += 1;
  }
  return tokens;
}

async function writeClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function Code({
  source,
  lang = 'js',
  copyable = false,
}: {
  source: string;
  lang?: string;
  /** Primer snippets are meant to be tried; question code is not (it would leak nothing, but it is noise). */
  copyable?: boolean;
}) {
  const normalized = normalizeLang(lang);
  const tokens = useMemo(() => tokenize(source, normalized), [source, normalized]);
  const [copied, setCopied] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const pre = (
    <pre className="code" tabIndex={0} role="region" aria-label={`Code sample, ${LANG_NAME[normalized] ?? normalized}`}>
      <code>
        {tokens.map((token, i) =>
          token.kind ? (
            <span key={i} className={token.kind}>
              {token.text}
            </span>
          ) : (
            token.text
          ),
        )}
      </code>
    </pre>
  );

  if (!copyable) return pre;

  return (
    <div className="code-block">
      {pre}
      <button
        type="button"
        className="btn btn-ghost btn-sm code-copy"
        onClick={async () => {
          const ok = await writeClipboard(source);
          setCopied(ok ? 'copied' : 'failed');
          window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => setCopied('idle'), 2000);
        }}
      >
        Copy
      </button>
      <span className="sr-only" role="status">
        {copied === 'copied' ? 'Copied' : copied === 'failed' ? 'Could not copy' : ''}
      </span>
      {copied !== 'idle' && (
        <span className="code-copied" aria-hidden="true">
          {copied === 'copied' ? 'Copied' : 'Copy failed'}
        </span>
      )}
    </div>
  );
}
