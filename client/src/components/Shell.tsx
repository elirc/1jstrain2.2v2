import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

import { useApp } from '../lib/app-state';
import { ThemeToggle } from './ui';

const NAV = [
  { to: '/', label: 'Roadmap', end: true },
  { to: '/tracks', label: 'Tracks' },
  { to: '/drill', label: 'Drill' },
  { to: '/progress', label: 'Progress' },
  { to: '/labs', label: 'Code labs' },
];

export function Shell() {
  const { profiles, profile, selectProfile, createProfile, progress } = useApp();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const due = progress?.totals.due ?? 0;

  async function onAdd(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    await createProfile(trimmed);
    setName('');
    setAdding(false);
  }

  return (
    <div className="shell">
      <header className="topbar">
        <NavLink to="/" className="brand">
          <span className="brand-mark">SR</span>
          <span>Stack Ready</span>
        </NavLink>

        <nav className="nav" aria-label="Main">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}>
              {item.label}
              {item.to === '/drill' && due > 0 ? (
                <span className="tag tag-accent" style={{ marginLeft: 6 }}>
                  {due}
                </span>
              ) : null}
            </NavLink>
          ))}
        </nav>

        <div className="topbar-right">
          {adding ? (
            <form onSubmit={onAdd} className="row" style={{ gap: 6 }}>
              <label className="sr-only" htmlFor="new-profile">
                New learner name
              </label>
              <input
                id="new-profile"
                className="input"
                style={{ width: 150 }}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name"
                maxLength={40}
                autoFocus
              />
              <button type="submit" className="btn btn-sm btn-primary">
                Add
              </button>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setAdding(false)}>
                Cancel
              </button>
            </form>
          ) : (
            <>
              <label className="sr-only" htmlFor="profile-select">
                Learner
              </label>
              <select
                id="profile-select"
                className="select"
                value={profile?.id ?? ''}
                onChange={(e) => {
                  if (e.target.value === '__new') setAdding(true);
                  else selectProfile(e.target.value);
                }}
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
                <option value="__new">+ New learner…</option>
              </select>
            </>
          )}
          <ThemeToggle />
        </div>
      </header>

      <Outlet />
    </div>
  );
}
