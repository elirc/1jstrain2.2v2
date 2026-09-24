# Walkthrough 10: the Markdown renderer and the highlighter

Files: `client/src/components/Markdown.tsx`, `client/src/components/Code.tsx`, `client/src/components/Markdown.test.tsx`, `client/src/components/Code.test.ts`, `content/lint.js` · As of: the working tree after the 2026-09-24 refactor (baseline `6f1bf43`) · Time: ~40 min · Read first: walkthrough 06

"Before" quotes are anchored at `6f1bf43`. "After" quotes come from the working tree, which is not committed yet, so they carry plain paths and no SHA.

## The job in one sentence

Turn the curriculum's Markdown (53 primers, 1,047 `why` texts, and every prompt and choice) into React elements, never an HTML string. Colour the code inside it well enough to read, and terminate on any input, including input no author would write.

## The contract

- **In:** a source string. **Out:** `ReactNode[]`. No `dangerouslySetInnerHTML` anywhere (ADR-0005).
- **Supported subset:** headings `#`–`####`, paragraphs, flat bullet and numbered lists (an `<ol start>` is kept), GFM tables, fenced code, inline code (double-backtick spans too), bold, italic and backslash escapes. Links, blockquotes, nested lists and HTML render as literal text.
- **Invariant 1:** every pass of the block loop in `renderBlocks` consumes at least one line, so it terminates on any input.
- **Invariant 2:** inline parsing only moves forward, and each recursion gets a strictly shorter slice.
- **Invariant 3:** bold and italic may contain inline code, and code spans are terminal (nothing is parsed inside them).
- **Invariant 4:** for every language, joining `tokenize(source, lang)` gives back `source` exactly.
- **Invariant 5 (content side):** the curriculum uses only the supported subset. `content/lint.js` checks part of this (see "What is still wrong here").

## Read it in this order

1. `client/src/components/Markdown.tsx › renderBlocks (L153–171 @ 6f1bf43)`. The paragraph branch that could consume nothing.
2. `client/src/components/Markdown.tsx › renderBlocks` (working tree). Block order: blank, fence, heading, table, list, paragraph. Then the guard at the bottom.
3. `client/src/components/Markdown.tsx › parseInline`, `codeSpanEnd` and `findCloser` (working tree).
4. `client/src/components/Code.tsx › tokenize` (working tree). One pass, one decision per character.
5. The two test files, with the curriculum-wide cases last.

## The lines worth stopping at

**The loop that could not advance.**
`client/src/components/Markdown.tsx › renderBlocks (L153–166 @ 6f1bf43)`
```tsx
    // Paragraph: consume until a blank line or the start of another block
    const paragraph: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      // …
      !lines[i].trim().startsWith('|')
    ) {
```
A line starting with `|` whose next line is not a separator row is skipped by the table branch. The paragraph `while` then rejects the same line on its first test. `paragraph` is empty, `i` does not move, and the outer loop spins until the tab runs out of memory (M-05, J24). No content triggered it. The first author to write `| just text` would have frozen every learner's tab on that primer.

**Now the loop terminates by construction, and it is checked as well.**
`client/src/components/Markdown.tsx` (working tree):
```tsx
    const paragraph: string[] = [];
    do {
      paragraph.push(lines[i].trim());
      i += 1;
    } while (i < lines.length && lines[i].trim() && !startsBlock(lines, i));
    // …
    if (i === start) i += 1;
```
The `do … while` always takes the current line, and every branch above it advances `i` too. The final line is labelled belt and braces in the source. It is unreachable today, and it exists so the next branch someone adds cannot rebuild the hang. It is B02 in two lines: name the invariant, then enforce it where it lives. `startsBlock` is shared between the paragraph test and the block dispatch, so the two cannot disagree about what starts a block again.

**Inline parsing went from one regex to a scanner.**
`client/src/components/Markdown.tsx › parseInline (L19–21 @ 6f1bf43)`
```tsx
function parseInline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*\n]+\*)/g;
```
Bold content was pushed as a string and never parsed again, so `**always `===`**` showed literal backticks in seven primer passages. The same regex made `a * b * c` italic (M-13, F-27). The working tree walks the string once. An escape consumes two characters. A backtick run opens a code span that closes on a run of exactly the same length (CommonMark), so ``` `` a`b `` ``` works. `**` and `*` open only when followed by a non-space character, and close only where `findCloser` finds a delimiter after a non-space character, stepping over escapes and code spans. Bold and italic recurse into `parseInline` on the slice between the delimiters.

**Table cells split outside code only.** `splitRow` walks the row with the same `codeSpanEnd`, so `` `a | b` `` stays in one cell, and `\|` is a literal pipe. `TABLE_SEPARATOR` is now GFM, so a separator without outer pipes (`---|---`) parses. At the baseline that was the other way into the hang.

**The highlighter's one hard rule is round-tripping.** `tokenize` pushes every character exactly once, either into a coloured token or into merged plain text. So `tokens.map(t => t.text).join('') === source` for any input, and a highlighter bug can mis-colour code but never change it. Two fixes from J26 sit in the line-comment test:
```tsx
    const lineComment =
      (isCLike && char === '/' && next === '/') ||
      (isSql && char === '-' && next === '-') ||
      (isBash && char === '#' && (i === 0 || /\s/.test(source[i - 1])));
