import { describe, expect, it } from 'vitest';
import { modules, questions } from '@jstrain/content';

import { normalizeLang, tokenize, type Token } from './Code';

const kinds = (tokens: Token[], kind: Token['kind']) => tokens.filter((t) => t.kind === kind).map((t) => t.text);

describe('tokenize', () => {
  // 10 (B9)
  it('bash long flags are not comments', () => {
    const tokens = tokenize('git push -u origin feature/x --force-with-lease', 'bash');
    expect(kinds(tokens, 'com')).toEqual([]);
    expect(kinds(tokenize('curl https://example.com/api', 'bash'), 'com')).toEqual([]);
    expect(kinds(tokenize('echo $# ${#arr[@]} # count', 'bash'), 'com')).toEqual(['# count']);
  });

  // 11
  it('sql double-dash starts a comment', () => {
    expect(kinds(tokenize('SELECT 1 -- one\nFROM t', 'sql'), 'com')).toEqual(['-- one']);
    expect(kinds(tokenize('select 1', 'sql'), 'kw')).toEqual(['select']);
  });

  // 12
  it('an unterminated single quote stops at the newline', () => {
    const tokens = tokenize("<p>Don't</p>\nconst x = 1", 'jsx');
    expect(kinds(tokens, 'kw')).toContain('const');
    expect(kinds(tokens, 'str')).toEqual(["'t</p>"]);
  });

  // 13
  it('template literals span lines and keep escaped backticks', () => {
    const source = 'const s = `a \\` b\nc`; let y';
    const tokens = tokenize(source, 'ts');
    expect(kinds(tokens, 'str')).toEqual(['`a \\` b\nc`']);
    expect(kinds(tokens, 'kw')).toEqual(['const', 'let']);
  });

  // 14
  it('number forms', () => {
    const tokens = tokenize('f(0xFF, 1e6, 1_000n, 3.14, .5)', 'js');
    expect(kinds(tokens, 'num')).toEqual(['0xFF', '1e6', '1_000n', '3.14', '.5']);
    expect(kinds(tokenize('decimal m = 100m;', 'csharp'), 'num')).toEqual(['100m']);
  });

  it('keeps `set` plain, maps aliases, and leaves unknown languages unhighlighted', () => {
    expect(kinds(tokenize('const set = new Set()', 'js'), 'kw')).toEqual(['const', 'new']);
    expect(normalizeLang('sh')).toBe('bash');
    expect(normalizeLang('c#')).toBe('csharp');
    expect(normalizeLang('http')).toBe('text');
    expect(tokenize('GET /api const', 'http')).toEqual([{ text: 'GET /api const' }]);
  });

  it('reads a regex literal as one token, not as a string opener', () => {
    const tokens = tokenize("s.replace(/'/g, '')", 'js');
    expect(kinds(tokens, 'str')).toEqual(["/'/g", "''"]);
  });

  it('round-trips random source in every language it knows', () => {
    let seed = 7;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    const atoms = [
      '/',
      '//',
      '/*',
      '*/',
      '"',
      "'",
      '`',
      '\\',
      '\n',
      ' ',
      '@"',
      '"""',
      '#',
      '--',
      '0x',
      '1e',
      '.5',
      '_',
      'a',
      'const',
      'SELECT',
      '$',
      '{',
      '}',
      '(',
      ')',
      '[',
      ']',
      '=',
      ',',
      ';',
      'n',
      'm',
    ];
    for (const lang of ['js', 'ts', 'jsx', 'csharp', 'sql', 'bash', 'json', 'text']) {
      for (let i = 0; i < 150; i += 1) {
        let source = '';
        const length = Math.floor(rand() * 120);
        while (source.length < length) source += atoms[Math.floor(rand() * atoms.length)];
        const tokens = tokenize(source, lang);
        expect(tokens.map((t) => t.text).join(''), `${lang} case ${i}: ${JSON.stringify(source)}`).toBe(source);
        expect(tokens.every((t) => t.text.length > 0)).toBe(true);
      }
    }
  });

  // 15
  it('round-trips every snippet in the curriculum', () => {
    const snippets: { source: string; lang: string }[] = [];
    for (const m of modules) {
      const fence = /```([^\n]*)\n([\s\S]*?)```/g;
      let match: RegExpExecArray | null;
      while ((match = fence.exec(m.primer)) !== null) {
        snippets.push({ lang: match[1].trim() || 'text', source: match[2] });
      }
    }
    for (const q of questions) if (q.code) snippets.push({ source: q.code, lang: q.lang ?? 'js' });
    expect(snippets.length).toBeGreaterThan(100);
    for (const { source, lang } of snippets) {
      const joined = tokenize(source, lang)
        .map((t) => t.text)
        .join('');
      expect(joined).toBe(source);
    }
  });
});
