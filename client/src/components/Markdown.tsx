import type { ReactNode } from 'react';
import { Code } from './Code';

/**
 * A small markdown renderer for the subset the content actually uses:
 * headings (#–####), paragraphs, flat lists (with an `<ol start>`), GFM
 * tables, fenced code, inline code (including double-backtick spans), bold,
 * italic and backslash escapes. Links, blockquotes, nested lists and HTML are
 * deliberately unsupported; they render as the literal text.
 *
 * It builds React elements rather than an HTML string, so there is no
 * `dangerouslySetInnerHTML` anywhere and no XSS surface — worth doing properly
 * in an app that teaches exactly this.
 *
 * Two invariants keep it safe on any input: every pass of the block loop
 * consumes at least one line, and inline parsing only ever moves forward.
 */

/** Inline formatting: `code`, **bold**, *italic*. */
export function Inline({ text }: { text: string }) {
  return <>{parseInline(text)}</>;
}

const ESCAPABLE = new Set(['\\', '`', '*', '_', '|', '#', '[', ']', '-']);

/** Length of the run of `char` starting at `i`. */
function runLength(text: string, i: number, char: string): number {
  let n = 0;
  while (text[i + n] === char) n += 1;
  return n;
}

/**
 * If a code span opens at `i`, the index just past its closing run, else -1.
 * A span closes on a backtick run of exactly the same length (CommonMark).
 */
function codeSpanEnd(text: string, i: number): number {
  const open = runLength(text, i, '`');
  let j = i + open;
  while (j < text.length) {
    if (text[j] === '`') {
      const run = runLength(text, j, '`');
      if (run === open) return j + run;
      j += run;
    } else {
      j += 1;
    }
  }
  return -1;
}

/** Finds the closing delimiter at or after `from`, stepping over escapes and code spans. */
function findCloser(text: string, from: number, delim: '**' | '*'): number {
  let j = from;
  while (j < text.length) {
    const c = text[j];
    if (c === '\\') {
      j += 2;
      continue;
    }
    if (c === '`') {
      const end = codeSpanEnd(text, j);
      j = end === -1 ? j + runLength(text, j, '`') : end;
      continue;
    }
    if (text.startsWith(delim, j) && j > from && !/\s/.test(text[j - 1])) {
      if (delim === '**') return j;
      // A single * closer must not be half of a ** pair.
      if (text[j + 1] !== '*' && text[j - 1] !== '*') return j;
    }
    j += 1;
  }
  return -1;
}

export function parseInline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let buffer = '';
  let key = 0;
  const flush = () => {
    if (buffer) out.push(buffer);
    buffer = '';
  };

  let i = 0;
  while (i < text.length) {
    const c = text[i];

    if (c === '\\' && ESCAPABLE.has(text[i + 1] ?? '')) {
      buffer += text[i + 1];
      i += 2;
      continue;
    }

    if (c === '`') {
      const end = codeSpanEnd(text, i);
      const open = runLength(text, i, '`');
      if (end === -1) {
        buffer += text.slice(i, i + open);
        i += open;
        continue;
      }
      let content = text.slice(i + open, end - open);
      // One space of padding is stripped when both sides have it, so `` `x` `` can show a backtick.
      if (content.length > 2 && content.startsWith(' ') && content.endsWith(' ') && content.trim()) {
        content = content.slice(1, -1);
      }
      flush();
      out.push(<code key={key++}>{content}</code>);
      i = end;
      continue;
    }

    if (c === '*' && text[i + 1] === '*' && text[i + 2] && !/\s/.test(text[i + 2])) {
      const close = findCloser(text, i + 2, '**');
      if (close !== -1) {
        flush();
        out.push(<strong key={key++}>{parseInline(text.slice(i + 2, close))}</strong>);
        i = close + 2;
        continue;
      }
    }

    if (c === '*' && text[i + 1] !== '*' && text[i + 1] && !/\s/.test(text[i + 1])) {
      const close = findCloser(text, i + 1, '*');
      if (close !== -1) {
        flush();
        out.push(<em key={key++}>{parseInline(text.slice(i + 1, close))}</em>);
        i = close + 1;
        continue;
      }
    }

    buffer += c;
    i += 1;
  }
  flush();
  return out;
}

export function Markdown({ source, copyable = false }: { source: string; copyable?: boolean }) {
  return <div className="md">{renderBlocks(source, { copyable })}</div>;
}

