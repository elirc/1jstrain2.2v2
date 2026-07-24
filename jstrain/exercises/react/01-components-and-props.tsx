/**
 * MODULE REACT-01 — Components, props and JSX
 * ============================================
 *
 * A React component is a function that takes props and returns JSX. That is
 * the whole idea; everything else is a consequence.
 *
 *   function Hello({ name }: { name: string }) {
 *     return <p>Hello, {name}!</p>;
 *   }
 *
 * Things that trip people up coming from HTML:
 *   - `className`, not `class`; `htmlFor`, not `for`.
 *   - `{}` switches from markup to JavaScript. `{cond && <X/>}` renders X only
 *     when cond is truthy — but `{count && <X/>}` prints "0" when count is 0.
 *   - Every element in a list needs a stable `key` (not the array index when
 *     the list can reorder).
 *   - Props are read-only. A component never modifies its props.
 *   - A component must return ONE root node; use `<>...</>` to group.
 *
 * The tests use React Testing Library, which queries the rendered DOM the way
 * a user would: by role, label and text. If a test cannot find your element,
 * the markup is probably not accessible.
 *
 * Run:  npx vitest run tests/react/01-components-and-props.test.tsx
 */
import type { ReactNode } from 'react';

/**
 * PROBLEM 1 — Your first component.
 *
 * Render `<h1>Hello, {name}!</h1>`. When `name` is missing or empty, use
 * 'stranger'.
 */
export function Greeting({ name }: { name?: string }) {
  throw new Error('TODO');
}

/**
 * PROBLEM 2 — Props, defaults and conditional rendering.
 *
 * Render:
 *   <article>
 *     <h2>{title}</h2>
 *     <p>{description}</p>            (only when description is given)
 *     <span>{price formatted}</span>  ('$12.50' — always two decimals)
 *     <strong>Sold out</strong>       (only when inStock is false)
 *   </article>
 *
 * `inStock` defaults to true.
 */
export interface ProductCardProps {
  title: string;
  price: number;
  description?: string;
  inStock?: boolean;
}

export function ProductCard(props: ProductCardProps) {
  throw new Error('TODO');
}

/**
 * PROBLEM 3 — Lists and keys.
 *
 * Render a `<ul>` with one `<li>` per user, showing the user's name.
 * Use `user.id` as the key. When the list is empty, render
 * `<p>No users</p>` instead of an empty list.
 */
export interface User {
  id: string;
  name: string;
  role: 'admin' | 'member';
}

export function UserList({ users }: { users: User[] }) {
  throw new Error('TODO');
}

/**
 * PROBLEM 4 — Composition with `children`.
 *
 * A generic panel:
 *   <section>
 *     <h3>{title}</h3>
 *     <div>{children}</div>
 *   </section>
 *
 * `children` is just a prop that React fills with whatever you put between
 * the tags.
 */
export function Panel({ title, children }: { title: string; children: ReactNode }) {
  throw new Error('TODO');
}

/**
 * PROBLEM 5 — Variants and className.
 *
 * Render a `<span>` whose className is `badge badge--{variant}` and whose
 * text is the children. `variant` defaults to 'neutral'.
 */
export function Badge({
  variant = 'neutral',
  children,
}: {
  variant?: 'neutral' | 'success' | 'danger';
  children: ReactNode;
}) {
  throw new Error('TODO');
}

/**
 * PROBLEM 6 — The `0` trap.
 *
 * Render `<p>You have {count} unread messages</p>`, but ONLY when count is
 * greater than zero. When it is zero, render nothing at all (`null`).
 *
 * Write it with `&&` and then check the test: `{count && <p>…</p>}` renders a
 * bare "0" on the page, which is one of the most common React bugs.
 */
export function UnreadBadge({ count }: { count: number }) {
  throw new Error('TODO');
}

/**
 * PROBLEM 7 — Rendering derived data.
 *
 * Given the users, render a `<ul>` with one `<li>` per ROLE, in the form
 * `admin: 2`. Roles are listed alphabetically, and roles with no users are
 * omitted.
 */
export function RoleSummary({ users }: { users: User[] }) {
  throw new Error('TODO');
}

/**
 * PROBLEM 8 — Passing components as props.
 *
 * `renderItem` decides how each item looks; `EmptyState` is a component to
 * render when the list is empty.
 *
 *   <ul>{items.map(renderItem)}</ul>
 *
 * Wrap each rendered item in an `<li>` with `key={getKey(item)}`.
 */
export interface ListProps<T> {
  items: T[];
  getKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  EmptyState?: () => ReactNode;
}

export function List<T>({ items, getKey, renderItem, EmptyState }: ListProps<T>) {
  throw new Error('TODO');
}

/**
 * PROBLEM 9 — A star rating, read only.
 *
 * Round `rating` to the nearest whole star and clamp it to 0..5 — call that
 * `stars`. Then render a `<div role="img">` with `aria-label` of
 * `{stars} out of 5 stars`, containing 5 `<span>` elements whose text is
 * '★' for the first `stars` of them and '☆' for the rest.
 */
export function StarRating({ rating }: { rating: number }) {
  throw new Error('TODO');
}

/**
 * PROBLEM 10 — Putting it together.
 *
 * Render a Panel titled 'Team' containing a UserList, and — below the list —
 * a `<p>` reading `{n} members` (or '1 member' for exactly one).
 * Render nothing but the Panel when the team is empty (the UserList already
 * handles its own empty state, and the count line is omitted).
 */
export function TeamPanel({ users }: { users: User[] }) {
  throw new Error('TODO');
}
