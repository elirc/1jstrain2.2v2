/**
 * Modules for stages 6 and 7: C#, ASP.NET Core / EF Core, and the craft topics
 * (git, testing, security, shipping) that separate a junior from a mid-level
 * engineer in an interview.
 */

/** @type {import('../types.d.ts').Module[]} */
export const stage67Modules = [
  {
    id: 'cs-basics',
    trackId: 'csharp',
    title: 'C# for people who know JavaScript',
    blurb: 'Value vs reference types, nullable reference types, strings, collections and records.',
    estMinutes: 30,
    objectives: [
      'Explain value vs reference types and where each lives',
      'Say what `string?` actually changes',
      'Pick the right collection type for a job',
      'Explain what a record gives you that a class does not',
    ],
    primer: `
## The mental shift from JavaScript

C# is statically typed, compiled to IL and JIT-compiled at runtime, garbage
collected, and object-oriented by default. Types are **real at runtime** —
unlike TypeScript, you can ask an object what it is, and generics keep their
type arguments (reified generics). That single difference explains a lot of the
API design.

## Value types vs reference types

**Value types** (\`int\`, \`double\`, \`bool\`, \`char\`, \`decimal\`,
\`DateTime\`, any \`struct\`, any \`enum\`) are copied on assignment.
**Reference types** (\`class\`, \`string\`, arrays, delegates, \`object\`) copy
the reference. Pass a \`List<T>\` to a method and the method can add to your
list; pass an \`int\` and it cannot change your variable.

\`string\` is a reference type but is **immutable** and has value equality
(\`==\` compares characters), which is why it feels like a value type. Building
a string in a loop with \`+=\` allocates a new string each iteration — use
\`StringBuilder\`.

Boxing is wrapping a value type in an object to store it as \`object\`; it
allocates, and it is why generics were added.

## Nullable

\`int?\` is \`Nullable<int>\` — a real type with \`HasValue\`/\`Value\`.
**Nullable reference types** (\`string?\`, enabled by default in new projects)
are different: purely a compile-time analysis, like TypeScript's
\`strictNullChecks\`. \`string\` means "should never be null" and the compiler
warns when you break the promise, but nothing stops a null arriving at runtime
from an old library or deserialisation.

Useful operators: \`?.\` (null-conditional), \`??\` (null-coalescing),
\`??=\`, and \`!\` (null-forgiving — the same "trust me" as TypeScript).

## Collections

| Need | Use |
| --- | --- |
| Ordered, resizable list | \`List<T>\` |
| Key → value | \`Dictionary<TKey, TValue>\` |
| Uniqueness / set ops | \`HashSet<T>\` |
| Read-only contract | \`IReadOnlyList<T>\`, \`IEnumerable<T>\` |
| Fixed size, fast | \`T[]\` |

Declare parameters as the **narrowest interface** that works —
\`IEnumerable<T>\` if you only iterate — so callers are not forced into a
concrete type.

## Classes, structs and records

\`class\` = reference type, reference equality by default. \`struct\` = value
type, for small immutable things. \`record\` (C# 9) is a reference type with
**value equality**, a generated \`ToString\`, deconstruction and \`with\`
expressions for non-destructive copies — which makes it the natural choice for
DTOs and API models:

\`\`\`csharp
public record OrderDto(Guid Id, string Status, decimal Total);
var cancelled = order with { Status = "cancelled" };
\`\`\`

## Syntax you will meet immediately

Auto-properties (\`public string Name { get; set; }\`), \`init\` for
set-once properties, \`var\` for inferred locals (still statically typed),
expression-bodied members (\`=>\`), string interpolation
(\`$"Hello {name}"\`), \`switch\` expressions with pattern matching,
\`is not null\`, top-level statements in \`Program.cs\`, and file-scoped
namespaces. \`decimal\` — not \`double\` — for money.
`,
  },
  {
    id: 'cs-oop',
    trackId: 'csharp',
    title: 'Types, interfaces and exceptions',
    blurb: 'Classes, interfaces vs abstract classes, generics, exceptions and IDisposable.',
    estMinutes: 25,
    objectives: [
      'Choose between an interface and an abstract class with a reason',
      'Explain `virtual`/`override` vs `new`',
      'Say when to catch an exception and when not to',
      'Explain what `using` does and why it exists',
    ],
    primer: `
## Interfaces vs abstract classes

An **interface** is a contract with no state; a type can implement many. An
**abstract class** is a partial implementation with fields, constructors and
shared behaviour; a type inherits exactly one. Rule of thumb: interface for
"can do" (\`IDisposable\`, \`IOrderRepository\`), abstract class for "is a"
with genuinely shared code. Modern C# allows default interface methods, but
using them to share behaviour is usually a design smell.

Interfaces are also what makes dependency injection and unit testing work: your
service depends on \`IOrderRepository\`, and the test passes a fake.

## Inheritance mechanics

A method is only polymorphic if it is \`virtual\` (or \`abstract\`) in the base
and \`override\` in the derived class. \`new\` **hides** instead of overriding —
so calling through a base-typed reference runs the base version, which is nearly
always a bug. \`sealed\` prevents further inheritance. Favour composition over
inheritance; deep hierarchies are the classic C# code-review complaint.

## Generics

Real at runtime, and constrained with \`where\`:

\`\`\`csharp
public class Repository<T> where T : class, IEntity, new()
{
    public T? FindById(Guid id) => /* ... */;
}
\`\`\`

Constraints: \`class\`, \`struct\`, \`new()\`, a base class, an interface,
\`notnull\`. Generic *variance*: \`IEnumerable<out T>\` is covariant, so an
\`IEnumerable<Dog>\` is an \`IEnumerable<Animal>\`; \`List<T>\` is invariant,
because you could add a \`Cat\`.

## Exceptions

Throw for exceptional conditions, not for control flow — they are expensive and
they hide intent. Catch only what you can actually handle, catch the **specific**
type, and let the rest bubble to a global handler.

\`\`\`csharp
try { /* ... */ }
catch (HttpRequestException ex) { logger.LogWarning(ex, "upstream failed"); throw; }
finally { /* always runs */ }
\`\`\`

\`throw;\` rethrows and **preserves the original stack trace**; \`throw ex;\`
resets it and destroys your debugging information. That is a favourite interview
question. Common types: \`ArgumentNullException\`,
\`ArgumentOutOfRangeException\`, \`InvalidOperationException\`,
\`NotImplementedException\`. Define your own for domain errors and translate
them to HTTP status codes in one place.

## IDisposable and \`using\`

The garbage collector handles memory, but not file handles, sockets or database
connections. \`IDisposable.Dispose()\` releases those deterministically, and
\`using\` calls it for you even if an exception is thrown:

\`\`\`csharp
using var conn = new SqlConnection(cs);   // disposed at end of scope
\`\`\`

\`IAsyncDisposable\` + \`await using\` is the async version. Forgetting to
dispose \`HttpClient\` is the famous exception: you should **reuse** one (via
\`IHttpClientFactory\`), because creating one per request exhausts sockets.
`,
  },
  {
    id: 'cs-linq-async',
    trackId: 'csharp',
    title: 'LINQ, IQueryable and async/await',
    blurb: 'Deferred execution, IEnumerable vs IQueryable, Task, and the async mistakes that deadlock.',
    estMinutes: 30,
    objectives: [
      'Write the LINQ equivalent of map/filter/reduce',
      'Explain deferred execution and when a query actually runs',
      'Explain the difference between IEnumerable and IQueryable in EF',
      'Say why `.Result` is dangerous and what to do instead',
    ],
    primer: `
## LINQ is map/filter/reduce with different names

| JavaScript | LINQ |
| --- | --- |
| \`map\` | \`Select\` |
| \`filter\` | \`Where\` |
| \`reduce\` | \`Aggregate\` |
| \`find\` | \`FirstOrDefault\` |
| \`some\` / \`every\` | \`Any\` / \`All\` |
| \`flatMap\` | \`SelectMany\` |
| \`sort\` | \`OrderBy\` / \`ThenBy\` |
| \`length\` | \`Count()\` |

\`\`\`csharp
var top = orders
    .Where(o => o.Status == "paid")
    .GroupBy(o => o.CustomerId)
    .Select(g => new { CustomerId = g.Key, Total = g.Sum(o => o.Total) })
    .OrderByDescending(x => x.Total)
    .Take(10)
    .ToList();
\`\`\`

\`First\` throws when empty, \`FirstOrDefault\` returns \`null\`/default;
\`Single\` throws if there is more than one, which is a useful assertion when a
result must be unique.

## Deferred execution

A LINQ query is a **description**, not a result. Nothing runs until you
enumerate it — \`ToList()\`, \`ToArray()\`, \`Count()\`, \`First()\`, or a
\`foreach\`. Two consequences worth knowing: the query sees the data as it is at
enumeration time (change the source in between and the result changes), and
enumerating the same query twice runs it twice — including twice against the
database.

## IEnumerable vs IQueryable

\`IEnumerable<T>\` works over objects in memory with delegates.
\`IQueryable<T>\` builds an **expression tree** that a provider (EF Core)
translates into SQL. The difference is a real production bug:

\`\`\`csharp
db.Orders.Where(o => o.Total > 100)          // IQueryable -> SQL WHERE. Good.
db.Orders.ToList().Where(o => o.Total > 100) // pulls the whole table, filters in C#. Bad.
\`\`\`

Once you call \`AsEnumerable()\`/\`ToList()\`, every later operator runs
in memory. And anything EF cannot translate (a call to your own C# method inside
\`Where\`) either throws or silently forces client-side evaluation.

## Task and async/await

\`Task\` is roughly a promise; \`Task<T>\` carries a result. \`async\`/\`await\`
reads like JavaScript, with real differences:

- \`await\` frees the thread back to the pool — it is about **throughput**, not
  background threads. The point is serving more requests, not going faster.
- Make it async **all the way down**. Blocking with \`.Result\` or
  \`.Wait()\` can deadlock in contexts with a synchronization context, and
  wastes a thread everywhere else.
- \`async void\` is only for event handlers; its exceptions cannot be caught and
  crash the process. Return \`Task\` instead.
- \`Task.WhenAll(t1, t2)\` is \`Promise.all\`; \`Task.WhenAny\` is \`race\`.
- Pass a \`CancellationToken\` through and honour it — ASP.NET Core gives you
  one that fires when the client disconnects.
- \`ConfigureAwait(false)\` in library code avoids capturing the context; it is
  unnecessary in ASP.NET Core, which has no synchronization context.

An \`async\` method that never awaits runs synchronously and the compiler warns
you. Naming convention: suffix async methods with \`Async\`.
`,
  },
  {
    id: 'net-aspnet',
    trackId: 'dotnet',
    title: 'ASP.NET Core: the request pipeline',
    blurb: 'Minimal APIs vs controllers, routing, model binding, middleware, filters and results.',
    estMinutes: 30,
    objectives: [
      'Describe the middleware pipeline and why order matters',
      'Write a minimal API endpoint and the controller equivalent',
      'Explain model binding and where validation happens',
      'Return the right IResult/ActionResult for each CRUD outcome',
    ],
    primer: `
## Program.cs

Since .NET 6 there is one file: build services, build the app, register
middleware, run.

\`\`\`csharp
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDbContext<AppDb>(o => o.UseSqlite(builder.Configuration.GetConnectionString("Default")));
builder.Services.AddScoped<IOrderService, OrderService>();

var app = builder.Build();
app.UseExceptionHandler("/error");
app.UseHttpsRedirection();
app.UseCors("spa");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();
\`\`\`

## The pipeline

Middleware is a chain of delegates. Each may act on the request, call
\`next()\`, and then act on the response on the way back out — so it is nested,
not linear. **Order matters**: \`UseAuthentication\` must precede
\`UseAuthorization\`, and \`UseCors\` must come before anything that responds.
Middleware that never calls \`next\` short-circuits the pipeline, which is what
\`UseStaticFiles\` does for a match.

## Minimal APIs vs controllers

\`\`\`csharp
app.MapGet("/api/orders/{id:guid}", async (Guid id, IOrderService svc) =>
    await svc.FindAsync(id) is { } o ? Results.Ok(o) : Results.NotFound());
\`\`\`

Minimal APIs are less ceremony and are excellent for small services.
Controllers give you attribute routing, filters, model-state validation and
conventions that scale better across a large team. Both use the same DI,
binding and pipeline; the choice is style, and saying that is the right answer.

## Model binding

The framework maps the request onto your parameters: route values, query string,
headers, and the body (JSON by default). \`[FromBody]\`, \`[FromQuery]\`,
\`[FromRoute]\`, \`[FromServices]\` make it explicit. \`[ApiController]\` on a
controller turns on automatic \`400\` responses for invalid model state, infers
\`[FromBody]\` for complex types, and requires attribute routing.

Bind to a **DTO/request record**, not to your EF entity, or you get
over-posting: a client sends \`{"isAdmin":true}\` and the binder happily sets it.

## Validation

Data annotations (\`[Required]\`, \`[StringLength]\`, \`[Range]\`,
\`[EmailAddress]\`) or FluentValidation. With \`[ApiController]\`, failures
return an RFC 7807 \`ProblemDetails\` payload automatically — which is the
standard error shape to reach for, rather than inventing your own.

## Returning results

\`Results.Ok(dto)\`, \`Results.Created($"/api/orders/{id}", dto)\`,
\`Results.NoContent()\`, \`Results.NotFound()\`, \`Results.BadRequest(problem)\`,
\`Results.Problem()\` — in controllers, \`Ok()\`, \`CreatedAtAction()\`,
\`NoContent()\`, \`NotFound()\`. Use \`ActionResult<T>\` so you get both the
type and the status flexibility. Handle exceptions centrally with
\`UseExceptionHandler\` or an \`IExceptionHandler\`, not with try/catch in every
action.
`,
  },
  {
    id: 'net-di-config',
    trackId: 'dotnet',
    title: 'Dependency injection, configuration, logging',
    blurb: 'Service lifetimes, the options pattern, configuration precedence, secrets and logging.',
    estMinutes: 25,
    objectives: [
      'Name the three service lifetimes and pick correctly',
      'Explain the captive dependency problem',
      'Say where configuration comes from and which source wins',
      'Explain why you should not put secrets in appsettings.json',
    ],
    primer: `
## Dependency injection

DI is built into ASP.NET Core, not an add-on. You register an implementation
against an interface and the framework constructs your class for you —
constructor injection is the default and the one to use.

\`\`\`csharp
builder.Services.AddScoped<IOrderService, OrderService>();
public class OrdersController(IOrderService orders) : ControllerBase { }
\`\`\`

The payoff is testability (pass a fake) and swapping implementations per
environment.

## Lifetimes

| Lifetime | One instance per | Use for |
| --- | --- | --- |
| \`Singleton\` | application | caches, stateless helpers, config |
| \`Scoped\` | HTTP request | \`DbContext\`, repositories, per-request state |
| \`Transient\` | every injection | cheap, stateless, short-lived |

The trap is the **captive dependency**: inject a Scoped \`DbContext\` into a
Singleton and it is captured for the app's lifetime, giving you a shared,
non-thread-safe context and stale data. The container detects some of these at
startup in development. Inject \`IServiceScopeFactory\` and create a scope when a
singleton (or a background service) needs scoped work.

## Configuration

Sources are layered, and **later sources win**: \`appsettings.json\` →
\`appsettings.{Environment}.json\` → user secrets (Development) → environment
variables → command line. Nested keys flatten with \`:\` — or \`__\` in
environment variables, which is what you use in Docker and CI.

Read it with the **options pattern** rather than string lookups:

\`\`\`csharp
builder.Services.Configure<StripeOptions>(builder.Configuration.GetSection("Stripe"));
public class PaymentService(IOptions<StripeOptions> options) { }
\`\`\`

\`IOptions\` is a singleton snapshot; \`IOptionsSnapshot\` is per-request and
picks up changes; \`IOptionsMonitor\` notifies on change.

\`ASPNETCORE_ENVIRONMENT\` (\`Development\`/\`Staging\`/\`Production\`) drives
which files load and whether you get the developer exception page.

## Secrets

Never commit them. Local development uses \`dotnet user-secrets\`, which stores
them outside the repository; production uses environment variables or a vault
(Azure Key Vault, AWS Secrets Manager). Connection strings with passwords in
\`appsettings.json\` are the most common finding in a .NET code review.

## Logging

\`ILogger<T>\` is injected and writes to configured providers (console, Seq,
Application Insights). Use **structured** logging — the message template with
named placeholders, not string interpolation — so fields are queryable:

\`\`\`csharp
logger.LogInformation("Order {OrderId} shipped to {Country}", id, country);  // yes
logger.LogInformation($"Order {id} shipped");                                // no
\`\`\`

Levels: Trace, Debug, Information, Warning, Error, Critical — filtered by
configuration per namespace. Never log passwords, tokens or full card numbers.
`,
  },
  {
    id: 'net-efcore',
    trackId: 'dotnet',
    title: 'Entity Framework Core',
    blurb: 'DbContext, change tracking, migrations, relationships, loading strategies and N+1.',
    estMinutes: 30,
    objectives: [
      'Explain what change tracking does and when to turn it off',
      'Choose between eager, explicit and lazy loading',
      'Write and apply a migration',
      'Spot the EF code that will generate a bad query',
    ],
    primer: `
## DbContext

A \`DbContext\` is a unit of work plus a set of repositories (\`DbSet<T>\`). It
is **not thread-safe** and is registered as \`Scoped\` — one per request,
disposed at the end. Reusing one across requests or awaiting two queries on the
same context concurrently is a real bug that produces confusing errors.

\`\`\`csharp
public class AppDb(DbContextOptions<AppDb> options) : DbContext(options)
{
    public DbSet<Order> Orders => Set<Order>();
    protected override void OnModelCreating(ModelBuilder b) { /* fluent config */ }
}
\`\`\`

## Change tracking

EF snapshots every entity it returns and works out the UPDATE for you when you
call \`SaveChangesAsync()\` — one call, wrapped in a transaction. That is
convenient and it costs memory and CPU. For read-only queries use
\`AsNoTracking()\`; on a list endpoint it is a measurable win and it is the
first thing a reviewer looks for.

\`SaveChangesAsync\` is where the SQL happens; before that, nothing is written.

## Loading related data

- **Eager**: \`.Include(o => o.Items).ThenInclude(i => i.Product)\` — one query
  with joins. The default choice.
- **Explicit**: \`context.Entry(order).Collection(o => o.Items).LoadAsync()\`
  when you decide later.
- **Lazy**: proxies load on property access — convenient and the classic cause
  of **N+1**, because a loop over 50 orders quietly issues 50 more queries.

Best of all, project straight to a DTO so only the columns you need leave the
database:

\`\`\`csharp
var dto = await db.Orders
    .AsNoTracking()
    .Where(o => o.CustomerId == id)
    .Select(o => new OrderDto(o.Id, o.Status, o.Items.Count))
    .ToListAsync();
\`\`\`

## Queries that go wrong

\`Where\` before \`ToListAsync\` filters in SQL; after it, in memory. Calling
your own C# method inside a \`Where\` cannot be translated. \`.Include\` on a
big graph produces a cartesian explosion —
\`AsSplitQuery()\` fixes it. Always paginate with \`Skip\`/\`Take\` and an
\`OrderBy\` (paging without a deterministic order is undefined).

## Migrations

\`\`\`bash
dotnet ef migrations add AddOrderStatus
dotnet ef database update
\`\`\`

A migration is generated C# with \`Up\` and \`Down\`, committed to the
repository. Review the generated SQL before shipping — EF will happily write a
column drop that loses data. In production, apply migrations as a deliberate
deploy step (\`dotnet ef database update\` or a migration bundle), not with
\`Database.Migrate()\` on startup in a multi-instance environment, where several
instances race.

## Relationships and concurrency

EF infers relationships from navigation properties and conventions
(\`CustomerId\` + \`Customer\`), and you refine them with the fluent API
(\`HasMany/WithOne\`, \`OnDelete\`, \`HasIndex\`, \`IsRequired\`). Add a
\`[Timestamp]\`/\`IsRowVersion()\` column and EF checks it in the UPDATE's
\`WHERE\`, throwing \`DbUpdateConcurrencyException\` if someone else changed the
row — optimistic concurrency for free.
`,
  },
  {
    id: 'craft-git',
    trackId: 'craft',
    title: 'Git in a team',
    blurb: 'Branching, merge vs rebase, conflicts, undoing mistakes and pull requests.',
    estMinutes: 25,
    objectives: [
      'Explain merge vs rebase and when each is appropriate',
      'Resolve a conflict without panicking',
      'Undo a commit safely on a shared branch',
      'Write a commit message and a PR a reviewer thanks you for',
    ],
    primer: `
## The model

Git stores snapshots. A commit points at a tree plus its parents; a branch is
just a moving pointer to a commit; \`HEAD\` points at your current branch. Three
places to keep straight: **working directory** → \`git add\` → **staging area**
→ \`git commit\` → **repository**.

## Everyday flow

\`\`\`bash
git switch -c feature/order-filters
git add -p                       # stage hunks, review as you go
git commit -m "Filter orders by status"
git fetch origin
git rebase origin/main           # replay your commits on top of latest main
git push -u origin feature/order-filters --force-with-lease
\`\`\`

## Merge vs rebase

**Merge** creates a commit with two parents; history is true but noisy.
**Rebase** rewrites your commits onto a new base; history is linear and readable
but the commits are *new objects*. The rule: **never rebase a branch other
people have pulled**. Rebase your own feature branch to stay current, merge (or
squash-merge) into \`main\`.

\`--force-with-lease\` instead of \`--force\` refuses to push if someone else
has pushed since you last fetched. Use it every time.

## Conflicts

A conflict is Git telling you two commits changed the same lines and it will not
guess. Open the file, resolve between the markers, \`git add\` it, then
\`git rebase --continue\` or \`git commit\`. \`git merge --abort\` /
\`git rebase --abort\` always gets you back to safety.

## Undo, by situation

| Situation | Command |
| --- | --- |
| Unstage a file | \`git restore --staged file\` |
| Discard local changes | \`git restore file\` |
| Fix the last commit (not pushed) | \`git commit --amend\` |
| Undo last commit, keep changes | \`git reset --soft HEAD~1\` |
| Undo a **pushed** commit | \`git revert <sha>\` |
| Park work | \`git stash\` / \`git stash pop\` |
| "I destroyed everything" | \`git reflog\` |

\`reset --hard\` on shared history rewrites what others have; \`revert\` adds a
new commit that undoes the change and is the safe public option. \`reflog\`
remembers where HEAD has been for ~90 days and has saved everyone at least once.

## Pull requests

Small, single-purpose, with a description of *why*. Imperative-mood subject
under ~50 characters, body explaining context and trade-offs, and a link to the
ticket. Conventional Commits (\`feat:\`, \`fix:\`, \`chore:\`) let tooling
generate changelogs. As a reviewer, comment on correctness and clarity, ask
questions rather than issue orders, and approve when it is *better*, not when it
is perfect.

Also worth knowing: \`git bisect\` to binary-search for the commit that broke
something, \`git cherry-pick\` to move one commit between branches,
\`git blame\` to find out who to ask, and \`.gitignore\` — plus the fact that
committing a secret means rotating it, because deleting it later does not remove
it from history.
`,
  },
  {
    id: 'craft-testing',
    trackId: 'craft',
    title: 'Testing a CRUD app',
    blurb: 'The pyramid, unit vs integration vs e2e, test doubles, and what is worth testing.',
    estMinutes: 25,
    objectives: [
      'Say what each layer of the pyramid buys you',
      'Distinguish a stub, a mock and a fake',
      'Explain why testing implementation details makes tests worse',
      'Decide what to test in a CRUD feature',
    ],
    primer: `
## The pyramid

Many fast **unit** tests (one function or component, no I/O), fewer
**integration** tests (several pieces together — a route with a real test
database), a few **end-to-end** tests (a browser driving the real app). The
shape is about cost and speed: e2e tests catch the most but are slow and flaky,
so you keep a handful covering the critical journeys — sign up, add to cart,
check out.

## Doubles

- **Stub** — returns canned data. "This repository returns these three orders."
- **Mock** — a stub you also assert on. "The email sender was called once."
- **Fake** — a working lightweight implementation. In-memory repository, SQLite
  instead of Postgres.
- **Spy** — wraps the real thing and records calls.

Over-mocking couples tests to structure: refactor the internals without changing
behaviour, and every test breaks while the app still works. Prefer fakes, and
mock at the *boundary* (the HTTP call, the clock, the payment provider).

## Test what a user can observe

\`\`\`js
// implementation detail — breaks on refactor
expect(wrapper.state('isOpen')).toBe(true);

// behaviour — survives refactors
await user.click(screen.getByRole('button', { name: /filters/i }));
expect(screen.getByRole('dialog')).toBeVisible();
\`\`\`

Testing Library queries by role, label and text on purpose: if your test cannot
find the element the way a user or a screen reader would, that is an
accessibility bug too. Query priority is role → label → placeholder → text →
test id, with \`data-testid\` as the escape hatch.

Structure each test **Arrange, Act, Assert**, name it after the behaviour
(\`returns 404 when the order belongs to another user\`), and keep tests
independent — order-dependent tests are a permanent tax.

## In a CRUD app, specifically

Worth testing: validation rules, authorisation ("another user's id returns
403/404"), the mapping between entity and DTO, pagination edges, error paths,
and any calculation (totals, discounts, dates). Not worth testing: that the
framework routes, that a getter gets, or snapshots of an entire page that
someone will update blindly the moment they fail.

For the API, spin up the app in-process (supertest, \`WebApplicationFactory\`)
against a real migrated test database, and reset state between tests with a
transaction rollback or a truncate.

## Coverage and CI

Coverage tells you what was executed, not what was verified — 100% coverage with
no assertions is possible. Use it to find untested areas, not as a target.
Tests run in CI on every push; a flaky test must be fixed or deleted, because a
suite people ignore is worse than no suite.

## TDD, briefly

Red → green → refactor. The value is less "testing" and more design pressure:
code that is hard to test is usually hard to use. You do not have to practise it
to answer the question, but you should be able to describe the loop.
`,
  },
  {
    id: 'craft-security',
    trackId: 'craft',
    title: 'Security for CRUD apps',
    blurb: 'Injection, XSS, CSRF, broken access control, secrets and dependency risk.',
    estMinutes: 25,
    objectives: [
      'Explain SQL injection and the one correct fix',
      'Explain XSS and how React helps and where it stops helping',
      'Describe broken access control with a concrete example',
      'List what you would check before shipping a login form',
    ],
    primer: `
## Broken access control

Consistently the top item on the OWASP list, and the one juniors miss. The bug
is checking *authentication* but not *ownership*:

\`\`\`js
// Anyone logged in can read anyone's order.
app.get('/api/orders/:id', requireAuth, (req, res) =>
  res.json(db.getOrder(req.params.id)));

// Scope every query by the owner.
db.getOrder({ id: req.params.id, userId: req.user.id });
\`\`\`

That is **IDOR**. Related: trusting a client-side role check, trusting a hidden
form field, or letting a client set \`isAdmin\` through mass assignment. Deny by
default, check on every request, on the server.

## Injection

Never build a query by concatenating input. Parameterised queries send the SQL
and the data separately, so the data can never become code:

\`\`\`js
db.query('SELECT * FROM users WHERE email = $1', [email]);   // safe
db.query(\`SELECT * FROM users WHERE email = '\${email}'\`);   // catastrophic
\`\`\`

ORMs parameterise for you — until you drop to raw SQL. The same logic applies to
shell commands, to \`LIKE\` patterns, and to any column name you interpolate
(whitelist those; they cannot be parameterised).

## XSS

Injected script running in your origin — it can read the DOM, your
\`localStorage\`, and act as the user. React escapes interpolated values by
default, so \`{userInput}\` is safe. What is not safe:
\`dangerouslySetInnerHTML\`, \`href={userInput}\` (\`javascript:\` URLs),
injecting into \`<script>\`, and rendering unsanitised HTML from a rich-text
editor (sanitise with DOMPurify). Add a Content-Security-Policy as the second
line of defence.

## CSRF

The victim's browser is tricked into sending an authenticated request, and it
works because cookies attach automatically. Defences: \`SameSite=Lax\` cookies,
an anti-forgery token, and checking \`Origin\`. APIs that authenticate with an
\`Authorization\` header are not CSRF-prone, because the header is not sent
automatically.

## Secrets and dependencies

Secrets live in environment variables or a vault, never in the repo, never in
the client bundle — anything in \`VITE_\`/\`NEXT_PUBLIC_\` is public. A secret
that was ever committed is compromised: rotate it. Keep dependencies patched
(\`npm audit\`, Dependabot); most real-world breaches of small apps come through
an outdated package or a leaked key rather than clever cryptography.

## The pre-ship checklist for a login form

HTTPS everywhere and HSTS; password hashed with bcrypt/Argon2; rate limiting and
lockout on repeated failures; identical error text for "no such user" and "wrong
password" (no user enumeration); session cookie \`HttpOnly; Secure;
SameSite=Lax\`; session regenerated on login; logout invalidates server side;
no tokens in URLs or logs; generic error pages in production so stack traces do
not leak.
`,
  },
  {
    id: 'craft-shipping',
    trackId: 'craft',
    title: 'Shipping and running it',
    blurb: 'Environments, CI/CD, Docker, logging, monitoring and debugging production.',
    estMinutes: 25,
    objectives: [
      'Describe a CI pipeline for this stack',
      'Explain what Docker solves',
      'Say what you would log and what you would alert on',
      'Walk through debugging "the site is slow" methodically',
    ],
    primer: `
## Environments

Development, staging, production — same code, different configuration, injected
from the environment. Anything that differs per environment (URLs, connection
strings, keys, feature flags) is config, and the front end's build-time
variables are baked into the bundle and therefore public.

## CI/CD

**CI** runs on every push: install with \`npm ci\` / \`dotnet restore\`, lint,
type-check, test, build. **CD** deploys the artefact that CI produced — the
same artefact through each environment, so you are not rebuilding on the way to
production. Keep the pipeline fast (cache dependencies, run jobs in parallel) or
people route around it, and make \`main\` always deployable.

Deployment strategies worth naming: blue/green (two environments, flip the
router), canary (a slice of traffic first), and rolling. Every one of them needs
a **rollback** you have actually tested, and database migrations that are
backwards-compatible for the window when both versions are live — expand,
migrate, contract.

## Docker, briefly

An image is a filesystem plus metadata built from a \`Dockerfile\`; a container
is a running instance. It solves "works on my machine" by shipping the runtime
with the app. Practical points: multi-stage builds (build with the SDK, run on a
slim runtime image), \`.dockerignore\` so \`node_modules\` and \`.git\` do not
bloat the context, order layers so dependency installation caches, do not run as
root, and pass configuration as environment variables. \`docker compose\` wires
your app to a database locally.

## Observability

**Logs** — structured JSON with a request id so one request is traceable across
services. **Metrics** — request rate, error rate, latency percentiles (p95/p99,
because the average hides the pain), CPU, memory, database connections.
**Traces** — where the time went across services. Alert on **symptoms users
feel** (error rate, latency, availability), not on every CPU spike, or people
learn to ignore alerts.

Health endpoints: liveness ("am I running") and readiness ("can I serve — is the
database reachable"). Wire up an error tracker (Sentry) with source maps so a
production stack trace is readable.

## Debugging production

Have a method rather than a hunch:

1. **What changed?** Deploys, config, feature flags, traffic, upstream.
2. **Scope it.** All users or some? All endpoints or one? When did it start?
3. **Follow the data.** Metrics for the shape, logs for the detail, traces for
   the layer.
4. **Form one hypothesis, test it, write down what you learn.**
5. **Mitigate first** (roll back, scale, disable the flag), fix properly after.
6. Afterwards, a blameless postmortem: timeline, root cause, what made it slow
   to detect, one or two concrete actions.

"The site is slow" is usually a database query without an index, an N+1, a
missing cache, a payload that grew, or a synchronous call blocking the loop —
check in that order before rewriting anything.
`,
  },
];
