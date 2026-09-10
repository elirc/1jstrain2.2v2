import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Code } from '../components/Code';
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
  problems: number;
  teaches: string;
  /** Modules in this app that cover the same ground. */
  related: string[];
}

const TRACKS: { id: string; title: string; blurb: string; command: string; labs: Lab[] }[] = [
  {
    id: 'js',
    title: 'JavaScript — 131 problems',
    blurb: 'Write the language by hand before a framework hands it to you.',
    command: 'npm run test:js',
    labs: [
      { file: 'js/01-values-and-types.js', title: 'Values and types', problems: 12, teaches: 'coercion, == vs ===, NaN, falsiness, ?? vs ||', related: ['js-values'] },
      { file: 'js/02-functions-and-scope.js', title: 'Functions and scope', problems: 13, teaches: 'closures, once, currying, the var loop bug, hoisting', related: ['js-functions'] },
      { file: 'js/03-arrays.js', title: 'Arrays', problems: 14, teaches: 'map/filter/reduce, groupBy, non-mutating sorts, a real report query', related: ['js-objects-arrays'] },
      { file: 'js/04-objects.js', title: 'Objects', problems: 13, teaches: 'destructuring, deep clone/merge, immutable path updates', related: ['js-objects-arrays'] },
      { file: 'js/05-strings-and-regex.js', title: 'Strings and regex', problems: 13, teaches: 'slugify, templating, query strings, parsing log lines', related: ['js-objects-arrays'] },
      { file: 'js/06-this-classes-prototypes.js', title: 'this, classes, prototypes', problems: 13, teaches: 'the four this rules, bind by hand, private fields, EventEmitter', related: ['js-functions'] },
      { file: 'js/07-async.js', title: 'Async', problems: 14, teaches: 'timeout, retry with backoff, bounded concurrency, AbortSignal', related: ['js-async'] },
      { file: 'js/08-iterators-generators.js', title: 'Iterators and generators', problems: 12, teaches: 'the iteration protocol, lazy pipelines, async generators', related: ['js-async'] },
      { file: 'js/09-errors-collections-dates.js', title: 'Errors, collections, dates', problems: 13, teaches: 'custom errors, cause, Result types, an LRU cache with Map', related: ['js-objects-arrays'] },
      { file: 'js/10-functional-patterns.js', title: 'Functional patterns', problems: 14, teaches: 'pipe, memoize, debounce/throttle, a mini Redux with middleware', related: ['react-state'] },
    ],
  },
  {
    id: 'ts',
    title: 'TypeScript — 73 problems',
    blurb: 'Graded twice: behaviour, and the types themselves with expectTypeOf.',
    command: 'npm run test:ts && npm run test:types',
    labs: [
      { file: 'ts/01-basic-types.ts', title: 'Basic types', problems: 12, teaches: 'unions, literals, tuples, unknown vs any, as const, never', related: ['ts-basics'] },
      { file: 'ts/02-generics.ts', title: 'Generics', problems: 12, teaches: 'inference, constraints, keyof, a Result<T, E> type', related: ['ts-shapes'] },
      { file: 'ts/03-narrowing-unions.ts', title: 'Narrowing unions', problems: 12, teaches: 'discriminated unions, predicates, parsing unknown data', related: ['ts-shapes'] },
      { file: 'ts/04-utility-and-mapped-types.ts', title: 'Utility and mapped types', problems: 12, teaches: 'rebuild Partial/Pick/Omit/Record by hand, DeepPartial', related: ['ts-shapes'] },
      { file: 'ts/05-conditional-and-template-types.ts', title: 'Conditional and template types', problems: 12, teaches: 'infer, distribution, CamelCase<S>, a typed event emitter', related: ['ts-shapes'] },
      { file: 'ts/06-typing-real-code.ts', title: 'Typing real code', problems: 13, teaches: 'branded ids, overloads, validated API responses, satisfies', related: ['ts-practice'] },
    ],
  },
  {
    id: 'react',
    title: 'React — 57 problems',
    blurb: 'Graded with Testing Library, querying by role and label the way a user sees the page.',
    command: 'npm run test:react',
    labs: [
      { file: 'react/01-components-and-props.tsx', title: 'Components and props', problems: 9, teaches: 'JSX, lists and keys, children, the {count && …} zero bug', related: ['react-render'] },
      { file: 'react/02-state-and-events.tsx', title: 'State and events', problems: 10, teaches: 'the updater form, controlled inputs, lifting state', related: ['react-state'] },
      { file: 'react/03-effects-and-data.tsx', title: 'Effects and data', problems: 10, teaches: 'cleanup, race conditions, debouncing, AbortController', related: ['react-effects'] },
      { file: 'react/04-hooks.tsx', title: 'Hooks', problems: 10, teaches: 'useReducer, useRef, useMemo with React.memo, custom hooks', related: ['react-perf'] },
      { file: 'react/05-context-and-composition.tsx', title: 'Context and composition', problems: 9, teaches: 'context with a safe hook, compound components, a cart store', related: ['react-app'] },
      { file: 'react/06-building-a-feature.tsx', title: 'Building a feature', problems: 9, teaches: 'search, sort, pagination, optimistic updates', related: ['react-app'] },
    ],
  },
  {
    id: 'capstone',
    title: 'Capstone — 2 integration challenges',
    blurb: 'Everything at once, the way a ticket actually arrives.',
    command: 'npm run test:capstone',
    labs: [
      { file: 'capstone/01-analytics-pipeline.ts', title: 'Analytics pipeline', problems: 1, teaches: 'validate untrusted JSON, bucket by day, percentiles, format a report', related: ['ts-practice', 'data-sql'] },
      { file: 'capstone/02-dashboard.tsx', title: 'Dashboard', problems: 1, teaches: 'loading and error states, a filter that re-derives without re-fetching', related: ['react-effects', 'react-app'] },
    ],
  },
];