```
At the baseline, `client/src/components/Code.tsx › lineComment (L57–60 @ 6f1bf43)` treated `--` as a comment in bash too, so `git push --force-with-lease` was drawn as an italic comment. `#` starts a comment only at a word boundary now, so `$#`, `${#a}` and `url#frag` survive. `//` is a comment only in C-like languages, so it is not one in a shell URL.

**Home-grown, on purpose, with a stated limit.** The header comment says why there is no Prism or Shiki: bundle size against short snippets, and a scanner that is "honest about not being a parser". J24's option B (a Markdown library) was rejected for the same reason ADR-0005 exists. The no-`innerHTML` guarantee without a sanitiser is worth more than coverage of syntax the content does not use. This is B14 both ways: the trigger to switch is written down ("revisit if content needs links, blockquotes or nested lists"), and the next step then is a validator rule, not a bigger parser.

## Observe it

`cd client && npx vitest run src/components/Markdown.test.tsx src/components/Code.test.ts --reporter=verbose`. On this tree (both files, 20 cases, all passed; the lines below are an excerpt):
```
✓ src/components/Markdown.test.tsx > Markdown > terminates on a pipe-leading line that is not a table
✓ src/components/Markdown.test.tsx > Markdown > parses a GFM table whose separator has no outer pipes
✓ src/components/Markdown.test.tsx > Markdown > renders inline code inside bold without literal backticks
✓ src/components/Markdown.test.tsx > Markdown > does not italicise arithmetic
✓ src/components/Markdown.test.tsx > Markdown > terminates without throwing on random pipes, backticks, asterisks and fences
✓ src/components/Markdown.test.tsx > Markdown > renders every primer and every explanation in the curriculum, each within a budget
✓ src/components/Code.test.ts > tokenize > bash long flags are not comments
✓ src/components/Code.test.ts > tokenize > round-trips random source in every language it knows
✓ src/components/Code.test.ts > tokenize > round-trips every snippet in the curriculum
```
The termination case has `{ timeout: 2000 }`. At the baseline the vitest worker never returned and was killed with `exit code 143` (J24 Verification). A test for a hang needs a timeout, or it hangs the suite too.

## What is still wrong here

- J24 follow-up, half done: `content/lint.js` now fails validation on `unsupportedMarkdown` (links, images, blockquotes, rules, nested lists), but only for **primers**. A link in a `why`, a prompt or a choice is still rendered as literal text without a warning.
- The renderer and the linter disagree. `boldWithBacktick` is a *problem* ("code inside bold, which the renderer cannot nest"), but since J24 the renderer nests it correctly, and *renders inline code inside bold without literal backticks* pins that. The content rule is now stricter than the client for no reason. It was found while writing this walkthrough and has no register row. The fix belongs to the content owner: delete the rule, or keep it as a style choice and correct its message.
- J26: the scroll-restoration, theme-flash and inline-code wrap fixes have no automated test, because jsdom has no layout. They still need a manual check at 375 px in light and dark.
- M-16 is partial: the tag contrast (about 3.8:1) is claimed by no entry.
- F-27's unclosed fence now runs to the end of the source as code (`i += 1; // closing fence (or past the end)`). That is a decision, not a hang. An author gets a page of code rather than a frozen tab.

## Do it

1. (5 min) For each branch of `renderBlocks`, point at the line that advances `i`. Then explain why the final `if (i === start) i += 1` can never fire today.
2. (15 min) Predict the React tree for `**bold with `code` and *nested*** and for `2 * 3 * 4`. Check both by adding cases to `Markdown.test.tsx`.
3. (20 min) Add blockquotes (`> text`, one level only) as a new branch. Keep invariant 1 without leaning on the belt-and-braces line. Add it to `startsBlock`. Add a case to the fuzz test's alphabet, and drop the blockquote check from `unsupportedMarkdown` in `content/lint.js`, where it is a validation problem today. That file belongs to the content owner, so your change there is a proposal. Prove it terminates and renders.

## Check yourself

1. Which invariant broke at the baseline, and why did no content trigger it?
2. Why is the `do … while` the real fix and `if (i === start)` only a guard?
3. How does the scanner know that ``` `` a`b `` ``` is one code span?
4. Why is round-tripping the one rule the highlighter must never break?
5. What does J24 say to do when content needs a feature outside the subset?

<details><summary>Answers</summary>

1. "Every pass of the block loop consumes at least one line." The only pipe-leading line outside a table sat inside a fence, which the fence branch consumed first.
2. The `do … while` makes the paragraph branch always consume, so the invariant holds by construction. The guard only makes a future branch that forgets to advance safe. It would hide that bug rather than surface it.
3. `codeSpanEnd` counts the opening run (2) and closes only on a run of exactly 2. The single backtick inside is a run of 1 and is stepped over.
4. A bug that changes the text changes the code the learner copies or reads. A bug that only mis-colours is cosmetic. The curriculum-wide test pins it for every real snippet.
5. Add a validator rule in `content/` first, and extend the renderer only when content needs it. Do not swap in a full parser.

</details>
