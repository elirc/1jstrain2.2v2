import { Fragment, type ReactNode } from 'react';
import { Code } from './Code';

/**
 * A small markdown renderer for the subset the content actually uses:
 * headings, paragraphs, lists, tables, fenced code, inline code, bold and
 * italic.
 *
 * It builds React elements rather than an HTML string, so there is no
 * `dangerouslySetInnerHTML` anywhere and no XSS surface — worth doing properly
 * in an app that teaches exactly this.
 */

/** Inline formatting: `code`, **bold**, *italic*. */
export function Inline({ text }: { text: string }) {
  return <>{parseInline(text)}</>;
}

function parseInline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*\n]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) out.push(text.slice(lastIndex, match.index));
    const token = match[0];

    if (token.startsWith('`')) {
      out.push(<code key={key++}>{token.slice(1, -1)}</code>);
    } else if (token.startsWith('**')) {
      out.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
    } else {
      out.push(<em key={key++}>{token.slice(1, -1)}</em>);
    }
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) out.push(text.slice(lastIndex));
  return out;
}

export function Markdown({ source }: { source: string }) {
  return <div className="md">{renderBlocks(source)}</div>;
}

function renderBlocks(source: string): ReactNode[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let key = 0;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i += 1;
      continue;
    }

    // Fenced code
    if (line.trimStart().startsWith('```')) {
      const lang = line.trim().slice(3).trim() || 'js';
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        body.push(lines[i]);
        i += 1;
      }
      i += 1; // closing fence
      blocks.push(<Code key={key++} source={body.join('\n')} lang={lang} />);
      continue;
    }

    // Headings
    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
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

    // Table: a header row followed by a separator row of dashes
    if (line.trim().startsWith('|') && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] ?? '')) {
      const header = splitRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
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

    // Lists — a run of items, each of which may wrap onto indented lines
    const bullet = /^\s*[-*]\s+/;
    const numbered = /^\s*\d+\.\s+/;
    if (bullet.test(line) || numbered.test(line)) {
      const ordered = numbered.test(line);
      const marker = ordered ? numbered : bullet;
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
      blocks.push(ordered ? <ol key={key++}>{rendered}</ol> : <ul key={key++}>{rendered}</ul>);
      continue;
    }

    // Paragraph: consume until a blank line or the start of another block
    const paragraph: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trimStart().startsWith('```') &&
      !/^#{1,4}\s/.test(lines[i]) &&
      !bullet.test(lines[i]) &&
      !numbered.test(lines[i]) &&
      !lines[i].trim().startsWith('|')
    ) {
      paragraph.push(lines[i].trim());
      i += 1;
    }
    blocks.push(
      <p key={key++}>
        <Inline text={paragraph.join(' ')} />
      </p>,
    );
  }

  return blocks.map((block, n) => <Fragment key={n}>{block}</Fragment>);
}

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}
