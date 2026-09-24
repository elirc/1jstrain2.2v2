import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Code } from '../components/Code';
import { Page } from '../components/ui';
import labsIndex from '../labs.generated.json';
import { useApp } from '../lib/app-state';

/**
 * The bridge to the hands-on half of the repo.
 *
 * Recall questions and typing code are different skills, and interviews test
 * both. `jstrain/` is a test-graded problem set that lives alongside this app;
 * this page is the map into it, matched up with the modules that teach the same
 * material.
 */

interface Lab {
  file: string;
  title: string;
  teaches: string;
  /** Modules in this app that cover the same ground. */
  related: string[];
}

// One line per row keeps this table readable; Prettier would explode it.
// prettier-ignore
const TRACKS: { id: string; title: string; blurb: string; command: string; labs: Lab[] }[] = [
  {
    id: 'js',
    title: 'JavaScript',
    blurb: 'Write the language by hand before a framework hands it to you.',
    command: 'npm run test:js',
    labs: [
      { file: 'js/01-values-and-types.js', title: 'Values and types', teaches: 'coercion, == vs ===, NaN, falsiness, ?? vs ||', related: ['js-values'] },
      { file: 'js/02-functions-and-scope.js', title: 'Functions and scope', teaches: 'closures, once, currying, the var loop bug, hoisting', related: ['js-functions'] },
      { file: 'js/03-arrays.js', title: 'Arrays', teaches: 'map/filter/reduce, groupBy, non-mutating sorts, a real report query', related: ['js-objects-arrays'] },
      { file: 'js/04-objects.js', title: 'Objects', teaches: 'destructuring, deep clone/merge, immutable path updates', related: ['js-objects-arrays'] },
      { file: 'js/05-strings-and-regex.js', title: 'Strings and regex', teaches: 'slugify, templating, query strings, parsing log lines', related: ['js-objects-arrays'] },
      { file: 'js/06-this-classes-prototypes.js', title: 'this, classes, prototypes', teaches: 'the four this rules, bind by hand, private fields, EventEmitter', related: ['js-classes'] },
      { file: 'js/07-async.js', title: 'Async', teaches: 'timeout, retry with backoff, bounded concurrency, AbortSignal', related: ['js-async'] },
      { file: 'js/08-iterators-generators.js', title: 'Iterators and generators', teaches: 'the iteration protocol, lazy pipelines, async generators', related: ['js-stdlib'] },
      { file: 'js/09-errors-collections-dates.js', title: 'Errors, collections, dates', teaches: 'custom errors, cause, Result types, an LRU cache with Map', related: ['js-stdlib'] },
      { file: 'js/10-functional-patterns.js', title: 'Functional patterns', teaches: 'pipe, memoize, debounce/throttle, a mini Redux with middleware', related: ['react-state'] },
    ],
  },
  {
    id: 'ts',
    title: 'TypeScript',
    blurb: 'Graded twice: behaviour, and the types themselves with expectTypeOf.',
    command: 'npm run test:ts && npm run test:types',
    labs: [
      { file: 'ts/01-basic-types.ts', title: 'Basic types', teaches: 'unions, literals, tuples, unknown vs any, as const, never', related: ['ts-basics'] },
      { file: 'ts/02-generics.ts', title: 'Generics', teaches: 'inference, constraints, keyof, a Result<T, E> type', related: ['ts-shapes'] },
      { file: 'ts/03-narrowing-unions.ts', title: 'Narrowing unions', teaches: 'discriminated unions, predicates, parsing unknown data', related: ['ts-shapes'] },
      { file: 'ts/04-utility-and-mapped-types.ts', title: 'Utility and mapped types', teaches: 'rebuild Partial/Pick/Omit/Record by hand, DeepPartial', related: ['ts-advanced'] },
      { file: 'ts/05-conditional-and-template-types.ts', title: 'Conditional and template types', teaches: 'infer, distribution, CamelCase<S>, a typed event emitter', related: ['ts-advanced'] },
      { file: 'ts/06-typing-real-code.ts', title: 'Typing real code', teaches: 'branded ids, overloads, validated API responses, satisfies', related: ['ts-practice'] },
    ],
  },
  {
    id: 'react',
    title: 'React',
    blurb: 'Graded with Testing Library, querying by role and label the way a user sees the page.',
    command: 'npm run test:react',
    labs: [
      { file: 'react/01-components-and-props.tsx', title: 'Components and props', teaches: 'JSX, lists and keys, children, the {count && …} zero bug', related: ['react-render'] },
      { file: 'react/02-state-and-events.tsx', title: 'State and events', teaches: 'the updater form, controlled inputs, lifting state', related: ['react-state'] },
      { file: 'react/03-effects-and-data.tsx', title: 'Effects and data', teaches: 'cleanup, race conditions, debouncing, AbortController', related: ['react-effects'] },
      { file: 'react/04-hooks.tsx', title: 'Hooks', teaches: 'useReducer, useRef, useMemo with React.memo, custom hooks', related: ['react-perf'] },
      { file: 'react/05-context-and-composition.tsx', title: 'Context and composition', teaches: 'context with a safe hook, compound components, a cart store', related: ['react-app'] },
      { file: 'react/06-building-a-feature.tsx', title: 'Building a feature', teaches: 'search, sort, pagination, optimistic updates', related: ['react-app'] },
    ],
  },
  {
    id: 'capstone',
    title: 'Capstone',
    blurb: 'Everything at once, the way a ticket actually arrives.',
    command: 'npm run test:capstone',
    labs: [
      { file: 'capstone/01-analytics-pipeline.ts', title: 'Analytics pipeline', teaches: 'validate untrusted JSON, bucket by day, percentiles, format a report', related: ['ts-practice', 'data-sql'] },
      { file: 'capstone/02-dashboard.tsx', title: 'Dashboard', teaches: 'loading and error states, a filter that re-derives without re-fetching', related: ['react-effects', 'react-app'] },
    ],
  },
];

