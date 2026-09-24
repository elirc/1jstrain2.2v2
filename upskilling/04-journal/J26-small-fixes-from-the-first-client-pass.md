---
id: J26
title: Small fixes from the first client pass
area: client
closes: [M-13, M-16]
ladder: [B13]
adrs: []
status: landed
---

# Small fixes from the first client pass

Date 2026-09-24 · Author Claude (client implementer) · Area client · Commit uncommitted working tree (baseline 6f1bf43)
Closes M-13 (rest), M-16 (part: nowrap, focus ring, contrast tokens) · Ladder B13 · ADRs none

## Symptom

- Bash `--force-with-lease` in the `craft-git` primer is drawn as an italic comment.
- Long inline code spans overflow the choice button at 375 px, so the page scrolls sideways.
- A module card low on the roadmap opens its page scrolled past the header.
- A learner who forced light mode on a dark OS sees a dark flash on every load.

## Root cause

`client/src/components/Code.tsx › lineComment (L57–60 @ 6f1bf43)` treats `--` as a comment in bash:
```tsx
      (char === '-' && next === '-' && (lang === 'sql' || lang === 'bash')) ||
```
`client/src/styles.css › white-space: nowrap (L171–179 @ 6f1bf43)` never lets inline code wrap. The router has no `<ScrollRestoration/>`. `client/src/components/ui.tsx › ThemeToggle (L110–128 @ 6f1bf43)` applies `data-theme` in an effect after the first paint.

## The change

`--` is a comment only in SQL. `#` starts a comment in bash only at a word boundary, and `//` never does. `:not(pre) > code` is `white-space: normal; overflow-wrap: anywhere`. `Shell.tsx` renders `<ScrollRestoration />`. `index.html` has a pre-paint script that always resolves `data-theme` to `light` or `dark`, so the CSS has one dark block. `ThemeToggle` validates the stored value with `isTheme` and follows `matchMedia` while on "system". `--text-faint` is now `#646c7b`/`#8791a2`, and `.input:focus-visible` has its ring back.

## Verification

`client/src/components/Code.test.ts` › *bash long flags are not comments*. At the baseline: `AssertionError: expected [ '--force-with-lease' ] to deeply equal []`. After: passes. Three other tokenizer tests also failed at the baseline. The scroll, theme and wrap fixes have no automated test (jsdom has no layout) and I had no browser in this session. They still need a manual check at 375 px in light and dark.

## Update 2026-09-24

Recomputing every text/background pair in `tokens.css` (WCAG 2 relative luminance, both themes): all pass 4.5:1 except the light-theme code number, `#b3541e` on `#f0f2f6` at 4.46. It is now `#a84d18` (5.01). Lowest passing pairs: light `.nav a.active` 4.67, `.banner-bad` 4.68, `.meta` on `--bg-inset` 4.80; dark `.nav a.active` 4.92, `.meta` on `--bg-inset` 5.02. Two touch fixes in `components.css`: nav links get `min-height: 44px` under `pointer: coarse` (they were 34 px), and the ≤640 px nav gets a 48 px trailing spacer so the last link can scroll clear of the edge fade, which otherwise covered "Code labs" permanently.
