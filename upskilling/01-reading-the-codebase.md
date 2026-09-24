# Reading the codebase: thirteen stops

This is a guided read of Stack Ready in an order that builds on itself: contract, content, server, client, then the history of why it looks the way it does. Each stop gives you the files, a time budget, questions to **answer in writing before you look anything up**, and a **prove-it** command that tells you whether your answer was right. Keep your answers. You will reuse them in E01.

**Which tree this describes.** The previous version of this guide was anchored at commit `6f1bf43`, the baseline before the refactor. This version describes the **working tree after the 2026-09-24 refactor**, which is not committed yet. Every path and symbol below exists in that tree, and every prove-it output was recorded on it. There is no SHA to anchor to yet, so the stops name files and symbols instead of line numbers. The formatter is still moving lines, and symbols survive that.

What moved since the baseline, so that old notes still make sense:

| At `6f1bf43` | Now |
|---|---|
| `server/src/index.js` (app, config, listen, shutdown) | `server/src/index.js` wires `app.js`, `config.js` and `lifecycle.js` together |
| the answer logic inline in `routes/api.js` | `server/src/answer.js › submitAnswer`, plus `present.js`, `validate.js` and `errors.js` |
| `server/src/check.js` as the only test | `check.js` is a smoke test, and the suites live in `server/test/*.test.js` |
| `content/modules/stage-*.js` | one file per track or author in `content/modules/`, plus `content/lint.js` |
| `client/src/pages/DrillPage.tsx` | `client/src/pages/drill/`: six components, the `useDrillSession` reducer and hook, `keys.ts`, `params.ts`, and their tests |
| `client/src/styles.css` | `client/src/styles/tokens.css`, `base.css`, `components.css`, `pages.css` |
| no client tests | `*.test.ts(x)` next to the file they test, and helpers in `client/src/test/` |

Run every prove-it command from the repo root unless it says otherwise. The ones marked **(server)** need the API running on a scratch port and data directory. Start it in a second terminal:

```bash
PORT=3997 DATA_DIR="$(mktemp -d)" NODE_ENV=test node server/src/index.js
# [server] listening on http://127.0.0.1:3997
P=$(curl -s localhost:3997/api/profiles | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).data[0].id))")
```

To see what a stop looked like before, run `git show 6f1bf43:<path>`. The previous version of this guide was never committed (`upskilling/` is not in `6f1bf43`), so the baseline outputs it recorded are repeated below each prove-it, as "At the baseline …".

---

## 1. The front door: `README.md` and the root `package.json` (15 min)

- Name the three workspaces. `jstrain/` has `drills` scripts but is not a workspace. Why?
- `allowScripts` lists `better-sqlite3` and `esbuild` as `true`. At the baseline they were pinned to versions (`better-sqlite3@12.11.1`). What went wrong with the pinned form on the next `npm update`, and which of the two failures would nobody have noticed? (J02)
- `engines.node` is `^22.22.2 || >=24.15.0`. Why that floor rather than `>=20`? (J02 gives the reason; `config.js › loadEnvFile` is one thing that needs a modern Node.)
- Write down every number the README states: questions, modules, tracks, stages, the stage threshold, and the share of questions with an `ask`. You will check them at stops 3 and 4.

**Prove it:**

```bash
npm run check:content
# 1047 questions, 53 modules, 10 stages, 9 tracks (js 146, ts 80, react 145, node 103, web 115, data 80, csharp 84, dotnet 100, craft 194)
# 0 warning(s)
```

`npm run check:content -- --strict` prints the same with `(strict: warnings fail)`. Compare with README L7.

## 2. The shape of a question: `content/types.d.ts`, then `content/schema.js` (25 min)

- Why is the authoring shape (`d`, `choices` as strings, `answer` as an index) different from the runtime shape (`difficulty`, `choices[]` with ids)?
- `q()` returns a function, not a question. What does `deck()` inject, and what would break if `q()` built the question directly?
- `seenIds` lives at module level. What can a test **not** do because of it? (It is not "importing the file twice throws". An ES module is evaluated once per realm. F-25 is still open.)
- `choices.map` builds ids as `` `${id}-c${i}` `` in authored order. Where does the order the learner sees get decided, and why is that not in `content/`? (`server/src/present.js`, ADR-0014)

