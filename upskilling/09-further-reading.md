# Further reading (stub)

Ten outside sources, each chosen because a specific journal entry or ADR here depends on it. Read the one next to an entry when you reach that entry, not all ten up front. This is a stub. Links are left out on purpose; search for the exact title.

| # | Source | Why it matters here | Used by |
|---|---|---|---|
| 1 | Michael Nygard, "Documenting Architecture Decisions" (2011) | The origin of the ADR shape in `02-adrs/`, including why a superseded record is kept and not edited (ADR-0012 → 0016). | ADRs 0001–0018 |
| 2 | SQLite documentation: "Write-Ahead Logging" and `PRAGMA user_version` | Explains why leftover `-wal` files are not data loss, and gives the integer the migrations hang on (contract §13). | J19, J21, ADR-0017, E03 |
| 3 | better-sqlite3 API docs, `Database#transaction()` | The synchronous transaction wrapper that `recordAnswer()` uses, and why nesting is safe (savepoints inside `importProfile`). | J08, J40 |
| 4 | Piotr Wozniak, the original SM-2 description (SuperMemo, 1990) | Compare with `server/src/srs.js`: what the trim removed (quality grades) and what it added (an ease ceiling). | Walkthrough 02, ADR-0009, J10, J45 |
| 5 | React docs, "You Might Not Need an Effect" and "Synchronizing with Effects" | The "Another round" bug is an effect whose dependencies do not include what changed. The same pages cover cancellation and `useEffectEvent`. | J23, J25, J28 |
| 6 | Michael Feathers, *Working Effectively with Legacy Code*, the chapter on characterisation tests | How to pin behaviour before changing it, and what to do when the pinned behaviour is the bug (`check.js` L69–73). | J01 |
| 7 | Stripe engineering blog, "Designing robust and predictable APIs with idempotency" | The standard fix for a replayed `POST /api/answers`, and why this release chose `practice` and a client guard instead. | J08, J10, E07 |
| 8 | OWASP Cross-Site Scripting Prevention Cheat Sheet | The rule ADR-0005 relies on (text children, never HTML strings), and the URL-scheme allowlist needed the day content gets links. | ADR-0005, J24 |
| 9 | WAI-ARIA Authoring Practices, the Listbox pattern and keyboard interaction guidance | What focus should do when an order row moves, and why a global Enter handler is wrong. | J25, J31 |
| 10 | Google SRE Book, "Postmortem Culture: Learning from Failure" | The blameless format for E06 (the "accuracy 104%" postmortem): timeline, impact, contributing causes, actions. Compare the `craft-incidents` primer in `content/modules/craft-ops.js`. | E06 (about J15) |

TODO: when an entry cites a source not listed here, add it with the entry number. Remove a row once no entry uses it.
