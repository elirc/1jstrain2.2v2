/**
 * Modules — ASP.NET Core, DI/configuration and EF Core.
 *
 * One file per author, so parallel authors never touch the same file. Each
 * module carries a primer that covers everything its questions test. Primers
 * are markdown-lite — headings, lists, `code`, fenced blocks, tables, **bold**
 * and *italic*; validateContent() rejects anything the renderer cannot show.
 */

/** @type {import('../types.d.ts').Module[]} */
export const dotnetModules = [
  {
    id: 'net-aspnet',
    trackId: 'dotnet',
    title: 'ASP.NET Core: the request pipeline',
    blurb: 'Minimal APIs vs controllers, routing, model binding, middleware, filters and results.',
    estMinutes: 35,
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
builder.Services.AddDbContext<AppDb>(o =>
    o.UseSqlite(builder.Configuration.GetConnectionString("Default")));
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
\`WebApplication\` adds \`UseRouting\` at the start of the pipeline for you (and
\`UseEndpoints\` at the end); if you call \`UseRouting\` explicitly it must
precede authentication and authorisation so the endpoint's \`[Authorize]\`
metadata is known. Middleware that never calls \`next\` short-circuits the
pipeline, which is what \`UseStaticFiles\` does for a match.

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
return an RFC 9457 (formerly 7807) \`ProblemDetails\` payload automatically —
which is the standard error shape to reach for, rather than inventing your own.

## Returning results

\`Results.Ok(dto)\`, \`Results.Created($"/api/orders/{id}", dto)\`,
\`Results.NoContent()\`, \`Results.NotFound()\`, \`Results.BadRequest(problem)\`,
\`Results.Problem()\` — in controllers, \`Ok()\`, \`CreatedAtAction()\`,
\`NoContent()\`, \`NotFound()\`. Use \`ActionResult<T>\` so you get both the
type and the status flexibility. Handle exceptions centrally with
\`UseExceptionHandler\` or an \`IExceptionHandler\`, not with try/catch in every
action.

Filters run inside MVC in the order authorization → resource → action →
exception → result and, unlike middleware, see the action and its arguments.
There is no \`HttpContext.Current\`; inject \`IHttpContextAccessor\` or take
\`HttpContext\` as a parameter.

## Order in Program.cs

The file has a fixed shape: \`CreateBuilder\` → register services on
\`builder.Services\` → \`builder.Build()\` → middleware → endpoints → \`app.Run()\`.
After \`Build()\` the service collection is read-only and adding to it throws;
\`Run()\` blocks until shutdown, so nothing after it executes. Endpoint mappings
can sit anywhere between \`Build()\` and \`Run()\` because \`WebApplication\` runs
them at the end of the pipeline.

## Short-circuiting

A middleware that returns without calling \`next\` ends the request right there:
nothing after it runs, including the endpoint.

\`\`\`csharp
app.Use(async (ctx, next) =>
{
    if (!ctx.Request.Headers.ContainsKey("X-Api-Key"))
    {
        ctx.Response.StatusCode = 401;   // a complete response, empty body
        return;                          // the endpoint never runs
    }
    await next(ctx);
});
\`\`\`

That is the point of auth, static files and rate limiting — reject work
cheaply. The mirror-image bug is forgetting \`await next(ctx)\` on the happy path,
which turns every request into an empty \`200\`.

## Route groups

\`MapGroup\` (.NET 7+) gives a set of endpoints a shared prefix and shared
conventions. Everything you chain onto the group — \`RequireAuthorization\`,
\`AddEndpointFilter\`, \`RequireRateLimiting\`, \`WithTags\` — applies to each
endpoint mapped on it, and groups nest. It is endpoint metadata, not a separate
middleware branch.

\`\`\`csharp
var orders = app.MapGroup("/api/orders").RequireAuthorization();
orders.MapGet("/", ListOrders);
orders.MapGet("/{id:int}", GetOrder);
orders.MapPost("/", CreateOrder);
\`\`\`

One group per feature file is how a minimal API stays organised.

## TypedResults

\`Results.Ok(dto)\` returns \`IResult\`, which hides the status and body type.
\`TypedResults.Ok(dto)\` returns \`Ok<OrderDto>\`, which describes itself to
OpenAPI, so the 200 and its schema are documented without \`.Produces<T>()\`.
With several outcomes, make the union the return type and the compiler rejects
anything you did not declare:

\`\`\`csharp
static async Task<Results<Ok<OrderDto>, NotFound>> GetOrder(int id, AppDb db) =>
    await db.Orders.FindAsync(id) is { } o
        ? TypedResults.Ok(OrderDto.From(o))
        : TypedResults.NotFound();
\`\`\`

A unit test can call the handler directly and assert on the concrete type.
Runtime behaviour is identical; prefer \`TypedResults\` in new code.

## Centralised errors: IExceptionHandler and ProblemDetails

In .NET 8+ the idiom is three lines plus one class. Services throw domain
exceptions; one handler maps them to status codes.

\`\`\`csharp
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<DomainExceptionHandler>();
// ...
app.UseExceptionHandler();   // early, so it wraps everything that can throw

sealed class DomainExceptionHandler(IProblemDetailsService pds) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext ctx, Exception ex, CancellationToken ct)
    {
        if (ex is not NotFoundException) return false;   // let the next handler try
        ctx.Response.StatusCode = StatusCodes.Status404NotFound;
        return await pds.TryWriteAsync(new() { HttpContext = ctx });
    }
}
\`\`\`

Handlers run in registration order until one returns \`true\`. Log the full
exception with a trace id; the client sees only a safe title, the status and
that trace id.

## Endpoint filters and validation

Endpoint filters (.NET 7+) run after binding and before the handler, see the
typed arguments (\`context.GetArgument<T>(0)\`), and can short-circuit by
returning a result instead of calling \`next\`. They are the minimal-API
equivalent of action filters, and the natural home for validation.

This matters because **.NET 8 minimal APIs do not validate data annotations on
their own** — the automatic \`400\` is an \`[ApiController]\` feature, produced by
its \`ModelStateInvalidFilter\` with a \`ValidationProblemDetails\` body. In a
minimal API you add a filter, FluentValidation or a library such as
MiniValidation. .NET 10 adds built-in minimal-API validation, but only after
\`builder.Services.AddValidation()\`.

## Built-in middleware you should know

| Need | Built in | Registration |
| --- | --- | --- |
| Rate limiting | since .NET 7 | \`AddRateLimiter\` + \`UseRateLimiter\` |
| Output caching | since .NET 7 | \`AddOutputCache\` + \`UseOutputCache\` |
| Response compression | since 1.x | \`AddResponseCompression\` + \`UseResponseCompression\` |
| Problem Details | since .NET 7 | \`AddProblemDetails\` |

FluentValidation and Serilog are good packages, but they are packages. For rate
limiting, a limiter without a partition key is one bucket shared by everyone;
partition by API key or user, and set the rejection status yourself — the
default is \`503\`, and you want \`429\`.

\`\`\`csharp
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.AddPolicy("per-key", ctx => RateLimitPartition.GetFixedWindowLimiter(
        ctx.Request.Headers["X-Api-Key"].ToString(),
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 100, Window = TimeSpan.FromMinutes(1) }));
});
app.UseRateLimiter();
orders.RequireRateLimiting("per-key");
\`\`\`

Each instance counts on its own, so behind a load balancer with three instances
the effective limit triples unless the counter lives in a shared store.
`,
  },
  {
    id: 'net-di-config',
    trackId: 'dotnet',
    title: 'Dependency injection, configuration, logging',
    blurb: 'Service lifetimes, the options pattern, configuration precedence, secrets and logging.',
    estMinutes: 30,
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
logger.LogInformation("Order {OrderId} shipped to {Country}", id, country); // yes
logger.LogInformation($"Order {id} shipped");                               // no
\`\`\`

Levels: Trace, Debug, Information, Warning, Error, Critical — filtered by
configuration per namespace. Never log passwords, tokens or full card numbers.

## Multiple registrations and keyed services

Register the same interface twice and a constructor asking for one instance
gets the **last** registration; \`IEnumerable<T>\` gets all of them, in
registration order. Libraries use \`TryAddScoped\` and friends, which register
only if nothing is there yet, so your registration wins.

When the caller must pick an implementation by name, .NET 8 added keyed
services:

\`\`\`csharp
builder.Services.AddKeyedScoped<IPaymentGateway, StripeGateway>("stripe");
builder.Services.AddKeyedScoped<IPaymentGateway, PayPalGateway>("paypal");

public class Checkout([FromKeyedServices("stripe")] IPaymentGateway gateway) { }
\`\`\`

\`GetRequiredKeyedService<T>(key)\` resolves one in code. A plain
\`IPaymentGateway\` parameter does not see keyed registrations. When the key comes
from data at runtime, injecting \`IEnumerable<IPaymentGateway>\` and choosing by a
property is still a fine design.

## Scope validation

The default host turns on \`ValidateScopes\` and \`ValidateOnBuild\` **only in
Development**. A singleton that takes a scoped \`DbContext\` therefore throws at
\`builder.Build()\` on your machine, and starts happily in Production, where the
context is resolved from the root provider and lives for the whole app. Run CI
or tests in Development, or switch validation on everywhere:

\`\`\`csharp
builder.Host.UseDefaultServiceProvider(o => { o.ValidateScopes = true; o.ValidateOnBuild = true; });
\`\`\`

## Validating options at startup

\`\`\`csharp
builder.Services.AddOptions<SmtpOptions>()
    .BindConfiguration("Smtp")
    .ValidateDataAnnotations()
    .ValidateOnStart();
\`\`\`

Without \`ValidateOnStart()\`, validation is lazy: it runs the first time
something reads \`IOptions<SmtpOptions>.Value\`, possibly hours after the deploy.
With it, a missing \`Smtp:Host\` throws \`OptionsValidationException\` while the host
starts, the new instances never become ready, and a rolling deploy stops with
the old version still serving. Add \`.Validate(o => ..., "message")\` for rules
annotations cannot express.

## The environment and the full precedence list

\`ASPNETCORE_ENVIRONMENT\` (or the generic-host \`DOTNET_ENVIRONMENT\`; the
\`ASPNETCORE_\` one wins if both are set) names the environment. Unset, it is
\`Production\`. \`launchSettings.json\` sets it for \`dotnet run\` and is ignored in
deployments. In Development the default sources, lowest precedence first, are:

1. \`appsettings.json\`
2. \`appsettings.Development.json\`
3. user secrets
4. environment variables
5. command-line arguments

When a value "will not change", something higher up (usually an environment
variable in the container) is overriding it.

## IHttpClientFactory and resilience

\`new HttpClient()\` per call exhausts sockets under load; one static client
never sees DNS changes. \`IHttpClientFactory\` pools and recycles the underlying
handlers (every two minutes by default), gives you named and typed clients
configured in one place, and an outgoing \`DelegatingHandler\` pipeline. It adds
logging, but not caching and not retries.

\`\`\`csharp
builder.Services.AddHttpClient<PaymentsClient>(c => c.BaseAddress = new("https://api.payments.example"))
    .AddStandardResilienceHandler();
\`\`\`

\`AddStandardResilienceHandler\` (package \`Microsoft.Extensions.Http.Resilience\`,
.NET 8+, Polly v8) adds a rate limiter, a total timeout, retries with
exponential backoff and jitter, a circuit breaker and a per-attempt timeout.
Retrying "charge the card" is only safe with an idempotency key; otherwise turn
retries off for unsafe methods. The breaker matters as much as the retry: it
stops you hammering a dependency that is already down.
`,
  },
  {
    id: 'net-efcore',
    trackId: 'dotnet',
    title: 'Entity Framework Core',
    blurb: 'DbContext, change tracking, migrations, relationships, loading strategies and N+1.',
    estMinutes: 40,
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

\`FromSql\`/\`FromSqlInterpolated\` parameterise an interpolated string;
\`FromSqlRaw($"...{input}")\` is SQL injection. For genuinely parallel queries
use \`IDbContextFactory\` to get one context per operation. The tracker returns
the already-tracked instance for an id it has seen (identity resolution), which
surprises people writing tests. \`ExecuteUpdate\`/\`ExecuteDelete\` (EF Core 7+)
run set-based updates without loading entities.

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

## Find vs FirstOrDefault

\`FindAsync(id)\` checks the change tracker first and only queries when the key
is not tracked; \`FirstOrDefaultAsync(o => o.Id == id)\` always queries. \`Find\`
cannot be combined with \`Include\` or \`AsNoTracking\`.

## Bulk updates without loading

\`\`\`csharp
await db.Orders
    .Where(o => o.PlacedAt < cutoff)
    .ExecuteUpdateAsync(s => s
        .SetProperty(o => o.Archived, true)
        .SetProperty(o => o.UpdatedAt, now));
\`\`\`

One \`UPDATE ... WHERE\`, no entities loaded (EF Core 7+; EF Core 9 also accepts
complex-type properties). It bypasses the change tracker: tracked instances keep
stale values, \`SaveChanges\` interceptors do not run, concurrency tokens are not
checked, so set audit columns in the same call. \`ExecuteDeleteAsync\` is the twin.

## Cartesian explosion and split queries

Two sibling collection \`Include\`s in a single query multiply: 20 items × 10
payments is 200 rows per order. \`AsSplitQuery()\` sends one query per collection
(more round trips, no single snapshot outside a transaction), and
\`UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery)\` makes it the
default. EF logs a warning when it sees the pattern. Often a projection of just
the counts the page shows is better still.

## Global query filters

\`\`\`csharp
modelBuilder.Entity<Order>().HasQueryFilter(o => !o.IsDeleted && o.TenantId == _tenantId);
\`\`\`

The filter is added to every LINQ query for the type, including through
\`Include\`s; a query opts out with \`IgnoreQueryFilters()\`. It is the standard
soft-delete and multi-tenancy tool. It only filters reads: turning \`Remove\` into
a flag update is a job for an interceptor.

## Disconnected entities

\`db.Update(new Customer { Id = id, Name = dto.Name })\` marks **every** column
modified, so fields the DTO lacks are overwritten with defaults: silent data
loss. Load, apply, save instead: \`FindAsync\`, copy the DTO fields, and
\`SaveChangesAsync\` writes only what changed. To avoid the read, attach and flag
single properties with \`Entry(c).Property(x => x.Name).IsModified = true\`, or
use \`ExecuteUpdateAsync\`.

## The migrations workflow

1. Change the entity classes or \`OnModelCreating\`.
2. Run \`dotnet ef migrations add AddOrderNotes\`.
3. Review the generated \`Up\`/\`Down\` code and commit it with the model change.
4. In CI, build a bundle (\`dotnet ef migrations bundle\`) or an idempotent script (\`dotnet ef migrations script --idempotent\`).
5. Apply it as a deploy step, before the new code takes traffic.

\`dotnet ef\` is a dotnet tool (\`dotnet-ef\`) and needs
\`Microsoft.EntityFrameworkCore.Design\` in the startup project;
\`dotnet ef migrations remove\` deletes the last unapplied migration. Migrations
must stay compatible with the version still running during the rollout.

## Concurrency conflicts become 409

When a \`[Timestamp]\` row-version check fails, \`SaveChangesAsync\` throws
\`DbUpdateConcurrencyException\`. Return \`409 Conflict\` (or \`412\` if the client
sent \`If-Match\`) with the current values from
\`ex.Entries[0].GetDatabaseValuesAsync()\`. Blind retries fail again, because the
original value is still stale. On PostgreSQL, Npgsql can use the \`xmin\` system
column as the token.

## Transactions and execution strategies

One \`SaveChanges\` is atomic. Two calls, or \`SaveChanges\` plus \`ExecuteUpdate\`,
need an explicit transaction:

\`\`\`csharp
var strategy = db.Database.CreateExecutionStrategy();
await strategy.ExecuteAsync(async () =>
{
    await using var tx = await db.Database.BeginTransactionAsync();
    // SaveChangesAsync(), ExecuteUpdateAsync(), ...
    await tx.CommitAsync();
});
\`\`\`

With \`EnableRetryOnFailure\` the wrapper is mandatory: the strategy retries the
whole unit, and it throws on a user-initiated transaction outside one. Whether
reads inside a transaction lock rows depends on the isolation level and the
database, not on tracking.

## Raw SQL safely

\`FromSql($"... {email}")\` and \`ExecuteSql($"...")\` (EF Core 7+; the
\`...Interpolated\` names before that) turn each hole into a parameter.
\`FromSqlRaw\` with \`{0}\` placeholders and separate arguments is also safe;
\`FromSqlRaw\` with concatenation, or with an interpolated string, is injection.
Dynamic column names cannot be parameters: allowlist them.

## Owned and complex types

A value object such as \`Address\` maps into the owner's table with
\`OwnsOne(c => c.Address)\` or, in EF Core 8+, \`ComplexProperty(c => c.Address)\`.
Owned types have a hidden key and identity; complex types are pure values. In
EF Core 8 and 9 a complex type must be required and cannot be a collection, so
optional value objects stay owned. \`OwnsOne(..., b => b.ToJson())\` stores one
as a JSON column.

## Interceptors for audit columns

\`\`\`csharp
public sealed class AuditInterceptor(TimeProvider clock) : SaveChangesInterceptor
{
    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData e, InterceptionResult<int> result, CancellationToken ct = default)
    {
        foreach (var entry in e.Context!.ChangeTracker.Entries<IAuditable>())
            if (entry.State is EntityState.Added or EntityState.Modified)
                entry.Entity.UpdatedAt = clock.GetUtcNow();
        return base.SavingChangesAsync(e, result, ct);
    }
}
\`\`\`

Register it with \`AddInterceptors\`. It sees every \`SaveChanges\`, and nothing
that bypasses the tracker (\`ExecuteUpdate\`, \`ExecuteDelete\`, raw SQL).
`,
  },
  {
    id: 'net-auth',
    trackId: 'dotnet',
    title: 'Authentication and authorisation in ASP.NET Core',
    blurb:
      'Schemes, JWT bearer and cookies, claims and policies, resource-based checks, and the Identity pieces you should not rebuild.',
    estMinutes: 30,
    objectives: [
      'Explain authentication schemes and the difference between `UseAuthentication` and `UseAuthorization`',
      'Configure JWT bearer validation correctly',
      'Write policy-based and resource-based authorisation',
      'Decide between ASP.NET Core Identity and an external identity provider',
    ],
    primer: `
## The model

Authentication answers "who is this?"; authorisation answers "may they do
this?". ASP.NET Core keeps them in separate middleware.

- A **scheme** is a named authentication handler: \`Cookies\`, \`Bearer\`, or your own. The handler reads the request and produces a \`ClaimsPrincipal\`.
- \`app.UseAuthentication()\` runs the default scheme's handler and sets \`HttpContext.User\`. If nothing valid was sent, \`User\` is anonymous. It never rejects a request by itself.
- \`app.UseAuthorization()\` reads the selected endpoint's metadata (\`[Authorize]\`, \`RequireAuthorization\`, the fallback policy) and evaluates the policy against \`User\`.

When a policy fails, authorisation asks the scheme to **challenge** if the user
is anonymous and to **forbid** if they are signed in. JWT bearer renders those
as \`401\` (with \`WWW-Authenticate: Bearer\`) and \`403\`. Cookie auth renders them
as redirects to the login and access-denied pages, which is why an API behind
cookie auth "returns HTML" until you override those events.

The order in the default \`WebApplication\` pipeline is fixed: routing selects
the endpoint, authentication builds \`User\`, authorisation evaluates the
endpoint's policy, the endpoint runs. Since .NET 7, \`WebApplication\` adds the
two auth middleware for you when the services are registered; write them out
anyway so the order is visible. Authorisation before authentication means an
anonymous \`User\` and a 401 for everyone.

## Cookie authentication

Cookies are the right default for server-rendered apps and for an SPA served
from the same site as its API. The browser stores the cookie and sends it
automatically, which is both the convenience and the danger: another site can
make the browser send it too. That is CSRF, and it is why cookie-authenticated
form posts need **antiforgery tokens**, a secret the attacker's page cannot
read. MVC checks them with \`[ValidateAntiForgeryToken]\`, Razor Pages checks them
automatically, and in .NET 8+ minimal endpoints that bind forms are checked once
you add \`app.UseAntiforgery()\`. \`SameSite=Lax\` blocks most cross-site posts;
keep antiforgery as defence in depth. A bearer header is never attached
automatically, so a bearer-only API has nothing to forge.

## JWT bearer

\`\`\`csharp
builder.Services.AddAuthentication().AddJwtBearer(o =>
{
    o.Authority = "https://login.example.com/";   // issuer + keys via discovery
    o.Audience = "orders-api";                    // tokens minted for *this* API
});
\`\`\`

With \`Authority\` set, the handler downloads the issuer and signing keys from the
OpenID Connect discovery document, so good configuration is mostly these two
lines. The checks that must stay on, each tied to an attack:

| Check | Without it |
| --- | --- |
| Signature | anyone can write a token as JSON |
| Issuer | tokens from another issuer are accepted |
| Audience | a token minted for a different API works on yours |
| Lifetime | a stolen token never expires |

\`ValidateAudience = false\` copied from a blog post is the classic finding. The
default \`ClockSkew\` is five minutes; tighten it, never widen it. Keep
\`RequireHttpsMetadata\` on outside local development.

Claims in a validated token are trustworthy, because the signature proves your
identity provider issued them unchanged. A role or user id sent any other way (a
body field, a header, a query parameter) is not. The caveat is freshness: a
token issued before someone was demoted keeps the old role until it expires, so
access tokens are short-lived. If your provider puts roles in a claim called
\`roles\`, set \`TokenValidationParameters.RoleClaimType\`, or \`RequireRole\` never
matches.

## Authorisation: roles, claims, policies

\`\`\`csharp
builder.Services.AddAuthorizationBuilder()
    .AddPolicy("Admin", p => p.RequireRole("admin"))
    .AddPolicy("CanRefund", p => p.RequireRole("Support", "Admin").RequireClaim("refund_limit"))
    .SetFallbackPolicy(new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build());

app.MapGet("/admin/stats", GetStats).RequireAuthorization("Admin");
\`\`\`

Roles and claims are inputs; a **policy** is a named bundle of requirements
(\`RequireRole\`, \`RequireClaim\`, \`RequireAssertion\`, or a custom
\`IAuthorizationRequirement\` with a handler). Endpoints should ask for a
capability such as \`CanRefund\`, not encode the org chart in forty
\`[Authorize(Roles = ...)]\` attributes; when "team leads can refund too" arrives,
you change one line. Policies are evaluated per request against the current
principal's claims; none re-reads the database unless your handler does.

A signed-in user whose token lacks the \`admin\` role gets \`403\` from
\`/admin/stats\`; an anonymous caller gets \`401\`.

The **fallback policy** applies to endpoints with no authorisation metadata at
all, so a new endpoint is protected unless someone opts out. It is different
from the default policy, which is what a bare \`[Authorize]\` means. Opt out with
\`[AllowAnonymous]\` on a controller or action, or \`.AllowAnonymous()\` on a
minimal-API endpoint or group. It skips every policy, including the fallback, so
review it like any security change.

## Resource-based authorisation

"Only the owner or support staff may edit this order" depends on data, so it
cannot be decided from endpoint metadata before the handler runs. Load the
resource, then ask:

\`\`\`csharp
public sealed class EditOrderHandler : AuthorizationHandler<EditRequirement, Order>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext ctx, EditRequirement req, Order order)
    {
        var userId = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (order.OwnerId == userId || ctx.User.IsInRole("Support")) ctx.Succeed(req);
        return Task.CompletedTask;
    }
}

// in the endpoint, after loading the order:
var result = await auth.AuthorizeAsync(user, order, "CanEditOrder");
if (!result.Succeeded) return TypedResults.Forbid();
\`\`\`

Return \`403\`, or \`404\` if you would rather not reveal that the id exists.
Missing this check is **IDOR** (insecure direct object reference), the most
common real API vulnerability. Hiding the Edit button in React protects
nothing.

## Identity and external identity providers

ASP.NET Core Identity is a membership library: EF Core user and role stores,
\`UserManager\` and \`SignInManager\`, a versioned PBKDF2 password hasher, lockout,
TOTP two-factor, and data-protected tokens for email confirmation and password
reset. Use it when the app owns its users; do not hand-roll password storage.
.NET 8 added \`MapIdentityApi\` endpoints for SPA and mobile clients.

Identity is not an OpenID Connect server. For single sign-on across apps, or
tokens for other clients, use an external provider (Entra ID, Auth0, Keycloak)
or a server such as Duende IdentityServer or OpenIddict.

For a React SPA the safest shape is the **BFF** (backend-for-frontend): the
.NET host runs the OpenID Connect flow as a confidential client, keeps the
access and refresh tokens server-side, and proxies the SPA's API calls. The
browser holds only an \`HttpOnly\`, \`SameSite\` session cookie, so injected script
cannot steal a token and replay it elsewhere. The costs: an extra hop, the SPA
and BFF on the same site, and CSRF protection, because you are back to cookies.

## Data Protection

Auth cookies, antiforgery tokens and Identity's reset tokens are encrypted and
signed with Data Protection keys. By default the key ring lives on local disk
or in memory; in a container it disappears on every deploy. Scale to three
instances and a cookie issued by one cannot be read by the others: users are
"randomly" signed out and form posts fail antiforgery. Persist keys to shared
storage and give every instance the same application name:

\`\`\`csharp
builder.Services.AddDataProtection()
    .SetApplicationName("orders")
    .PersistKeysToDbContext<AppDb>();   // or Azure Blob Storage, Redis
\`\`\`

Protect the keys at rest (for example with \`ProtectKeysWithAzureKeyVault\`).

## Common mistakes

- IDOR: checking that the user is signed in, but not that the order is theirs.
- A new endpoint shipped without \`[Authorize]\`: the fallback policy prevents it.
- Trusting a role, tenant or user id from the request body instead of the validated token.
- Disabling issuer or audience validation "because it works locally".
- Tokens in \`localStorage\` in an SPA, where any XSS can read them.
- Data Protection keys that are per-instance or lost on each deploy.
`,
  },
  {
    id: 'net-testing',
    trackId: 'dotnet',
    title: 'Testing ASP.NET Core and EF Core',
    blurb:
      'xUnit, doubles at the boundaries, WebApplicationFactory integration tests and a real database in a container — plus the InMemory trap.',
    estMinutes: 30,
    objectives: [
      'Structure xUnit tests with facts, theories and fixtures',
      'Write an integration test against the real pipeline with `WebApplicationFactory`',
      'Explain why the EF InMemory provider gives false confidence and what to use instead',
      'Decide what to mock (external boundaries) and what to run for real',
    ],
    primer: `
## xUnit essentials

xUnit is the default test framework in the .NET templates; NUnit and MSTest do
the same job with different names.

\`\`\`csharp
public class PricingTests
{
    [Fact]
    public void Zero_total_has_no_discount() => Assert.Equal(0, Pricing.Discount(0));

    [Theory]
    [InlineData(1000, 100)]
    [InlineData(2500, 250)]
    public void Discount_is_ten_percent(int totalCents, int expectedCents) =>
        Assert.Equal(expectedCents, Pricing.Discount(totalCents));
}
\`\`\`

- \`[Fact]\` is one test with no parameters. \`[Theory]\` runs once per data row, and each row is reported as its own case. \`[MemberData]\` and \`[ClassData]\` supply rows computed in code.
- xUnit creates a **new instance of the test class for every test**. The constructor is per-test setup; \`IDisposable\` or \`IAsyncLifetime\` is teardown. Instance fields cannot leak between tests.
- Expensive shared setup (a database container, a web host) goes in a fixture: \`IClassFixture<T>\` shares it across one class, \`ICollectionFixture<T>\` with \`[Collection("Db")]\` across several. xUnit builds it once.
- Async tests return \`Task\`; never \`async void\`.

| xUnit | NUnit | MSTest |
| --- | --- | --- |
| \`[Fact]\` | \`[Test]\` | \`[TestMethod]\` |
| \`[Theory]\` + \`[InlineData]\` | \`[TestCase]\` | \`[DataRow]\` |
| constructor / \`Dispose\` | \`[SetUp]\` / \`[TearDown]\` | \`[TestInitialize]\` / \`[TestCleanup]\` |
| \`IClassFixture<T>\` | \`[OneTimeSetUp]\` | \`[ClassInitialize]\` |

**Parallelism**: xUnit runs test collections in parallel, and by default each
class is its own collection. Tests in different classes run at the same time;
tests within one class run one after another. xUnit v3 keeps this model. Put
classes that share a database into one collection so they do not trample each
other.

## Assertions and doubles

The built-in \`Assert\` is enough. Assertion libraries read better, but check the
licence before adopting one: FluentAssertions moved to a commercial licence for
v8. For doubles, Moq and NSubstitute are the common libraries, and a
hand-written fake is often better than either:

\`\`\`csharp
public sealed class FakeEmailSender : IEmailSender
{
    public List<(string To, string Subject)> Sent { get; } = [];
    public Task SendAsync(string to, string subject, string body)
    {
        Sent.Add((to, subject));
        return Task.CompletedTask;
    }
}
\`\`\`

A fake records what happened and lets the test assert on outcomes. A mock set
up with \`Verify(x => x.Add(It.IsAny<Order>()), Times.Once)\` pins the
implementation: a harmless refactor breaks it while a real bug may not.

**What to substitute**: the edges you do not own or cannot control. Payment
gateways and other third-party APIs, email and SMS, the clock. **What to keep
real**: your own code, the class under test (mocking it tests the mock), and in
integration tests your own database.

## Unit tests that pay

Unit-test code with logic and no I/O: pricing and discount rules, validators,
state transitions, mapping. For time, inject \`TimeProvider\` (.NET 8+) instead
of calling \`DateTime.UtcNow\`:

\`\`\`csharp
public class CouponService(TimeProvider clock)
{
    public bool IsExpired(Coupon c) => clock.GetUtcNow() >= c.IssuedAt.AddDays(30);
}

var time = new FakeTimeProvider(DateTimeOffset.Parse("2025-01-01T00:00:00Z"));
var svc = new CouponService(time);
var coupon = new Coupon { IssuedAt = time.GetUtcNow() };
time.Advance(TimeSpan.FromDays(30));
Assert.True(svc.IsExpired(coupon));
\`\`\`

\`FakeTimeProvider\` lives in \`Microsoft.Extensions.TimeProvider.Testing\`;
production registers \`TimeProvider.System\`. Test both sides of a boundary. A
settable static \`Clock.Now\` works but leaks between parallel tests; never
change the machine clock or \`Thread.Sleep\` in a test.

## WebApplicationFactory: the real pipeline in memory

\`WebApplicationFactory<Program>\` (package \`Microsoft.AspNetCore.Mvc.Testing\`)
boots your actual app (DI, configuration, middleware, routing, filters,
serialisation) on an in-memory \`TestServer\`, and \`CreateClient()\` returns an
\`HttpClient\` wired straight to it, with no network socket. With top-level
statements \`Program\` is internal, so add \`public partial class Program { }\` or
\`InternalsVisibleTo\`.

\`\`\`csharp
var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(b =>
    b.ConfigureTestServices(s =>
    {
        s.AddSingleton<IEmailSender, FakeEmailSender>();
        s.AddAuthentication("Test")
            .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>("Test", _ => { });
    }));
var client = factory.CreateClient();
\`\`\`

\`ConfigureTestServices\` runs **after** your \`Program.cs\` registrations, and the
last registration wins, so the fake replaces the real sender. Register it as a
singleton and the test can resolve the same instance from \`factory.Services\` to
inspect what was sent. Subclass the factory to share overrides, use
\`WithWebHostBuilder\` for per-test changes, and dispose it (it usually lives in
a fixture).

**Authorised endpoints**: do not remove \`UseAuthorization\` and do not mint real
JWTs. Register a test scheme whose \`AuthenticationHandler\` returns
\`AuthenticateResult.Success\` with the claims the test asks for (say, through a
header), and \`NoResult()\` when the header is absent. Your real policies still
run, so you test the 401, the 403 and the 200.

## Databases in tests

The EF Core **InMemory provider gives false confidence**. It is not relational:
LINQ runs against objects, so queries SQL cannot translate still "work"; unique
indexes and foreign keys are not enforced; transactions are not supported; raw
SQL is unavailable. Microsoft's own guidance discourages it for testing. SQLite
in-memory is closer but has its own dialect and type differences.

Use the real engine in a container with Testcontainers, and make it fast:

- One container per test run, in a collection fixture; apply migrations once.
- Reset data between tests with Respawn (deletes from every table in dependency order, in milliseconds), or wrap each test in a transaction and roll it back when the code under test does not manage its own transactions.
- Tests sharing one database go in one collection, or each parallel collection gets its own database in the same container.

Do not mock \`DbSet<T>\`: you would fake \`IQueryable\` and async enumeration by
hand, and untranslatable queries, missing \`Include\`s and constraint violations
all pass. Do not add a generic repository only to make EF mockable; it hides
projection, \`AsNoTracking\` and \`ExecuteUpdate\` behind a lowest-common-denominator
interface. The durable split: pure logic unit-tested, data access tested against
the real engine.

## Test data

Each test creates the data it needs, through the app's own \`DbContext\` resolved
from a scope on the factory's services, so tests can run in any order. Builders
(\`new OrderBuilder().WithItems(3).Build()\`) keep the arrange step short and say
what matters; Bogus or AutoFixture fill the fields that do not. Shared seed
data that many tests read and some tests change is how order-dependent failures
start.

## Speed and CI

- Share expensive fixtures (container, factory) per run, not per test.
- Keep unit and integration tests in separate projects or categories so the fast ones run on every save.
- A flaky test is a bug. Quarantine it with an issue and fix it; a suite people rerun until green tests nothing.
- Never assert on wall-clock timing on shared CI runners; performance belongs in a load test.

## What to test in an API

For \`POST /orders\`, a good integration test runs in this order: create the
factory and client; seed the customer; POST the order; follow the \`Location\`
header with a GET; assert the fetched order matches. Assert the contract a
client relies on:

- the status (\`201\`), and a \`Location\` header that resolves;
- the body shape, including the validation-error shape for bad input (\`400\` with field errors);
- authorisation: \`401\` anonymous, \`403\` for the wrong user, success for the owner;
- persistence: the row exists and round-trips;
- the error shape (Problem Details) for a 404 and a 409.

Not which private methods were called, and not the JSON property order.
`,
  },
];