**Prove it:** the duplicate-id guard fires on a rebuild, not on a re-import:

```bash
node --input-type=module -e "const {q,deck}=await import('./content/schema.js');const m=q({id:'demo-1',prompt:'p',why:'w',choices:['a','b'],answer:1});deck('demo','js',[m]);try{deck('demo','js',[m])}catch(e){console.log(e.message)}"
# [content] duplicate question id: demo-1
```

Then count where the authored answer sits, and look at what a learner is actually served:

```bash
node --input-type=module -e "const {questions}=await import('./content/index.js');const c={};for(const q of questions)if(q.type==='mcq'||q.type==='output')c[q.answer]=(c[q.answer]??0)+1;console.log(c)"
# { '0': 203, '1': 201, '2': 197, '3': 194 }
node --input-type=module -e "const {presentQuestion}=await import('./server/src/present.js');const {getQuestion}=await import('@jstrain/content');const q=getQuestion('js-values-1');for(let i=0;i<3;i++)console.log(presentQuestion(q).choices.map(c=>c.id).join(' '))"
# three different orders, e.g. js-values-1-c1 js-values-1-c0 js-values-1-c3 js-values-1-c2
```

At the baseline the first count was `{ '0': 15, '1': 363, '2': 9, '3': 2 }` and nothing shuffled (M-01). The fix has two halves: shuffling on serve (J12), and a seeded one-off permutation of the authored keys (J34, in review, `content/tools/permute-choices.mjs`). Which half would still be needed if the other were reverted?

## 3. Assembly and validation: `content/index.js`, then `content/lint.js` (20 min)

- Which checks happen at import time (in `q()`), which in `validateContent()`, and which in `lintContent()`? Why does `q()` throw on the first problem while the other two collect them all?
- `lintContent` returns `problems` and `warnings`. What decides which list a rule goes into, and why must server boot never fail on a warning? (Read the header comment of `lint.js`.)
- `unsupportedMarkdown` runs over primers. What does it not run over?

**Prove it:**

```bash
node --input-type=module -e "const {questions}=await import('./content/index.js');console.log(questions.filter(q=>q.type==='output'&&!q.code).map(q=>q.id))"
# []
node --input-type=module -e "const {lintContent}=await import('./content/lint.js');const c=await import('./content/index.js');const id=c.questions.find(q=>q.type==='output').id;const bad=c.questions.map(q=>q.id===id?{...q,code:undefined}:q);console.log(lintContent(c.modules,bad,c.questionsByModule).problems)"
# [ 'question js-values-2 is type "output" but has no code' ]
node --input-type=module -e "const {questions}=await import('./content/index.js');console.log(questions.filter(q=>q.ask).length,'of',questions.length,'have an ask')"
# 229 of 1047 have an ask
```

At the baseline four `output` questions had no code, and nothing caught them. Is 229 of 1,047 "about a fifth"?

## 4. The path: `content/tracks.js` (10 min)

- What exactly is `unlockAt` compared against: this stage's mastery, or another stage's? Which one? Find the line in `server/src/progress.js › buildProgress` (`gateId`).
- One stage has an `after`. Why does the comment next to it say a JS-only learner should not have to master C# first?
- Where else is the threshold restated in prose, and does the prose compute it or copy it?

**Prove it:**

```bash
node --input-type=module -e "const {stages}=await import('./content/index.js');console.log(stages.map(s=>s.id+':'+s.unlockAt+(s.after?' after '+s.after:'')).join(', '))"
# stage-1:0, stage-2:0.35, …, stage-8:0.35 after stage-5, stage-9:0.35, stage-10:0.35
grep -n "35%" README.md
# 65:A stage unlocks once you have mastered 35% of the stage it builds on — usually
```

`client/src/pages/Dashboard.tsx` renders `Math.round(stage.unlockAt * 100)`, so it cannot drift. The README copies the number, so it can. At the baseline both said "a third" (F-19, J37).

## 5. The process: `server/src/index.js`, `config.js`, `app.js`, `lifecycle.js` (25 min)

