import { vi } from 'vitest';

/**
 * A small fetch mock: routes `METHOD /path` (with `:param` segments) to
 * handlers that return an envelope, and records every call. MSW would do the
 * same with a service worker; at this size a function is enough.
 */

export interface MockRequest {
  method: string;
  path: string;
  query: URLSearchParams;
  params: Record<string, string>;
  headers: Record<string, string>;
  body: unknown;
  signal: AbortSignal | undefined;
}

export type MockResult =
  | { status?: number; data: unknown }
  | { status: number; error: { code: string; message: string; details?: Record<string, unknown> } }
  | { status: number; raw: string | null; contentType?: string };

export type Handler = MockResult | ((req: MockRequest) => MockResult | Promise<MockResult>);

export interface FetchMock {
  calls: MockRequest[];
  on: (route: string, handler: Handler) => void;
  callsTo: (route: string) => MockRequest[];
}

function compile(route: string) {
  const [method, pattern] = route.split(' ');
  const names: string[] = [];
  const source = pattern
    .split('/')
    .map((part) => {
      if (part.startsWith(':')) {
        names.push(part.slice(1));
        return '([^/]+)';
      }
      return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');
  return { method, regex: new RegExp(`^${source}$`), names };
}

function toResponse(result: MockResult): Response {
  if ('raw' in result) {
    return new Response(result.raw, {
      status: result.status,
      headers: { 'content-type': result.contentType ?? 'text/html' },
    });
  }
  const status = result.status ?? 200;
  if (status === 204) return new Response(null, { status });
  const body = 'error' in result ? { error: result.error } : { data: result.data };
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function abortError() {
  return new DOMException('The operation was aborted.', 'AbortError');
}

export function mockFetch(routes: Record<string, Handler> = {}): FetchMock {
  const table: { route: string; compiled: ReturnType<typeof compile>; handler: Handler }[] = [];
  const calls: MockRequest[] = [];

  const on = (route: string, handler: Handler) => {
    // Later registrations win, so a test can override a default route.
    table.unshift({ route, compiled: compile(route), handler });
  };
  for (const [route, handler] of Object.entries(routes)) on(route, handler);

  const fetchImpl = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(input), 'http://localhost');
    const method = (init.method ?? 'GET').toUpperCase();
    const signal = init.signal ?? undefined;
    if (signal?.aborted) throw abortError();

    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries((init.headers as Record<string, string>) ?? {})) {
      headers[k.toLowerCase()] = v;
    }
    let body: unknown = undefined;
    if (typeof init.body === 'string') {
      try {
        body = JSON.parse(init.body);
      } catch {
        body = init.body;
      }
    }

    const req: MockRequest = {
      method,
      path: url.pathname,
      query: url.searchParams,
      params: {},
      headers,
      body,
      signal,
    };
    calls.push(req);

    const match = table.find((entry) => entry.compiled.method === method && entry.compiled.regex.test(url.pathname));
    if (!match) {
      return toResponse({
        status: 404,
        error: { code: 'not_found', message: `No mock for ${method} ${url.pathname}` },
      });
    }
    const groups = match.compiled.regex.exec(url.pathname) ?? [];
    match.compiled.names.forEach((name, i) => {
      req.params[name] = decodeURIComponent(groups[i + 1]);
    });

    const pending = Promise.resolve(typeof match.handler === 'function' ? match.handler(req) : match.handler);
    const result = signal
      ? await new Promise<MockResult>((resolve, reject) => {
          signal.addEventListener('abort', () => reject(abortError()), { once: true });
          pending.then(resolve, reject);
        })
      : await pending;
    return toResponse(result);
  };

  vi.stubGlobal('fetch', vi.fn(fetchImpl));

  return {
    calls,
    on,
    callsTo: (route: string) => {
      const { method, regex } = compile(route);
      return calls.filter((c) => c.method === method && regex.test(c.path));
    },
  };
}

/** A promise you resolve from the test, for ordering races deliberately. */
export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
