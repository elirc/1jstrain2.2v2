/** Reference solutions for MODULE REACT-02. */
import { useState, type FormEvent } from 'react';

export function Counter({ initial = 0 }: { initial?: number }) {
  const [count, setCount] = useState(initial);
  return (
    <div>
      <button type="button" onClick={() => setCount((c) => Math.max(0, c - 1))}>
        -
      </button>
      <span data-testid="count">{count}</span>
      <button type="button" onClick={() => setCount((c) => c + 1)}>
        +
      </button>
      <button type="button" onClick={() => setCount(initial)}>
        Reset
      </button>
    </div>
  );
}

export function TripleCounter() {
  const [count, setCount] = useState(0);
  const addThree = () => {
    // Each updater receives the value produced by the previous one.
    setCount((c) => c + 1);
    setCount((c) => c + 1);
    setCount((c) => c + 1);
  };
  return (
    <div>
      <output>{count}</output>
      <button type="button" onClick={addThree}>
        Add three
      </button>
    </div>
  );
}

export function MessageInput() {
  const [value, setValue] = useState('');
  return (
    <div>
      <label htmlFor="message">Message</label>
      <input
        id="message"
        value={value}
        onChange={(event) => {
          const next = event.target.value;
          if (next.length <= 100) setValue(next);
        }}
      />
      <p>{value.length}/100 characters</p>
    </div>
  );
}

export function Disclosure({ details }: { details: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setOpen((o) => !o)}>
        {open ? 'Hide details' : 'Show details'}
      </button>
      {open && <p>{details}</p>}
    </div>
  );
}

export function SearchableList({ items }: { items: string[] }) {
  const [query, setQuery] = useState('');
  // Derived during render — never stored in state.
  const matches = items.filter((item) => item.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div>
      <label htmlFor="search">Search</label>
      <input id="search" value={query} onChange={(event) => setQuery(event.target.value)} />
      {matches.length === 0 && query.trim() !== '' ? (
        <p>No matches</p>
      ) : (
        <ul>
          {matches.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export interface LoginFormProps {
  onSubmit: (credentials: { email: string; password: string }) => void;
}

export function LoginForm({ onSubmit }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found: string[] = [];
    if (!email.includes('@')) found.push('Enter a valid email');
    if (password.length < 8) found.push('Password must be at least 8 characters');
    setErrors(found);
    if (found.length === 0) {
      onSubmit({ email, password });
      setPassword('');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="email">Email</label>
      <input id="email" value={email} onChange={(event) => setEmail(event.target.value)} />

      <label htmlFor="password">Password</label>
      <input
        id="password"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />

      {errors.map((error) => (
        <p role="alert" key={error}>
          {error}
        </p>
      ))}

      <button type="submit">Sign in</button>
    </form>
  );
}

export function SettingsPanel() {
  const [settings, setSettings] = useState({ darkMode: false, fontSize: 14 });

  return (
    <div>
      <label htmlFor="dark">Dark mode</label>
      <input
        id="dark"
        type="checkbox"
        checked={settings.darkMode}
        onChange={(event) => setSettings((s) => ({ ...s, darkMode: event.target.checked }))}
      />

      <label htmlFor="size">Font size</label>
      <input
        id="size"
        type="number"
        value={settings.fontSize}
        onChange={(event) => setSettings((s) => ({ ...s, fontSize: Number(event.target.value) }))}
      />

      <pre data-testid="state">{JSON.stringify(settings)}</pre>
    </div>
  );
}

export function ItemManager() {
  const [items, setItems] = useState<{ id: string; text: string }[]>([]);
  const [draft, setDraft] = useState('');

  const add = () => {
    const text = draft.trim();
    if (text === '') return;
    setItems((current) => [...current, { id: `${Date.now()}-${current.length}`, text }]);
    setDraft('');
  };

  return (
    <div>
      <label htmlFor="new-item">New item</label>
      <input id="new-item" value={draft} onChange={(event) => setDraft(event.target.value)} />
      <button type="button" onClick={add}>
        Add
      </button>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            {item.text}
            <button
              type="button"
              onClick={() => setItems((current) => current.filter((i) => i.id !== item.id))}
            >
              Remove {item.text}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MultiSelect({ options }: { options: string[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (option: string) => {
    // A NEW Set, or React sees the same reference and skips the render.
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(option)) next.delete(option);
      else next.add(option);
      return next;
    });
  };

  const chosen = [...selected].sort();

  return (
    <div>
      {options.map((option) => (
        <span key={option}>
          <label htmlFor={`opt-${option}`}>{option}</label>
          <input
            id={`opt-${option}`}
            type="checkbox"
            checked={selected.has(option)}
            onChange={() => toggle(option)}
          />
        </span>
      ))}
      <p>Selected: {chosen.length === 0 ? 'none' : chosen.join(', ')}</p>
    </div>
  );
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function TemperatureConverter() {
  const [celsius, setCelsius] = useState('');
  const [fahrenheit, setFahrenheit] = useState('');

  const onCelsius = (next: string) => {
    setCelsius(next);
    const parsed = Number(next);
    setFahrenheit(next.trim() === '' || Number.isNaN(parsed) ? '' : String(round1(parsed * 1.8 + 32)));
  };

  const onFahrenheit = (next: string) => {
    setFahrenheit(next);
    const parsed = Number(next);
    setCelsius(
      next.trim() === '' || Number.isNaN(parsed) ? '' : String(round1((parsed - 32) / 1.8)),
    );
  };

  return (
    <div>
      <TemperatureInput label="Celsius" value={celsius} onChange={onCelsius} />
      <TemperatureInput label="Fahrenheit" value={fahrenheit} onChange={onFahrenheit} />
    </div>
  );
}

export function TemperatureInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  const id = `temp-${label.toLowerCase()}`;
  return (
    <p>
      <label htmlFor={id}>{label}</label>
      <input id={id} value={value} onChange={(event) => onChange(event.target.value)} />
    </p>
  );
}
