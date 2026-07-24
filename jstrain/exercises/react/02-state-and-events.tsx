/**
 * MODULE REACT-02 — State, events and forms
 * ==========================================
 *
 *   const [value, setValue] = useState(initial);
 *
 * Rules that explain 90% of "why didn't it update?":
 *   1. State is a SNAPSHOT. `value` does not change during the current render;
 *      calling setValue schedules a re-render with a new value.
 *   2. Therefore `setCount(count + 1)` twice in a row adds ONE. Use the
 *      updater form — `setCount(c => c + 1)` — when the new value depends on
 *      the old one.
 *   3. React compares with Object.is. Mutating an array or object and passing
 *      the same reference back changes nothing on screen. Always make a copy.
 *   4. Do not put in state anything you can COMPUTE during render. Derived
 *      state that drifts out of sync is the most common React bug there is.
 *
 * Forms: a controlled input takes `value` and `onChange` from state, so the
 * component always knows what the user typed.
 *
 * Run:  npx vitest run tests/react/02-state-and-events.test.tsx
 */
// You will need these: `useState` for every problem here, and `FormEvent` to
// type the submit handler in PROBLEM 6.
import { useState, type FormEvent } from 'react';

/**
 * PROBLEM 1 — Counter.
 *
 * Render:
 *   <button>-</button>  <span data-testid="count">{count}</span>  <button>+</button>
 *   <button>Reset</button>
 *
 * Buttons are labelled '-', '+' and 'Reset'. Start at `initial` (default 0).
 * The count must never go below 0 — '-' at 0 does nothing.
 */
export function Counter({ initial = 0 }: { initial?: number }) {
  throw new Error('TODO');
}

/**
 * PROBLEM 2 — The updater form.
 *
 * One button labelled 'Add three' that increases the count by 3 using THREE
 * separate calls to the state setter in the same handler. If you write
 * `setCount(count + 1)` three times you will get 1, not 3 — that is the whole
 * lesson.
 *
 * Show the value in `<output>{count}</output>`.
 */
export function TripleCounter() {
  throw new Error('TODO');
}

/**
 * PROBLEM 3 — A controlled input.
 *
 * A labelled text input ('Message') plus `<p>{value.length}/100 characters</p>`.
 * Input longer than 100 characters is rejected (the state keeps the previous
 * value). Use `htmlFor`/`id` so the label is properly associated.
 */
export function MessageInput() {
  throw new Error('TODO');
}

/**
 * PROBLEM 4 — Toggling.
 *
 * A button that reads 'Show details' or 'Hide details' and toggles a
 * `<p>{details}</p>` below it. The paragraph is not in the DOM at all when
 * hidden.
 */
export function Disclosure({ details }: { details: string }) {
  throw new Error('TODO');
}

/**
 * PROBLEM 5 — Derived state, done right.
 *
 * A search box (labelled 'Search') filters `items` case-insensitively as the
 * user types, and a `<ul>` shows the matches.
 *
 * Keep ONLY the query in state. The filtered list is computed during render.
 * Show `<p>No matches</p>` when nothing matches a non-empty query.
 */
export function SearchableList({ items }: { items: string[] }) {
  throw new Error('TODO');
}

/**
 * PROBLEM 6 — A form with validation.
 *
 * Fields: 'Email' and 'Password' (type="password"), plus a 'Sign in' submit
 * button.
 *
 * On submit (and only on submit):
 *   - email must contain '@'      -> 'Enter a valid email'
 *   - password must be >= 8 chars -> 'Password must be at least 8 characters'
 * Render each error in a `<p role="alert">`. When there are no errors, call
 * `onSubmit({ email, password })` and clear the password field.
 *
 * The form must NOT reload the page — remember `event.preventDefault()`.
 */
export interface LoginFormProps {
  onSubmit: (credentials: { email: string; password: string }) => void;
}

export function LoginForm({ onSubmit }: LoginFormProps) {
  throw new Error('TODO');
}

/**
 * PROBLEM 7 — Immutable updates to an object in state.
 *
 * A settings panel with a 'Dark mode' checkbox and a 'Font size' number input,
 * both stored in ONE state object `{ darkMode, fontSize }`.
 *
 * Render a `<pre data-testid="state">` containing `JSON.stringify(settings)`
 * so the test can read it. Update immutably.
 */
export function SettingsPanel() {
  throw new Error('TODO');
}

/**
 * PROBLEM 8 — A list with add and remove.
 *
 * An input labelled 'New item' and an 'Add' button. Adding trims the value,
 * ignores an empty string, appends to the list and clears the input.
 * Each item is an `<li>` with its text and a 'Remove {text}' button.
 *
 * Items keep a stable id — do not use the array index as the React key.
 */
export function ItemManager() {
  throw new Error('TODO');
}

/**
 * PROBLEM 9 — Multi-select with a Set.
 *
 * Render a checkbox per option, labelled with the option. Selecting toggles
 * membership. Below, render `<p>Selected: {sorted, comma-joined}</p>`
 * (or 'Selected: none').
 *
 * Keep a `Set` in state — and remember rule 3: mutating the Set and setting
 * the same reference back will not re-render.
 */
export function MultiSelect({ options }: { options: string[] }) {
  throw new Error('TODO');
}

/**
 * PROBLEM 10 — Lifting state up.
 *
 * Two inputs, 'Celsius' and 'Fahrenheit', that stay in sync: typing in either
 * updates the other. The single source of truth lives in this parent; the
 * child below is dumb.
 *
 * Values are rounded to at most 1 decimal when derived, and an empty or
 * non-numeric input clears the other field.
 */
export function TemperatureConverter() {
  throw new Error('TODO');
}

/** Provided for you — do not change. */
export function TemperatureInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  const id = `temp-${label.toLowerCase()}`;
  return (
    <p>
      <label htmlFor={id}>{label}</label>
      <input id={id} value={value} onChange={(event) => onChange(event.target.value)} />
    </p>
  );
}