- `index.js` is the only file that reads the environment, opens the store and listens. What does `createApp()` take as parameters, and why does that make `server/test/http.test.js` possible without a port?
- List the middleware in `createApp` in order. Why is `cors` first now, and why is the import route's parser mounted before the global one?
- `toErrorResponse` decides the `code`. Which branch does a body-parser error take, and which does a Node `ENOENT` take?
- Which interface does the server bind by default, and where is that decided? What does `createShutdown` close, in what order, and why is it in its own file?

**Prove it (server):**

```bash
curl -s -i -X POST localhost:3997/api/sessions -H 'content-type: application/json' -H "x-profile-id: $P" -d '{bad' | sed -n '1p;$p'
# HTTP/1.1 400 Bad Request
# {"error":{"code":"invalid_json","message":"The request body is not valid JSON."}}
netstat -ano | grep ":3997" | grep LISTEN
#   TCP    127.0.0.1:3997         0.0.0.0:0              LISTENING       <pid>
cd server && npx vitest run test/lifecycle.test.js
#       Tests  6 passed (6)
```

At the baseline the first command answered `internal_error` (F-14), and `netstat` showed `0.0.0.0:3997` and `[::]:3997` (M-04).

## 6. The routes: `server/src/routes/`, then `answer.js` and `validate.js` (25 min)

- There are four routers now: `api.js`, `profiles.js`, `questions.js` and `settings.js`. Which routes do not call `requireProfile`, and why is the export route one of them?
- `POST /answers` validates the body shape in the route and the answer shape in `grade()`. Where exactly does a malformed answer become a 400, and what is guaranteed not to happen when it does?
- `submitAnswer` writes through `store.recordAnswer`. Write the invariant it keeps, as a test assertion.
- `xpEarned` in the response comes from `xpFor(after.outcome, …)`. The dashboard's XP comes from `replayXp`. Are they the same number a year from now? (`http.test.js` has a case that says.)

**Prove it (server):**

```bash
curl -s -X POST localhost:3997/api/answers -H 'content-type: application/json' -H "x-profile-id: $P" -d '{"questionId":"js-values-1","response":"1"}'
# {"error":{"code":"invalid_response","message":"That response does not fit a mcq question: unknown choice id.","details":{"field":"response"}}}
curl -s localhost:3997/api/progress -H "x-profile-id: $P" | node -e "process.stdin.on('data',d=>console.log('attempts',JSON.parse(d).data.totals.attempts))"
# attempts 0
```

Nothing was recorded and nothing was revealed. At the baseline the same request was graded wrong, recorded, and answered with the key (M-02).

## 7. Grading: `server/src/grade.js` (15 min)

- Every choice type is answered by id now. What does `grade()` return for an integer, and why is "malformed" a different result from "wrong" (`valid: false`)?
- Why does `multi` deduplicate (read the comment) while `order` rejects duplicates?
- `normalise` handles Unicode forms, smart quotes, dashes, wrapping quotes and backticks, case, whitespace and trailing punctuation. Write down two answers a person would accept that it still rejects.

**Prove it:**

```bash
node --input-type=module -e "import {grade} from './server/src/grade.js';console.log(grade({type:'short',answer:['npm ci']},'\`npm ci\`'))"
# { valid: true, correct: true }
node --input-type=module -e "import {grade} from './server/src/grade.js';import {getQuestion} from '@jstrain/content';const q=getQuestion('js-values-1');console.log(grade(q,1), grade(q,q.choices[q.answer].id))"
# { valid: false, correct: false, reason: 'expected a choice id' } { valid: true, correct: true }
```

At the baseline the first command printed `{ correct: false }`.

## 8. Scheduling: `server/src/srs.js` (30 min)

- Draw the state after the first correct answer, the second (on time), an early correct answer, and a wrong answer. Label each with its `outcome`.
- Why does `isDue` require `attempts > 0`? (Look at `emptyCardState` in `store.js`.)
- The header says "spaced is enforced, not assumed". Which line enforces it? Why is `dueAt` local midnight (`startOfLocalDay`) rather than `now + intervalDays × 24 h`?