const BULLET = /^\s*[-*]\s+/;
const NUMBERED = /^\s*(\d+)\.\s+/;
const HEADING = /^(#{1,4})\s+(.*)$/;
const FENCE = /^\s*```/;
/** A GFM delimiter row: cells of dashes with optional colons, outer pipes optional. */
const TABLE_SEPARATOR = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;

function startsTable(lines: string[], i: number): boolean {
  const next = lines[i + 1] ?? '';
  return lines[i].includes('|') && next.includes('|') && TABLE_SEPARATOR.test(next);
}

function startsBlock(lines: string[], i: number): boolean {
  const line = lines[i];
  return FENCE.test(line) || HEADING.test(line) || BULLET.test(line) || NUMBERED.test(line) || startsTable(lines, i);
}

export function renderBlocks(source: string, options: { copyable?: boolean } = {}): ReactNode[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let key = 0;
  let i = 0;

  while (i < lines.length) {
    const start = i;
    const line = lines[i];

    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (FENCE.test(line)) {
      // A bare fence is plain text, not JavaScript.
      const lang = line.trim().slice(3).trim() || 'text';
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !FENCE.test(lines[i])) {
        body.push(lines[i]);
        i += 1;
      }
      i += 1; // closing fence (or past the end)
      blocks.push(<Code key={key++} source={body.join('\n')} lang={lang} copyable={options.copyable} />);
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      const level = heading[1].length;
      const content = <Inline text={heading[2]} />;
      blocks.push(
        level <= 2 ? (
          <h2 key={key++}>{content}</h2>
        ) : level === 3 ? (
          <h3 key={key++}>{content}</h3>
        ) : (
          <h4 key={key++}>{content}</h4>
        ),
      );
      i += 1;
      continue;
    }

    if (startsTable(lines, i)) {
      const header = splitRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim() && lines[i].includes('|')) {
        rows.push(splitRow(lines[i]));
        i += 1;
      }
      blocks.push(
        <div className="table-scroll" key={key++}>
          <table>
            <thead>
              <tr>
                {header.map((cell, c) => (
                  <th key={c}>
                    <Inline text={cell} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => (
                    <td key={c}>
                      <Inline text={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    // Lists — a run of items, each of which may wrap onto indented lines.
    if (BULLET.test(line) || NUMBERED.test(line)) {
      const ordered = NUMBERED.test(line);
      const marker = ordered ? NUMBERED : BULLET;
      const first = ordered ? Number(NUMBERED.exec(line)?.[1] ?? 1) : 1;
      const items: string[] = [];
      while (i < lines.length && (marker.test(lines[i]) || (items.length > 0 && /^\s{2,}\S/.test(lines[i])))) {
        if (marker.test(lines[i])) items.push(lines[i].replace(marker, ''));
        else items[items.length - 1] += ` ${lines[i].trim()}`;
        i += 1;
      }
      const rendered = items.map((item, n) => (
        <li key={n}>
          <Inline text={item} />
        </li>
      ));
      blocks.push(
        ordered ? (
          <ol key={key++} start={first !== 1 ? first : undefined}>
            {rendered}
          </ol>
        ) : (
          <ul key={key++}>{rendered}</ul>
        ),
      );
      continue;
    }

    // Paragraph: always takes the current line, then runs until a blank line
    // or the start of another block.
    const paragraph: string[] = [];
    do {
      paragraph.push(lines[i].trim());
      i += 1;
    } while (i < lines.length && lines[i].trim() && !startsBlock(lines, i));
    blocks.push(
      <p key={key++}>
        <Inline text={paragraph.join(' ')} />
      </p>,
    );

    // Loop invariant: every pass consumes at least one line. Belt and braces —
    // the branches above already guarantee it, and this makes it impossible to
    // regress into the infinite loop an unmatched `|` line once caused.
    if (i === start) i += 1;
  }

  return blocks;
}

/** Splits a table row on pipes that are outside code spans and not escaped. */
export function splitRow(line: string): string[] {
  let text = line.trim();
  if (text.startsWith('|')) text = text.slice(1);
  if (text.endsWith('|') && !text.endsWith('\\|')) text = text.slice(0, -1);

  const cells: string[] = [];
  let current = '';
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === '\\' && text[i + 1] === '|') {
      current += '|';
      i += 2;
      continue;
    }
    if (c === '`') {
      const end = codeSpanEnd(text, i);
      if (end !== -1) {
        current += text.slice(i, end);
        i = end;
        continue;
      }
    }
    if (c === '|') {
      cells.push(current.trim());
      current = '';
      i += 1;
      continue;
    }
    current += c;
    i += 1;
  }
  cells.push(current.trim());
  return cells;
}

/** Markdown reduced to its words, for an `aria-label`. */
export function stripMarkdown(text: string): string {
  return text.replace(/\\(.)/g, '$1').replace(/`+/g, '').replace(/\*+/g, '').trim();
}
