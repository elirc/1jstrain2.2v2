/**
 * Modules — SQL and data modelling (stage 5).
 *
 * One file per author, so parallel authors never touch the same file. Each
 * module carries a primer that covers everything its questions test. Primers
 * are markdown-lite — headings, lists, `code`, fenced blocks, tables, **bold**
 * and *italic*; validateContent() rejects anything the renderer cannot show.
 */

/** @type {import('../types.d.ts').Module[]} */
export const dataModules = [
  {
    id: 'data-sql',
    trackId: 'data',
    title: 'SQL you will actually write',
    blurb: 'SELECT, JOINs, GROUP BY, NULL semantics, and the queries interviewers ask you to write.',
    estMinutes: 40,
    objectives: [
      'Write a JOIN + GROUP BY query from a plain-English requirement',
      'Explain the difference between WHERE and HAVING',
      'Explain why `= NULL` never matches',
      'Say what a LEFT JOIN gives you that an INNER JOIN does not',
    ],
    primer: `
## Logical order of evaluation

You write \`SELECT\` first, but the engine evaluates:

\`\`\`
FROM → JOIN → WHERE → GROUP BY → HAVING → SELECT → DISTINCT → ORDER BY → LIMIT
\`\`\`

That order explains two classic gotchas: you cannot use a \`SELECT\` alias in
\`WHERE\` (it does not exist yet), and \`WHERE\` filters **rows before**
grouping while \`HAVING\` filters **groups after** it.

## Joins

- \`INNER JOIN\` — rows with a match on both sides.
- \`LEFT JOIN\` — every left row; unmatched right columns are NULL. This is how
  you find "customers with no orders": \`LEFT JOIN ... WHERE o.id IS NULL\`.
- \`RIGHT\`/\`FULL\` — the mirror and the union.
- \`CROSS JOIN\` — every combination; usually an accident.

Putting a condition on the right table in \`WHERE\` instead of in the \`ON\`
clause turns a LEFT JOIN back into an INNER JOIN — a real and very common bug.

## Aggregation

\`\`\`sql
SELECT c.id, c.name,
       COUNT(o.id) AS order_count,
       COALESCE(SUM(o.total), 0) AS lifetime
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id AND o.status = 'paid'
WHERE c.created_at >= '2024-01-01'
GROUP BY c.id, c.name
HAVING COUNT(o.id) > 3
ORDER BY lifetime DESC
LIMIT 10;
\`\`\`

Every non-aggregated column in \`SELECT\` must be in \`GROUP BY\`.
\`COUNT(*)\` counts rows; \`COUNT(col)\` skips NULLs; \`COUNT(DISTINCT col)\`
does what it says. Aggregates other than \`COUNT(*)\` ignore NULLs.

## NULL

NULL means *unknown*, so every comparison with it is unknown, not false:
\`x = NULL\` never matches — use \`IS NULL\`. \`NOT IN (subquery containing a
NULL)\` returns no rows at all, which is a genuinely nasty afternoon. Use
\`COALESCE(x, fallback)\`, and remember \`NULL\` sorts to one end and is skipped
by \`UNIQUE\` in most engines.

## NULL arithmetic and COALESCE

NULL is contagious. \`10 - NULL\` is NULL, \`'a' || NULL\` is NULL, and so is
\`price - discount\` for every row with no discount. \`COALESCE(a, b, ...)\`
returns its first non-NULL argument, so write
\`price - COALESCE(discount, 0)\`.

The same logic bites filters. \`WHERE status <> 'cancelled'\` silently drops
rows whose status is NULL, because \`NULL <> 'cancelled'\` is unknown and
\`WHERE\` keeps only rows that are *true*. If NULL should count as "not
cancelled", say so: \`status IS DISTINCT FROM 'cancelled'\` (Postgres, SQL
Server 2022+) or \`status <> 'cancelled' OR status IS NULL\`. Better: make the
column \`NOT NULL\` when a value is always known.

## CASE and conditional aggregation

\`CASE WHEN ... THEN ... ELSE ... END\` is an expression, so it can go inside an
aggregate. That turns rows into columns in one pass:

\`\`\`sql
SELECT date_trunc('month', created_at) AS month,
       SUM(CASE WHEN status = 'paid'     THEN total ELSE 0 END) AS paid,
       SUM(CASE WHEN status = 'refunded' THEN total ELSE 0 END) AS refunded
FROM orders
GROUP BY 1;
\`\`\`

Postgres also has \`SUM(total) FILTER (WHERE status = 'paid')\`, which reads
better. \`GROUP BY month, status\` would give you the same numbers as *rows*.

## Join fan-out

A join returns one row per matching pair. Join orders (one) to order items
(many) and each order appears once per item, so \`SUM(o.total)\` counts an
order with three items three times. The report is "a bit high" and nobody
notices for a month. The rule: **aggregate first, then join**. Sum the items per
order in a subquery or CTE, or do not join a table your aggregate does not need.
\`COUNT(DISTINCT o.id)\` hides the symptom for counts but not for sums.

\`COUNT(*)\` counts rows, \`COUNT(DISTINCT customer_id)\` counts different
non-NULL values: with customer ids \`1, 1, 2\` that is 3 and 2.

## Self-joins and anti-joins

A self-join uses one table twice with different aliases, typically for
hierarchies stored as \`manager_id\` or \`parent_id\`:

\`\`\`sql
SELECT e.name, m.name AS manager
FROM employees e
LEFT JOIN employees m ON m.id = e.manager_id;   -- LEFT keeps the CEO
\`\`\`

"Rows in A with no match in B" is an anti-join. Write it as
\`LEFT JOIN b ... WHERE b.id IS NULL\` or \`WHERE NOT EXISTS (SELECT 1 FROM b
WHERE ...)\`; both are correct and usually plan the same. An \`INNER JOIN\`
can never produce the NULL row, and \`NOT IN (subquery)\` returns nothing at all
once the subquery yields a single NULL — so \`NOT EXISTS\` is the safe habit.

## Rows have no order

A table is a set. Without \`ORDER BY\`, rows come back in whatever order the
plan produces, and that changes when an index is added, statistics refresh, a
parallel scan kicks in or vacuum moves rows. "It always comes back in id order"
is a latent bug, and so is \`LIMIT 10\` without \`ORDER BY\`.

## Date ranges

Use half-open ranges: inclusive start, exclusive end.

\`\`\`sql
WHERE created_at >= '2024-01-01' AND created_at < '2024-02-01'
\`\`\`

\`BETWEEN '2024-01-01' AND '2024-01-31'\` on a timestamp stops at *midnight*
on the 31st and drops almost the whole last day. \`EXTRACT(MONTH FROM
created_at) = 1\` ignores the year and wraps the column in a function, which
defeats a plain index. Remember that a date literal compared with a
\`timestamptz\` is interpreted in the session time zone — decide whose January
you mean.

## The rest of the toolkit

\`DISTINCT\`, \`IN\`/\`EXISTS\` (prefer \`EXISTS\` for correlated subqueries),
\`LIKE\` (leading \`%\` cannot use an index), \`UNION\` (dedupes, paying for a
sort or hash) vs \`UNION ALL\` (just appends — use it whenever duplicates are
impossible or wanted). Both sides of a \`UNION\` need the same number of
columns in the same order with compatible types; columns match by position, not
by name. CTEs (\`WITH x AS (...)\`) keep multi-step queries readable, and window
functions (\`ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY created_at
DESC)\`) solve "the latest row per group" — the query that separates people who
have used SQL from people who have read about it.

Window functions, recursive CTEs, upserts and query plans are covered in depth
in *Advanced SQL: windows, CTEs and query plans*.

## Writes

\`INSERT INTO t (a, b) VALUES (...) RETURNING id\`, \`UPDATE t SET ... WHERE\`,
\`DELETE FROM t WHERE\`. **Always** write the \`WHERE\` first. Prefer a soft
delete (\`deleted_at\`) when anything references the row. Upsert is
\`INSERT ... ON CONFLICT (col) DO UPDATE\` in Postgres/SQLite,
\`MERGE\` in SQL Server.

\`RETURNING\` (Postgres, SQLite 3.35+) hands back the affected rows: the
generated id after an insert, the new values after an update, what was removed
after a delete. SQL Server's equivalent is \`OUTPUT\`.

## Changing production data by hand

A one-off fix in production follows a ritual, every time:

1. Run a \`SELECT\` with exactly the \`WHERE\` you intend to use and look at the
   rows and the count.
2. \`BEGIN;\` then run the \`UPDATE\` or \`DELETE\`, ideally with \`RETURNING\`.
3. Check the affected row count matches what the \`SELECT\` showed.
4. \`COMMIT;\` if it does, \`ROLLBACK;\` if anything surprises you.

A backup is not an undo button: restoring it is slow and throws away everyone
else's writes since it was taken. Testing on your laptop proves nothing about
production's data. Have a second person read the statement.
`,
  },
  {
    id: 'data-modeling',
    trackId: 'data',
    title: 'Schema, indexes, transactions and ORMs',
    blurb: 'Normalisation, keys, indexing, N+1, transactions, migrations and SQL vs NoSQL.',
    estMinutes: 35,
    objectives: [
      'Model a one-to-many and a many-to-many relationship',
      'Say what an index costs as well as what it buys',
      'Recognise and fix an N+1 query',
      'Explain what a transaction guarantees',
    ],
    primer: `
## Relationships

**One-to-many** — the foreign key lives on the *many* side
(\`orders.customer_id\`). **Many-to-many** — a join table
(\`order_id\`, \`product_id\`) whose primary key is usually the pair, plus any
data about the relationship such as \`quantity\`. **One-to-one** — a unique
foreign key, usually a sign the tables should be merged unless you are splitting
off rarely-read columns.

Normalisation to 3NF means every fact lives in exactly one place, so an update
touches one row. Deliberate denormalisation (a cached \`order_count\`) trades
write complexity for read speed — fine, if you say out loud that you are doing
it and how it stays correct.

## Normal forms in plain words

- **1NF** — one value per column per row. \`tags = 'red,large,sale'\` breaks
  it: you cannot index one tag, put a foreign key on it, or query it without
  \`LIKE '%sale%'\` (which also matches "wholesale"). Use a
  \`product_tags(product_id, tag_id)\` join table. A Postgres \`text[]\` or
  JSONB array with a GIN index is a defensible shortcut when tags are free-form
  and never need attributes of their own.
- **2NF/3NF** — every non-key column depends on the key, the whole key, and
  nothing but the key. In practice: if a value can be looked up from another
  column (a customer's city from their postcode, a product's name in every order
  line), it belongs in its own table.

## Keys and constraints

A surrogate primary key (auto-increment or UUID) is the default; a natural key
(an email) becomes painful the day it changes. Auto-increment integers are small
and index well but leak volume and do not work for distributed generation;
UUIDv4 is random and fragments B-tree indexes, which is why UUIDv7/ULID
(time-ordered) exist.

Put the constraints in the database — \`NOT NULL\`, \`UNIQUE\`, \`CHECK\`,
foreign keys with a deliberate \`ON DELETE\` (\`CASCADE\`, \`RESTRICT\`,
\`SET NULL\`). Application-only validation fails the moment a second service, a
script, or a race condition shows up.

\`CHECK\` enforces a rule over the columns of one row:
\`price NUMERIC(12,2) NOT NULL CHECK (price >= 0)\` or
\`CHECK (ends_at > starts_at)\`. It cannot look at other rows or tables (that
is what \`UNIQUE\`, foreign keys and exclusion constraints are for). MySQL only
enforces \`CHECK\` from 8.0.16; older versions parsed and ignored it.

## Money

Never \`FLOAT\`, \`REAL\` or \`DOUBLE PRECISION\`: binary floating point cannot
represent most decimal fractions, so \`0.1 + 0.2\` is not \`0.3\` and totals
drift by a cent. Use \`NUMERIC(12,2)\` (exact decimal) or an integer number of
minor units (cents), and always store the currency code next to the amount.
Not every currency has two decimal places, so integer cents need a per-currency
exponent.

## Status columns: enum, CHECK or lookup table

| Option | Add a value | Metadata per value | Integrity |
| --- | --- | --- | --- |
| Native enum | \`ALTER TYPE ... ADD VALUE\`; removing means recreating the type | none | built in |
| Text + \`CHECK (status IN (...))\` | alter the constraint | none | built in |
| Lookup table + foreign key | an \`INSERT\` | any columns (label, sort order, is-final) | the foreign key |

Enums are compact and fine for a set that almost never changes. A lookup table
wins when statuses carry data or change with the business. None of the three
decides which *transitions* are legal (\`shipped\` back to \`pending\`) — that
is application code or a trigger.

## JSONB: when

JSONB is right for sparse, variable, mostly-read data: per-customer custom
fields, raw webhook payloads, settings. It is wrong for core fields you filter,
join, sort or constrain on, because you give up types, \`NOT NULL\`, foreign
keys and good planner statistics. A GIN index makes containment queries
(\`attrs @> '{"color":"red"}'\`) fast but is no substitute for a column. Rule:
once a JSON key appears in \`WHERE\` clauses everywhere, promote it to a real
column.

## Indexes

An index is a sorted structure that turns a full scan into a lookup. It costs
disk and slows every write, so index what you filter, join and sort on — not
everything. Primary keys are indexed automatically; **foreign keys usually are
not** (MySQL/InnoDB is the exception), and that is a very common cause of slow
joins. Postgres requires an index on the *referenced* primary key only; without
one on \`orders.customer_id\`, joining from a customer and every \`DELETE\` on
\`customers\` (which must check for referencing orders) scans all of
\`orders\`. Index your foreign keys unless you have measured that you should
not.

A composite index \`(customer_id, created_at)\` serves queries filtering on
\`customer_id\`, or on both, but not on \`created_at\` alone — leftmost prefix
(some engines — Postgres 18+, MySQL 8.0.13+ — can skip-scan the second column in
limited cases; do not design around it). Wrapping a column in a function
(\`WHERE LOWER(email) = ...\`) or a leading wildcard \`LIKE '%x'\` defeats the
index. Diagnose with \`EXPLAIN\` / \`EXPLAIN ANALYZE\` and look for a sequential
scan on a big table.

## Transactions

A transaction is all-or-nothing: **A**tomic, **C**onsistent, **I**solated,
**D**urable. Wrap any multi-statement change that must not half-apply — transfer
money, create an order and decrement stock. Keep them short; a transaction held
open across an HTTP call is how you deadlock a database. Isolation levels trade
correctness against concurrency (read committed is the default in Postgres and
SQL Server; MySQL/InnoDB defaults to repeatable read; the anomalies are dirty
read, non-repeatable read, phantom read). Optimistic concurrency — a \`version\`
column checked in the \`WHERE\` — is the standard way to stop two users
overwriting each other. Isolation levels, locks, deadlocks and pooling are
covered in depth in *Concurrency, pooling and scaling the database*.

## Soft delete

A \`deleted_at\` column keeps rows recoverable and history intact, and it has
three costs you should name before adding one:

- Every query, join, report and count must add \`deleted_at IS NULL\`; forget it
  once and "deleted" data leaks. (ORM global filters help, but raw SQL and
  reports bypass them.)
- \`UNIQUE (email)\` now blocks a new user from reusing a deleted user's email,
  so you need a partial unique index:
  \`CREATE UNIQUE INDEX ON users (email) WHERE deleted_at IS NULL\`.
- A GDPR erasure request still needs a real delete or anonymisation.

If you only need an undo window, moving deleted rows to an archive table is often
simpler.

## Audit columns and history

\`created_at\`/\`updated_at\` filled by the database (\`DEFAULT now()\` plus a
trigger or the ORM) and \`created_by\`/\`updated_by\` holding the acting user's
id answer "when and who" for the current state. "What did it look like before?"
needs an append-only history table (\`invoice_history\`) written *in the same
transaction* as the change, so history cannot disagree with the data. Never take
audit timestamps from the client: its clock is wrong, skewed and forgeable.

## Multi-tenancy

| Design | Isolation | Operational cost |
| --- | --- | --- |
| Shared schema, \`tenant_id\` on every table | logical (in queries or RLS) | lowest: one migration, one pool |
| Schema per tenant | stronger | migrations and objects multiply per tenant |
| Database per tenant | strongest, per-tenant restore | highest: connections, backups, monitoring per tenant |

The sensible default for many small tenants is the shared schema: put
\`tenant_id\` first in composite indexes and keys (\`(tenant_id, created_at)\`),
scope every query in one place, and let Postgres Row-Level Security enforce it
as a second line of defence. Move the few huge or regulated tenants to their own
database when noisy neighbours or contracts demand it.

## Adding a NOT NULL column without downtime

During a deploy, old and new code run side by side, so the schema must suit both:

1. Add the column as nullable (instant in Postgres).
2. Deploy code that writes it on every insert and update.
3. Backfill existing rows in batches.
4. Add \`NOT NULL\`.
5. Deploy code that relies on the value being present.

Writing before backfilling matters: otherwise rows inserted after the backfill
passes them stay NULL and step 4 fails. In Postgres, \`SET NOT NULL\` scans the
table under an exclusive lock; on a big table add
\`CHECK (country IS NOT NULL) NOT VALID\`, \`VALIDATE CONSTRAINT\` it, then
\`SET NOT NULL\`, which Postgres 12+ proves from the check without a scan. When
a constant default makes sense, Postgres 11+ adds a column with a default
without rewriting the table.

## The N+1 problem

Fetch 50 orders, then loop and fetch each order's customer: 51 queries. Fix it
with a join, an eager \`include\`, or one \`WHERE id IN (...)\` batch. It is the
single most common ORM performance bug and it is invisible until the table
grows. Turn on query logging in development and count.

## ORMs

They save you mapping code and give type-safe queries and migrations; they cost
you a leaky abstraction and easy-to-miss inefficiency. Know what SQL your ORM
emits. **Migrations** are versioned, committed, ordered schema changes; in
production you usually roll forward with a new migration rather than running a
down migration, but know whether yours are reversible. Never edit a shipped
migration, never change a production schema by hand, and expand-then-contract
(add the column, backfill, switch reads, drop the old one) lets you deploy
without downtime.

## SQL vs NoSQL

Relational when your data has relationships and you need transactions and ad-hoc
queries — which is nearly every CRUD app. Document stores when the shape is
genuinely document-like, schema varies, and you scale by sharding on a known
access key. "We used Mongo because it was easy to start" is an honest answer;
"because it is web-scale" is not.
`,
  },
  {
    id: 'data-queries',
    trackId: 'data',
    title: 'Advanced SQL: windows, CTEs and query plans',
    blurb:
      'Window functions, recursive CTEs, upserts, keyset pagination, and reading EXPLAIN well enough to pick the right index.',
    estMinutes: 35,
    objectives: [
      'Write ranking, running-total and previous-row queries with window functions',
      'Use CTEs, including recursive ones, to keep a complex query readable',
      'Write an idempotent upsert and a keyset-paginated query',
      'Read an EXPLAIN plan and choose a composite, covering or partial index',
    ],
    primer: `
Examples are Postgres unless a line says otherwise. Most of it carries over to
MySQL 8, SQL Server and SQLite with small spelling changes, which are called out.

## Window functions

An aggregate with \`GROUP BY\` collapses rows; a window function computes across
related rows **and keeps every row**. The \`OVER\` clause defines the window:

\`\`\`sql
SELECT customer_id, created_at, total,
       ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY created_at DESC) AS rn,
       SUM(total)   OVER (PARTITION BY customer_id ORDER BY created_at)      AS running
FROM orders;
\`\`\`

- \`PARTITION BY\` splits rows into groups (like \`GROUP BY\`, without
  collapsing). Leave it out and the whole result is one partition.
- \`ORDER BY\` inside \`OVER\` orders rows within each partition.

**Ranking.** For scores 100, 100, 90 ordered descending:

| Function | Result | Use it for |
| --- | --- | --- |
| \`ROW_NUMBER()\` | 1, 2, 3 | exactly one row per position (dedupe, latest per group) |
| \`RANK()\` | 1, 1, 3 | ties share a place, then a gap, like a league table |
| \`DENSE_RANK()\` | 1, 1, 2 | ties share a place, no gaps |

Which of two tied rows gets \`ROW_NUMBER\` 1 is arbitrary; add a tie-breaker
(\`ORDER BY score DESC, id\`) when it matters.

**Previous and next rows.** \`LAG(col)\` reads the previous row in window order,
\`LEAD(col)\` the next. Day-over-day change is \`count - LAG(count) OVER (ORDER
BY day)\`; the first row has no previous row and gets NULL (or pass a default:
\`LAG(count, 1, 0)\`). If a day with no data has no row, \`LAG\` silently compares
with the last day that does, so generate the missing days first
(\`generate_series\` in Postgres).

**Running totals and frames.** With \`ORDER BY\` in the window, aggregates use a
default frame from the start of the partition to the current row, so
\`SUM(amount) OVER (ORDER BY day)\` over 10, 20, 5 gives 10, 30, 35. Without
\`ORDER BY\`, every row gets the partition total. The default frame is
\`RANGE\`, which treats rows with equal sort values as one step; write
\`ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW\` when the sort column can
repeat, and \`ROWS BETWEEN 6 PRECEDING AND CURRENT ROW\` for a 7-row moving
average.

## Top-N per group and filtering on a window

Window functions are evaluated after \`WHERE\`, \`GROUP BY\` and \`HAVING\`, so
Postgres allows them only in the \`SELECT\` list and \`ORDER BY\`. To filter on
one, compute it in a CTE or subquery and filter outside:

\`\`\`sql
WITH ranked AS (
  SELECT p.*, ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY revenue DESC) AS rn
  FROM products p
)
SELECT * FROM ranked WHERE rn <= 3;
\`\`\`

The same shape de-duplicates (keep \`rn = 1\` per natural key) and finds the
latest row per group. \`LIMIT 3\` would limit the whole result, not each
category. Use \`RANK\` instead when ties should all be included. Postgres also
has \`DISTINCT ON (customer_id) ... ORDER BY customer_id, created_at DESC\` for
the one-row-per-group case. Some warehouses (Snowflake, BigQuery, DuckDB) add a
\`QUALIFY\` clause for this; Postgres, MySQL and SQL Server do not.

## CTEs, including recursive ones

\`WITH name AS (...)\` names a subquery so a long query reads top to bottom.
Since Postgres 12, a CTE that is referenced once and has no side effects is
inlined into the main query, so it costs nothing; before 12 every CTE was an
optimisation fence. \`MATERIALIZED\` and \`NOT MATERIALIZED\` let you choose.

A **recursive CTE** walks a tree or graph of any depth. It has an anchor (where
to start) and a recursive member that joins the table to the rows found so far,
repeating until an iteration adds nothing:

\`\`\`sql
WITH RECURSIVE subtree AS (
  SELECT id, parent_id, name FROM categories WHERE id = 7      -- anchor
  UNION ALL
  SELECT c.id, c.parent_id, c.name
  FROM categories c JOIN subtree s ON c.parent_id = s.id      -- recursive member
)
SELECT * FROM subtree;
\`\`\`

Org charts, category trees and threaded comments all use it. Postgres, MySQL 8
and SQLite spell it \`WITH RECURSIVE\`; SQL Server uses plain \`WITH\`. Add a
depth column and a limit if the data could contain a cycle.

## Upserts

"Insert, or update if it already exists" is one atomic statement, not a
\`SELECT\` followed by an \`INSERT\` or \`UPDATE\` (which races):

\`\`\`sql
INSERT INTO users (email, name) VALUES ($1, $2)
ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
RETURNING id;
\`\`\`

\`ON CONFLICT\` needs a unique index or constraint on the target columns.
\`EXCLUDED\` is the row you tried to insert; the existing row keeps its id.
\`DO NOTHING\` skips silently. SQLite shares this syntax, MySQL uses \`INSERT
... ON DUPLICATE KEY UPDATE\`, and SQL Server uses \`MERGE\` (with a
\`HOLDLOCK\` hint to be safe under concurrency). Postgres 15+ also has
\`MERGE\`, but for a plain upsert \`ON CONFLICT\` is the one that is safe under
concurrent inserts.

## Keyset pagination

\`OFFSET 100000\` reads and discards 100,000 rows on every request, and rows
inserted meanwhile shift every page. Keyset (cursor) pagination remembers the
last row seen and seeks past it:

\`\`\`sql
SELECT * FROM posts
WHERE (created_at, id) < ($1, $2)        -- the last row of the previous page
ORDER BY created_at DESC, id DESC
LIMIT 20;
-- backed by: CREATE INDEX ON posts (created_at DESC, id DESC);
\`\`\`

The \`id\` tie-breaker is required: many rows can share a \`created_at\`, and
\`created_at < $1\` alone would skip those equal to the cursor. The row-value
comparison is Postgres (and MySQL/SQLite) syntax; in SQL Server expand it to
\`created_at < $1 OR (created_at = $1 AND id < $2)\`. Hand the client an opaque
cursor that encodes both values. The trade-off: no "jump to page 37".

## Reading EXPLAIN

\`EXPLAIN\` shows the plan the planner chose with its *estimates*;
\`EXPLAIN ANALYZE\` runs the query and adds *actual* rows and timings (so do
not run it on a \`DELETE\` you do not mean). Read the tree inside out.

| Node | Meaning |
| --- | --- |
| Seq Scan | reads the whole table; fine for small tables or big result shares |
| Index Scan | walks the index, then fetches each row from the table |
| Index Only Scan | answers from the index alone, when every needed column is in it |
| Bitmap Heap Scan | collects matches from one or more indexes, then reads pages in order; for medium result sizes |
| Nested Loop | for each outer row, look up the inner side; great when the outer side is small |
| Hash Join | builds a hash of one side; good for large unsorted inputs |

The first thing to compare is **estimated vs actual rows**. \`rows=10\`
estimated and \`rows=120000\` actual means the planner chose a strategy for the
wrong size — typically a nested loop that should have been a hash join. The
usual cause is stale or too-coarse statistics: run \`ANALYZE\`, raise the
column's statistics target (\`ALTER TABLE ... ALTER COLUMN ... SET
STATISTICS\`), or add \`CREATE STATISTICS\` for correlated columns. Fix the
estimate before rewriting the query; Postgres has no query hints without an
extension.

An Index Only Scan with a high \`Heap Fetches\` count is not really index-only.
An index entry does not know whether its row version is visible to your
transaction, so Postgres can skip the table only for pages the *visibility map*
marks all-visible, and \`VACUUM\` sets those bits. After heavy writes, vacuum
(or tune autovacuum for that table) and the heap fetches drop.

## Designing indexes

- **Equality first, then range or sort.** For
  \`WHERE customer_id = $1 AND created_at > $2 ORDER BY created_at\`, index
  \`(customer_id, created_at)\`: one customer's rows sit together, already in
  date order, so there is no sort.
- **Covering.** \`CREATE INDEX ON orders (customer_id) INCLUDE (total, status)\`
  (Postgres 11+, SQL Server) stores extra non-key columns in the index so a
  query reading only those can use an Index Only Scan.
- **Partial.** \`CREATE UNIQUE INDEX ON users (email) WHERE deleted_at IS NULL\`
  indexes only matching rows: smaller, and here it makes emails unique among
  active users while soft-deleted rows are ignored. A unique key on
  \`(email, deleted_at)\` does not work, because NULLs never conflict with each
  other. SQL Server calls these filtered indexes; MySQL has none.
- **Expression.** An index on \`email\` cannot serve
  \`WHERE lower(email) = $1\`; the plan shows a Seq Scan with that filter.
  \`CREATE INDEX ON users (lower(email))\` can, as long as the query uses the
  same expression — or use the \`citext\` type.

**Why an index is ignored:** a function or cast on the column (including an
implicit cast from a parameter of a different type), a condition that matches a
large share of the table (a seq scan is then genuinely cheaper), stale
statistics, or a leading-wildcard \`LIKE\`. Having a primary key has nothing to
do with it. Always confirm with \`EXPLAIN ANALYZE\`.

## Other tools worth knowing

- **Views** are saved queries, recomputed on every read. **Materialised views**
  store the result: \`REFRESH MATERIALIZED VIEW CONCURRENTLY dash\` rebuilds it
  while readers keep using the old contents (it needs a unique index on the
  view). A dashboard over 50M rows that tolerates 5 minutes of staleness is the
  textbook case.
- **Full-text search**: \`to_tsvector\` and \`to_tsquery\` with a GIN index cover
  "search inside text" far better than \`LIKE '%word%'\`; \`pg_trgm\` handles
  fuzzy and infix matching.
- **JSONB operators**: \`->\` returns JSON, \`->>\` returns text, \`@>\` tests
  containment (and can use a GIN index).
`,
  },
  {
    id: 'data-scale',
    trackId: 'data',
    title: 'Concurrency, pooling and scaling the database',
    blurb:
      'Isolation levels and locks, deadlocks, connection limits, read replicas, partitioning, and migrations on huge tables.',
    estMinutes: 35,
    objectives: [
      'Name the isolation levels and the anomaly each one allows',
      'Choose between a constraint, an atomic update, optimistic versioning and `SELECT … FOR UPDATE`',
      'Explain replication lag and how to give users read-your-writes',
      'Plan a backfill or index build on a 100M-row table without an outage',
    ],
    primer: `
Examples are Postgres unless a line says otherwise; the ideas carry over to
MySQL and SQL Server with different defaults, which are called out.

## Isolation levels and anomalies

Concurrent transactions can see each other's work in surprising ways. The
standard names the anomalies:

| Anomaly | What happens |
| --- | --- |
| Dirty read | you see another transaction's uncommitted change |
| Non-repeatable read | you read a row twice and get different values, because someone committed in between |
| Phantom | you run the same query twice and new rows appear |
| Lost update | two read-modify-write cycles overlap and one overwrites the other |
| Write skew | two transactions each check a condition, both pass, and together they break it |

The levels, weakest to strongest, are **Read Uncommitted, Read Committed,
Repeatable Read, Serializable**. Each forbids more anomalies and costs more
concurrency or retries.

Defaults differ, and interviewers ask: **Postgres and SQL Server default to Read
Committed; MySQL InnoDB defaults to Repeatable Read.** Postgres treats Read
Uncommitted as Read Committed, its Repeatable Read is snapshot isolation (no
phantoms, but write skew is possible), and its Serializable detects dangerous
patterns and aborts one transaction with a serialization failure (SQLSTATE
\`40001\`) that you must retry.

**MVCC in one paragraph.** Postgres never overwrites a row in place; an update
writes a new row version, and each transaction reads from a *snapshot* of which
versions were committed. Readers never block writers and writers never block
readers. Under Read Committed, each *statement* takes a fresh snapshot, so if T2
commits between two of T1's \`SELECT\`s, T1's second read sees the new value.
Under Repeatable Read the whole *transaction* uses its first snapshot. Old
versions are cleaned up by \`VACUUM\`.

## Locks

Writes take row locks automatically: two \`UPDATE\`s of the same row serialise,
and in Read Committed the second one re-reads the latest version before applying
its change. That is why this is safe:

\`\`\`sql
UPDATE products SET stock = stock - 1 WHERE id = $1 AND stock > 0;
\`\`\`

- \`SELECT ... FOR UPDATE\` locks rows you intend to change later in the
  transaction (pessimistic locking).
- \`NOWAIT\` fails immediately instead of waiting; \`SKIP LOCKED\` skips locked
  rows, which is how you build a job queue on a table.
- Advisory locks (\`pg_advisory_xact_lock(key)\`) lock an application-defined
  number, for "only one worker runs this job".
- \`SET lock_timeout = '5s'\` bounds how long a statement waits for a lock,
  which matters most for DDL (see below).

## Deadlocks

T1 locks row A then wants B; T2 locks B then wants A. Neither can proceed.
Postgres checks for cycles after \`deadlock_timeout\` (1 second by default),
aborts one transaction with SQLSTATE \`40P01\`, and lets the other finish. The
fixes: **lock rows in a consistent order** (for example, update accounts by
ascending id), keep transactions short, and retry the victim, because deadlocks
can never be ruled out completely. Raising the timeout changes nothing but the
wait.

## Choosing a concurrency strategy

In order of preference:

1. **A constraint.** Double booking is prevented by
   \`UNIQUE (room_id, slot)\`; the second insert fails with SQLSTATE \`23505\`,
   which you return as \`409 Conflict\`. For time ranges, an exclusion
   constraint (\`EXCLUDE USING gist (room_id WITH =, during WITH &&)\`, with the
   \`btree_gist\` extension) forbids overlaps. "Check, then insert" in
   application code races: both requests see no booking and both insert.
2. **An atomic statement.** Do the arithmetic in the \`UPDATE\` with a guard in
   the \`WHERE\`, then check the affected row count. \`UPDATE 0\` (a
   \`rowCount\` of 0 in node-postgres) is not an error; it means the guard
   failed — out of stock, or no such row — and the API must answer 409 or 404,
   not 200.
3. **Optimistic versioning.** A \`version\` column checked in the \`WHERE\` for
   edits that span user think-time (covered in *Schema, indexes, transactions
   and ORMs*).
4. **Pessimistic locks.** \`SELECT ... FOR UPDATE\` when a multi-step decision
   must see stable rows.

Read-modify-write in application code (\`SELECT stock\`, compute, \`UPDATE SET
stock = 4\`) is the lost update, and wrapping it in a Read Committed transaction
does not fix it.

## Connections and pooling

Each Postgres connection is a separate server process with its own memory, and
\`max_connections\` defaults to 100. Twenty app instances with a pool of 20
each is 400 connections, which a default server refuses. Keep pools small
(often under ten per instance; more connections than CPU cores rarely helps),
and put a pooler such as PgBouncer in front when you have many app instances or
serverless functions.

PgBouncer's **transaction mode** gives your client a server connection only for
the duration of one transaction; the next transaction may run on another. That
breaks anything tied to the session: \`SET\` without \`LOCAL\`, session-level
advisory locks, \`LISTEN\`, temporary tables. Named prepared statements
historically broke too; PgBouncer 1.21+ can track protocol-level prepared
statements (\`max_prepared_statements\`), but SQL-level \`PREPARE\` still
does not survive.

## Read replicas

A replica replays the primary's write-ahead log. With the default
**asynchronous** replication:

- Replicas scale **reads**; every write still goes to the primary, so they do
  nothing for write throughput or write lock contention.
- Reads can be stale by milliseconds, or minutes under load.
- A replica can be promoted on failover, but transactions committed on the
  primary that had not reached it are lost. Synchronous replication closes that
  gap at the cost of commit latency.

The classic bug: a user saves, is redirected, and sees old data because the
read went to a lagging replica. The fix is **read-your-writes**: route that
user's reads to the primary for a few seconds after they write (a flag in the
session), or wait until the replica has replayed past the write's WAL position.
A fixed sleep fails whenever lag exceeds it.

## Growing tables

Scale in this order: fix queries and indexes → a bigger instance → caching and
read replicas → partitioning → sharding. **Sharding is the last resort**,
because cross-shard joins, transactions and reports become your problem forever,
and one well-tuned Postgres server outgrows most CRUD apps' needs.

**Partitioning** splits one logical table into child tables by a key, usually
time (declarative partitioning, Postgres 10+):

\`\`\`sql
CREATE TABLE events (id bigint, created_at timestamptz, payload jsonb)
  PARTITION BY RANGE (created_at);
CREATE TABLE events_2024_05 PARTITION OF events
  FOR VALUES FROM ('2024-05-01') TO ('2024-06-01');
\`\`\`

Retention becomes \`DETACH PARTITION\` (\`CONCURRENTLY\` in 14+) and \`DROP
TABLE\` — a metadata change — instead of a \`DELETE\` of millions of rows that
floods the WAL and bloats the table. Queries filtering on \`created_at\` skip
irrelevant partitions (pruning).

## Operations at size

- **Indexes.** \`CREATE INDEX\` blocks writes for the whole build.
  \`CREATE INDEX CONCURRENTLY\` does not; it is slower, cannot run inside a
  transaction block (tell your migration tool), and a failure leaves an
  \`INVALID\` index you must drop and retry.
- **Backfills.** Never one giant \`UPDATE\` of 100M rows: it locks every row it
  touches for its whole duration, floods replicas with WAL, bloats the table, and
  a failure at 90% rolls it all back. Update in batches by primary-key range
  (a few thousand rows each), commit each batch, throttle when replica lag
  climbs, record progress so the job can resume, and run it as a separate job
  rather than inside the deploy migration.
- **DDL and lock timeouts.** An \`ALTER TABLE\` waiting for its exclusive
  lock behind one long query blocks every query that arrives after it. Set
  \`lock_timeout\` so the migration fails fast and retries instead.
- **Backups.** A backup you have never restored is a hope. Know your **RPO**
  (how much data you can lose: nightly dumps mean up to 24 hours) and **RTO**
  (how long a restore takes). Point-in-time recovery — base backups plus
  archived WAL, or a managed service's PITR — brings RPO down to minutes. Keep
  copies away from the server they protect, and run restore drills on a
  schedule.
`,
  },
];