/**
 * The third way to learn this material: read a finished codebase. `marketplace/`
 * is a complete Next.js + SQLite marketplace with a line-by-line guide for
 * every file it contains.
 */
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

export function LabsPage() {
  const { moduleById } = useApp();
  const [open, setOpen] = useState<string | null>('js');

  return (
    <main className="main narrow">
      <div className="page-head">
        <h1>Code labs</h1>
        <p>
          Knowing the answer and being able to type it are different skills, and an interview tests
          both. The <code>jstrain/</code> folder in this repo is a test-graded problem set —
          274 problems, 1057 tests — that pairs with the modules here.
        </p>
      </div>

      <section className="card" style={{ marginBottom: 22 }}>
        <h2 style={{ fontSize: 15, marginBottom: 8 }}>Getting going</h2>
        <p className="muted" style={{ fontSize: 13.5 }}>
          Every exercise is a function whose body is <code>throw new Error('TODO')</code>. Delete the
          throw, write the code, and run the tests until they go green.
        </p>
        <Code
          lang="bash"
          source={`cd jstrain
npm install          # once
npm run watch        # re-runs affected tests as you save

# or grade a single module
npx vitest run tests/js/03-arrays.test.js`}
        />
        <p className="muted" style={{ fontSize: 13.5, marginBottom: 0 }}>
          From the project root, <code>npm run drills</code> runs the whole suite and{' '}
          <code>npm run drills:watch</code> starts the watcher. Reference answers live in{' '}
          <code>jstrain/solutions/</code> — read them after you have tried, and diff them against
          yours.
        </p>
      </section>

      <section className="card" style={{ marginBottom: 22 }}>
        <h2 style={{ fontSize: 15, marginBottom: 4 }}>Read a real codebase</h2>
        <p className="muted" style={{ fontSize: 13.5 }}>
          The third way to learn this material is to read a finished app.{' '}
          <code>marketplace/</code> is a complete Next.js + SQLite marketplace — sellers, carts,
          checkout, orders, reviews, an admin panel — with a line-by-line guide for every file in{' '}
          <code>marketplace/_learning/</code>. Start with{' '}
          <code>_learning/00-ARCHITECTURE.md</code>, which explains each technology choice and its
          alternative.
        </p>
        {READING.map((entry) => (
          <div key={entry.area} className="track-row" style={{ gridTemplateColumns: '1fr' }}>
            <div>
              <div className="spread" style={{ marginBottom: 2 }}>
                <strong style={{ fontSize: 13.5 }}>{entry.area}</strong>
                <code style={{ fontSize: 11 }}>{entry.files}</code>
              </div>
              <p className="muted" style={{ fontSize: 12.5, margin: '0 0 6px' }}>
                {entry.teaches}
              </p>
              <div className="row" style={{ gap: 6 }}>
                {entry.related.map((moduleId) => (
                  <Link key={moduleId} className="tag tag-accent" to={`/module/${moduleId}`}>
                    {moduleById.get(moduleId)?.title ?? moduleId}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ))}
      </section>

      <h2 style={{ fontSize: 15, marginBottom: 12 }}>The graded problem set</h2>

      <div className="stack">
        {TRACKS.map((track) => {
          const isOpen = open === track.id;
          const problems = track.labs.reduce((n, lab) => n + lab.problems, 0);

          return (
            <section key={track.id} className="stage">
              <button
                type="button"
                className="stage-head"
                style={{ width: '100%', border: 0, cursor: 'pointer', textAlign: 'left' }}
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : track.id)}
              >
                <div style={{ flex: 1 }}>
                  <div className="row" style={{ gap: 8 }}>
                    <h2>{track.title}</h2>
                    <span className="tag">{track.labs.length} files</span>
                  </div>
                  <p>{track.blurb}</p>
                </div>
                <span className="faint" aria-hidden="true">
                  {isOpen ? '▾' : '▸'}
                </span>
              </button>

              {isOpen && (
                <div className="fade-in">
                  <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)' }}>
                    <Code lang="bash" source={`cd jstrain && ${track.command}`} />
                    <p className="faint" style={{ margin: 0, fontSize: 12 }}>
                      {problems} problems in this track.
                    </p>
                  </div>

                  {track.labs.map((lab) => (
                    <div
                      key={lab.file}
                      style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)' }}
                    >
                      <div className="spread" style={{ marginBottom: 3 }}>
                        <strong style={{ fontSize: 14 }}>{lab.title}</strong>
                        <span className="faint" style={{ fontSize: 11.5 }}>
                          {lab.problems} problems
                        </span>
                      </div>
                      <div className="faint" style={{ fontSize: 12, marginBottom: 6 }}>
                        <code>exercises/{lab.file}</code>
                      </div>
                      <p className="muted" style={{ fontSize: 13, margin: '0 0 8px' }}>
                        {lab.teaches}
                      </p>
                      <div className="row" style={{ gap: 6 }}>
                        <span className="faint" style={{ fontSize: 11.5 }}>
                          Study first:
                        </span>
                        {lab.related.map((moduleId) => (
                          <Link key={moduleId} className="tag tag-accent" to={`/module/${moduleId}`}>
                            {moduleById.get(moduleId)?.title ?? moduleId}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
}
