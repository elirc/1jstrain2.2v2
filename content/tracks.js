/**
 * Tracks are the subject areas. Stages are the *path* through them — the
 * opinionated noob-to-mid ordering. A module belongs to exactly one track and
 * appears in exactly one stage.
 */

/** @type {import('./types.d.ts').Track[]} */
export const tracks = [
  {
    id: 'js',
    title: 'JavaScript',
    blurb: 'The language everything else in this stack is built on.',
    color: '#e8b339',
    icon: 'JS',
  },
  {
    id: 'ts',
    title: 'TypeScript',
    blurb: 'Types as a design tool, not as decoration.',
    color: '#4b8bf5',
    icon: 'TS',
  },
  {
    id: 'react',
    title: 'React',
    blurb: 'Rendering, state and data fetching the way real apps do it.',
    color: '#4fc3d9',
    icon: '⚛',
  },
  {
    id: 'node',
    title: 'Node & Express',
    blurb: 'Writing the API that your React app talks to.',
    color: '#6cc24a',
    icon: '⬢',
  },
  {
    id: 'web',
    title: 'HTTP & the Web',
    blurb: 'Status codes, CORS, cookies, caching — the layer between the two.',
    color: '#b47ae0',
    icon: '⇄',
  },
  {
    id: 'data',
    title: 'SQL & Data',
    blurb: 'Queries, schema design and the mistakes that show up in code review.',
    color: '#e07a5f',
    icon: '▤',
  },
  {
    id: 'csharp',
    title: 'C#',
    blurb: 'The other language on your CV, taught for people who know JS.',
    color: '#9b6bd6',
    icon: 'C#',
  },
  {
    id: 'dotnet',
    title: 'ASP.NET Core & EF',
    blurb: 'Minimal APIs, DI, configuration and Entity Framework Core.',
    color: '#5b8def',
    icon: '.N',
  },
  {
    id: 'craft',
    title: 'Craft',
    blurb: 'Git, testing, security and shipping — what separates junior from mid.',
    color: '#8a94a6',
    icon: '◆',
  },
];

/** @type {import('./types.d.ts').Stage[]} */
export const stages = [
  {
    id: 'stage-1',
    title: 'Stage 1 · The language',
    blurb:
      'Before frameworks: values, functions, objects, classes, async, the standard library and modules. Almost every "why did this break" moment later traces back to something here.',
    unlockAt: 0,
    modules: ['js-values', 'js-functions', 'js-objects-arrays', 'js-classes', 'js-async', 'js-stdlib', 'js-modules'],
  },
  {
    id: 'stage-2',
    title: 'Stage 2 · Types and the browser',
    blurb:
      "TypeScript well enough to model an API response and read a library's types, plus the browser platform, CSS layout and accessibility your React code lives inside.",
    unlockAt: 0.35,
    modules: ['ts-basics', 'ts-shapes', 'ts-practice', 'ts-advanced', 'web-browser', 'web-css', 'web-a11y'],
  },
  {
    id: 'stage-3',
    title: 'Stage 3 · React for real apps',
    blurb:
      "Rendering model first, then state, effects, server state, performance, app structure and React 19's async model.",
    unlockAt: 0.35,
    modules: ['react-render', 'react-state', 'react-effects', 'react-data', 'react-perf', 'react-app', 'react-server'],
  },
  {
    id: 'stage-4',
    title: 'Stage 4 · The server side',
    blurb:
      'Node, Express, auth, HTTP semantics and API design: the CRUD backend a mid-level dev is expected to build unsupervised.',
    unlockAt: 0.35,
    modules: ['node-runtime', 'node-express', 'node-auth', 'web-http', 'web-api-design'],
  },
  {
    id: 'stage-5',
    title: 'Stage 5 · Data',
    blurb:
      'SQL you can write in an interview, the schema and index decisions that decide whether the app survives its first 10k rows, and wiring the database into Node properly.',
    unlockAt: 0.35,
    modules: ['data-sql', 'data-modeling', 'data-queries', 'node-data'],
  },
  {
    id: 'stage-6',
    title: 'Stage 6 · C#, the language',
    blurb: 'The other language on your CV: value semantics, types and exceptions, modern syntax, LINQ and async.',
    unlockAt: 0.35,
    modules: ['cs-basics', 'cs-oop', 'cs-modern', 'cs-linq-async'],
  },
  {
    id: 'stage-7',
    title: 'Stage 7 · ASP.NET Core and EF Core',
    blurb: 'The same CRUD API on the other stack: pipeline, DI and config, EF Core, auth and tests.',
    unlockAt: 0.35,
    modules: ['net-aspnet', 'net-di-config', 'net-efcore', 'net-auth', 'net-testing'],
  },
  {
    id: 'stage-8',
    title: 'Stage 8 · Ship it',
    blurb:
      'Git, testing, security, deployment and the cloud services underneath. This is the stage that gets skipped and the stage that gets asked about.',
    unlockAt: 0.35,
    // Gated by the Data stage, not by .NET: a JS-only learner should not have
    // to master C# before learning to ship.
    after: 'stage-5',
    modules: ['craft-git', 'craft-testing', 'craft-security', 'craft-shipping', 'craft-cloud'],
  },
  {
    id: 'stage-9',
    title: 'Stage 9 · Run it in production',
    blurb:
      'Beyond mid-level: make it fast, see inside it, keep the data correct under concurrency, move work to queues, and harden it.',
    unlockAt: 0.35,
    modules: ['web-perf', 'craft-observability', 'data-scale', 'node-jobs', 'craft-appsec'],
  },
  {
    id: 'stage-10',
    title: 'Stage 10 · Toward senior',
    blurb:
      'System design for CRUD at scale, architecture decisions, incidents and on-call, and the review and mentoring that make a team better. Grounded, not whiteboard puzzles.',
    unlockAt: 0.35,
    modules: ['craft-design', 'craft-architecture', 'craft-incidents', 'craft-review'],
  },
];
