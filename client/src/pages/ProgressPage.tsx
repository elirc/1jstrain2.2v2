import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { Bar, ErrorBanner, Page, Stat, TrackDot, percent, relativeWhen } from '../components/ui';
import { api, errorMessage, isApiError } from '../lib/api';
import { useApp } from '../lib/app-state';
import { SETTINGS_RANGES, type DayActivity, type ExportDocument, type Settings } from '../lib/types';
import { drillHref } from './drill/params';

const WEEKS = 26;

export function ProgressPage() {
  const { curriculum, progress, trackById, flags } = useApp();
  const cells = useMemo(() => buildHeatmap(progress?.activity ?? []), [progress?.activity]);
  const heatRef = useRef<HTMLDivElement>(null);

  // Today is the last column: start scrolled to it on narrow screens.
  useEffect(() => {
    const el = heatRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);

  if (!curriculum || !progress) return null; // the Gate guarantees both

  const weakest = [...progress.modules]
    .filter((m) => m.attempts >= 3 && m.accuracy !== null)
    .sort((a, b) => (a.accuracy ?? 1) - (b.accuracy ?? 1))
    .slice(0, 6);

  const dueSoon = [...progress.modules]
    .filter((m) => m.due > 0)
    .sort((a, b) => b.due - a.due)
    .slice(0, 6);

  const activeDays = cells.filter((c) => !c.future && c.attempts > 0).length;
  const flaggedCount = flags?.length ?? 0;
  const nextDueAt = progress.totals.nextDueAt;

  return (
    <Page title="Progress">
      <div className="page-head">
        <h1>Progress</h1>
        <p>
          Mastery means you have answered a question correctly twice, with a gap in between — not that you got lucky
          once.
        </p>
      </div>

      <div className="stat-row section">
        <Stat value={progress.xp} label="total XP" />
        <Stat value={progress.streak} label={progress.streak === 1 ? 'day streak' : 'days streak'} />
        <Stat value={progress.totals.attempts} label="questions answered" />
        <Stat value={`${progress.totals.mastered}/${progress.totals.questions}`} label="mastered" />
        <Stat value={percent(progress.totals.accuracy)} label="overall accuracy" />
      </div>

      <section className="card section">
        <div className="spread">
          <h2 className="card-title">Last six months</h2>
          <div className="row tight meta" aria-hidden="true">
            <span>less</span>
            {[0, 1, 2, 3, 4].map((n) => (
              <span key={n} className={`heat-cell${n ? ` heat-${n}` : ''}`} />
            ))}
            <span>more</span>
          </div>
        </div>
        <div
          ref={heatRef}
          className="heatmap"
          role="img"
          aria-label={`Activity over the last ${WEEKS} weeks: ${activeDays} days with answers, ${progress.today.attempts} answered today.`}
        >
          {cells.map((cell) => (
            <span
              key={cell.date}
              aria-hidden="true"
              className={`heat-cell${cell.future ? ' heat-future' : cell.level ? ` heat-${cell.level}` : ''}`}
              title={cell.future ? undefined : `${cell.date}: ${cell.attempts} answered`}
            />
          ))}
        </div>
      </section>

      <div className="grid grid-cards">
        <section className="card">
          <h2 className="card-title">By track</h2>
          {progress.tracks.map((track) => {
            const meta = trackById.get(track.trackId);
            return (
              <div key={track.trackId} className="track-row">
                <div>
                  <div className="row tight">
                    <TrackDot color={meta?.color ?? 'var(--accent)'} />
                    <span className="strong small">{meta?.title ?? track.trackId}</span>
                  </div>
                  <Bar value={track.mastery} color={meta?.color} />
                </div>
                <div className="track-row-figures">
                  <div className="strong">
                    {track.mastered}/{track.total}
                  </div>
                  <div className="meta">{percent(track.accuracy)}</div>
                </div>
              </div>
            );
          })}
        </section>

        <div className="stack">
          <section className="card">
            <h2 className="card-title">Weakest modules</h2>
            <p className="muted small">Lowest accuracy, at least three attempts.</p>
            {weakest.length === 0 ? (
              <p className="meta flush">Answer a few more questions and this fills in.</p>
            ) : (
              weakest.map((m) => (
                <Link key={m.moduleId} to={`/module/${encodeURIComponent(m.moduleId)}`} className="track-row">
                  <span className="small">
                    {curriculum.modules.find((x) => x.id === m.moduleId)?.title ?? m.moduleId}
                  </span>
                  <span className="tag tag-warn">{percent(m.accuracy)}</span>
                </Link>
              ))
            )}
            {weakest.length > 0 && (
              <Link className="btn btn-sm btn-block" to={drillHref({ mode: 'weak' })}>
                Drill weak spots
              </Link>
            )}
          </section>

          <section className="card">
            <h2 className="card-title">Due for review</h2>
            {dueSoon.length === 0 ? (
              <p className="meta flush">
                Nothing is due.{' '}
                {nextDueAt
                  ? `The next review is ${relativeWhen(nextDueAt)}.`
                  : 'Answer something and it will come back for review.'}
              </p>
            ) : (
              <>
                {dueSoon.map((m) => (
                  <Link key={m.moduleId} to={`/module/${encodeURIComponent(m.moduleId)}`} className="track-row">
                    <span className="small">
                      {curriculum.modules.find((x) => x.id === m.moduleId)?.title ?? m.moduleId}
                    </span>
                    <span className="tag tag-accent">{m.due}</span>
                  </Link>
                ))}
                <Link className="btn btn-sm btn-primary btn-block" to={drillHref({ mode: 'review' })}>
                  Review {progress.totals.due} due
                </Link>
              </>
            )}
          </section>

          <section className="card">
            <h2 className="card-title">Flagged</h2>
            {flaggedCount === 0 ? (
              <p className="meta flush">
                Nothing flagged. After answering, “Flag for later” keeps a question you want to argue with or revisit.
              </p>
            ) : (
              <>
                <ul className="plain-list flag-list">
                  {(flags ?? []).slice(0, 5).map((f) => (
                    <li key={f.questionId} className="meta">
                      <Link to={`/module/${encodeURIComponent(f.moduleId)}`}>{f.prompt}</Link>
                      {f.note && <span> — {f.note}</span>}
                    </li>
                  ))}
                </ul>
                <Link className="btn btn-sm btn-block" to={drillHref({ mode: 'flagged' })}>
                  Drill flagged {flaggedCount}
                </Link>
              </>
            )}
          </section>
        </div>
      </div>

      <LearnerCard />
    </Page>
  );
}

/* -------------------------------------------------------------------------- */

const FIELD_LABEL: Record<keyof Settings, string> = {
  dailyGoal: 'Daily goal (answers)',
  sessionSize: 'Session size (questions)',
  newPerDay: 'New questions per day',
};

function SettingsForm() {
  const { settings, settingsError, updateSettings } = useApp();
  const [draft, setDraft] = useState<Record<keyof Settings, string> | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof Settings, string>>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!settings) {
    return <p className="meta">{settingsError ? `Settings unavailable: ${settingsError}` : 'Loading settings…'}</p>;
  }

  const values = draft ?? {
    dailyGoal: String(settings.dailyGoal),
    sessionSize: String(settings.sessionSize),
    newPerDay: String(settings.newPerDay),
  };

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors: Partial<Record<keyof Settings, string>> = {};
    const patch: Partial<Settings> = {};
    for (const key of Object.keys(FIELD_LABEL) as (keyof Settings)[]) {
      const { min, max } = SETTINGS_RANGES[key];
      const n = Number(values[key]);
      if (!Number.isInteger(n) || n < min || n > max) {
        nextErrors[key] = `A whole number from ${min} to ${max}.`;
      } else if (n !== settings![key]) {
        patch[key] = n;
      }
    }
    setErrors(nextErrors);
    setStatus(null);
    if (Object.keys(nextErrors).length > 0) return;
    if (Object.keys(patch).length === 0) {
      setStatus('Nothing changed.');
      return;
    }
    setSaving(true);
    try {
      await updateSettings(patch);
      setDraft(null);
      setStatus('Saved.');
    } catch (err) {
      const field = isApiError(err, 'validation_failed') ? err.details?.field : undefined;
      if (typeof field === 'string' && field in FIELD_LABEL) {
        setErrors({ [field]: errorMessage(err) });
      } else {
        setStatus(`Could not save: ${errorMessage(err)}`);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="settings-form" onSubmit={onSubmit} noValidate>
      {(Object.keys(FIELD_LABEL) as (keyof Settings)[]).map((key) => {
        const { min, max } = SETTINGS_RANGES[key];
        const id = `setting-${key}`;
        return (
          <div key={key} className="field">
            <label htmlFor={id}>{FIELD_LABEL[key]}</label>
            <input
              id={id}
              className="input input-number"
              type="number"
              inputMode="numeric"
              min={min}
              max={max}
              step={1}
              value={values[key]}
              aria-invalid={errors[key] ? true : undefined}
              aria-describedby={errors[key] ? `${id}-error` : undefined}
              onChange={(e) => setDraft({ ...values, [key]: e.target.value })}
            />
            {errors[key] && (
              <span id={`${id}-error`} className="field-error">
                {errors[key]}
              </span>
            )}
          </div>
        );
      })}
      <div className="row">
        <button type="submit" className="btn btn-sm btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save settings'}
        </button>
        <span className="meta" role="status">
          {status}
        </span>
      </div>
    </form>
  );
}

function isExportDocument(value: unknown): value is ExportDocument {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { format?: unknown }).format === 'stack-ready-profile' &&
    (value as { version?: unknown }).version === 1
  );
}

