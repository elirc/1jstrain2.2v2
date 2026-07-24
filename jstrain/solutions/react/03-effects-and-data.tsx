/** Reference solutions for MODULE REACT-03. */
import { useEffect, useRef, useState } from 'react';

export function useDocumentTitle(title: string): void {
  useEffect(() => {
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);
}

export function Ticker({ intervalMs }: { intervalMs: number }) {
  const [ticks, setTicks] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTicks((t) => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return <p data-testid="ticks">{ticks}</p>;
}

export interface LoadedUser {
  id: string;
  name: string;
}

export function UserProfile({
  userId,
  load,
}: {
  userId: string;
  load: (id: string) => Promise<LoadedUser>;
}) {
  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'success'; user: LoadedUser }
    | { status: 'error'; error: Error }
  >({ status: 'loading' });

  useEffect(() => {
    let ignore = false;
    setState({ status: 'loading' });
    load(userId).then(
      (user) => {
        if (!ignore) setState({ status: 'success', user });
      },
      (error: Error) => {
        if (!ignore) setState({ status: 'error', error });
      },
    );
    return () => {
      ignore = true;
    };
  }, [userId, load]);

  if (state.status === 'loading') return <p>Loading…</p>;
  if (state.status === 'error') return <p role="alert">{state.error.message}</p>;
  return <p>{state.user.name}</p>;
}

export function SearchResult({
  query,
  load,
}: {
  query: string;
  load: (query: string) => Promise<string>;
}) {
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    load(query).then((next) => {
      // The cleanup for the previous query has already set ignore = true,
      // so a late response from it cannot overwrite the current one.
      if (!ignore) setResult(next);
    });
    return () => {
      ignore = true;
    };
  }, [query, load]);

  return <p data-testid="result">{result ?? 'none'}</p>;
}

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}

export function useWindowEvent(eventName: string, handler: (event: Event) => void): void {
  const latest = useRef(handler);
  useEffect(() => {
    latest.current = handler;
  }, [handler]);

  useEffect(() => {
    const listener = (event: Event) => latest.current(event);
    window.addEventListener(eventName, listener);
    return () => window.removeEventListener(eventName, listener);
  }, [eventName]);
}

export function AbortableLoader({ load }: { load: (signal: AbortSignal) => Promise<string> }) {
  const [data, setData] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal).then(
      (next) => {
        if (!controller.signal.aborted) setData(next);
      },
      (error: { name?: string }) => {
        if (error?.name !== 'AbortError') throw error;
      },
    );
    return () => controller.abort();
  }, [load]);

  return <p>{data ?? 'idle'}</p>;
}

export function FullName({ first, last }: { first: string; last: string }) {
  const renders = useRef(0);
  renders.current += 1;

  // No state, no effect: just compute it.
  return (
    <div>
      <p>
        {first} {last}
      </p>
      <span data-testid="renders">{renders.current}</span>
    </div>
  );
}

export function useLocalStorageState<T>(
  key: string,
  initial: T,
): [T, (next: T | ((current: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw === null ? initial : (JSON.parse(raw) as T);
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}

export function LiveSearch({
  search,
  debounceMs = 300,
}: {
  search: (query: string) => Promise<string[]>;
  debounceMs?: number;
}) {
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query.trim(), debounceMs);
  const [results, setResults] = useState<string[] | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (debounced === '') {
      setResults(null);
      setSearching(false);
      return;
    }
    let ignore = false;
    setSearching(true);
    search(debounced).then((next) => {
      if (ignore) return;
      setResults(next);
      setSearching(false);
    });
    return () => {
      ignore = true;
    };
  }, [debounced, search]);

  return (
    <div>
      <label htmlFor="live-search">Search</label>
      <input
        id="live-search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {searching && <p>Searching…</p>}
      {!searching && results !== null && (
        <ul>
          {results.map((result) => (
            <li key={result}>{result}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
