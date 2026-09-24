/**
 * Modules — React (stage 3).
 *
 * One file per author, so parallel authors never touch the same file. Each
 * module carries a primer that covers everything its questions test. Primers
 * are markdown-lite — headings, lists, `code`, fenced blocks, tables, **bold**
 * and *italic*; validateContent() rejects anything the renderer cannot show.
 */

/** @type {import('../types.d.ts').Module[]} */
export const reactModules = [
  {
    id: 'react-render',
    trackId: 'react',
    title: 'The rendering model',
    blurb: 'What a component is, what re-render really means, keys, and the JSX gotchas.',
    estMinutes: 35,
    objectives: [
      'Explain what happens between setState and the DOM changing',
      'Say why keys matter and why the array index is usually wrong',
      'Explain why `{count && <X/>}` renders a literal 0',
      'Distinguish props from state and know which one to reach for',
    ],
    primer: `
## What React does

A component is a function from props and state to a description of UI. Calling
it produces a tree of plain objects (React elements) — **not** DOM. React
compares that tree with the previous one and applies the minimum set of DOM
mutations. That comparison is reconciliation; "the virtual DOM" is just the name
for the object tree.

"Re-render" means **React called your function again**. It does not mean the DOM
changed. A re-render that produces the same output touches no DOM at all, which
is why "unnecessary re-renders" are usually cheap and rarely the real problem.

A component re-renders when its state changes, when its parent re-renders, or
when a context it consumes changes. Note the second one: props being "the same"
does not stop a re-render unless the component is wrapped in \`React.memo\`.

## JSX

JSX compiles to function calls: \`<Foo a={1}/>\` becomes \`jsx(Foo, { a: 1 })\`.
Consequences that show up as questions:

- Components must be capitalised, or JSX emits the string tag \`"foo"\`.
- \`class\` → \`className\`, \`for\` → \`htmlFor\`, and event props are
  camelCase (\`onClick\`).
- You return one root; \`<>...</>\` is a fragment that adds no DOM node.
- \`{}\` interpolates an expression, not a statement — no \`if\`, no \`for\`.
- \`false\`, \`null\`, \`undefined\` and \`true\` render nothing. \`0\` **does
  not.** \`{items.length && <List/>}\` renders a literal \`0\` on an empty
  array; write \`{items.length > 0 && <List/>}\`.

## Keys

Keys tell React which element in a list is which between renders. With the array
index as key, deleting the first item makes React think every item changed its
content rather than that one was removed — so component state (an input's typed
text, a checkbox) sticks to the wrong row. Use a stable id from the data. Index
keys are only safe when the list never reorders, never filters and never has
items removed.

Keys must be unique among **siblings**, not globally, and \`key\` is not
readable as a prop. Since React 19, \`ref\` *is*: function components receive it
as an ordinary prop and no longer need \`forwardRef\`.

## Props vs state

Props come from the parent and are read-only inside the component. State is
owned by the component and changing it schedules a render. If a value can be
computed from props or existing state, **derive it during render** — do not copy
it into state, or you now have two sources of truth that drift.

## Purity

Rendering must be pure: same props and state, same output, no side effects. That
is why StrictMode double-invokes your component in development — to surface
impurity (React 19 also reuses the first call's \`useMemo\`/\`useCallback\`
results on the second, so the double call is cheaper). Mutating a prop, writing
to a module-level variable, or calling \`fetch\` during render are all bugs the
double-render is designed to expose.

## Trigger, render, commit

Every update goes through the same three steps. **Trigger**: a state setter
queues an update and schedules a render. **Render**: React calls your
components and diffs the result; nothing on screen changes yet. **Commit**:
React applies the DOM changes, then runs \`useLayoutEffect\` callbacks
synchronously, before the browser can paint, then \`useEffect\` callbacks. The
browser usually paints between the last two, but after a discrete event such as
a click React may flush passive effects before paint, so never rely on "effects
run after paint" for correctness.

## Never define components inside components

\`\`\`tsx
function Parent() {
  function Field() { /* has its own useState */ }
  return <Field />;   // a NEW component type on every Parent render
}
\`\`\`

React compares element types by reference. A function declared inside
\`Parent\` is a different function on every render, so React unmounts the old
\`Field\` and mounts a new one: its state resets and inputs lose focus. Declare
components at module level and pass data in as props.

## Children as props

Components re-render when their parent renders, but the rule underneath is
about **element identity**: if the element object is the same as last time,
React skips it. In \`<Layout><ExpensiveChart /></Layout>\`, the chart element is
created by the component that renders \`Layout\` and arrives as \`children\`.
When \`Layout\`'s own state changes, it returns the same \`children\` object, so
the chart does not re-render. Passing expensive subtrees as children ("lifting
content up") is a free optimisation that needs no \`memo\`.

Props are read-only. Mutating one (\`props.user.name = 'x'\`) does not
re-render anything, because React never watches objects, and it silently
changes the parent's data. Ask the owner to change it through a callback.

## What renders nothing

\`null\`, \`undefined\`, \`true\` and \`false\` render nothing. Every number
renders, including \`0\` and \`NaN\` (React also warns about \`NaN\` in
development), and an empty string renders an invisible empty text node. Keep
the left side of \`&&\` a boolean.

## Portals

\`createPortal(children, domNode)\` renders a subtree into a different DOM
node, usually \`document.body\`, so a modal, dropdown or tooltip escapes a
parent's \`overflow: hidden\` and stacking context. Only the DOM position
changes: the portal stays in the same place in the React tree, so context still
reaches it and its events bubble to its **React** ancestors, not its DOM
ancestors. A click inside a modal can therefore trigger an \`onClick\` on the
table row that opened it; stop propagation where that matters.

## React 19 odds and ends

- \`ref\` is an ordinary prop for function components:
  \`function TextInput({ ref, ...rest }) { return <input ref={ref} {...rest} />; }\`.
  \`forwardRef\` still works but is no longer needed for new code.
- \`useId()\` returns an id that is stable across renders and identical on the
  server and the client, which is what you need to pair a \`<label htmlFor>\`
  with an input or wire up \`aria-describedby\`. A counter or
  \`Math.random()\` gives different ids on each side and breaks hydration.
  It is not for list keys; those come from your data.
`,
  },
  {
    id: 'react-state',
    trackId: 'react',
    title: 'State, events and forms',
    blurb: 'useState properly, the updater form, controlled inputs, lifting state and useReducer.',
    estMinutes: 35,
    objectives: [
      'Explain why two setState calls with the same value only bump the counter once',
      'Know when the updater form is mandatory',
      'Build a controlled input and say what "controlled" means',
      'Decide between useState and useReducer with a real criterion',
    ],
    primer: `
## setState is asynchronous-ish

\`setCount(count + 1)\` does not change \`count\` — that variable is a const from
this render. React schedules a render with the new value and **batches** every
update in the same event (and since React 18, in promises and timeouts too).

\`\`\`js
setCount(count + 1);
setCount(count + 1);   // both compute from the same stale count -> +1 total

setCount(c => c + 1);
setCount(c => c + 1);   // queued functions, each sees the previous -> +2
\`\`\`

Use the **updater form** whenever the next value depends on the previous one.

## Immutability is not style

React compares with \`Object.is\`. \`state.items.push(x); setItems(state.items)\`
passes the same reference, so React bails out and nothing renders. Always create
a new array or object.

## Lazy initial state

\`useState(expensiveInit())\` calls \`expensiveInit\` on **every** render and
throws the result away. \`useState(expensiveInit)\` — passing the function —
calls it once.

## Controlled inputs

A controlled input's value comes from state and every keystroke goes through
\`onChange\`. That is what lets you validate, format and disable a submit
button. An uncontrolled input keeps its own value in the DOM and you read it
with a ref or on submit — fine for simple forms, and what libraries like
react-hook-form use for performance. Setting \`value\` without \`onChange\`
produces React's "you provided a value prop without an onChange handler"
warning, because the field is then read-only by accident.

## Lifting state up

When two siblings need the same value, move it to their nearest common parent
and pass it down with a callback back up. That is the whole answer, and it is
what "single source of truth" means in React. Reach for context or a store only
when the prop-passing depth genuinely hurts.

## useState vs useReducer

Switch to \`useReducer\` when the next state depends on several fields at once,
when several values must change together to stay consistent, or when the update
logic is worth testing on its own. A reducer is \`(state, action) => newState\`
— a pure function, easy to unit test without rendering anything.

## Where state should live

Local first. Lift only when shared. Server data is not really "state" you own —
it is a cache of someone else's data, which is the argument for React Query /
SWR rather than \`useState\` + \`useEffect\`. URL state (filters, page, selected
tab) usually belongs in the query string so links are shareable.

## Stale closures

Every render has its own props and state, and every function created during
that render closes over them. A callback that outlives its render (an interval,
a subscription, a promise) keeps seeing the old values:

\`\`\`tsx
useEffect(() => {
  const id = setInterval(() => setCount(count + 1), 1000); // count is 0 forever
  return () => clearInterval(id);
}, []);
\`\`\`

That counter reaches 1 and stays there: every tick sets \`0 + 1\`. Use the
updater form, \`setCount((c) => c + 1)\`, which needs no dependency. The
empty dependency array was the lie that caused it.

## useState replaces, it does not merge

\`setUser({ name: 'B' })\` throws away every other field; class components'
\`this.setState\` merged, hooks do not. Spread the previous value
(\`setUser((u) => ({ ...u, name: 'B' }))\`) or keep unrelated values in
separate \`useState\` calls.

Know which array methods mutate: \`push\`, \`pop\`, \`splice\`, \`sort\` and
\`reverse\` change the array in place, as does assigning to a property.
Spread, \`map\`, \`filter\` and the ES2023 copying methods \`toSorted\`,
\`toReversed\`, \`toSpliced\` and \`with\` return new arrays. Spread is shallow,
so copy every level you change.

## Props as initial state

\`useState(props.initialValue)\` reads the prop **once**, on the first render;
later changes are ignored. Either the prop really is only an initial value
(then reset the component with \`key={item.id}\` when the item changes), or the
component should be controlled and read the prop directly. Syncing a copy with
an effect gives you an extra render and two sources of truth.

## Uncontrolled forms and FormData

For a simple form that only needs its values on submit, skip the state:

\`\`\`tsx
function onSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  const data = new FormData(e.currentTarget);
  save({ title: String(data.get('title')) });
}
\`\`\`

Typing renders nothing and there is less code. React 19 form actions
(\`<form action={fn}>\`) hand your function the \`FormData\` directly. Choose
controlled inputs when the UI must react to each keystroke: live validation,
formatting, or fields that depend on each other.

## Lifting state, step by step

Find the closest common parent of everything that needs the value, move the
\`useState\` there, pass the value and an \`onChange\`-style callback down as
props, then make the children read the prop and call the callback instead of
keeping their own copy.

## Reducers as event logs

Name actions after what happened, not after the state you want:
\`{ type: 'field_changed', field, value }\`, \`{ type: 'submitted' }\`. The
component says what happened, the reducer decides what it means, and DevTools
shows a readable history. Reducers must be pure: no fetches, no mutation, no
\`Date.now()\`. React may call them more than once (StrictMode does so on
purpose), so side effects belong in the handler that dispatches.

## When context plus a reducer stops scaling

A context holding a \`useReducer\` store works until many components read
different slices of it. Context has no selectors: every consumer re-renders
whenever the value changes, and \`memo\` does not stop that. First split
contexts by concern (and put \`dispatch\` in its own context, since it never
changes). When that is not enough, move to a store with selectors such as
Zustand or Redux Toolkit, where \`useStore((s) => s.cart.count)\` re-renders
only when that slice changes.

## Immer

Deeply nested immutable updates are noisy. Immer's \`produce\` (or the
\`useImmer\` hook) hands you a draft you can "mutate":
\`draft.items[3].done = true\`. It records the changes and returns a new object
in which only the changed path is new and every untouched branch keeps its
identity (structural sharing), so \`memo\` and \`Object.is\` still work. Redux
Toolkit uses it inside \`createSlice\`.

## Exposing an imperative handle

Occasionally a parent needs to call a method on a child, such as \`focus()\` or
\`scrollToRow(5)\`. In React 19 the \`ref\` arrives as a prop, and
\`useImperativeHandle(ref, () => ({ focus }), [])\` decides what the parent's
\`ref.current\` is. Keep it for focus, scrolling and media; data flows down
through props, not up through handles.

Server data is covered in depth in *Server state, mutations and forms*.
`,
  },
  {
    id: 'react-effects',
    trackId: 'react',
    title: 'Effects and data fetching',
    blurb: 'useEffect, dependencies, cleanup, race conditions, and the effects you should delete.',
    estMinutes: 40,
    objectives: [
      'Say what useEffect is actually for and name three cases where it is wrong',
      'Explain the three dependency-array forms',
      'Fix a fetch race condition',
      'Explain why StrictMode runs your effect twice',
    ],
    primer: `
## What effects are for

\`useEffect\` **synchronises your component with something outside React**:
subscriptions, timers, event listeners, imperative DOM APIs, analytics, and
(historically) data fetching. It is not a lifecycle hook and it is not "run this
after state changes".

You do **not** need an effect to:

- transform data for rendering — do it during render
- reset state when a prop changes — use a \`key\` on the component
- respond to a user event — put the logic in the event handler
- compute derived values — that is just a variable, or \`useMemo\` if expensive

"I updated state in an effect that depends on that state" is an infinite loop
waiting to happen.

## The dependency array

\`\`\`js
useEffect(fn);              // after every render
useEffect(fn, []);          // once after mount (and its cleanup on unmount)
useEffect(fn, [a, b]);      // when Object.is(a, prev a) is false
\`\`\`

Dependencies are compared by reference, so an inline object, array or function
is a *new* value each render and re-fires the effect every time. That is what
\`useCallback\`/\`useMemo\` are really for. Lying about dependencies to silence
the lint rule creates stale closures — the effect keeps seeing the values from
the render it was created in.

## Cleanup

Return a function and React runs it before the next effect and on unmount.
Anything you start, you stop: \`clearInterval\`, \`removeEventListener\`,
\`subscription.unsubscribe()\`, \`controller.abort()\`. Missing cleanup is how
listeners and intervals stack up on every render and keep stale closures (and
the whole component scope) alive after unmount.

## The race condition

\`\`\`js
useEffect(() => {
  let cancelled = false;
  fetch(\`/api/search?q=\${query}\`)
    .then(r => r.json())
    .then(data => { if (!cancelled) setResults(data); });
  return () => { cancelled = true; };
}, [query]);
\`\`\`

Without that flag, typing "re" then "react" can show the results for "re" if the
slower request lands second. This is the most-asked React bug in interviews.
\`AbortController\` is the better version because it also cancels the request.

## StrictMode

Since React 18, StrictMode in development mounts, unmounts and remounts every
component once, so each effect runs twice. That is a **feature**: an effect with
correct cleanup is unaffected, so a double-run that breaks your code has found a
real bug. It does not happen in production.

## useLayoutEffect

\`useLayoutEffect\` runs synchronously after DOM mutation and before paint. Use
it only to measure layout and adjust the DOM before the user sees a frame
(tooltip positioning); for everything else it just delays painting. It does not
run during server rendering. Two smaller rules: the effect callback itself
cannot be \`async\` (React expects a cleanup function back, not a promise —
define the async function inside and call it), and "skip the first run" is
usually a sign the logic belongs in an event handler. Cleanup also gives you a
debounce for free:

\`\`\`js
useEffect(() => {
  const t = setTimeout(() => search(query), 300);
  return () => clearTimeout(t);   // each keystroke cancels the previous timer
}, [query]);
\`\`\`

## The modern answer

For server data, most teams now use React Query / SWR / a framework loader
rather than \`useEffect\` + \`useState\`. Saying so — and naming what you get
(caching, dedupe, retries, stale-while-revalidate, no hand-rolled race
handling) — is the mid-level answer.

## StrictMode in practice

With \`<StrictMode>\` in development, this effect logs \`connect\`,
\`disconnect\`, \`connect\`:

\`\`\`tsx
useEffect(() => {
  console.log('connect');
  return () => console.log('disconnect');
}, []);
\`\`\`

The extra unmount and remount prove that your cleanup undoes your setup. If the
second \`connect\` leaks a socket or doubles a listener, users would hit the same
bug on fast navigation. Fix the cleanup; do not add a "has run" ref.

## Cancelling with AbortController

\`\`\`tsx
useEffect(() => {
  const controller = new AbortController();
  fetch(\`/api/users/\${id}\`, { signal: controller.signal })
    .then((r) => r.json())
    .then(setUser)
    .catch((e) => { if (e.name !== 'AbortError') setError(e); });
  return () => controller.abort();
}, [id]);
\`\`\`

\`abort()\` cancels the request itself and rejects the promise with an
\`AbortError\`, which you ignore. A boolean flag also fixes the race but lets
the request finish.

## When cleanup runs

When a dependency changes (say \`userId\` goes from 1 to 2), React renders with
2, commits the DOM, runs the **old** effect's cleanup (which still sees
\`userId\` 1 through its closure), then runs the new effect with 2. On unmount
only the cleanup runs.

## Effect or event handler?

Ask what caused the code to run. If it is a particular interaction (clicking
Save, submitting a form, logging a button click), the code belongs in that
event handler: it runs once, with the right data, and cannot re-fire because of
an unrelated render. Effects are for staying in sync with something outside
React while the component is on screen: a subscription, a timer, a chart
library, a socket.

## Effect chains

An effect that sets state, which triggers another effect that sets more state,
costs a render per link, shows intermediate states and hides the data flow.
Compute derived values during render, and make all the state changes an event
causes in that event's handler, where React batches them into one render.

## Effect events

Sometimes an effect needs the latest value of something that should **not**
re-run it: a chat connection keyed by \`roomId\` that shows a notification in the
current \`theme\`. React 19.2 made \`useEffectEvent\` stable for this:

\`\`\`tsx
const onConnected = useEffectEvent(() => showNotification('Connected', theme));
useEffect(() => {
  const conn = connect(roomId);
  conn.on('connected', onConnected);
  return () => conn.disconnect();
}, [roomId]);
\`\`\`

The effect event always sees the latest \`theme\` and is not a dependency.
Removing \`theme\` from the array instead hides the problem behind a disabled
lint rule; before 19.2, a ref kept up to date was the usual workaround.

## Subscribing to external stores

For values React does not own (\`navigator.onLine\`, a store, browser APIs), use
\`useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)\`.
\`subscribe\` adds listeners and returns an unsubscribe function; \`getSnapshot\`
returns the current value and must return the same value while nothing changed,
or React re-renders in a loop. React reads the snapshot during render, so a
concurrent render never shows two different values at once (tearing), and the
server snapshot covers SSR. It is what Zustand and Redux use under the hood.

## Layout effects and paint

\`useLayoutEffect\` runs synchronously after DOM mutations and **before** the
browser paints, blocking the frame until it finishes. \`useEffect\` normally
runs after paint, although React may flush it earlier after a discrete event
such as a click. So: layout effects for measure-then-adjust, passive effects for
everything else.

## Why production apps do not fetch in effects

Fetching in \`useEffect\` works, but in a real app it costs you: no cache or
dedupe (every mount refetches), render-then-fetch waterfalls (a child cannot
start until its parent has rendered with data), race and cancellation handling
written by hand in every component, and no SSR or streaming. A data library
(TanStack Query, SWR) or a framework loader solves all of it. Covered in depth in
*Server state, mutations and forms*.
`,
  },
  {
    id: 'react-data',
    trackId: 'react',
    title: 'Server state, mutations and forms',
    blurb:
      'Treat server data as a cache: query keys, staleness, invalidation, optimistic updates, and forms validated with a shared schema.',
    estMinutes: 30,
    objectives: [
      'Explain why server state is a cache and not app state',
      'Choose query keys and `staleTime` so data is fresh without refetch storms',
      'Write a mutation with invalidation and a safe optimistic update',
      'Build a form with schema validation shared with the API, and show server errors on the right field',
    ],
    primer: `
## Server state is a cache

Client state belongs to the UI: whether a modal is open, the text in a draft,
the selected tab. It is always correct because nothing else can change it.
Server state is different. The orders list is a **snapshot of someone else's
data**: other users change it, it can be stale the moment it arrives, it has
loading and error states, several screens want the same data, and after every
write something has to refresh it.

Put that in Redux or \`useState\` "like everything else" and you end up writing
a cache by hand: request dedupe, loading flags, error flags, refetching on
focus, invalidating after a save, race handling. A server-state library
(TanStack Query, SWR, RTK Query) is that cache, done properly. The examples
here use TanStack Query v5; the ideas transfer.

\`\`\`tsx
function useOrders(filters: { status: string; page: number }) {
  return useQuery({
    queryKey: ['orders', filters],
    queryFn: () => api.getOrders(filters),
  });
}
\`\`\`

## Query keys and the cache

The query key is the **cache address**. Every input that changes the result
must be in it: \`['orders', { status, page }]\`, not \`['orders']\`. Leave
\`status\` out and two different result sets overwrite each other in one entry.
With it in, each combination is cached separately, going back to page 1 is
instant, and invalidating \`['orders']\` still matches all of them because keys
match by **prefix**. Build keys in one place (a small key factory) so every
component uses exactly the same ones; the ESLint plugin catches query functions
that use a variable missing from the key.

Queries with the same key are **deduplicated**: if two mounted components ask
for \`['orders', filters]\` at the same time, one request is made and both get
the result. That is why you can call \`useOrders()\` wherever you need the data
instead of fetching at the top and prop-drilling.

Two timers decide the cache's behaviour:

| Option | Default | Meaning |
| --- | --- | --- |
| \`staleTime\` | 0 | How long data counts as fresh. Fresh data is served from the cache with no request. |
| \`gcTime\` | 5 minutes | How long an entry with no observers stays in memory before it is deleted (called \`cacheTime\` before v5). |

Stale data is still shown. It just gets refetched in the background when a
trigger fires: a component mounts, the window regains focus, or the network
reconnects. With the defaults, leaving the orders page and coming back ten
seconds later renders the cached list instantly **and** starts a background
refetch: stale-while-revalidate. If that refetch on every tab switch is too
much, raise \`staleTime\` (30 seconds is a common choice for lists that rarely
change). Do not reach for \`staleTime: Infinity\` unless the data really never
changes.

## Loading and error states

- \`isPending\`: there is no data yet (first load). Show a skeleton.
- \`isFetching\`: a request is in flight, including background refetches while
  old data is on screen. Show a subtle indicator, not a spinner that replaces
  the table.
- \`isError\` and \`error\`: the last fetch failed; data from before may still be
  there.

Pagination makes the difference visible. Each page is a new key, so clicking
Next leaves the query without data and the table flashes a spinner.
\`placeholderData: keepPreviousData\` (in v4, \`keepPreviousData: true\`) keeps
the previous page on screen until the next arrives, with \`isPlaceholderData\`
true so you can dim the table or disable Next. In Suspense mode
(\`useSuspenseQuery\`) the loading state moves to the nearest \`<Suspense>\`
boundary instead.

## Mutations

Writes go through \`useMutation\`. The interesting part is what happens after
success:

\`\`\`tsx
const queryClient = useQueryClient();
const createOrder = useMutation({
  mutationFn: api.createOrder,
  onSuccess: (created) => {
    queryClient.setQueryData(['order', created.id], created);
    return queryClient.invalidateQueries({ queryKey: ['orders'] });
  },
});
\`\`\`

\`invalidateQueries\` marks every query whose key starts with \`['orders']\` as
stale and refetches the ones currently on screen; the rest refetch when next
used. It is the default response to a write because the server stays the source
of truth. \`setQueryData\` writes data you already have (the response) straight
into the cache. Returning the invalidation promise keeps the mutation pending
until the lists have refreshed, so the old list never flashes. Reloading the
page or refetching every query throws away the cache you are paying for.

## Optimistic updates

For actions that almost always succeed (toggling a done flag, renaming), update
the UI before the server answers, and **always** plan the rollback:

1. \`onMutate\`: cancel in-flight queries for the key with \`cancelQueries\`,
   so a refetch cannot land after your write and overwrite it.
2. Snapshot the current data with \`getQueryData\`.
3. Write the optimistic value with \`setQueryData\`, and return the snapshot as
   context.
4. \`onError\`: restore the snapshot and tell the user.
5. \`onSettled\`: invalidate the key, so success and failure both end up
   matching the server.

For a single screen there are lighter options: render \`mutation.variables\` as
a pending row while the mutation runs, or use React 19's \`useOptimistic\`
(covered in *Modern React: Suspense, actions and Server Components*).

## Waterfalls, prefetching and infinite lists

A waterfall is a request that could have started earlier but waits for a
component to render first: the order renders, and only then does its line-items
component mount and fetch. Start requests before rendering instead: prefetch
with \`queryClient.prefetchQuery\` on hover or focus, or load everything a route
needs in its loader, in parallel with \`Promise.all\`. Suspense boundaries
change what the user sees while waiting, not when requests start.

Infinite scroll over a cursor API uses \`useInfiniteQuery\`:

\`\`\`tsx
const q = useInfiniteQuery({
  queryKey: ['feed'],
  queryFn: ({ pageParam }) => api.getFeed({ cursor: pageParam }),
  initialPageParam: null,
  getNextPageParam: (last) => last.nextCursor, // undefined or null = no more
});
// q.data.pages, q.hasNextPage, q.fetchNextPage(), q.isFetchingNextPage
\`\`\`

Trigger \`fetchNextPage\` from an \`IntersectionObserver\` on a sentinel row
at the bottom of the list. Cursors beat offsets because new rows do not shift
pages you already have. Virtualise once the list gets long.

## Forms

react-hook-form registers inputs as **uncontrolled**: values live in the DOM and
the library reads them when validating or submitting, so a keystroke does not
re-render the whole form. Only what subscribes to a value (\`watch\`, an error
message) re-renders. Components that are controlled by nature, like a date
picker, go through its \`Controller\` wrapper.

Validation lives in one **schema** shared with the server:

\`\`\`tsx
const OrderInput = z.object({
  email: z.string().email(),   // zod v4 prefers z.email()
  quantity: z.coerce.number().int().min(1),
});
const result = OrderInput.safeParse(raw);
if (!result.success) { /* result.error lists every issue */ }
\`\`\`

\`safeParse\` never throws: it returns \`{ success: true, data }\` or
\`{ success: false, error }\`. \`parse\` throws a \`ZodError\` instead, which
suits the server's validation middleware. Zod does not coerce types unless you
ask (\`z.coerce.number()\`), which matters because every form value is a string.
Plug the same schema into the form with a resolver and into the API handler, and
the rules cannot drift.

Some rules can only be checked on the server: uniqueness, permissions, stock.
Return them keyed by field (a 422 with \`{ errors: { email: 'already registered' } }\`)
and map each one onto its input with \`setError('email', { message })\`, so the
message appears next to the field the user must fix, linked with
\`aria-describedby\`. A toast is for problems that belong to no field (a 409
conflict, a 500). Disable the submit button while the mutation is pending so a
double click cannot create two orders, and make the endpoint idempotent anyway.

## Choosing a tool

| Situation | Reach for |
| --- | --- |
| SPA talking to a REST or RPC API | TanStack Query (or SWR for simpler needs) |
| Already on Redux Toolkit | RTK Query |
| Framework with loaders or Server Components | the framework's loaders, plus a client cache for interactive screens |
| One request in a tiny app | plain \`fetch\` in an effect, with an AbortController |

Whatever you pick, the model is the same: keys, staleness, invalidation after
writes, and a rollback for anything optimistic.
`,
  },
  {
    id: 'react-perf',
    trackId: 'react',
    title: 'Re-renders and performance',
    blurb: 'memo, useMemo, useCallback, referential identity and how to find a real bottleneck.',
    estMinutes: 30,
    objectives: [
      'Explain what React.memo compares and when it does nothing',
      'Say when useMemo/useCallback are worth it and when they are noise',
      'Diagnose a slow list',
      'Explain why context updates re-render every consumer',
    ],
    primer: `
## Measure first

Most React "performance problems" are one slow render (a huge list, an expensive
computation in render) rather than too many renders. Use the React DevTools
Profiler and its "why did this render" highlight before optimising anything.
Premature \`useMemo\` everywhere costs readability and a little memory and
usually buys nothing.

## React.memo

Wraps a component so it skips re-rendering when its props are **shallow-equal**
to last time. It does nothing if you pass a new object, array or inline arrow
every render — which is exactly what you usually do:

\`\`\`jsx
<Row onSelect={() => select(id)} style={{ color: 'red' }} />
\`\`\`

Both props are new references each render, so \`memo\` compares, finds them
different, and re-renders anyway — now with extra overhead. \`memo\` pays off
for expensive subtrees with stable primitive props.

## useMemo and useCallback

\`useMemo(fn, deps)\` caches a **value**; \`useCallback(fn, deps)\` caches a
**function** (it is \`useMemo(() => fn, deps)\`). Two legitimate reasons to use
them:

1. The computation is genuinely expensive.
2. The value's **identity** matters — it is a dependency of an effect or a prop
   to a memoised child.

Neither is a guarantee: React may discard a memo cache. Never put logic with
side effects inside one.

## Context

Every consumer of a context re-renders when its **value** changes. A context
whose value is \`{ user, setUser }\` created inline re-renders every consumer on
every provider render. Fixes: memoise the value, split into two contexts
(state and dispatch — the dispatch one never changes), or use a store with
selectors (Zustand, Redux) so components subscribe to slices.

## Lists

Long lists are the usual real bottleneck: virtualise with
react-window/TanStack Virtual so only visible rows mount, keep row components
memoised with stable props, and avoid recreating handlers per row. Also check
you are not sorting/filtering the whole array on every keystroke without
memoising it.

## Concurrent features and the compiler

\`startTransition\`/\`useTransition\` mark an update as non-urgent so React can
render the urgent one first and interrupt the slow one; \`useDeferredValue\` is
the one-value version. React Compiler (stable since 1.0, October 2025)
auto-memoises components and hooks at build time, which makes most manual
\`useMemo\`/\`useCallback\`/\`memo\` unnecessary in compiled code — you should
still know what it is automating.

## Beyond React

The biggest wins are often not React at all: code-split routes with
\`React.lazy\` + \`Suspense\`, ship less JavaScript, avoid a waterfall of
dependent requests, and serve images at the right size. Interviewers like
candidates who reach for the network tab before \`useMemo\`.

## A profiling workflow

Record the slow interaction in the React DevTools Profiler, find the component
doing the most work, reduce that work (move state down, memoise, virtualise),
then record again to confirm. Turn on "Record why each component rendered" to
see whether a render came from a hook, a changed prop (it names the prop) or the
parent, and "Highlight updates when components render" to spot a context
re-rendering the whole page. Confirm numbers on a production build; development
builds are much slower.

## State colocation

The component that owns a piece of state re-renders on every change, along
with everything it renders. A search box whose \`query\` lives in the page
component re-renders the page and its 2,000-row table on every keystroke. Move
the state down into the component that uses it and the problem disappears, with
no \`memo\` at all. Try colocation before any memoisation.

## useDeferredValue

\`\`\`tsx
const deferred = useDeferredValue(query);
const rows = <SlowList query={deferred} />;   // SlowList wrapped in memo
\`\`\`

React renders the urgent update (the input) with the old deferred value, so the
memoised list is skipped, then renders again in the background with the new
value, abandoning that work if another keystroke arrives. The input stays
responsive and the list catches up. It is not a debounce: there is no fixed
delay. \`useTransition\` returns \`[isPending, startTransition]\` and does the
same for a state update you control. Covered in depth in *Modern React:
Suspense, actions and Server Components*.

## What breaks memoisation

\`memo\` compares props shallowly, so any prop that is a new value on each
render defeats it: an inline object (\`style={{ margin: 8 }}\`), an inline arrow
(\`onClick={() => save(id)}\`), and **children**. JSX children are a prop, and
\`<Card><p>hi</p></Card>\` creates a new element every render, so a memoised
\`Card\` renders every time anyway. Strings, numbers and booleans compare by
value; \`useCallback\`/\`useMemo\` with stable dependencies keep references
stable. React Compiler inserts this memoisation for you.

## Splitting context

\`dispatch\` from \`useReducer\` (and any \`useState\` setter) never changes
identity. Put it in its own context and components that only dispatch stop
re-rendering when the state changes. Components that read state still
re-render on every change, which is the point where a store with selectors
wins.
`,
  },
  {
    id: 'react-app',
    trackId: 'react',
    title: 'Structuring a real React app',
    blurb: 'Routing, context vs store, data libraries, error boundaries, forms and rendering strategies.',
    estMinutes: 35,
    objectives: [
      'Lay out a CRUD app folder structure and defend it',
      'Choose between local state, context, a store and a server-cache library',
      'Explain what an error boundary catches and what it does not',
      'Explain CSR vs SSR vs SSG in one sentence each',
    ],
    primer: `
## Folder structure

Two structures survive contact with a real app: **by feature**
(\`features/orders/{api,components,hooks}\`) for anything non-trivial, and
by type (\`components/\`, \`hooks/\`, \`lib/\`) for small apps. Feature folders
win because a change to "orders" touches one directory. Keep a shared \`ui/\`
for genuinely generic components and a \`lib/\` for the API client.

## Routing

A router maps URL → component, gives you nested layouts, route params
(\`/orders/:id\`), and search params. The URL is state you get for free: filters,
pagination and the selected tab belong there so links are shareable and the back
button works. Protected routes are a layout that checks auth and redirects.

## Which state tool

| Kind of state | Reach for |
| --- | --- |
| One component's UI | \`useState\` |
| Two siblings | lift to the parent |
| Whole-app, rarely changes (theme, current user) | context |
| Whole-app, changes often, many consumers | a store with selectors (Zustand, Redux Toolkit) |
| Data from the server | React Query / SWR / a loader |
| Filters, page, tab | the URL |

Context is a dependency-injection mechanism, not a state manager — it has no
selector, so every consumer re-renders on any change.

## Server data

A server-cache library handles caching by key, deduplication, background
refetch, stale-while-revalidate, retries, pagination and mutation invalidation.
Rebuilding that with \`useEffect\` is where junior codebases drown. Optimistic
updates mean applying the change locally, then rolling back if the request
fails — always with a rollback path.

## Error boundaries and Suspense

An error boundary is a component that catches errors thrown **during rendering**
of its subtree and shows a fallback. It does not catch errors in event handlers,
in async callbacks, or on the server render. Only class components can be error
boundaries (or a library wrapper). \`<Suspense>\` shows a fallback while a lazy
component or a suspending data source is pending.

## Rendering strategies

- **CSR** — the browser downloads JS and renders. Simple; slower first paint;
  weaker SEO.
- **SSR** — HTML rendered per request, then hydrated. Fast first paint, live
  data, more server cost.
- **SSG** — HTML built at deploy time. Fastest and cheapest; content is fixed
  until the next build (ISR revalidates it on a timer).
- **RSC** (React Server Components) — components that run only on the server,
  ship no JS, and can query the database directly. \`"use client"\` marks the
  boundary where interactivity begins.

## Hooks, briefly

A custom hook is a function starting with \`use\` that calls other hooks; it
shares *logic*, not state — two components using \`useOrders\` get independent
state. Hooks must be called in the same order every render (no conditions or
loops) because React matches them to state by call order. \`useRef\` holds a
mutable value across renders without causing one. React 19 adds
\`useActionState\` and \`useOptimistic\` for form actions and optimistic UI.

## Accessibility, briefly

Use semantic elements (\`<button>\`, not a clickable \`<div>\`), label every
input (\`htmlFor\`/\`aria-label\`), keep focus visible, and make sure keyboard
users can reach everything. Testing Library queries by role and label precisely
so that untestable markup and inaccessible markup are the same failure.

## Resetting error boundaries

A boundary stays in its error state until it is reset or remounted, so a
boundary around your routes keeps showing the fallback after the user navigates
away. Key it by path (\`<ErrorBoundary key={location.pathname}>\`) or use a
library such as react-error-boundary with \`resetKeys\` and a "Try again" button
that calls \`resetErrorBoundary\`. Boundaries still miss event-handler and async
errors: catch those and put them into state.

## One origin: the dev proxy

Call the API with relative URLs (\`fetch('/api/orders')\`) and let Vite's
\`server.proxy\` forward \`/api\` to the backend in development. The browser
sees a single origin in dev and in production (where the app is served next to
the API or behind one reverse proxy), so there is no CORS to configure and no
environment-specific host baked into the bundle. Remember that anything with
the \`VITE_\` prefix is compiled into the public bundle, so it is never a secret.

## Route params are strings

\`useParams()\` returns strings (typed \`string | undefined\` in React Router):
on \`/orders/42\`, \`id\` is \`'42'\`, so \`orders.find((o) => o.id === id)\`
finds nothing when ids are numbers. Convert once at the boundary with
\`Number(id)\` or a schema. Search params have the same trap.

## Client-side authorisation is UX

Hiding the Admin menu, redirecting in a route guard, or decoding the access
token in the browser to read \`role\` are all fine for deciding what to show.
None of it is security: the user controls the browser and can call the API
directly, so every endpoint verifies the token and authorises the action itself.

## Token refresh in a SPA

Keep the access token short-lived and in memory, and the refresh token in an
httpOnly cookie. In the API client, on a 401, start **one** refresh and make
every other failing request wait for that same promise, then replay each
request once; go to login only if the refresh itself fails. Without that
single-flight guard, ten parallel 401s cause ten refreshes, and with rotating
refresh tokens all but the first fail.

## Code-splitting boundaries

Split at routes and at heavy widgets (editors, charts, maps) with
\`React.lazy\`. Wrapping every component in \`lazy\` creates a request per
component, discovered only when it renders: a waterfall of chunks and a flash of
fallbacks.

## Building a feature

Work from the boundary inward, each step on top of the last: the type and API
client function, then a data hook on top of the client, then the screen that
renders loading, error, empty and data states, then a test for that screen.

## Testing components

Query the way users find things (\`getByRole\`, \`getByLabelText\`), drive the
UI with \`userEvent\` rather than \`fireEvent\` (it produces the full sequence
of pointer, focus and keyboard events a user does), and mock the network, not
your modules, with MSW. MSW intercepts requests at the network layer, so your
real fetch code and data hooks run, and the same handlers can mock the API in
the browser during development; it cannot tell you the real API agrees.

Async UI needs async queries. \`getBy*\` checks once and throws; after
\`await user.click(save)\`, the "Saved" message appears only once the request
resolves, so use \`await screen.findByText('Saved')\` (\`findBy*\` is
\`waitFor\` plus \`getBy*\`, retrying for up to a second by default). Never use
fixed sleeps. Covered in depth in *Testing a CRUD app*.

Server data is covered in depth in *Server state, mutations and forms*, and
Server Components in *Modern React: Suspense, actions and Server Components*.
`,
  },
  {
    id: 'react-server',
    trackId: 'react',
    title: 'Modern React: Suspense, actions and Server Components',
    blurb:
      "React 19's async model: Suspense and `use`, transitions, actions and optimistic UI, and where Server Components change the architecture.",
    estMinutes: 35,
    objectives: [
      'Explain what Suspense waits for and where to place boundaries',
      'Keep input responsive with transitions and `useDeferredValue`',
      'Build a form with actions, `useActionState` and `useOptimistic`',
      "Explain Server vs Client Components, `'use client'`, and what causes hydration errors",
    ],
    primer: `
## The async UI problem

Classic React apps fetch in effects and track \`isLoading\` in every component.
The result is spinner soup (five spinners resolving in random order), request
waterfalls (a child cannot start fetching until its parent has rendered with
data), and screens that tear or freeze while a slow render runs. React 18 and
19 answer this with one model: components can **suspend** while something
loads, updates can be marked **non-urgent**, and mutations become **Actions**
with built-in pending and optimistic states. Server Components then move data
fetching to the server entirely.

## Suspense

\`<Suspense fallback={...}>\` shows its fallback while any component inside it
is suspended, and its children once they are ready. Only three things suspend:

- a \`React.lazy\` component whose code has not loaded yet,
- \`use(promise)\` on a promise that is still pending,
- a Suspense-enabled data source (\`useSuspenseQuery\`, a framework loader), which
  is built on the same mechanism.

A component that fetches in \`useEffect\` never suspends: the effect runs after
the render has already committed, so its loading state is yours to draw.

A suspending component is caught by its **nearest** boundary, and only that
boundary shows its fallback:

\`\`\`tsx
<Suspense fallback={<PageSkeleton />}>
  <Header />
  <Suspense fallback={<Spinner />}>
    <Comments />
  </Suspense>
</Suspense>
\`\`\`

If only \`Comments\` suspends, the user sees the header with a spinner where the
comments will go. Place boundaries where a placeholder makes sense to a user
(a panel, a card, a route), not around every component, and pair them with error
boundaries, because a rejected promise is thrown to the nearest error boundary.

## use()

\`use\` reads a promise or a context during render. Unlike other hooks it may be
called inside conditions and loops. With a pending promise it suspends; with a
resolved one it returns the value; with a rejected one it throws to the error
boundary.

The promise must be **stable**. This loops forever:

\`\`\`tsx
function Profile({ id }) {
  const user = use(fetchUser(id)); // a new promise on every render
  return <h1>{user.name}</h1>;
}
\`\`\`

When a component suspends, React throws that render attempt away and retries
after the promise settles, but the retry creates a new pending promise, and
React warns about an uncached promise. Create the promise in a Server
Component and pass it down, create it in an event handler or loader and store
it, or get it from a cache keyed by \`id\` (which is what Suspense libraries do).

## Transitions and deferred values

Some updates are urgent (typing, clicking), others can wait (rendering the
result). A **transition** marks an update as non-urgent:

\`\`\`tsx
const [isPending, startTransition] = useTransition();
function selectTab(next) {
  startTransition(() => setTab(next));
}
\`\`\`

React renders the new tab in the background, keeps the current UI interactive,
and abandons that render if a newer update arrives: that is what
"interruptible" means. \`isPending\` lets you dim the old tab instead of
replacing it with a spinner, and if the new tab suspends, a transition keeps the
old content on screen instead of showing the Suspense fallback.

\`useDeferredValue(value)\` is the version for a value you do not set yourself.
Filter a big list with \`useDeferredValue(query)\` and, as the user types, the
input updates on every keystroke while the memoised list keeps showing older
results and catches up. It is not a debounce: there is no fixed delay, and
intermediate values may be skipped. Compare \`query !== deferred\` to show that
the list is stale.

## Actions

In React 19, a transition can be async, and an async transition is called an
**Action**. Its most visible form is a function passed to a form:

\`\`\`tsx
async function saveOrder(formData: FormData) {
  await api.createOrder({ title: String(formData.get('title')) });
}
<form action={saveOrder}>...</form>
\`\`\`

React prevents the page navigation, calls the function with the form's
\`FormData\`, and tracks it as a transition. After it succeeds, React resets the
form's **uncontrolled** fields. Three hooks build on this:

| Hook | What it gives you |
| --- | --- |
| \`useActionState(action, initial)\` | \`[state, formAction, isPending]\`. React calls \`action(previousState, formData)\` and its return value becomes \`state\`: the place for validation errors or a success message. |
| \`useFormStatus()\` | Called in a child of a form: \`{ pending, data, method, action }\` for the submission in progress. Ideal for a reusable submit button. |
| \`useOptimistic(state, update)\` | A value equal to \`state\`, plus your optimistic changes while an action is pending. |

With \`useOptimistic\`, the user submits a comment, it appears immediately
(styled as pending), the action awaits the server, and when the action finishes
React drops the optimistic layer and renders the real state: including the saved
comment on success, without it on failure. The optimistic value is never saved
anywhere, so the action must update the real state (or trigger a refetch).

## Server Components

A Server Component runs only on the server, at build time or per request. It can
be \`async\`, \`await\` a database query directly, and read secrets from the
environment, and it sends its **rendered output** to the browser, not its code,
so it adds nothing to the client bundle. It cannot use state, effects or event
handlers, because none of those exist on the server.

Interactive parts are Client Components, marked by \`'use client'\` at the top of
the file. The directive marks a **bundle boundary**: that module and everything
it imports ship to the browser. It does **not** mean "only renders in the
browser": Client Components are still rendered to HTML on the server during SSR
and hydrated afterwards.

Props that cross from a Server Component into a Client Component must be
**serialisable**: strings, numbers, plain objects and arrays, Dates, Maps and
Sets, promises, JSX, and Server Functions. An ordinary function such as
\`onSelect={(id) => ...}\` cannot be sent, and React throws. Anything you pass
across is visible in the browser, so never pass a whole database row that holds
secrets.

## Server Functions

A function in a module (or function body) marked \`'use server'\` can be called
from client code, for example as a form action. The bundler replaces the call
with a network request. That makes every Server Function a **public POST
endpoint** with a generated id: anyone who finds it can call it with any
arguments. Treat it like an API route:

\`\`\`tsx
'use server';
export async function deleteOrder(id: unknown) {
  const user = await requireSession();           // authenticate
  const orderId = z.string().uuid().parse(id);   // validate
  await assertCanDelete(user, orderId);          // authorise this resource
  await db.orders.delete(orderId);
}
\`\`\`

Hiding the button does nothing for the endpoint. Note that \`'use server'\` is
not how you mark server-only code; Server Components need no directive, and
the \`server-only\` package keeps a module out of the client bundle.

## SSR, streaming and hydration

Streaming SSR (\`renderToPipeableStream\` in Node, \`renderToReadableStream\` on
web streams) sends the shell (layout, navigation, fallbacks) immediately, then
streams each Suspense boundary's HTML into the same response as its data
resolves. Time to first byte and first paint improve because nothing waits for
the slowest query, and selective hydration lets each section become interactive
independently, prioritising the one the user touches.

Hydration expects the first client render to match the server HTML exactly.
Common mismatches: \`new Date().toLocaleTimeString()\`, \`Math.random()\`,
\`typeof window !== 'undefined'\` branches, and locale or time zone differences.
React 19 logs one detailed mismatch error and re-renders up to the nearest
Suspense boundary on the client, discarding that server HTML. Fix it by
rendering such values after mount, passing them from the server, or, for a
single unavoidable text node like a timestamp, \`suppressHydrationWarning\` on
that element. React 19 also hoists \`<title>\`, \`<meta>\` and \`<link>\` rendered
anywhere in the tree into the document head.

## When not to

Server Components need a framework (in practice Next.js, or React Router in
framework mode), a Node server to run, and a new mental model. They pay off when
data access sits close to the UI, bundles are large, or first-load speed and SEO
matter. An internal CRUD admin panel behind a login often gains little: a Vite
SPA talking to your existing API is simple to host and staff. The strong
interview answer names those criteria instead of a slogan. React 19.2's
\`<Activity mode="hidden">\` is a small related tool: it hides a subtree while
keeping its state, useful for tabs you want to keep warm.
`,
  },
];
