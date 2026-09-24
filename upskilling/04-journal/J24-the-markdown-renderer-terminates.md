---
id: J24
title: The Markdown renderer terminates, and bold can contain code
area: client
closes: [F-27, M-05, M-13]
ladder: [B02, B09, B14]
adrs: [0005 unchanged]
status: landed
---

# The Markdown renderer terminates, and bold can contain code

Date 2026-09-24 · Author Claude (client implementer) · Area client · Commit uncommitted working tree (baseline 6f1bf43)
Closes F-27, M-05, M-13 (the bold-with-code half; the `--flag` half is J26) · Ladder B02, B09, B14 · ADRs 0005 unchanged

## Symptom

Two defects, one latent and severe, one live and cosmetic.

1. A line that starts with `|` but is not a table freezes the tab. `| just text`, or a valid GFM table whose separator has no outer pipes (`|---|---`), spins the renderer until the tab runs out of memory. No content hits it today; the only pipe-leading line outside a table sits inside a fence.
2. Bold that contains code renders literal backticks. `**always `===`**` shows as bold text with the backticks visible. Seven primer passages do this, including the four `this` rules in `js-functions`.

Reproduce at `6f1bf43`: render `<Markdown source="| just text" />` in any harness. It never returns.

## Root cause

`client/src/components/Markdown.tsx › renderBlocks (L153–171 @ 6f1bf43)`, the paragraph branch:
```tsx
    const paragraph: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      ...
      !lines[i].trim().startsWith('|')
    ) {
```
The table branch above it skipped the line because the next line was not a separator. The paragraph `while` then rejects the same line on its first test, so `paragraph` is `[]`, `i` does not move, an empty `<p>` is pushed, and the outer `while (i < lines.length)` repeats with the same `i`. The invariant that breaks: *every pass of the block loop consumes at least one line.*

`client/src/components/Markdown.tsx › parseInline (L19–42 @ 6f1bf43)` matches one flat regex:
```tsx
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*\n]+\*)/g;
```
The bold alternative accepts backticks and its content is pushed as a string, never parsed again. The same regex italicises `a * b * c`.

## Options

| | Option | What it costs | Why (not) |
|---|---|---|---|
| A | Do nothing | Nothing | No live content triggers the hang, but the failure mode is a frozen tab mid-drill with no error, and the next author will not know the rule. |
| B | Pull in `marked` or `markdown-it` and render its tokens | One runtime dependency (~40 KB) | ADR 0005 chose React elements to keep the no-`innerHTML` guarantee without a sanitiser. A token-to-React layer on a full parser is more code than the fix. |
| C | Make the paragraph branch always consume, add a loop invariant, relax the separator to GFM, and make inline parsing a small forward-only scanner that recurses into `**`/`*` | ~200 lines, all local | Chosen. The supported subset stays small and is pinned by tests. |

## Decision and trade-off

I chose C. The paragraph branch is now a `do … while`, so it takes the current line unconditionally, and a belt-and-braces `if (i === start) i += 1` sits at the bottom of the loop. The inline parser is a character scanner: code spans are terminal (and may use a double-backtick run), bold and italic recurse, `*` needs non-space flanking, and backslash escapes work. Table cells split only on pipes outside code spans. The trade-off is that the renderer is still a subset, and I did not add links, blockquotes or nested lists. Revisit if content needs one of them. The next step then is a validator rule in `content/`, not a bigger parser.

## The change

`client/src/components/Markdown.tsx` is rewritten at about 330 lines: exported `parseInline`, `renderBlocks`, `splitRow` and `stripMarkdown`. `TABLE_SEPARATOR` is now GFM. Ordered lists keep their start number. A bare fence is `text`, not `js`.

After, `client/src/components/Markdown.tsx` (the paragraph branch):
```tsx
    const paragraph: string[] = [];
    do {
      paragraph.push(lines[i].trim());
      i += 1;
    } while (i < lines.length && lines[i].trim() && !startsBlock(lines, i));
    ...
    if (i === start) i += 1;
```

## Verification

I ran the new tests against the baseline file (copied into a throwaway folder) before deleting the copy:

1. `client/src/components/Markdown.test.tsx` › *terminates on a pipe-leading line that is not a table*. At the baseline the vitest worker never returned and was killed: `Worker exited unexpectedly with exit code 143`. After: passes in milliseconds.
2. › *renders inline code inside bold without literal backticks*. At the baseline: `expect(received).toHaveTextContent()` failed on `strong > code`. After: passes.
3. › *does not italicise arithmetic*: baseline `expected <em></em> to be null`. › *keeps the ordered list start number*: baseline `getAttribute("start") === "3"` failed. › *a bare fence is plain text*: baseline `expected <span class="kw"></span> to be null`.
4. › *renders every primer and every explanation in the curriculum, each within a budget* renders all 53 primers and 1,047 `why` texts statically, each under 1 s.
5. `npx vitest run` in `client/` → 70 passed.

## What a senior reviewer would ask

- *Why not also reject unsupported syntax at content validation?* That belongs to `content/`, which another team owns this release. I raise it as a follow-up rather than editing their validator.
- *Is the recursion bounded?* Each recursive call gets a strictly shorter slice between delimiters, so depth is at most the number of nested delimiters.
- *Does anything reach the DOM as HTML?* No. Every node is a React text child or element. Test 7 renders `<img onerror>` and asserts no `img` element exists.

## The junior version of this fix

Add `if (paragraph.length === 0) i += 1` inside the paragraph branch. It stops the hang for the one known input and passes review. It leaves the invariant implicit, so the next branch someone adds can reintroduce the loop, and it does nothing for bold-with-code, which still ships backticks to seven primers.

## Follow-ups

- [ ] `validateContent()` rejects Markdown outside the pinned subset (links, blockquotes, nested lists, `#####`) → content owner

## Update 2026-09-24

Two fuzz tests now sit beside the curriculum test: `Markdown.test.tsx` › *terminates without throwing on random pipes, backticks, asterisks and fences* (400 seeded inputs through `renderBlocks` and `parseInline`, each under 500 ms) and `Code.test.ts` › *round-trips random source in every language it knows* (150 seeded inputs per language). Both pass on the renderer as written; they exist so the termination and round-trip invariants are checked on inputs no author would write.