/**
 * The third way to learn this material: read a finished codebase. `marketplace/`
 * is a complete Next.js + SQLite marketplace with a line-by-line guide for
 * every file it contains.
 */
// One line per row keeps this table readable; Prettier would explode it.
// prettier-ignore
const READING: { area: string; files: string; teaches: string; related: string[] }[] = [
  {
    area: 'Auth and sessions',
    files: 'src/lib/auth.js, src/lib/security.js, api/auth/*',
    teaches: 'register, login, cookie sessions, hashing, and how a route checks who you are',
    related: ['node-auth', 'craft-security'],
  },
  {
    area: 'The data layer',
    files: 'src/lib/db.js, src/lib/catalog.js',
    teaches: 'schema, prepared statements, joins and the queries behind a product listing',
    related: ['data-sql', 'data-modeling'],
  },
  {
    area: 'API routes',
    files: 'src/app/api/**/route.js',
    teaches: 'request parsing, validation with Zod, status codes and error shapes',
    related: ['web-api-design', 'node-express'],
  },
  {
    area: 'Checkout',
    files: 'src/lib/cart.js, src/lib/orders.js, api/checkout',
    teaches: 'a multi-step transaction that must not half-apply, split across sellers',
    related: ['data-modeling', 'web-http'],
  },
  {
    area: 'React pages',
    files: 'src/components/*.js',
    teaches: 'lists and filters, forms, loading and error states, client/server boundaries',
    related: ['react-state', 'react-effects', 'react-app'],
  },
];

/** Problem counts come from the files themselves (scripts/labs-index.mjs), not from this file. */
const COUNTS: Record<string, number> = labsIndex.files;

function problemsIn(file: string): number | null {
  return typeof COUNTS[file] === 'number' ? COUNTS[file] : null;
}

