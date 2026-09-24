---
id: J25
title: The stolen Enter key
area: client
closes: [M-07]
ladder: [B13, B11]
adrs: []
status: landed
---

# The stolen Enter key

Date 2026-09-24 · Author Claude (client implementer) · Area client · Commit uncommitted working tree (baseline 6f1bf43)
Closes M-07 · Ladder B13, B11 · ADRs none

## Symptom

In a drill, focus any link or button that is not part of the question (the **Tracks** nav link, the theme toggle, an order question's ↑ button) and press Enter. The link does not navigate and the button does not activate. The drill submits the answer instead. The same happens in the **New learner** name field, where both the drill and the learner form act on one keypress. `Ctrl+1` is swallowed on a four-choice question. Holding Enter submits, and the autorepeat then skips the explanation as soon as the grade lands.

Reproduce at `6f1bf43`: open `/drill?mode=daily`, press `2`, Tab to **Tracks**, press Enter. The answer is submitted and the URL stays `/drill`.

## Root cause

`client/src/pages/DrillPage.tsx › onKeyDown (L253–289 @ 6f1bf43)`:
```tsx
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        if (event.key === 'Enter' && !answered) submit();
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        if (answered) onNext();
        else submit();
        return;
      }
```
It is a `window` listener, so it hears every key on the page. It never asks where the key was aimed, whether a modifier was held, or whether the event is an autorepeat. `preventDefault()` on Enter cancels the synthetic click that a focused link or button would have received. The invariant: *a global shortcut must decline every key that another control on the page owns.*

## Options

| | Option | What it costs | Why (not) |
|---|---|---|---|
| A | Do nothing | Nothing | Keyboard and screen-reader users cannot use the nav during a drill, and the order question is unusable with Enter. |
| B | Attach the listener to the question card instead of `window` | Small | Keys pressed with focus on `<body>`, the common case after clicking a choice, would stop working. |
| C | Keep one window listener but make it decline: modifiers, `repeat`, already-handled events, targets outside the card, Enter on links, buttons, selects and text fields. Make the card a `<form>` so Enter in the answer box submits natively. | ~80 lines | Chosen. |
| D | Drop the shortcuts | Negative code | They are the fastest way through a review queue and people use them. |

## Decision and trade-off

I chose C. The shortcuts live in `client/src/pages/drill/keys.ts`, and `shouldIgnore()` is the policy. The handler reads the latest props through `useEffectEvent`, so it is registered once and never churns. Digits apply only to choice types; `0` is give-up (J30). What it gives up: a digit pressed while focus sits in the nav does nothing. That is the point, but it is a behaviour change. Revisit if a second global shortcut appears. At that point it needs a shortcut table and a cheat-sheet, which were deferred this release.

## The change

New `client/src/pages/drill/keys.ts` (~80 lines). `QuestionCard.tsx` is a `<form onSubmit>`. The old listener is deleted with the old `DrillPage.tsx`.

After, `client/src/pages/drill/keys.ts`:
```ts
export function shouldIgnore(event: KeyboardEvent, card: HTMLElement | null): boolean {
  if (event.defaultPrevented || event.repeat || event.ctrlKey || event.metaKey || event.altKey) {
    return true;
  }
  const target = event.target instanceof Element ? event.target : null;
  const onPage = target === null || target === document.body || target === document.documentElement;
  return !onPage && !(card && target && card.contains(target));
}
```
and inside the handler:
```ts
      if (target?.closest('a, button, select, summary')) return; // native activation wins
      if (isTextField(target)) return; // the form submits on its own
```

## Verification

1. `client/src/pages/drill/DrillPage.test.tsx` › *Enter on a focused nav link navigates instead of submitting*: the location becomes `/tracks` and there is no `POST /api/answers`. At the baseline the handler submits and calls `preventDefault()`, so the link never navigates.
2. › *Ctrl+1 is not intercepted*: `fireEvent.keyDown(body, { key: '1', ctrlKey: true })` returns `true` (not prevented) and no choice is checked. The same holds for `repeat: true`.
3. › *digit selects a choice and a double Enter submits exactly once, with the choice id*: one POST, not two.
4. › *digits typed into the short-answer box stay in the box*: the value is `404`, and Enter submits through the form.

## What a senior reviewer would ask

- *Why `useEffectEvent` rather than a ref?* It gives the handler the latest `answered` and draft without re-subscribing, with no stale-closure window between a state change and re-registration. That window is what made the double submit (F-07) possible.
- *Does Space still activate choices?* Yes. Choices are native radios and checkboxes (J30), so Space and the arrow keys are the browser's.
- *What about macOS Cmd+digit?* It is declined by the `metaKey` check, although the menu bar usually takes it first.

## The junior version of this fix

Add `if (target.tagName === 'A') return;` above the Enter branch. It fixes the nav link in the bug report. It leaves the theme toggle, the order buttons, the select, `Ctrl+1` and autorepeat broken, because it patches the reported symptom instead of the rule "decline what you do not own".

## Follow-ups

- [ ] A keyboard cheat-sheet dialog once a shortcut table exists → deferred (P8)
