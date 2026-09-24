/**
 * Modules — The browser platform, CSS and accessibility (stage 2).
 *
 * One file per author, so parallel authors never touch the same file. Each
 * module carries a primer that covers everything its questions test. Primers
 * are markdown-lite — headings, lists, `code`, fenced blocks, tables, **bold**
 * and *italic*; validateContent() rejects anything the renderer cannot show.
 */

/** @type {import('../types.d.ts').Module[]} */
export const webPlatformModules = [
  {
    id: 'web-browser',
    trackId: 'web',
    title: 'The browser platform',
    blurb: 'The DOM, events, storage, same-origin and what the network tab is telling you.',
    estMinutes: 30,
    objectives: [
      'Explain event bubbling, capturing and delegation',
      'Choose between localStorage, sessionStorage and cookies with a reason',
      'State the same-origin rule precisely',
      'Explain what happens between typing a URL and first paint',
    ],
    primer: `
## Events

An event travels **capture** (window → target), reaches the target, then
**bubbles** back up. Listeners run in the bubble phase unless you pass
\`{ capture: true }\`. \`stopPropagation()\` halts that travel;
\`preventDefault()\` cancels the browser's default action (form submit, link
navigation). They are unrelated, and constantly confused.

**Delegation** is one listener on a container plus
\`event.target.closest('button')\` — it survives elements added later, and is
how React attaches handlers: one listener per event type on the root container
(on \`document\` before React 17).

## Storage

| | Size | Lifetime | Sent to server | JS access |
| --- | --- | --- | --- | --- |
| \`localStorage\` | ~5MB | until cleared | no | yes |
| \`sessionStorage\` | ~5MB | per tab | no | yes |
| Cookie | ~4KB | \`Expires\`/\`Max-Age\` | **every request** | unless \`HttpOnly\` |

Never keep a session token in \`localStorage\` if you can avoid it: any XSS
reads it. An \`HttpOnly; Secure; SameSite=Lax\` cookie is invisible to JS. Web
storage is synchronous and origin-scoped; IndexedDB is the async, large,
structured option.

## Client storage beyond localStorage

**IndexedDB** is the browser's real database: asynchronous, transactional,
indexed, and able to store structured objects including \`Blob\` and \`File\`.
Its quota is a share of free disk, not 5MB. Use it for offline drafts with
attachments, cached data sets and anything you would otherwise base64 into
\`localStorage\` (which inflates binary data by a third and blocks the main
thread on every read). The raw API is clumsy; wrap it in a small helper such as
\`idb\`. Browsers may evict storage under pressure, so call
\`navigator.storage.persist()\` for data the user would hate to lose.
**Cache Storage** is the other big store: request/response pairs, used by
service workers.

## Same-origin

Same origin means the same **scheme, host and port** — \`https://a.com\` and
\`http://a.com\` differ, and so do \`a.com\` and \`api.a.com\`. Being
cross-origin is why you need CORS, and why an iframe from another origin cannot
read your DOM.

## URLs and query strings

Never build a query string by concatenation: a value containing \`&\` or \`=\`
silently becomes two parameters. Let the platform encode it.

\`\`\`js
const url = new URL('/api/orders', location.origin);
url.searchParams.set('q', 'a b');
url.searchParams.set('tag', 'x&y');
url.search; // '?q=a+b&tag=x%26y'
\`\`\`

\`URLSearchParams\` uses form encoding, so a space becomes \`+\`;
\`encodeURIComponent\` writes \`%20\`. Servers accept both.

## fetch and credentials

\`fetch\` decides about cookies with the \`credentials\` option:
\`'same-origin'\` (the default) sends them only to your own origin,
\`'include'\` sends them cross-origin too, \`'omit'\` never sends them. A
cross-origin \`fetch\` therefore sends **no cookies** unless you opt in, and
even then the server must allow credentials and the cookie must be
\`SameSite=None; Secure\` to cross sites.

## The critical path

DNS → TCP → TLS → HTTP request → HTML arrives. The parser builds the DOM,
blocking on synchronous \`<script>\` tags (\`defer\` runs after parsing, in
order; \`async\` runs whenever it lands). CSS is render-blocking because layout
cannot start without it. DOM + CSSOM → render tree → layout → paint →
composite. "CSS in the head, scripts deferred" falls straight out of that
sequence.

**Reflow** (layout) recomputes geometry and is expensive; **repaint** just
redraws pixels. Reading \`offsetHeight\` immediately after a style write forces a
synchronous reflow — layout thrashing.

## The rendering pipeline

Every visual change goes through up to four steps: **style** (which rules
apply), **layout** (sizes and positions), **paint** (pixels for each layer) and
**composite** (layers combined into a frame, usually on the GPU). What you
change decides how many run:

| You change | Steps that run |
| --- | --- |
| \`width\`, \`top\`, \`font-size\`, adding elements | style, layout, paint, composite |
| \`color\`, \`background\`, \`box-shadow\` | style, paint, composite |
| \`transform\`, \`opacity\` (on their own layer) | style, composite |

Animate \`transform\` and \`opacity\`; everything else costs a frame's worth of
main-thread work sixty times a second.

## Core Web Vitals

Google's user-experience metrics, measured on real users and judged at the
**75th percentile**:

| Metric | Measures | Good |
| --- | --- | --- |
| LCP, Largest Contentful Paint | loading: when the main content appears | ≤ 2.5 s |
| INP, Interaction to Next Paint | responsiveness: input to next frame | ≤ 200 ms |
| CLS, Cumulative Layout Shift | visual stability: unexpected movement | ≤ 0.1 |

INP replaced FID in March 2024 because FID only timed the first interaction's
input delay. Layout shift comes from images without \`width\`/\`height\`, banners
and ads injected above content, and web fonts swapping with different metrics.
Shifts within 500 ms of a user input and \`transform\` animations do not count.
Bad INP almost always means long tasks on the main thread.

## Workers and service workers

A **Web Worker** runs a script on a background thread. It has no DOM; you talk
to it with \`postMessage\`, which copies data (or transfers an \`ArrayBuffer\`).
Move CSV parsing, image work and heavy computation there and the page stays
responsive.

A **service worker** is different: a proxy between your pages and the network.
It intercepts \`fetch\`, can answer from Cache Storage for offline support, and
receives push messages. Its lifecycle is the classic gotcha: a new version
installs and then **waits** until every tab using the old one closes. Ship an
explicit "new version, reload" prompt that calls \`skipWaiting()\`, version your
caches, and clean old ones up on \`activate\`.

## Debugging in devtools

The Network tab gives status, a timing waterfall, and the request/response
headers you need to diagnose CORS and caching; "Preserve log" survives redirects
and reloads. A *simple* request showing \`(failed)\` with a CORS message in the
console usually **did** reach the server — the browser rejected the response
afterwards; a preflighted one (JSON body, custom headers) may have stopped at
the \`OPTIONS\` preflight and never been sent. Preflight and credentialed
requests are covered in the API design module.

Layout, the cascade and animation are covered in depth in *CSS and layout for
app developers*; semantic HTML, focus and ARIA in *Accessibility and semantic
HTML*.
`,
  },
  {
    id: 'web-css',
    trackId: 'web',
    title: 'CSS and layout for app developers',
    blurb:
      'The box model, flexbox vs grid, the cascade and specificity, responsive units, stacking contexts, and how to organise styles in a React app.',
    estMinutes: 25,
    objectives: [
      'Explain the box model and why `border-box` is the default you set globally',
      'Choose flexbox or grid for a layout and write it',
      'Debug "my z-index does not work" with stacking contexts',
      'Compare CSS Modules, Tailwind and CSS-in-JS with real trade-offs',
    ],
    primer: `
## The box model

Every element is a box: **content**, then **padding**, then **border**, then
**margin**. The question is what \`width\` means. With the default
\`box-sizing: content-box\` it is the content only, so padding and border are
added on top:

\`\`\`css
.box { width: 200px; padding: 20px; border: 5px solid; }
/* content-box: 200 + 2×20 + 2×5 = 250px on screen */
/* border-box:  exactly 200px; the content shrinks to 150px */
\`\`\`

That arithmetic is why a \`width: 100%\` input with padding overflows its
container. Set \`border-box\` once, globally, and forget about it:

\`\`\`css
*, *::before, *::after { box-sizing: border-box; }
\`\`\`

The universal selector does not match pseudo-elements, hence listing them.
Margins sit outside the box and never count toward \`width\`; vertical margins
between blocks also *collapse* (the larger wins), which is one more reason to
prefer \`gap\`.

## The cascade and specificity

When several declarations set the same property on the same element, the
browser decides in this order:

1. **Origin and importance.** Browser defaults lose to your (author) styles;
  \`!important\` flips the contest and beats every normal declaration.
2. **Cascade layers**, if you use \`@layer\`: unlayered styles beat layered ones.
3. **Specificity**, counted as (ids, classes/attributes/pseudo-classes,
  elements). \`#app p\` is (1,0,1) and beats \`.card .title.big\` at (0,3,0): one
  id outranks any number of classes. An inline \`style\` attribute beats every
  selector.
4. **Source order** breaks exact ties: the later rule wins.

So, from weakest to strongest: browser default, a less specific author rule, a
more specific one, an inline style, and an author \`!important\`. Avoid
\`!important\` and ids in stylesheets; both start specificity wars you win only
by escalating. Keep selectors flat (one or two classes).

**Inheritance** is separate: text properties such as \`color\`, \`font\` and
\`line-height\` flow down to children; box properties such as \`padding\` and
\`border\` do not.

## Layout: flow, flexbox and grid

Normal flow stacks **block** elements vertically and lays **inline** content
out in lines. \`display\` changes how an element takes part (\`block\`,
\`inline\`, \`inline-block\`, \`none\`) and how it lays out its children
(\`flex\`, \`grid\`).

**Flexbox is one-dimensional**: items along a main axis
(\`flex-direction\`), aligned on the cross axis. \`justify-content\` distributes
along the main axis, \`align-items\` along the cross axis, and \`gap\` spaces
items. \`flex: 1\` means \`flex: 1 1 0%\`: grow, shrink, and start from zero, so
siblings with \`flex: 1\` and \`flex: 2\` in 600px get 200px and 400px
regardless of content. An \`auto\` margin eats free space, which is how you push
one toolbar button to the far end. Flex items default to \`min-width: auto\`; set
\`min-width: 0\` when long text refuses to shrink.

**Grid is two-dimensional**: rows and columns that line up.

\`\`\`css
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}
\`\`\`

That one rule gives as many equal columns as fit, with no media queries.
\`grid-template-areas\` names regions for page layouts. The rule of thumb: grid
for two-dimensional layout, flex for distributing items along a line.

**Centring** a thing of unknown size: \`display: grid; place-items: center\` on
the parent (or flex with \`justify-content\` and \`align-items\`).
\`margin: 0 auto\` only centres horizontally, and \`top: 50%; left: 50%\` puts
the *corner* at the centre unless you add \`transform: translate(-50%, -50%)\`.
\`vertical-align\` only applies to inline content and table cells.

## Positioning and stacking contexts

\`position: relative\` offsets an element from where it would be;
\`absolute\` positions it against the nearest positioned ancestor; \`fixed\`
against the viewport; \`sticky\` sticks within its scroll container once you
scroll past it.

\`z-index\` is the source of more wasted afternoons than any other property,
because it only competes **within a stacking context**. A stacking context is a
group painted as one unit; everything inside is z-ordered among itself, and the
group as a whole takes one slot in its parent. These create one:

- a positioned element with a \`z-index\` other than \`auto\`
- \`opacity\` below 1
- any \`transform\` or \`filter\` other than \`none\`
- \`position: fixed\` or \`sticky\`, and \`isolation: isolate\`
- a flex or grid item with a \`z-index\`

A plain flex container, and anything \`position: static\`, does not. So a menu
with \`z-index: 9999\` inside a card that has a \`transform\` can still render
below a sticky header with \`z-index: 10\`: the 9999 only beats the card's other
children. Fix it by removing the property that created the context, or render
overlays (menus, tooltips, modals) into a **portal** on \`document.body\`, as
every serious UI library does. The native \`popover\` attribute and
\`<dialog>\` with \`showModal()\` go further and place the element in the
browser's top layer, above every stacking context.

## Responsive design

Write **mobile-first**: base styles for small screens, then
\`@media (min-width: 48rem)\` blocks that add columns as space appears. Use
fluid units: \`rem\` for type and spacing (it follows the font size the user
chose in browser settings, which \`px\` ignores; zoom scales both), \`%\` and
\`fr\` for widths, and \`clamp()\` for sizes that should scale between limits:

\`\`\`css
h1 { font-size: clamp(1.5rem, 1rem + 2vw, 2.5rem); }
\`\`\`

Never set \`html { font-size: 10px }\`; it overrides the user's preference.
**Container queries** make a component respond to its own box rather than the
viewport: declare \`container-type: inline-size\` on a wrapper and write
\`@container (width < 400px) { … }\`. A card in a narrow sidebar then stacks even
on a wide screen. Supported in all current browsers since 2023. For images, use
\`srcset\`/\`sizes\` and always set \`width\` and \`height\` so space is reserved.

## Selectors you actually use

| Selector | Matches |
| --- | --- |
| \`.a > .b\` | \`.b\` that is a direct child of \`.a\` |
| \`.a + .b\` | \`.b\` immediately after a sibling \`.a\` |
| \`.a ~ .b\` | every \`.b\` after a sibling \`.a\` |
| \`:hover\`, \`:focus-visible\` | pointer hover; keyboard-style focus |
| \`:not(.x)\`, \`:has(img)\` | exclusion; a parent that contains something |
| \`[aria-invalid="true"]\` | attribute value, great for styling state |

\`li + li { margin-top: 8px }\` spaces items without a margin above the first.
Style focus with \`:focus-visible\` so keyboard users see a ring and mouse users
do not.

## Motion and performance

Changing geometry (\`width\`, \`top\`, \`left\`) re-runs layout, paint and
composite on every frame; \`box-shadow\` and \`background\` repaint. Only
\`transform\` and \`opacity\` can be animated by the compositor alone, often off
the main thread, so animate those: move with \`translate\`, grow with
\`scale\`, fade with \`opacity\`. Use \`will-change\` sparingly; every layer
costs memory. Respect users who ask for less motion:

\`\`\`css
@media (prefers-reduced-motion: no-preference) {
  .toast { transition: transform 200ms ease-out; }
}
\`\`\`

Reserve space for late content (images, embeds, banners) so it does not shift
the page, which is what CLS measures.

## Organising CSS in a React app

| Approach | Good | Costs |
| --- | --- | --- |
| CSS Modules | scoped class names at build time, plain CSS, zero runtime | naming still needed, a file per component |
| Tailwind | constrained design scale, no naming, no dead CSS | long class lists, a vocabulary to learn |
| Runtime CSS-in-JS | co-location, props-driven styles | CPU on every render, SSR and streaming complexity, poor fit with Server Components |
| Global BEM | no tooling | relies on discipline to avoid collisions |

My default for a CRUD app: scoped styles with **no runtime** (CSS Modules or
Tailwind), sitting on **design tokens** as custom properties. Inline \`style\`
props cannot do \`:hover\`, media queries or pseudo-elements, so they are for
truly dynamic values only.

\`\`\`css
:root { --bg: #fff; --text: #111; --space-2: 0.5rem; }
@media (prefers-color-scheme: dark) {
  :root { --bg: #111; --text: #eee; }
}
body { background: var(--bg); color: var(--text); }
\`\`\`

Dark mode then becomes swapping token values (by media query, or by a
\`data-theme\` attribute when users can choose), not rewriting components.
`,
  },
  {
    id: 'web-a11y',
    trackId: 'web',
    title: 'Accessibility and semantic HTML',
    blurb: 'Semantic elements, labels, keyboard and focus, ARIA used sparingly, and how to check your own pages.',
    estMinutes: 25,
    objectives: [
      'Explain three concrete things a `<button>` gives you that a clickable `<div>` does not',
      'Label every form control and announce errors accessibly',
      'Manage focus in a SPA: dialogs, route changes and new content',
      'Audit a page in ten minutes with the keyboard, axe and a screen reader',
    ],
    primer: `
## Why it matters

Accessibility means people using a keyboard, a screen reader, voice control,
zoom or high contrast can use your app. The usual bar is **WCAG 2.2 level AA**;
it is referenced by procurement rules and by law, including the European
Accessibility Act, which applies to many consumer-facing digital products and
services sold in the EU from June 2025. There is also a selfish reason:
accessible markup is *testable* markup. Testing Library's \`getByRole('button',
{ name: 'Save' })\` only finds a real, named button, so accessibility and good
tests pull in the same direction.

Most of the work is not ARIA. It is using the right HTML element.

## Semantic HTML first

Browsers turn your HTML into an **accessibility tree**: every node has a role
(button, link, heading, textbox), a name, and states. Native elements fill that
tree in correctly and bring keyboard behaviour with them.

| Need | Use | Not |
| --- | --- | --- |
| an action on this page | \`<button type="button">\` | \`<div onClick>\` |
| navigation to a URL | \`<a href="/orders/42">\` | \`<a href="#">\` with a click handler |
| page regions | \`<header>\`, \`<nav>\`, \`<main>\`, \`<footer>\` | anonymous \`<div>\`s |
| a title | one \`<h1>\`, then \`<h2>\`, \`<h3>\` in order | bold text in a \`<div>\` |
| tabular data | \`<table>\` with \`<th>\` | a grid of \`<div>\`s |

A native \`<button>\` is focusable with Tab, activates with Enter **and** Space,
is announced as "button" with its text as the name, and supports \`disabled\`.
A clickable \`div\` has none of that. **Links navigate, buttons act**: a link
supports open-in-new-tab and appears in the screen reader's list of links; a
button changes something here. Screen-reader users jump by headings and
landmarks, so a sane heading outline is navigation, not decoration.

## Forms

Every control needs a programmatic **label**:

\`\`\`html
<label for="email">Email</label>
<input id="email" type="email" required
       aria-invalid="true" aria-describedby="email-error">
<p id="email-error">Enter an email address like name@example.com.</p>
\`\`\`

\`for\` must match the input's \`id\` (or wrap the input in the label). Clicking
the label then focuses the field. A placeholder is not a label: it disappears
while typing and usually fails contrast. A \`<span>\` next to the input is not
linked to it, and \`title\` is announced inconsistently. Group radio buttons in
\`<fieldset>\` with a \`<legend>\`.

On submit with errors: set \`aria-invalid="true"\` on each bad field, point
\`aria-describedby\` at its message so it is read when the field is focused,
and **move focus to the first invalid field** (or to an error summary that
links to each field). Red borders alone fail colour-blind and screen-reader
users; a disabled submit button explains nothing.

## Keyboard

Everything you can do with a mouse must work with a keyboard. Tab order
follows **DOM order**, so keep the DOM in the order people read it, and do not
reorder visually with CSS \`order\` or \`row-reverse\`. \`tabindex\` has two
legitimate values: \`0\` adds a custom control to the natural order, \`-1\` makes
something focusable from script only (a heading you move focus to). A
**positive** \`tabindex\` jumps that element ahead of everything on the page and
is always a bug. Never remove focus outlines without a replacement; style
\`:focus-visible\`. Add a "Skip to content" link as the first focusable element
so keyboard users do not tab through the whole nav on every page.

## Focus in a single-page app

In a SPA the browser no longer manages focus for you, so you do.

**Dialogs.** A modal must move focus inside when it opens, keep Tab and
Shift+Tab inside, close on Escape, make the page behind inert, and **return
focus to the trigger** when it closes. The native element does most of this:

\`\`\`js
dialog.showModal(); // page behind becomes inert, focus moves in, Escape closes
dialog.close();     // focus goes back to the element focused before opening
\`\`\`

Give the dialog a name with \`aria-labelledby\` pointing at its heading. The
\`inert\` attribute makes any subtree unfocusable and hidden from assistive
technology, useful for custom overlays.

**Route changes.** A real page load resets focus and announces the new title;
a client-side route change does neither, so screen-reader users hear nothing.
After the new route renders, update \`document.title\` and move focus to the new
\`<h1>\` (give it \`tabindex="-1"\`), or announce the change in a live region.
Check whether your framework already does this; Next.js ships a route
announcer.

**New content.** Status messages ("Changes saved") go in a **live region**:
\`role="status"\` (polite) for confirmations, \`role="alert"\` (assertive) for
errors that need attention now. The region must already exist in the DOM when
its text changes; a region mounted together with its message is often not
announced. Never steal focus for a toast.

## ARIA, sparingly

The **first rule of ARIA**: if a native element with the semantics and
behaviour you need exists, use it instead. ARIA only changes what assistive
technology is *told*: roles (\`role="dialog"\`), states (\`aria-expanded\`,
\`aria-invalid\`) and properties (\`aria-label\`, \`aria-describedby\`). It adds
no behaviour. A \`<div role="button">\` still needs \`tabindex="0"\`, Enter and
Space handlers, and disabled handling written by you. No ARIA is better than
wrong ARIA.

Where ARIA earns its keep:

- **Icon-only buttons**: \`<button aria-label="Close dialog">\` with the icon
  marked \`aria-hidden="true"\`, so it is announced as "Close dialog, button"
  rather than an unlabelled image.
- **Disclosure state**: \`aria-expanded\` on the button that opens a menu or
  accordion.
- **Live regions** for status messages, as above.
- **Composite widgets** with no native equivalent (tabs, a filterable
  combobox): follow the WAI-ARIA Authoring Practices (APG) pattern exactly. A
  combobox uses \`role="combobox"\` on the input, \`role="listbox"\` and
  \`role="option"\` for the list, \`aria-expanded\`, arrow keys, and
  \`aria-activedescendant\` to say which option is active while focus stays in
  the input. Better still, prefer a styled native \`<select>\`, or use a headless
  library (React Aria, Radix, Downshift) that has done this and tested it.
  \`role="menu"\` is for menus of actions, not for picking a value.

## Visual design

Text contrast must be at least **4.5:1** (3:1 for large text: 24px, or about
18.7px bold). Control boundaries and focus indicators need 3:1 against what is
next to them. Never use colour alone to convey meaning; pair it with text or an
icon. Content must still work at **200% zoom** and reflow to a narrow width
without horizontal scrolling. Honour \`prefers-reduced-motion\` for large or
parallax animation.

## Testing it

Do it in this order, because each step works on a page the previous one
cleaned up:

1. **Automated scan** with axe (browser extension, Lighthouse, or \`jest-axe\` /
  Playwright in CI). It reliably finds missing labels, missing \`alt\`
  attributes, contrast failures and invalid ARIA, but automated tools catch only
  part of real problems (estimates range from a third to about half). They cannot tell whether alt text is meaningful or
  whether the focus order makes sense.
2. **Keyboard-only pass**: unplug the mouse, Tab through every control, check
  focus is always visible and the order is logical, open and close every dialog.
  Screen-reader users drive the page by keyboard, so fix this before step 3. Zoom
  to 200% while you are there.
3. **Screen-reader smoke test** of the main flow with NVDA (Windows) or
  VoiceOver (macOS, iOS): are names, roles and announcements right?
4. **Lock it in**: tests that query by role and label, plus the axe check in CI,
  so fixes stay fixed.
`,
  },
];
