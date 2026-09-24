import { render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { modules, questions } from '@jstrain/content';

import { Markdown, parseInline, renderBlocks, splitRow } from './Markdown';

function md(source: string) {
  return render(<Markdown source={source} />).container;
}

/** A small deterministic PRNG (mulberry32), so a failure is reproducible from the seed. */
function prng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Random Markdown-shaped noise: every delimiter the renderer reacts to, in every order. */
function noise(rand: () => number, length: number): string {
  const atoms = [
    '|',
    '`',
    '``',
    '*',
    '**',
    '\\',
    '#',
    '# ',
    '-',
    '- ',
    '1. ',
    '```',
    '```js',
    '\n',
    '\n\n',
    ' ',
    '  ',
    'a',
    'b',
    ':',
    '---',
    '|---|',
    '_',
  ];
  let out = '';
  while (out.length < length) out += atoms[Math.floor(rand() * atoms.length)];
  return out;
}

describe('Markdown', () => {
  // 1 (B2)
  it('terminates on a pipe-leading line that is not a table', { timeout: 2000 }, () => {
    const c = md('| just text');
    expect(c.querySelector('p')).toHaveTextContent('| just text');
    expect(c.querySelector('table')).toBeNull();
    const twoLines = md('| just text\nnext line');
    expect(twoLines.querySelectorAll('p')).toHaveLength(1);
  });

  // 2
  it('parses a GFM table whose separator has no outer pipes', { timeout: 2000 }, () => {
    const c = md('| a | b |\n---|---\n| 1 | 2 |');
    expect(c.querySelectorAll('th')).toHaveLength(2);
    expect(c.querySelectorAll('td')).toHaveLength(2);
    const alsoWithout = md('| a | b |\n|---|---\n| 1 | 2 |');
    expect(alsoWithout.querySelectorAll('td')).toHaveLength(2);
  });

  // 3
  it('does not split a table cell on a pipe inside inline code', () => {
    expect(splitRow('| `a || b` | c |')).toEqual(['`a || b`', 'c']);
    const c = md('| x | y |\n|---|---|\n| `a || b` | c |');
    const cells = c.querySelectorAll('td');
    expect(cells).toHaveLength(2);
    expect(cells[0].querySelector('code')).toHaveTextContent('a || b');
  });

  // 4 (B8)
  it('renders inline code inside bold without literal backticks', () => {
    const c = md('Use **always `===`** here.');
    const code = c.querySelector('strong > code');
    expect(code).toHaveTextContent('===');
    expect(c.textContent).not.toContain('`');
  });

  // 5
  it('does not italicise arithmetic', () => {
    const c = md('2 * 3 * 4 and a * b * c');
    expect(c.querySelector('em')).toBeNull();
    expect(c.textContent).toBe('2 * 3 * 4 and a * b * c');
    expect(md('an *emphasised* word').querySelector('em')).toHaveTextContent('emphasised');
  });

  // 6
  it('supports double-backtick code spans containing a backtick', () => {
    const c = md('A template: `` `hi ${name}` `` done.');
    expect(c.querySelector('code')).toHaveTextContent('`hi ${name}`');
  });

  // 7
  it('renders HTML-looking text as text', () => {
    const c = md('<img src=x onerror=alert(1)> <b>x</b>');
    expect(c.querySelector('img')).toBeNull();
    expect(c.querySelector('b')).toBeNull();
    expect(c.textContent).toContain('<img src=x onerror=alert(1)>');
  });

  // 8
  it('keeps the ordered list start number', () => {
    const ol = md('3. a\n4. b').querySelector('ol');
    expect(ol).toHaveAttribute('start', '3');
    expect(ol?.querySelectorAll('li')).toHaveLength(2);
  });

  // 9
  it('a bare fence is plain text', () => {
    const c = md('```\nconst x = 1; // not js\n```');
    expect(c.querySelector('pre')).toHaveTextContent('const x = 1; // not js');
    expect(c.querySelector('.kw')).toBeNull();
    expect(c.querySelector('.com')).toBeNull();
  });

  it('terminates without throwing on random pipes, backticks, asterisks and fences', () => {
    const rand = prng(20260924);
    for (let i = 0; i < 400; i += 1) {
      const source = noise(rand, 20 + Math.floor(rand() * 300));
      const started = performance.now();
      expect(
        () => renderToStaticMarkup(<>{renderBlocks(source)}</>),
        `seed 20260924, case ${i}: ${JSON.stringify(source)}`,
      ).not.toThrow();
      expect(() => parseInline(source), `inline case ${i}`).not.toThrow();
      // A pathological input must not turn linear work into a hang.
      expect(performance.now() - started, `case ${i} took too long: ${JSON.stringify(source)}`).toBeLessThan(500);
    }
    // Every character of the input is still in the output somewhere (nothing is swallowed).
    const plain = 'a | b * c ` d \\ e';
    expect(parseInline(plain).join('')).toBe(plain);
  });

  // 39: a hang detector over the real content, not a benchmark. Static
  // rendering keeps it independent of how big the curriculum grows.
  it('renders every primer and every explanation in the curriculum, each within a budget', () => {
    const sources = [...modules.map((m) => m.primer), ...questions.map((q) => q.why)];
    let slowest = 0;
    for (const source of sources) {
      const started = performance.now();
      const html = renderToStaticMarkup(<Markdown source={source} />);
      slowest = Math.max(slowest, performance.now() - started);
      expect(html.startsWith('<div class="md">')).toBe(true);
    }
    expect(slowest).toBeLessThan(1_000);
  }, 60_000);
});
