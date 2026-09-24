import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { NavLink, Outlet, ScrollRestoration } from 'react-router-dom';

import { errorMessage } from '../lib/api';
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
  const { profiles, profile, selectProfile, createProfile, confirmLeaveSession, progress, notice, dismissNotice } =
    useApp();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const due = progress?.totals.due ?? 0;

  function closeForm() {
    setAdding(false);
    setName('');
    setAddError(null);
  }

  async function onAdd(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setAddError('Give the learner a name.');
      return;
    }
    // A new learner becomes the active one, which remounts a live drill.
    if (!confirmLeaveSession()) return;
    setSaving(true);
    try {
      await createProfile(trimmed);
      closeForm();
    } catch (err) {
      setAddError(errorMessage(err, 'Could not add that learner.'));
    } finally {
      setSaving(false);
    }
  }

  function onFormKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeForm();
    }
  }

  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="topbar">
        <NavLink to="/" className="brand" aria-label="Stack Ready, roadmap">
          <span className="brand-mark" aria-hidden="true">
            SR
          </span>
          <span>Stack Ready</span>
        </NavLink>

        <nav className="nav" aria-label="Main">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}>
              {item.label}
              {item.to === '/drill' && due > 0 ? (
                <span className="badge">
                  {due}
                  <span className="sr-only"> due</span>
                </span>
              ) : null}
            </NavLink>
          ))}
        </nav>

        <div className="topbar-right">
          {adding ? (
            <form onSubmit={onAdd} onKeyDown={onFormKeyDown} className="learner-form">
              <label className="sr-only" htmlFor="new-profile">
                New learner name
              </label>
              <input
                id="new-profile"
                className="input input-compact"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name"
                maxLength={40}
                autoFocus
                aria-invalid={addError ? true : undefined}
                aria-describedby={addError ? 'new-profile-error' : undefined}
              />
              <button type="submit" className="btn btn-sm btn-primary" disabled={saving}>
                Add
              </button>
              <button type="button" className="btn btn-sm btn-ghost" onClick={closeForm}>
                Cancel
              </button>
              {addError && (
                <span id="new-profile-error" className="field-error" role="alert">
                  {addError}
                </span>
              )}
            </form>
          ) : (
            <div className="learner">
              <label className="sr-only" htmlFor="profile-select">
                Learner
              </label>
              <select
                id="profile-select"
                className="select"
                value={profile?.id ?? ''}
                onChange={(e) => selectProfile(e.target.value)}
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-icon"
                onClick={() => setAdding(true)}
                aria-label="New learner"
                title="New learner"
              >
                <span aria-hidden="true">+</span>
              </button>
            </div>
          )}
          <ThemeToggle />
        </div>
      </header>

      {/* One app-level region for background failures (a refresh, a flag that did not save). */}
      <div className="notice-region" role="status">
        {notice && (
          <div className="notice">
            <span>{notice}</span>
            <button type="button" className="btn btn-sm btn-ghost" onClick={dismissNotice}>
              Dismiss
            </button>
          </div>
        )}
      </div>

      <Outlet />
      <ScrollRestoration />
    </div>
  );
}