**Prove it:**

```bash
node --input-type=module -e "import {schedule,isMastered} from './server/src/srs.js';const t=new Date('2026-01-01T10:00:00Z');let s={reps:0,lapses:0,ease:2.5,intervalDays:0,attempts:0,correct:0,dueAt:new Date(0).toISOString()};s=schedule(s,true,t);s=schedule(s,true,new Date(t.getTime()+60000));console.log(isMastered(s),s.reps,s.outcome)"
# false 1 practice
```

At the baseline this printed `true 3`: mastered in one minute (F-01, J10).

## 9. Choosing and counting: `server/src/sessions.js`, then `server/src/progress.js` (40 min)

- In `pickDaily`, trace a learner with 30 due cards and nothing unseen who asks for 40 questions. What stops a card appearing twice? Where is the only randomness left?
- In `buildProgress`, what set does `totals.correct` sum over, and what set does `totals.attempts` count? Why can they no longer differ?
- `computeStreak` steps by calendar date at local noon. What happened on a 23-hour day when it stepped by `DAY_MS`?

**Prove it:**

```bash
node --input-type=module -e "import {buildSession} from './server/src/sessions.js';import {questions} from '@jstrain/content';const past=new Date(Date.now()-864e5).toISOString(),fut=new Date(Date.now()+9e9).toISOString();const all=questions.map((q,i)=>i<30?{questionId:q.id,attempts:1,correct:1,reps:1,dueAt:past}:{questionId:q.id,attempts:2,correct:2,reps:2,dueAt:fut});let d=0;for(let r=0;r<200;r++){const ids=buildSession({store:{listCardStates:()=>all},profileId:'p',mode:'daily',size:40}).questions.map(q=>q.id);if(new Set(ids).size!==ids.length)d++}console.log(d,'of 200 sessions contain a duplicate')"
# 0 of 200 sessions contain a duplicate
node --input-type=module -e "import {buildProgress} from './server/src/progress.js';const n=new Date();const st=[{questionId:'js-values-1',attempts:1,correct:1,reps:1,dueAt:n.toISOString()},{questionId:'js-async-03',attempts:5,correct:5,reps:3,dueAt:n.toISOString()}];console.log(buildProgress({listCardStates:()=>st,listAttempts:()=>[]},'p',{now:n}).totals.accuracy)"
# 1
TZ=America/Los_Angeles node --input-type=module -e "import {computeStreak} from './server/src/progress.js';console.log(computeStreak(new Map([['2026-03-07',{}],['2026-03-09',{}]]),new Date(2026,2,9,0,30)))"
# 1
```

At the baseline these printed `200 of 200` (F-05), `6` (F-10) and `2` (F-24). Note the changed signatures: `buildSession` takes `size` (the route validates `limit`), and `buildProgress` takes `{ now }`. Walkthroughs 03 and 04 go deeper.

## 10. Persistence: `server/src/store.js`, then `server/test/store.test.js` and `server/src/check.js` (40 min)

- `createStore` falls back to JSON in exactly one case. Which, and what happens in every other failure?
- `migrate` uses `PRAGMA user_version`. What is a file with `user_version` 0 and a `profiles` table, and what is written before its first migration?
- `server/test/helpers.js` exports `backends`. Which suites run under `describe.each(backends)`, and what did the JSON store get wrong at the baseline that only such a suite would catch?
- `check.js` is now a smoke test next to the Vitest suites. What does it still do that they do not? (`REQUIRE_SQLITE`)

**Prove it:**

```bash
npm run check -w server
# … (backend: sqlite) … All checks passed.
#  Test Files  9 passed (9)
#       Tests  152 passed | 3 todo (155)
cd server && npx vitest run test/store.test.js
#       Tests  29 passed (29)
```

At the baseline no command could make the self-test exercise the JSON backend. Now every store-shaped test runs on both. Walkthrough 05 covers this stop in depth.

## 11. Client boot: `client/src/main.tsx` → `App.tsx › Gate` → `lib/app-state.tsx` → `lib/useResource.ts` → `lib/api.ts` (35 min)

