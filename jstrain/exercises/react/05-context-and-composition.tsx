/**
 * MODULE REACT-05 — Context and composition patterns
 * ===================================================
 *
 * Context solves ONE problem: passing a value to a deeply nested component
 * without threading props through every layer ("prop drilling"). It is not a
 * state manager and it is not free — every consumer re-renders when the
 * context value changes, so the value should be memoised.
 *
 *   const ThemeContext = createContext<Theme | null>(null);
 *   <ThemeContext.Provider value={value}>…</ThemeContext.Provider>
 *   const theme = useContext(ThemeContext);
 *
 * The pattern that makes context pleasant to use:
 *   - default the context to `null`
 *   - export a `useX()` hook that throws a clear error when the value is null
 *   - never export the raw context
 *
 * Composition beats configuration. Before adding a 12th prop to a component,
 * ask whether the caller could pass JSX instead.
 *
 * Run:  npx vitest run tests/react/05-context-and-composition.test.tsx
 */
import { createContext, useContext, useMemo, useReducer, useState, type ReactNode } from 'react';

/**
 * PROBLEM 1 — A theme context with a safe hook.
 *
 * `ThemeProvider` holds `theme` state ('light' | 'dark', default 'light') and
 * exposes `{ theme, toggleTheme }`.
 *
 * `useTheme()` returns that value, or throws
 * `new Error('useTheme must be used inside a ThemeProvider')` when there is no
 * provider above it.
 *
 * The context VALUE must be memoised so that consumers do not re-render when
 * the provider re-renders for an unrelated reason.
 */
export interface ThemeValue {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export function ThemeProvider({
  children,
  initial = 'light',
}: {
  children: ReactNode;
  initial?: 'light' | 'dark';
}) {
  throw new Error('TODO');
}

export function useTheme(): ThemeValue {
  throw new Error('TODO');
}

/**
 * PROBLEM 2 — A consumer.
 *
 * Render a button whose text is `Theme: {theme}` and which toggles the theme
 * when clicked.
 */
export function ThemeToggle() {
  throw new Error('TODO');
}

/**
 * PROBLEM 3 — Compound components.
 *
 * `Tabs` owns the selected id and shares it through context. The caller
 * composes the pieces:
 *
 *   <Tabs defaultId="a">
 *     <TabList>
 *       <Tab id="a">First</Tab>
 *       <Tab id="b">Second</Tab>
 *     </TabList>
 *     <TabPanel id="a">First panel</TabPanel>
 *     <TabPanel id="b">Second panel</TabPanel>
 *   </Tabs>
 *
 * Requirements:
 *   - `TabList` renders a `<div role="tablist">`.
 *   - `Tab` renders a `<button role="tab">` with `aria-selected` and
 *     `aria-controls={`panel-${id}`}`; clicking it selects that tab.
 *   - `TabPanel` renders a `<div role="tabpanel" id={`panel-${id}`}>` ONLY
 *     when its id is selected.
 *   - Using any of them outside `<Tabs>` throws
 *     'Tabs components must be used inside <Tabs>'.
 */
export function Tabs({ children, defaultId }: { children: ReactNode; defaultId: string }) {
  throw new Error('TODO');
}

export function TabList({ children }: { children: ReactNode }) {
  throw new Error('TODO');
}

export function Tab({ id, children }: { id: string; children: ReactNode }) {
  throw new Error('TODO');
}

export function TabPanel({ id, children }: { id: string; children: ReactNode }) {
  throw new Error('TODO');
}

/**
 * PROBLEM 4 — Children as a function (the render-prop pattern).
 *
 * `Toggle` owns the boolean and hands it to the caller's function:
 *
 *   <Toggle>{({ on, toggle }) => <button onClick={toggle}>{on ? 'On' : 'Off'}</button>}</Toggle>
 */
export interface ToggleRenderProps {
  on: boolean;
  toggle: () => void;
}

export function Toggle({
  children,
  initial = false,
}: {
  children: (props: ToggleRenderProps) => ReactNode;
  initial?: boolean;
}) {
  throw new Error('TODO');
}

/**
 * PROBLEM 5 — Slots instead of a wall of props.
 *
 * Render:
 *   <div>
 *     <header>{header}</header>
 *     {sidebar && <aside>{sidebar}</aside>}
 *     <main>{children}</main>
 *     {footer && <footer>{footer}</footer>}
 *   </div>
 *
 * Each slot is just a ReactNode prop.
 */
export function Layout({
  header,
  sidebar,
  footer,
  children,
}: {
  header: ReactNode;
  sidebar?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  throw new Error('TODO');
}

/**
 * PROBLEM 6 — Context + reducer: a shopping cart store.
 *
 * `CartProvider` holds `{ items: CartItem[] }` and exposes
 * `{ items, total, add, remove, setQuantity, clear }` through context.
 *
 *   add(item)                adds, or increases quantity if the id is present
 *   remove(id)               drops the line
 *   setQuantity(id, n)       n <= 0 removes the line
 *   total                    sum of price * quantity, rounded to 2 decimals
 *
 * `useCart()` throws 'useCart must be used inside a CartProvider' outside the
 * provider.
 */
export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface CartValue {
  items: CartItem[];
  total: number;
  add: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  remove: (id: string) => void;
  setQuantity: (id: string, quantity: number) => void;
  clear: () => void;
}

export function CartProvider({ children }: { children: ReactNode }) {
  throw new Error('TODO');
}

export function useCart(): CartValue {
  throw new Error('TODO');
}

/**
 * PROBLEM 7 — A component built on the store.
 *
 * Render:
 *   - `<p>Cart is empty</p>` when there are no items
 *   - otherwise a `<ul>` with one `<li>` per item reading
 *     `{name} x{quantity} — ${lineTotal}` (two decimals) and a button
 *     labelled `Remove {name}`
 *   - a `<p data-testid="total">Total: ${total}</p>` (two decimals)
 */
export function CartSummary() {
  throw new Error('TODO');
}

/**
 * PROBLEM 8 — Composing everything.
 *
 * Render a `Layout` whose header is a `ThemeToggle`, whose main content is
 * `Tabs` with two tabs ('Cart' showing `CartSummary`, and 'Help' showing
 * `<p>Ask us anything</p>`), all wrapped in the providers it needs.
 *
 * The default tab is 'cart'.
 */
export function StorePage() {
  throw new Error('TODO');
}
