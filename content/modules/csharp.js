/**
 * Modules — C#, the language.
 *
 * One file per author, so parallel authors never touch the same file. Each
 * module carries a primer that covers everything its questions test. Primers
 * are markdown-lite — headings, lists, `code`, fenced blocks, tables, **bold**
 * and *italic*; validateContent() rejects anything the renderer cannot show.
 */

/** @type {import('../types.d.ts').Module[]} */
export const csharpModules = [
  {
    id: 'cs-basics',
    trackId: 'csharp',
    title: 'C# for people who know JavaScript',
    blurb: 'Value vs reference types, nullable reference types, strings, collections and records.',
    estMinutes: 35,
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

Records, pattern matching and the newer syntax are covered in depth in *Modern C#: records, patterns and the new syntax*.

## Structs copy — every field, every time

Assigning a struct copies it. After \`var p2 = p1; p2.X = 5;\` the original
\`p1.X\` is unchanged, because \`p2\` is a separate value; with a class both names
point at one object. Mutable structs therefore bite: you edit a copy (a local read out
of a list, or a mutating method called through a property) and wonder why
nothing changed. Make structs \`readonly struct\` or \`readonly record struct\`.

\`\`\`csharp
var p1 = new Point { X = 1 };
var p2 = p1;
p2.X = 5;                     // p1.X is still 1

struct Point { public int X; } // with top-level statements, types go after the code
\`\`\`

Value types you will use daily: every numeric type, \`bool\`, \`char\`,
\`DateTime\`, \`DateTimeOffset\`, \`DateOnly\`, \`Guid\`, every \`enum\`, every
\`struct\` and \`record struct\`. Arrays and \`List<T>\` are reference types even
when they hold \`int\`s.

## Equality of collections

\`==\` on a class compares references unless the class overloads it, and
\`List<T>\`, arrays and dictionaries do not. Two lists holding \`1, 2, 3\` are
unequal with \`==\`; compare contents with \`a.SequenceEqual(b)\`. The trap
survives into records: a record's generated equality compares a \`List<T>\`
property by reference.

## Integer division

\`int / int\` is integer division and truncates toward zero: \`7 / 2\` is \`3\`.
Casting afterwards is too late — \`(double)(7 / 2)\` is \`3\` — so make an
operand non-integer first: \`7 / 2.0\` or \`(double)7 / 2\` is \`3.5\`. Printing a
\`double\` uses the current culture (\`3,5\` in Germany); pass
\`CultureInfo.InvariantCulture\` when the text is for machines.

## Dictionary lookups

Reading a missing key with the indexer throws \`KeyNotFoundException\` — there is
no \`undefined\`. When a missing key is normal, use the one-lookup idiom:

\`\`\`csharp
if (prices.TryGetValue(sku, out var price)) { /* found */ }
var qty = stock.GetValueOrDefault(sku);   // 0 when missing
\`\`\`

\`ContainsKey\` plus the indexer does two lookups, and \`try\`/\`catch\` for a normal
case is slow and noisy. Writing is the other way round: \`dict[key] = value\`
adds or overwrites, \`Add\` throws on a duplicate.

## Dates and times

| Value | Type |
| --- | --- |
| An instant: order placed, token expires | \`DateTimeOffset\`, or \`DateTime\` from \`DateTime.UtcNow\` |
| A calendar date: birthday, invoice date | \`DateOnly\` (.NET 6+) |
| A time of day: shop opens at 09:00 | \`TimeOnly\` (.NET 6+) |
| A length of time | \`TimeSpan\` |

\`DateTime.Now\` is the server's local wall clock: two servers in different zones
disagree and DST makes one hour ambiguous every year. Never store it. A birthday
stored as midnight in one zone moves to the previous day when converted, which
\`DateOnly\` makes impossible; EF Core 8+ maps it to a \`date\` column. For
testable code, inject \`TimeProvider\` (.NET 8+) instead of reading the clock
directly.

## Syntax you will meet immediately

Auto-properties (\`public string Name { get; set; }\`), \`init\` for
set-once properties, \`var\` for inferred locals (still statically typed),
expression-bodied members (\`=>\`), string interpolation
(\`$"Hello {name}"\`), \`switch\` expressions with pattern matching,
\`is not null\`, top-level statements in \`Program.cs\`, and file-scoped
namespaces. \`decimal\` — not \`double\` — for money.

## Project-level syntax

New projects look like they are missing their \`using\` lines. With
\`<ImplicitUsings>enable</ImplicitUsings>\` (.NET 6+) the SDK generates a
\`GlobalUsings.g.cs\` under \`obj/\` with \`global using\` directives for \`System\`,
\`System.Collections.Generic\`, \`System.Linq\`, \`System.Threading.Tasks\`,
\`System.IO\`, \`System.Net.Http\` and friends; the Web SDK adds the ASP.NET Core
namespaces. A \`global using\` in any file applies to the whole project, and
\`<Using Include="..." />\` in the \`.csproj\` does the same. File-scoped
namespaces (\`namespace Shop.Orders;\`, C# 10) put the whole file in one
namespace with one less level of indentation.
`,
  },
  {
    id: 'cs-oop',
    trackId: 'csharp',
    title: 'Types, interfaces and exceptions',
    blurb: 'Classes, interfaces vs abstract classes, generics, exceptions and IDisposable.',
    estMinutes: 30,
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

## When an interface earns its place

An interface is worth its extra file when there is a **seam**: two or more real
implementations (card payments and bank transfers), an I/O boundary you want to
fake in tests (email, payment gateway, the clock via \`TimeProvider\` in .NET
8+), or a contract at a module boundary that other code depends on. An \`IFoo\`
for every \`Foo\` with exactly one implementation is ceremony: twice the files,
and "go to definition" lands on the wrong thing. Never interface a DTO — build a
real one in the test.

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

## Delegates: Func and Action

A delegate is a typed function reference — C#'s answer to passing a callback.
You rarely declare your own; use the generic ones:

| Shape | Type |
| --- | --- |
| \`(Order) => bool\` | \`Func<Order, bool>\` — the **last** type argument is the return type |
| \`(Order) => void\` | \`Action<Order>\` |
| \`() => Task\` | \`Func<Task>\` |

Lambdas convert to either, which is how LINQ's \`Where(Func<T, bool>)\` works.
A custom \`delegate\` type is only worth it when a name documents intent better
than the generic signature.

## Events and the leak they cause

\`publisher.Tick += OnTick;\` stores a delegate whose target is the subscriber, so
the **publisher now keeps the subscriber alive**. A short-lived object
subscribing to a long-lived one (a view model to a singleton service, a
component to a static event) is never collected and keeps handling events after
it should be dead. Unsubscribe with \`-=\` in \`Dispose\`; an inline lambda can only
be removed if you stored it in a variable.

## Exceptions

Throw for exceptional conditions, not for control flow — they are expensive and
they hide intent. Catch only what you can actually handle, catch the **specific**
type, and let the rest bubble to a global handler.

\`\`\`csharp
try { /* ... */ }
catch (HttpRequestException ex)
{
    logger.LogWarning(ex, "upstream failed");
    throw;
}
finally { /* always runs */ }
\`\`\`

\`throw;\` rethrows and **preserves the original stack trace**; \`throw ex;\`
resets it and destroys your debugging information. That is a favourite interview
question. Common types: \`ArgumentNullException\`,
\`ArgumentOutOfRangeException\`, \`InvalidOperationException\`,
\`NotImplementedException\`. Define your own for domain errors and translate
them to HTTP status codes in one place.

## Exception filters

\`\`\`csharp
catch (HttpRequestException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
{
    return null;
}
\`\`\`

The \`when\` filter runs **before** the stack unwinds. If it is false, the
exception keeps propagating as though this \`catch\` did not exist — the throw
site and its local state stay intact for the debugger and crash dumps, which
catch-and-\`throw;\` cannot give you. A filter that logs and returns \`false\` is
the idiom for observing without catching.

## finally

\`finally\` runs on every exit: normal completion, \`return\`, \`break\`, or an
exception. With \`try { return 1; } finally { Log(); }\` the return value is
computed first, then \`finally\` runs, then the caller gets \`1\`. You cannot
\`return\` from inside \`finally\` (compile error), and \`using\` is just a
\`try\`/\`finally\` that calls \`Dispose\`.

## Result types vs exceptions

Split failures into two kinds. **Expected** outcomes — not found, validation
failed, out of stock — are part of the business, so put them in the signature:
return a \`Result<T>\` or a small closed set of outcome records, and map each to
an HTTP response at the edge (\`TypedResults.NotFound()\`, a 400 with
ProblemDetails, a 409). **Exceptional** conditions — a broken invariant, the
database is down, a bug — throw, and a global handler turns them into a 500.

The trade-off: results make control flow explicit and are far cheaper than a
throw (capturing a stack trace is expensive), but the BCL has no \`Result<T>\`,
so you write a small type or take a library, and every caller has to unwrap.
Throwing custom exceptions for routine outcomes and catching them in the
controller is the common alternative; it works, but it is control flow by
exception.

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
    id: 'cs-modern',
    trackId: 'csharp',
    title: 'Modern C#: records, patterns and the new syntax',
    blurb:
      'Records and `with`, pattern matching, `required` and `init`, primary constructors, collection expressions and nullable flow analysis.',
    estMinutes: 30,
    objectives: [
      'Use records and `with` for DTOs and value objects, and say where they do not fit',
      'Replace an if/else ladder with a switch expression using property and relational patterns',
      'Explain what nullable flow analysis proves and how `required` changes object creation',
      'Read C# 12–14 syntax (primary constructors, collection expressions, `field`) without guessing',
    ],
    primer: `
## Why this module exists

C# has changed more since 2019 than in the decade before it, and interviewers
use the new syntax as a quick test of whether your C# is current. Versions
matter here: C# 12 ships with .NET 8 (LTS), C# 13 with .NET 9 and C# 14 with
.NET 10 (the newest LTS). Each feature below names the version that introduced it.

## Records

\`\`\`csharp
public record OrderDto(Guid Id, string Status, decimal Total);   // C# 9
public readonly record struct Money(decimal Amount, string Currency); // C# 10
\`\`\`

A positional record gives you public init-only properties, a constructor,
deconstruction, a readable \`ToString\` and, above all, **value equality**: the
compiler generates \`Equals\`, \`GetHashCode\`, \`==\` and \`!=\` that compare every
member. Two \`new OrderDto(...)\` calls with the same values are \`==\`, even
though \`ReferenceEquals\` says they are two objects. Equality is shallow — a
\`List<T>\` member is compared by reference.

\`with\` makes a non-destructive copy, the C# spelling of \`{ ...dto, status: "x" }\`:

\`\`\`csharp
var cancelled = order with { Status = "cancelled" };  // order is unchanged
\`\`\`

The copy is shallow too: both records share any list they point at.

**Where records do not fit: EF Core entities.** An entity has *identity* — row
42 is the same customer after she changes her name. Record equality says the
opposite, and the hash code changes whenever a property does, which breaks
hash-based sets and lookups. \`with\` hands you an instance the \`DbContext\` has
never seen, so your change is silently lost or collides with the tracked
original. Use records for DTOs, messages and value objects (EF Core 8+ complex
types can be records), and plain classes for entities.

## Pattern matching

Patterns test a value's shape and can bind variables as they go:

| Pattern | Example | Since |
| --- | --- | --- |
| Type | \`shape is Circle c\` | C# 7 |
| Property | \`order is { Status: OrderStatus.Paid }\` | C# 8 |
| Extended property | \`order is { Customer.Country: "NL" }\` | C# 10 |
| Relational | \`total is > 0 and <= 100\` | C# 9 |
| Logical | \`and\`, \`or\`, \`not\` | C# 9 |
| List | \`xs is [var first, .., var last]\` | C# 11 |

A property pattern only matches a **non-null** object, and commas mean *and*:
\`order is { Status: OrderStatus.Paid, Total: > 1000m }\` is null-safe and
checks both members. It never assigns anything. \`x is { }\` is the idiomatic
"not null".

Prefer \`x is null\` and \`x is not null\` to \`== null\`/\`!= null\`. The pattern
compiles to a plain null test, while \`==\` calls a user-defined operator if the
type overloads one, and an odd overload can lie. Both are runtime checks, and
flow analysis understands both.

List patterns match by length and position: \`[]\` is empty, \`[var only]\` is
exactly one element, and \`..\` is a slice matching zero or more elements.

## Switch expressions

\`\`\`csharp
var label = total switch
{
    < 0     => "invalid",
    0       => "free",
    <= 100  => "small",
    _       => "large",
};
\`\`\`

Arms are tried **top to bottom and the first match wins**, so order them from
most to least specific. If an arm is fully covered by earlier arms the compiler
refuses it (error CS8510, "the pattern has already been handled"). A broad
\`{ Total: > 100 }\` above \`{ Total: > 1000 }\` makes the second unreachable; the
right order is \`{ Total: > 1000, IsVip: true }\`, then \`{ Total: > 1000 }\`,
then \`{ Total: > 100 }\`, then \`_\`.

The \`_\` discard matches everything. Leave it out and the compiler warns when the
arms are not exhaustive; an unmatched value then throws
\`SwitchExpressionException\` at runtime. With an enum, prefer listing every
member and letting the warning tell you when someone adds one.

## Creating objects: init, required and primary constructors

- \`init\` (C# 9) makes a property settable in an object initialiser and read-only
  afterwards.
- \`required\` (C# 11, .NET 7) makes the compiler insist that callers set the
  member in the initialiser: \`new User()\` without \`Email = ...\` does not
  compile. It is **not** a runtime null check and not the \`[Required]\`
  validation attribute; System.Text.Json (.NET 7+) honours it when
  deserialising.

\`\`\`csharp
public class User
{
    public required string Email { get; init; }
    public string? DisplayName { get; init; }
}
\`\`\`

**Primary constructors on classes** (C# 12, .NET 8) remove DI boilerplate:

\`\`\`csharp
public class OrderService(IOrderRepository repo, TimeProvider clock)
{
    public Task<Order?> Find(Guid id) => repo.FindAsync(id);
}
\`\`\`

The gotcha: a parameter your members use is captured into a hidden **mutable**
field, not a \`readonly\` one. Any method can write \`repo = null!\` and it
compiles. When that matters, copy it explicitly —
\`private readonly IOrderRepository _repo = repo;\` — and use only \`_repo\`.
Records are different: positional record parameters become public properties.

## Nullable reference types in practice

With \`<Nullable>enable</Nullable>\` (the default in new projects) the compiler
tracks whether each reference may be null and warns when you dereference one
that might be: \`string? name = GetName(); name.Length\` gives CS8602. Fix
warnings in this order:

1. Handle null: a guard clause, or \`name?.Length ?? 0\`.
2. Fix the signature: if \`GetName\` never returns null, make it return \`string\`.
3. Use the null-forgiving operator \`!\` (\`name!.Length\`) only when you can prove
   the value is set and the compiler cannot see it.

\`!\` does nothing at runtime; it only silences the warning, so a wrong \`!\` is a
\`NullReferenceException\` you asked not to be told about. Changing \`string?\` to
\`string\` just moves the warning to the assignment (CS8600). Attributes like
\`[NotNullWhen(true)]\` on a \`bool TryGet(..., out T? value)\` method teach the
analysis your own conventions. Serious teams fail the build on these warnings:
\`<WarningsAsErrors>nullable</WarningsAsErrors>\`. On a legacy codebase, turn it
on file by file with \`#nullable enable\`.

## Collections and syntax

- **Collection expressions** (C# 12): \`int[] xs = [1, 2, 3];\`,
  \`List<string> names = [];\`, and spread with \`..\`: \`[..first, ..second, 99]\`.
  The target type decides what gets built, so one syntax works for arrays,
  lists and spans.
- **Target-typed new** (C# 9): \`List<Order> orders = new();\`.
- **Raw string literals** (C# 11): \`"""\` ... \`"""\` holds JSON or SQL without
  escaping quotes.

## Iterators and async streams

A method using \`yield return\` becomes a lazy state machine. Calling it runs
**nothing**; each step of enumeration runs the body to the next \`yield\`. So:
enumerating twice runs the body twice, and an exception — including argument
validation at the top — surfaces on enumeration, not at the call. Put
validation in a normal wrapper method that returns the private iterator.

\`IAsyncEnumerable<T>\` is the async version, consumed with \`await foreach\`. It
is how you stream large results instead of buffering them:

\`\`\`csharp
await foreach (var o in db.Orders.AsNoTracking().AsAsyncEnumerable().WithCancellation(ct))
    await writer.WriteLineAsync($"{o.Id},{o.Total}");
\`\`\`

\`ToListAsync()\` on 100k rows holds all 100k entities in memory before the first
byte goes out; the stream keeps memory flat. A \`DbContext\` is not thread-safe,
so "parallelise it with \`Task.Run\` on the same context" throws instead.

## Recent additions to recognise

- **Params collections** (C# 13, .NET 9): \`params\` works with
  \`ReadOnlySpan<T>\`, \`List<T>\` and other collection types, not only arrays.
- **The Lock type** (C# 13, .NET 9): \`System.Threading.Lock\` is a dedicated
  lock type that \`lock\` recognises. It is still a synchronous lock — no \`await\` inside.
- **The field keyword** (preview in C# 13, stable in C# 14 / .NET 10): \`field\`
  refers to a property's compiler-generated backing field, so
  \`set => field = value.Trim();\` needs no hand-written field.
- **Extension members** (C# 14 / .NET 10): \`extension\` blocks that add
  properties and static members, not just methods.

You do not need these for a .NET 8 codebase, but you should recognise them in a
code review.
`,
  },
  {
    id: 'cs-linq-async',
    trackId: 'csharp',
    title: 'LINQ, IQueryable and async/await',
    blurb: 'Deferred execution, IEnumerable vs IQueryable, Task, and the async mistakes that deadlock.',
    estMinutes: 40,
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

## Multiple enumeration

Every terminal operator re-runs the pipeline from the source:

\`\`\`csharp
var late = orders.Where(o => IsLate(o));   // nothing runs yet
var n = late.Count();                      // runs IsLate on every order
var first = late.First();                  // runs it again, until the first match
\`\`\`

Over \`IQueryable\` that is two database round trips; over a one-shot source (a
network stream, an iterator with side effects) the second pass can differ or
fail. If you will enumerate more than once, materialise once with \`ToList()\`.
Do not reflexively \`ToList()\` everything, though — a huge or streamed sequence
is exactly what laziness is for.

## Any vs Count

\`Any()\` stops at the first element; \`Count()\` visits every match. In EF Core
\`Any(predicate)\` becomes \`EXISTS (SELECT 1 ...)\` while \`Count(predicate) > 0\`
becomes a full \`COUNT(*)\`. For a \`List<T>\` use the \`.Count\` property, which is
O(1). Analyzer CA1827 flags \`Count() > 0\`.

## SelectMany, GroupBy and ToDictionary

- \`SelectMany(o => o.Lines)\` is \`flatMap\`: it flattens a sequence of sequences.
  \`Select(o => o.Lines)\` gives you a sequence *of lists*.
- \`GroupBy(o => o.CustomerId)\` yields \`IGrouping\`s; each has a \`Key\` and is
  itself a sequence, so \`g.Sum(...)\`, \`g.Count()\` work per group. In memory,
  groups come out in first-seen key order; in SQL, order only with \`OrderBy\`.
- \`ToDictionary(u => u.Id)\` builds an O(1) lookup and throws on a duplicate
  key; use \`ToLookup\` when one key has many values.

## IEnumerable vs IQueryable

\`IEnumerable<T>\` works over objects in memory with delegates.
\`IQueryable<T>\` builds an **expression tree** that a provider (EF Core)
translates into SQL. The difference is a real production bug:

\`\`\`csharp
db.Orders.Where(o => o.Total > 100)          // IQueryable -> SQL WHERE. Good.
db.Orders.ToList().Where(o => o.Total > 100) // pulls the whole table, filters in C#. Bad.
\`\`\`

Once you call \`AsEnumerable()\`/\`ToList()\`, every later operator runs in
memory. And anything EF cannot translate (a call to your own C# method inside
\`Where\`) throws at runtime since EF Core 3.0 — only the final \`Select\`
projection may still be evaluated client-side.

What happens for \`await db.Orders.Where(...).OrderBy(...).Select(...).ToListAsync()\`:

1. \`Where\`, \`OrderBy\` and \`Select\` compose an expression tree. Nothing runs.
2. \`ToListAsync\` hands the tree to EF, which translates it to SQL (and caches the translation).
3. The database executes the SQL and streams rows back.
4. EF materialises the rows into objects, and the awaited task completes.

That is why an untranslatable method throws at \`ToListAsync\`, not at the
\`Where\` line.

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

## Blocking vs awaiting

These **block** the thread until the task finishes: \`.Result\`, \`.Wait()\`,
\`GetAwaiter().GetResult()\` (which at least throws the original exception rather
than an \`AggregateException\`) and \`Thread.Sleep\`. Any \`await\` — with or
without \`ConfigureAwait(false)\` — returns the thread and resumes later;
\`await Task.Delay(ms)\` is the non-blocking way to wait.

## WhenAll and exceptions

\`Task.WhenAll\` waits for **every** task, even after one fails, and stores all
failures in an \`AggregateException\` on the returned task. \`await\` unwraps it
and rethrows just one of them, so keep a reference to the task if you need
the rest:

\`\`\`csharp
var all = Task.WhenAll(a, b, c);
try { await all; }
catch { foreach (var e in all.Exception!.InnerExceptions) logger.LogError(e, "failed"); throw; }
\`\`\`

Nothing is cancelled when one task fails; pass a \`CancellationToken\` and cancel
it yourself if the others should stop.

## Throttling concurrency

"Call the API for 500 ids, at most 5 at a time":

\`\`\`csharp
await Parallel.ForEachAsync(ids, new ParallelOptions { MaxDegreeOfParallelism = 5 },
    async (id, ct) => await client.GetAsync($"/items/{id}", ct));
\`\`\`

\`Parallel.ForEachAsync\` is .NET 6+; a \`SemaphoreSlim(5)\` with \`WaitAsync\` and
\`Release\` in \`finally\` does the same by hand. \`Parallel.ForEach\` with an
\`async\` lambda is a bug: the lambda becomes \`async void\`, the loop returns at
once and nothing is throttled. \`Task.WhenAll\` over 500 calls fires all 500 —
\`HttpClient\` does not cap connections per server by default.

## ValueTask

\`ValueTask<T>\` is a struct holding either a ready result or a task, so a method
that usually completes synchronously (a cache hit) avoids allocating a \`Task\`.
The rules: await it **exactly once**, never concurrently, and never read
\`.Result\` before completion — call \`.AsTask()\` if you need \`WhenAll\`. Default to
\`Task<T>\`; reach for \`ValueTask<T>\` only on measured hot paths.

## Locks and await

\`lock (_gate) { await SaveAsync(); }\` does not compile (CS1996): \`lock\` is
\`Monitor.Enter\`/\`Exit\`, which must run on the same thread, and code after an
\`await\` may resume on another. Use an async-aware gate:

\`\`\`csharp
private readonly SemaphoreSlim _gate = new(1, 1);

await _gate.WaitAsync(ct);
try { await SaveAsync(ct); }
finally { _gate.Release(); }
\`\`\`

C# 13 / .NET 9's \`System.Threading.Lock\` type is a faster *synchronous* lock;
awaiting inside it is still an error. And any in-process lock protects one
process only — with three instances behind a load balancer, use the database
(unique constraints, optimistic concurrency) instead.

## Task.Run in ASP.NET Core

\`await db.Orders.ToListAsync()\` already frees the request thread while the
database works. Wrapping it in \`Task.Run\` borrows a second pool thread to start
the same call: a context switch and extra pool pressure, no speed-up.
\`Task.Run\` is for moving CPU-bound work off a UI thread; a web server has no
UI thread to protect.
`,
  },
];