- `main.tsx` imports four stylesheets: `tokens`, `base`, `components`, `pages`. Say what each one holds. Then say which ordering dependence is real (two rules with equal specificity) and which is only convention (custom properties resolve at computed-value time).
- What does the Gate render while boot loads, on a boot error, with no learner, and before the first progress snapshot? Which of those offer Retry?
- `profileId` starts as `null`, not as the stored id. What bug does that ordering prevent?
- `request<T>` resolves only with `data` from an envelope. What does a caller get for a 200 body that is HTML, and for a stopped server?

**Prove it:**

```bash
cd client && npx vitest run src/lib/app-state.test.tsx src/lib/api.test.ts
#       Tests  13 passed (13)
```

The case *a stale stored profile id falls back to the first profile with no error screen* is the baseline's M-06, where the page showed "The API should be running on port 3001" forever. Walkthroughs 07 and 08 cover this stop in depth.

## 12. The drill and the renderer: `client/src/pages/drill/`, then `pages/Dashboard.tsx`, `components/Markdown.tsx`, `components/Code.tsx` (50 min)

- Draw the drill's states from `drillReducer` in `useDrillSession.ts`. Which values are derived rather than stored (`finished`, `answered`)? What does `round` protect against?
- `QuestionCard` is keyed by `` `${state.round}:${state.index}:${question.id}` ``, and `DrillRoute` in `App.tsx` keys `DrillPage` by `location.key`. What does each key reset?
- `keys.ts › shouldIgnore` decides which keypresses the drill may take. List what it declines, and why Enter on a link is left alone.
- In `Markdown.tsx › renderBlocks`, show that every pass of the loop advances `i`. Why is `if (i === start) i += 1` there if it can never fire?
- `client/src/styles/tokens.css` defines the colour tokens for both themes. Where is `data-theme` set before first paint? (`client/index.html`, J26)

**Prove it:**

```bash
cd client && npx vitest run src/pages/drill/DrillPage.test.tsx -t "nav link|Another round"
#       Tests  2 passed | 13 skipped (15)
cd client && npx vitest run src/components/Markdown.test.tsx -t "terminates"
#       Tests  2 passed | 9 skipped (11)
```

At the baseline, Enter on a focused nav link submitted the answer (M-07), "Another round" changed the URL and nothing else (F-12), and a `|`-leading line froze the tab (M-05). Walkthroughs 09 and 10 cover this stop.

## 13. Why it looks like this: read the journal in INDEX order (2–3 h, over several days)

The code tells you what is true now. The journal tells you what was wrong, what else was considered, and what each fix gave up. [`04-journal/INDEX.md`](04-journal/INDEX.md) lists the 46 entries in J-number order: tooling (J01–J05), server correctness (J06–J22), client (J23–J32), content (J33–J37), then features (J38 onwards). Read them in that order, not by area, because later entries cite earlier ones.

- For each entry, read the Symptom and the Options, and write down which option you would pick **before** you read the Decision.
- Keep a list of every "Follow-ups" box that is still unticked. Those are the open work, and walkthroughs 03–10 quote them.
- Six entries are `in review` (J11, J33, J34, J35, J45, J46). Read their review notes as well. They are what "revise" looks like.

**Prove it:**

```bash
node upskilling/_tools/build-index.mjs --check
# checked upskilling/04-journal/INDEX.md (46 entries)
# checked 286 anchors
# ok
```

That command re-reads every entry's front matter and checks every `path › symbol @ sha` anchor in this folder against `git show`. If it prints `ok`, every "before" quote you just read can still be found at the commit it names.

---

## You are done when

You can explain, without notes, the full path of one answer: keypress, `keys.ts`, `useDrillSession › send`, `POST /api/answers`, `validate.js`, `submitAnswer`, `grade`, `schedule`, `recordAnswer` (one transaction), the response and its `outcome`, the reducer's `graded` action, `refreshProgress`, `buildProgress` and `replayXp`, and the number on the dashboard. You can also name two places where that path lied to the learner at `6f1bf43`, the journal entries that fixed them, and one follow-up those entries left open. That explanation is the first half of [E01](05-exercises/E01-trace-an-answer-end-to-end.md).
