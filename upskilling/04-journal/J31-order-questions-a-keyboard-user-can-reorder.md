---
id: J31
title: Order questions a keyboard user can reorder
area: client
closes: [F-15]
ladder: [B13, B04]
adrs: []
status: landed
---

# Order questions a keyboard user can reorder

Date 2026-09-24 · Author Claude (client implementer) · Area client · Commit uncommitted working tree (baseline 6f1bf43)
Closes F-15 · Ladder B13, B04 · ADRs none

## Symptom

On an order question, Tab to an item's ↓ button and press Space. The item moves, and focus falls to `<body>`. The next Tab starts again from the top of the page, so reordering four items takes dozens of keystrokes. A screen reader hears nothing about the move. After a wrong answer the whole list turns red and the correct sequence is never shown. And 1 time in 6, the three-item question arrives already solved, because the client's own shuffle can return the identity permutation.

Reproduce at `6f1bf43`: open a drill with an order question, focus ↓ on the first item, press Space, then check `document.activeElement` in the console. It is `body`.

## Root cause

`client/src/pages/DrillPage.tsx › OrderList (L468–473 @ 6f1bf43)`:
```tsx
      {items.map((item, i) => (
        <li
          key={`${item}-${i}`}
          className={`choice${correct === true ? ' is-correct' : correct === false ? ' is-wrong' : ''}`}
        >
```
The key includes the position, so a move changes both swapped rows' keys. React unmounts them and mounts new ones, and the focused button is destroyed. `client/src/pages/DrillPage.tsx › shuffled (L572–579 @ 6f1bf43)` is an unguarded Fisher–Yates. The grade is one boolean: `ordering.every((v, i) => v === result.answer[i])`. The invariant: *a move keeps the moved item's DOM node and focus, and after grading every position says whether it is right and where the item belongs.*

## Options

| | Option | What it costs | Why (not) |
|---|---|---|---|
| A | Do nothing | Nothing | The question type is close to unusable from a keyboard. |
| B | Drag and drop | A library, or a lot of pointer code | It is worse for keyboards and screen readers than buttons, and it is a new dependency. |
| C | Key rows by choice id, restore focus through a ref map, announce each move politely, reveal per position and the correct sequence, and leave the shuffle to the server | ~130 lines | Chosen. |

## Decision and trade-off

I chose C. Rows are keyed by choice id, so a move reorders existing nodes. A `useLayoutEffect` puts focus back on the button that was pressed, or on its sibling when the row reaches an end and that button disables. A `role="status"` span says "Moved “first” to position 2 of 3." `aria-label`s strip Markdown backticks. After grading each row is marked right or wrong, with sr-only text "wrong position, belongs at 3", and a "Correct order" list follows. The server now guarantees the served order is never the answer (CONTRACT §1), so the client's shuffle is deleted rather than fixed. What it gives up: two taps per step on touch devices. The buttons are 44 px under `pointer: coarse`. Revisit if order questions grow past about six items.

## The change

New `client/src/pages/drill/OrderList.tsx`. The draft holds `order: string[]` of ids (J30), and the reveal is `answerChoiceIds` in sequence.

After, `client/src/pages/drill/OrderList.tsx`:
```tsx
  useLayoutEffect(() => {
    const pending = pendingFocus.current;
    if (!pending) return;
    pendingFocus.current = null;
    const same = buttons.current.get(`${pending.id}:${pending.dir}`);
    const other = buttons.current.get(`${pending.id}:${pending.dir === 'up' ? 'down' : 'up'}`);
    (same && !same.disabled ? same : other)?.focus();
  }, [order]);
```

## Verification

`client/src/pages/drill/DrillPage.test.tsx` › *order questions render the server order and move items with focus kept*. It asserts the rows render in served order, that after ↓ the same button (now on row 2) has focus, that the status text announces the move, that at the bottom focus moves to ↑, and that the POST body is `response: ['o-c0','o-c1','o-c2']`. At the baseline the index key remounts the row, and `activeElement` is `body` after the first move. `useDrillSession.test.ts` › *the initial order draft is exactly the order the server sent* pins "the client never shuffles".

## What a senior reviewer would ask

- *Why not `aria-grabbed` or the listbox reorder pattern?* Both are deprecated or poorly supported. Two labelled buttons per row are announced correctly everywhere.
- *What if the server sends the solved order anyway?* The learner can submit at once and is graded correct. That is a server contract breach with its own test, not something the client should hide.
- *Does the announcement repeat on every render?* No. It changes only on a move, and a polite region reads it once.

## The junior version of this fix

Change the key to `item`, the text. Focus survives, and review passes. Two choices with identical text (it happens with short code tokens) now collide on one key, and React silently drops or duplicates a row. The choice id exists precisely to be the stable key.

## Follow-ups

- [ ] Keyboard grab-and-move (Space to pick up, arrows to move) if users ask for it → not planned
