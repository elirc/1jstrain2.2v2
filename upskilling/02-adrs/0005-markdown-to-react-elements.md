---
id: ADR-0005
title: Render markdown to React elements with a home-grown parser
status: accepted
date: 2026-09-23
amended-by: []
superseded-by: null
---

# ADR-0005: Render markdown to React elements with a home-grown parser

Status: accepted · Date 2026-09-23
Retro-documented from 6f1bf43
Anchors: `client/src/components/Markdown.tsx › renderBlocks (L4–12, L48–175 @ 6f1bf43)`, `client/src/components/Markdown.tsx › parseInline (L19–42 @ 6f1bf43)`, `client/src/components/Code.tsx › tokenize (L35–102 @ 6f1bf43)`

## Context
Every module has a markdown primer, and every `why` is markdown. The content uses a small subset: headings, paragraphs, flat lists, pipe tables, fenced code, inline code, bold and italic. It contains no links, images, blockquotes or nested lists (`_audits/2026-09-23-client.review.md`, row "Markdown latent list"). The app spends a whole module on XSS, so `dangerouslySetInnerHTML` would contradict its own lesson.

## Decision
We parse the subset ourselves, line by line, and emit React elements, so every piece of content reaches the DOM as a text child. We highlight code with a one-pass tokenizer instead of Prism or Shiki.

## Evidence
`client/src/components/Markdown.tsx › parseInline (L21 @ 6f1bf43)`
```ts
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*\n]+\*)/g;
```
`client/src/components/Markdown.tsx › Paragraph (L154–166 @ 6f1bf43)`
```ts
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
```
The renderer has **no tests**. Nothing checks that the content stays inside the supported subset.

## Consequences
- Good: there is no HTML string and no XSS surface, and nothing is added to the bundle.
- Cost: a home-grown parser needs the loop invariant a library would have given for free. A line that starts with `|` but is not a table is rejected by the table branch *and* by the paragraph loop, so `i` never advances and the tab freezes (client B2, register M-05; latent, because the one such line in the content sits inside a fence).
- Cost: the inline regex cannot nest, so ``**always `===`**`` renders literal backticks in seven live primer passages (client B8, M-13), and `a * b * c` becomes italics (F-27). An unclosed fence swallows the rest of the document (F-27).
- Cost: the tokenizer treats `--` as a bash comment, so `--force-with-lease` is greyed out (client B9, M-13).
- Forces on future work: the supported subset has to be written down and checked. J24 pins it with tests and makes `validateContent()` reject anything outside it.

## Alternatives rejected
- **`marked` plus `DOMPurify`.** It works, but it reintroduces an HTML string and puts a sanitiser between the app and its own lesson.
- **`react-markdown`.** It is the right answer once links arrive. At this subset it costs more bundle than the feature is worth.

## Breaks first at
Content shape, not volume. The parser handles 31 primers as easily as 300. It breaks the first time an author writes a construct outside the subset, and today it fails silently or loops instead of refusing.

## Revisit when
- Content needs its first link, image or nested list. Move then to an AST parser mapped to elements, with a URL-scheme allowlist. J24 keeps links out on purpose.
- The renderer's own tests become larger than the renderer.
