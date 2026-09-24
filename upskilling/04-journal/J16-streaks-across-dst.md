---
id: J16
title: Count streaks by calendar day, not by 24 hours
area: server
closes: [F-24]
ladder: [B10]
adrs: []
status: landed
---

# Count streaks by calendar day, not by 24 hours

Date 2026-09-24 · Author Claude (server implementer) · Area server · Commit uncommitted working tree (baseline 6f1bf43)
Closes F-24 · Ladder B10 · ADRs none

## Symptom

Twice a year the streak is wrong for a day. Against a scratch copy of `6f1bf43`, run under `TZ=America/Los_Angeles`:

```
practised 7 and 9 March 2026 (missed the 8th, the 23-hour day), asked at 00:30 on the 9th → 2   expected 1
practised 31 Oct, 1 and 2 Nov 2026 (1 Nov is 25 hours), asked at 23:30 on the 2nd        → 4   expected 3
```

In spring a missed day is skipped over, and in autumn a day is counted twice. It is off by one, on two days a year, and only in zones with DST. That is S2 by the register's definition (a visibly wrong number), and it is small.

## Root cause

`server/src/progress.js › computeStreak (L143–155 @ 6f1bf43)`
```js
export function computeStreak(days, now = new Date()) {
  let cursor = new Date(now);
  if (!days.has(localDayKey(cursor))) {
    cursor = new Date(cursor.getTime() - DAY_MS);
    if (!days.has(localDayKey(cursor))) return 0;
  }
  let streak = 0;
  while (days.has(localDayKey(cursor))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - DAY_MS);
  }
```

`days` is keyed by *local calendar date*, but the cursor steps back by 86,400,000 ms. On a 23-hour day, stepping back 24 hours from 00:30 lands on the day before yesterday. On a 25-hour day, stepping back from 23:30 lands on the same date again. The invariant: *each step of the cursor moves to the previous calendar date, exactly once.*

Nothing caught it because the result depends on the machine's time zone. The same test passes in UTC and fails in Los Angeles.

## Options

| | Option | What it costs | Why (not) |
|---|---|---|---|
| A | Do nothing | Nothing | Two wrong days a year, and the streak is the number learners watch most. |
| B | Compute in UTC | Small | Streaks would then break at 16:00 or 17:00 local time in California. The day a learner experiences is local (`localDayKey` already says so). |
| C | Step by calendar date anchored at local noon: `new Date(y, m, d - 1, 12)` | ~4 lines | Noon is never inside a DST transition in practice, and the `Date` constructor normalises `d - 1` across month boundaries. **Chosen.** |

## Decision and trade-off

I chose C. The time zone is still the server's, which for a local tool is the learner's. A learner who travels across zones gets their streak computed in the machine's current zone, and I accept that. The fix only means something if the tests run in a DST zone, so `server/vitest.config.js` pins `TZ: 'America/Los_Angeles'`, and a test asserts both that `process.env.TZ` is set and that January and July have different offsets. Without that, the DST tests pass on a UTC CI runner no matter what the code does (server review M15). Revisit if the app ever serves more than one machine's learners: `tz` becomes a profile setting.

## The change

`server/src/progress.js › computeStreak`: a `noon(d, offset)` helper replaces both millisecond steps. `server/vitest.config.js` sets `env.TZ`. The same calendar arithmetic is used for due dates in `server/src/srs.js › startOfLocalDay` (J10). About 5 changed lines.

After, `server/src/progress.js` (working tree):
```js
  const noon = (d, offset = 0) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + offset, 12);
  let cursor = noon(new Date(now));
  if (!days.has(localDayKey(cursor))) {
    cursor = noon(cursor, -1);
```

## Verification

1. `server/test/progress.test.js` › `computeStreak` › *is right across spring-forward and fall-back (TZ=America/Los_Angeles)*: both reproductions above, plus a 20-day streak that runs through 8 March. At the baseline the first two assertions fail with 2 and 4.
2. `server/test/srs.test.js` › `the test environment` › *runs in a pinned time zone with DST, so calendar tests cannot pass by geography*.
3. `server/test/srs.test.js` › *startOfLocalDay steps calendar days across DST (spring forward on 8 March 2026)*.

## What a senior reviewer would ask

- *Why noon and not midnight?* In some zones the DST jump happens at midnight, so local 00:00 can be skipped or occur twice. Transitions happen at night; none in current tz data falls at midday, so noon is always a real, unambiguous local time.
- *Does the heatmap have the same bug?* No. It groups by `localDayKey` of each attempt and never steps.
- *Why not use `Temporal`?* It is not available without a flag across the Node versions the project supports (J02), and four lines of `Date` arithmetic do not justify a polyfill.

## The junior version of this fix

Write the DST test and leave the time zone alone. On a developer machine in Europe or California it fails, the fix makes it pass, and the PR looks well tested. On a UTC CI runner the same test passes against the *baseline* code, because UTC has no 23- or 25-hour days. The test proves nothing there, and a later regression ships green. Pinning `TZ` in the config, and asserting that it took effect, is the part of this fix that is easy to skip.

## Follow-ups

- [ ] Per-profile time zone, only if the app ever runs for learners in different zones on one server → new entry
