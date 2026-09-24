---
id: J20
title: Run one contract suite against both store backends
area: server
closes: [F-13]
ladder: [B10, B16]
adrs: [0003 unchanged]
status: landed
---

# Run one contract suite against both store backends

Date 2026-09-24 · Author Claude (server implementer) · Area server · Commit uncommitted working tree (baseline 6f1bf43)
Closes F-13 · Ladder B10, B16 · ADRs 0003 unchanged (J18/ADR-0018 narrow when the fallback is used, not whether it exists)

## Symptom

The JSON store is the fallback that runs only on the machines where something already went wrong, and at `6f1bf43` nothing ever ran it. `check.js` exercises whichever backend loads, which on every developer machine is SQLite. The server review forced the JSON backend through a loader hook and found three things:

- `getProfile` returns the live object from the store's array, so a caller that edits the result edits the store.
- The `exit` hook is never removed, so after `close()` and the test's `rmSync`, exit writes into a deleted directory and prints an `ENOENT` stack trace (exit code 0, so nothing noticed).
- The file is written in place. A crash mid-write leaves truncated JSON, and the next boot renames it to `.corrupt-…` and starts **empty**, without saying so in the UI.

The two backends had also drifted: JSON attempts carried `profileId`, SQLite's did not, and neither had an `id`.

## Root cause

`server/src/store.js › flush (L188–203 @ 6f1bf43)`
```js
  let writeTimer = null;
  const flush = () => fs.writeFileSync(file, JSON.stringify(data, null, 2));
  // … debounce …
  process.on('exit', () => {
    if (writeTimer) clearTimeout(writeTimer);
    flush();
  });
```

`server/src/store.js › getProfile (L210 @ 6f1bf43)`: `getProfile: (id) => data.profiles.find((p) => p.id === id),`

More generally, `createJsonStore` was not exported, so no test could reach it. The invariant: *both backends satisfy one written contract (the same inputs give the same shapes and results), and each is tested on every run.*

## Options

| | Option | What it costs | Why (not) |
|---|---|---|---|
| A | Do nothing | Nothing | The fallback rots, and the day it is needed it loses data. |
| B | Drop the JSON store; require `better-sqlite3` | Removes ~200 lines | ADR-0003's reason stands: a learner on a machine without a prebuilt binary should still be able to study. |
| C | Fix the three defects and add unit tests for the JSON store alone | ~60 lines | The fixes land, but the drift between backends is still untested. |
| D | Export both constructors; `backends` in `test/helpers.js`; `describe.each(backends)` over one contract suite; fix what it finds | ~150 lines of tests | Every store behaviour is asserted twice, so drift is a red test. **Chosen.** |

## Decision and trade-off

I chose D. `test/helpers.js` exports `backends = [['sqlite', make], ['json', make]]`. Each `make(dir?)` returns `{ store, dir, file, cleanup }`, and the store, answer, progress, session and HTTP suites all run under `describe.each(backends)`. The suite pins the shared shape the drift above violated: `id` and `gaveUp` on every attempt and no `profileId`, copies from `getProfile` and `listProfiles`, and an `id` tiebreak on equal timestamps.

The JSON store now writes a temp file, fsyncs it, copies the current file to `.bak` and renames the temp file over the target, which is atomic on one volume. On load it validates the shape (arrays and objects where expected), tries `.bak` if the main file fails, keeps a `.corrupt-<ts>` copy and says so in the log. `close()` is idempotent, removes the `exit` hook, and makes later writes throw.

The cost is test time: everything store-shaped runs twice, and on this machine the full suite takes minutes rather than seconds. That is acceptable for a suite whose purpose is to exercise the rare path. I did not add retry-on-`EPERM` for antivirus locks on Windows. Revisit only if someone sees it.

## The change

`server/src/store.js`: `createSqliteStore` and `createJsonStore` are exported. JSON gains `readJsonFile`, an atomic `flush`, `mutate()` (refuses after close, then schedules a flush), and `toAttempt`/`cardFields` mappers. `server/test/store.test.js` has 9 contract cases × 2 backends, 4 JSON recovery and migration cases, and 5 SQLite open, fallback and migration cases.

After, `server/src/store.js` (working tree):
```js
    if (fs.existsSync(file)) fs.copyFileSync(file, bak);
    // rename over the target is atomic on one volume (MoveFileEx on Windows).
    fs.renameSync(tmp, file);
```

## Verification

1. `server/test/store.test.js` › `JSON store recovery and migration` › *a torn/corrupt file falls back to .bak and the corrupt copy is kept*. It writes `{"profiles": [ {"id": "trunc` over a good file and expects the previous profiles back from `.bak`. At the baseline: an empty store.
2. `store contract: json` › *getProfile and listProfiles return copies, not live objects*. At the baseline it fails for JSON (the name becomes `mutated`) and passes for SQLite: exactly the drift.
3. `store contract: json` › *close() is idempotent, persists, and leaves no exit hook behind*.
4. *a valid JSON file with the wrong shape is treated as corrupt, not trusted* (`{"profiles": null}` crashed later at the baseline).

## What a senior reviewer would ask

- *Why copy to `.bak` rather than rename?* A rename would leave a moment with no `progress.json` at all. Copying first means the target always exists.
- *Is the JSON store safe with two processes?* No, and it never was: last writer wins. It is a single-process fallback.
- *Does the suite prove the SQLite transaction and the JSON "validate then mutate" behave the same?* Yes: *recordAnswer … a bad attempt rolls back the card* runs on both (J08).

## The junior version of this fix

`getProfile: (id) => ({ ...data.profiles.find((p) => p.id === id) })`. It fixes the live object and passes review. But for an unknown id it returns `{}` instead of `undefined`, so `requireProfile` accepts every id on the JSON backend. On SQLite the same call returns `undefined`. Only a suite that runs both backends would catch it.

## Follow-ups

- [ ] Retry on `EPERM` during rename if antivirus locking is ever observed → new entry

## Update 2026-09-24

The senior-reviewer answer "the suite proves the SQLite transaction and the JSON validate-then-mutate behave the same" was only half true: the shared case failed validation before either backend wrote anything. See J08 › Update for the ghost-profile case that reaches the transaction and for the tenth contract case (profile existence on both backends).