function trackProblems(labs: Lab[]): number {
  return labs.reduce((n, lab) => n + (problemsIn(lab.file) ?? 0), 0);
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/** A module link that survives an id the curriculum does not have (yet). */
function ModuleTag({ moduleId }: { moduleId: string }) {
  const { moduleById } = useApp();
  const module = moduleById.get(moduleId);
  if (!module) {
    return (
      <span className="tag" title="This module is not in the curriculum yet">
        {moduleId}
      </span>
    );
  }
  return (
    <Link className="tag tag-accent" to={`/module/${encodeURIComponent(moduleId)}`}>
      {module.title}
    </Link>
  );
}

export function LabsPage() {
  const [open, setOpen] = useState<string | null>('js');
  const total = TRACKS.reduce((n, track) => n + trackProblems(track.labs), 0);

  return (
    <Page title="Code labs" narrow>
      <div className="page-head">
        <h1>Code labs</h1>
        <p>
          Knowing the answer and being able to type it are different skills, and an interview tests both. The{' '}
          <code>jstrain/</code> folder in this repo is a test-graded problem set — {plural(total, 'problem')} across{' '}
          {TRACKS.reduce((n, t) => n + t.labs.length, 0)} files — that pairs with the modules here.
        </p>
      </div>

      <section className="card section">
        <h2 className="section-title">Getting going</h2>
        <p className="muted">
          Every exercise is a function whose body is <code>throw new Error('TODO')</code>. Delete the throw, write the
          code, and run the tests until they go green.
        </p>
        <Code
          lang="bash"
          copyable
          source={`cd jstrain
npm install          # once
npm run watch        # re-runs affected tests as you save

# or grade a single module
npx vitest run tests/js/03-arrays.test.js`}
        />
        <p className="muted flush">
          From the project root, <code>npm run drills</code> runs the whole suite and <code>npm run drills:watch</code>{' '}
          starts the watcher. Reference answers live in <code>jstrain/solutions/</code> — read them after you have
          tried, and diff them against yours.
        </p>
      </section>

      <section className="card section">
        <h2 className="section-title">Read a real codebase</h2>
        <p className="muted">
          The third way to learn this material is to read a finished app. <code>marketplace/</code> is a complete
          Next.js + SQLite marketplace — sellers, carts, checkout, orders, reviews, an admin panel — with a line-by-line
          guide for every file in <code>marketplace/_learning/</code>. Start with{' '}
          <code>_learning/00-ARCHITECTURE.md</code>, which explains each technology choice and its alternative.
        </p>
        {READING.map((entry) => (
          <div key={entry.area} className="list-row list-row-flush">
            <div className="spread">
              <strong>{entry.area}</strong>
              <code className="small-code">{entry.files}</code>
            </div>
            <p className="meta">{entry.teaches}</p>
            <div className="row tight">
              {entry.related.map((moduleId) => (
                <ModuleTag key={moduleId} moduleId={moduleId} />
              ))}
            </div>
          </div>
        ))}
      </section>

      <h2 className="section-title">The graded problem set</h2>

      <div className="stack">
        {TRACKS.map((track) => {
          const isOpen = open === track.id;
          const problems = trackProblems(track.labs);
          const panelId = `labs-${track.id}`;

          return (
            <section key={track.id} className="stage">
              <h2 className="stage-toggle">
                <button
                  type="button"
                  className="stage-head stage-head-button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpen(isOpen ? null : track.id)}
                >
                  <span className="grow">
                    <span className="row tight">
                      <span className="stage-title">
                        {track.title} — {plural(problems, 'problem')}
                      </span>
                      <span className="tag">{plural(track.labs.length, 'file')}</span>
                    </span>
                    <span className="stage-blurb">{track.blurb}</span>
                  </span>
                  <span className="faint" aria-hidden="true">
                    {isOpen ? '▾' : '▸'}
                  </span>
                </button>
              </h2>

              {isOpen && (
                <div id={panelId} className="fade-in">
                  <div className="list-row">
                    <Code lang="bash" copyable source={`cd jstrain && ${track.command}`} />
                  </div>

                  {track.labs.map((lab) => {
                    const count = problemsIn(lab.file);
                    return (
                      <div key={lab.file} className="list-row">
                        <div className="spread">
                          <strong>{lab.title}</strong>
                          <span className="meta">
                            {count === null ? 'count unavailable' : plural(count, 'problem')}
                          </span>
                        </div>
                        <div className="meta">
                          <code>exercises/{lab.file}</code>
                        </div>
                        <p className="muted small">{lab.teaches}</p>
                        <div className="row tight">
                          <span className="meta">Study first:</span>
                          {lab.related.map((moduleId) => (
                            <ModuleTag key={moduleId} moduleId={moduleId} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </Page>
  );
}
