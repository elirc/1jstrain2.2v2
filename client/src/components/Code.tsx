import { useMemo, type JSX } from 'react';

/**
 * A deliberately small syntax highlighter.
 *
 * Pulling in Prism or Shiki would add far more to the bundle than this feature
 * is worth, and the snippets here are short. It tokenises comments, strings,
 * numbers and keywords in one pass — enough to make code readable, and honest
 * about not being a parser.
 */

const KEYWORDS: Record<string, string[]> = {
  js: 'const let var function return if else for while of in new class extends async await try catch finally throw typeof instanceof null undefined true false this import export from default switch case break continue delete void yield static get set do'.split(
    ' ',
  ),
  ts: 'const let var function return if else for while of in new class extends implements interface type enum async await try catch finally throw typeof instanceof keyof infer readonly satisfies as null undefined true false this import export from default switch case break continue public private protected static abstract declare namespace never unknown any string number boolean object symbol bigint'.split(
    ' ',
  ),
  csharp:
    'using namespace class struct record interface enum public private protected internal static readonly const void var new return if else for foreach while do switch case break continue try catch finally throw async await this base override virtual abstract sealed partial null true false is as in out ref params get set init where select from orderby group by join let string int decimal double bool object dynamic Task List Dictionary IEnumerable IQueryable'.split(
      ' ',
    ),
  sql: 'SELECT FROM WHERE JOIN LEFT RIGHT INNER OUTER FULL CROSS ON GROUP BY HAVING ORDER LIMIT OFFSET INSERT INTO VALUES UPDATE SET DELETE CREATE TABLE ALTER DROP INDEX AS AND OR NOT NULL IS IN EXISTS BETWEEN LIKE DISTINCT UNION ALL CASE WHEN THEN ELSE END WITH RETURNING PRIMARY KEY FOREIGN REFERENCES UNIQUE CHECK DEFAULT COUNT SUM AVG MIN MAX COALESCE OVER PARTITION ROW_NUMBER DESC ASC CONFLICT'.split(
    ' ',
  ),
  bash: 'npm npx node dotnet git cd export echo run install ci'.split(' '),
};

KEYWORDS.tsx = KEYWORDS.ts;
KEYWORDS.jsx = KEYWORDS.js;
KEYWORDS.json = KEYWORDS.js;

type Token = { text: string; kind?: 'kw' | 'str' | 'com' | 'num' };

function tokenize(source: string, lang: string): Token[] {
  const keywords = new Set(KEYWORDS[lang] ?? KEYWORDS.js);
  const caseInsensitive = lang === 'sql';
  const tokens: Token[] = [];
  let buffer = '';

  const flushWord = () => {
    if (!buffer) return;
    const isKeyword = caseInsensitive
      ? keywords.has(buffer.toUpperCase())
      : keywords.has(buffer);
    if (isKeyword) tokens.push({ text: buffer, kind: 'kw' });
    else if (/^\d[\d._]*n?$/.test(buffer)) tokens.push({ text: buffer, kind: 'num' });
    else tokens.push({ text: buffer });
    buffer = '';
  };

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    const next = source[i + 1];

    // Comments run to end of line (// in C-like, -- in SQL, # in bash).
    const lineComment =
      (char === '/' && next === '/') ||
      (char === '-' && next === '-' && (lang === 'sql' || lang === 'bash')) ||
      (char === '#' && lang === 'bash');

    if (lineComment) {
      flushWord();
      const end = source.indexOf('\n', i);
      const stop = end === -1 ? source.length : end;
      tokens.push({ text: source.slice(i, stop), kind: 'com' });
      i = stop - 1;
      continue;
    }

    if (char === '/' && next === '*') {
      flushWord();
      const end = source.indexOf('*/', i + 2);
      const stop = end === -1 ? source.length : end + 2;
      tokens.push({ text: source.slice(i, stop), kind: 'com' });
      i = stop - 1;
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      flushWord();
      let j = i + 1;
      while (j < source.length && source[j] !== char) {
        if (source[j] === '\\') j += 1;
        j += 1;
      }
      tokens.push({ text: source.slice(i, Math.min(j + 1, source.length)), kind: 'str' });
      i = j;
      continue;
    }

    if (/[A-Za-z0-9_$.]/.test(char)) {
      buffer += char;
      continue;
    }

    flushWord();
    tokens.push({ text: char });
  }
  flushWord();
  return tokens;
}

export function Code({ source, lang = 'js' }: { source: string; lang?: string }) {
  const tokens = useMemo(() => tokenize(source, lang), [source, lang]);

  return (
    <pre className="code" tabIndex={0} aria-label={`${lang} code sample`}>
      <code>
        {tokens.map((token, i) =>
          token.kind ? (
            <span key={i} className={token.kind}>
              {token.text}
            </span>
          ) : (
            (<span key={i}>{token.text}</span>) as JSX.Element
          ),
        )}
      </code>
    </pre>
  );
}