function ImportControl() {
  const { importProfile, lastImport, clearLastImport } = useApp();
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(file: File) {
    setBusy(true);
    setFailure(null);
    clearLastImport();
    try {
      let doc: unknown;
      try {
        doc = JSON.parse(await file.text());
      } catch {
        throw new Error('That file is not JSON.');
      }
      if (!isExportDocument(doc)) {
        throw new Error('That file is not a Stack Ready export (format "stack-ready-profile", version 1).');
      }
      // Success switches to the new learner; the report lives in app state
      // (`lastImport`) because that switch remounts this page.
      await importProfile(doc);
    } catch (err) {
      setFailure(
        isApiError(err, 'payload_too_large')
          ? 'That file is too large to import (the limit is 10 MB).'
          : `Could not import: ${errorMessage(err)}`,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="field">
      <label htmlFor="import-file">Import a learner from an export file</label>
      <input
        id="import-file"
        type="file"
        accept="application/json,.json"
        disabled={busy}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) void onFile(file);
        }}
      />
      <div role="status" className="meta">
        {busy && 'Importing…'}
        {failure && <span className="field-error">{failure}</span>}
        {lastImport && (
          <span>
            Imported as “{lastImport.profile.name}”: {lastImport.imported.attempts} answers,{' '}
            {lastImport.imported.cardStates} schedules, {lastImport.imported.flags} flags.
          </span>
        )}
        {lastImport && lastImport.skipped.unknownQuestionIds.length > 0 && (
          <details className="skipped" open>
            <summary>
              {lastImport.skipped.unknownQuestionIds.length} question
              {lastImport.skipped.unknownQuestionIds.length === 1 ? '' : 's'} not in this curriculum were skipped
            </summary>
            <ul>
              {lastImport.skipped.unknownQuestionIds.map((id) => (
                <li key={id}>
                  <code>{id}</code>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
}

function DangerZone() {
  const { profile, profiles, resetProgress, deleteProfile } = useApp();
  const [confirming, setConfirming] = useState<'reset' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!profile) return null;
  const onlyOne = profiles.length <= 1;

  async function run(action: 'reset' | 'delete') {
    setBusy(true);
    setError(null);
    try {
      if (action === 'reset') await resetProgress();
      else await deleteProfile(profile!.id);
      setConfirming(null);
    } catch (err) {
      setError(
        isApiError(err, 'last_profile')
          ? 'This is the only learner, so it cannot be deleted. Add another learner first, or reset this one instead.'
          : errorMessage(err),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="danger">
      {(['reset', 'delete'] as const).map((action) => (
        <div key={action} className="spread danger-row">
          <div>
            <div className="strong small">{action === 'reset' ? 'Reset progress' : `Delete ${profile.name}`}</div>
            <p className="meta flush">
              {action === 'reset'
                ? 'Clears every answer, schedule, flag and streak for this learner only. There is no undo.'
                : onlyOne
                  ? 'The only learner cannot be deleted.'
                  : 'Removes this learner and everything they have done. Export first if you might want it back.'}
            </p>
          </div>
          {confirming === action ? (
            <div className="row tight">
              <button type="button" className="btn btn-sm btn-danger" disabled={busy} onClick={() => void run(action)}>
                {action === 'reset' ? 'Yes, erase it' : 'Yes, delete'}
              </button>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setConfirming(null)}>
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-sm"
              disabled={action === 'delete' && onlyOne}
              onClick={() => {
                setError(null);
                setConfirming(action);
              }}
            >
              {action === 'reset' ? 'Reset progress' : 'Delete learner'}
            </button>
          )}
        </div>
      ))}
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
    </div>
  );
}

/** Settings, export, import, reset and delete — everything about the current learner. */
function LearnerCard() {
  const { profile } = useApp();
  if (!profile) return null;
  return (
    <section className="card section-top" aria-labelledby="learner-card-title">
      <h2 id="learner-card-title" className="card-title">
        This learner: {profile.name}
      </h2>

      <h3 className="eyebrow">Settings</h3>
      <SettingsForm />

      <h3 className="eyebrow">Backup</h3>
      <div className="row">
        <a className="btn btn-sm" href={api.exportUrl(profile.id)} download>
          Export {profile.name} (JSON)
        </a>
      </div>
      <ImportControl />

      <h3 className="eyebrow">Danger zone</h3>
      <DangerZone />
    </section>
  );
}

/* -------------------------------------------------------------------------- */

export interface HeatCell {
  date: string;
  attempts: number;
  level: number;
  future: boolean;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * A GitHub-style grid: one column per week, Sunday at the top, ending with the
 * current week. Steps by calendar day from local noon, so a DST change can
 * neither repeat nor skip a date. Days after today are marked `future`.
 * (Activity dates are the server's local days; for a local tool they match.)
 */
export function buildHeatmap(activity: DayActivity[], now = new Date()): HeatCell[] {
  const byDate = new Map(activity.map((d) => [d.date, d]));
  const today = new Date(now);
  today.setHours(12, 0, 0, 0);
  const todayKey = dateKey(today);

  const cursor = new Date(today);
  cursor.setDate(cursor.getDate() + (6 - cursor.getDay()) - (WEEKS * 7 - 1));

  const cells: HeatCell[] = [];
  let future = false;
  for (let n = 0; n < WEEKS * 7; n += 1) {
    const key = dateKey(cursor);
    const attempts = byDate.get(key)?.attempts ?? 0;
    cells.push({
      date: key,
      attempts,
      future,
      level: attempts === 0 ? 0 : attempts < 5 ? 1 : attempts < 12 ? 2 : attempts < 25 ? 3 : 4,
    });
    if (key === todayKey) future = true;
    cursor.setDate(cursor.getDate() + 1);
  }
  return cells;
}
