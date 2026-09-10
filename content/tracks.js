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
      'Before frameworks: values, functions, objects, async and modules. Almost every "why did this break" moment later traces back to something here.',
    unlockAt: 0,
    modules: ['js-values', 'js-functions', 'js-objects-arrays', 'js-async', 'js-modules'],
  },
  {
    id: 'stage-2',
    title: 'Stage 2 · Types and the browser',
    blurb:
      'TypeScript well enough to model an API response, plus the browser platform your React code runs inside.',
    unlockAt: 0.35,
    modules: ['ts-basics', 'ts-shapes', 'ts-practice', 'web-browser'],
  },
  {
    id: 'stage-3',
    title: 'Stage 3 · React for real apps',
    blurb:
      'Rendering model first, then state, effects, performance and how a page-sized app is actually structured.',
    unlockAt: 0.35,
    modules: ['react-render', 'react-state', 'react-effects', 'react-perf', 'react-app'],
  },
  {
    id: 'stage-4',
    title: 'Stage 4 · The server side',
    blurb:
      'Node, Express, HTTP semantics and API design: the CRUD backend a mid-level dev is expected to build unsupervised.',
    unlockAt: 0.35,
    modules: ['node-runtime', 'node-express', 'node-auth', 'web-http', 'web-api-design'],
  },
  {
    id: 'stage-5',
    title: 'Stage 5 · Data',
    blurb:
      'SQL you can write in an interview, plus schema and ORM decisions that decide whether the app survives its first 10k rows.',
    unlockAt: 0.35,
    modules: ['data-sql', 'data-modeling'],
  },
  {
    id: 'stage-6',
    title: 'Stage 6 · C# and .NET',
    blurb:
      'The same CRUD app on the other stack: C# fundamentals, LINQ, ASP.NET Core and EF Core.',
    unlockAt: 0.35,
    modules: ['cs-basics', 'cs-oop', 'cs-linq-async', 'net-aspnet', 'net-di-config', 'net-efcore'],
  },
  {
    id: 'stage-7',
    title: 'Stage 7 · Ship it',
    blurb:
      'Git, testing, security and deployment. This is the stage that gets skipped and the stage that gets asked about.',
    unlockAt: 0.35,
    modules: ['craft-git', 'craft-testing', 'craft-security', 'craft-shipping'],
  },
];
