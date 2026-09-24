import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { makeProgress, makeResult, makeSession, mcq, profileA, profileB, renderApp } from '../test/fixtures';
import { buildHeatmap } from './ProgressPage';

const flag = {
  questionId: 'js-values-1',
  moduleId: 'js-values',
  trackId: 'js',
  prompt: 'What is typeof null?',
  note: 'argue later',
  createdAt: '2026-09-20T10:00:00.000Z',
};

describe('Progress page: the learner card', () => {
  it('shows a field-level error from validation_failed.details.field', async () => {
    const { fetchMock } = renderApp('/progress', {
      'PATCH /api/settings': {
        status: 400,
        error: { code: 'validation_failed', message: 'sessionSize is out of range', details: { field: 'sessionSize' } },
      },
    });
    const user = userEvent.setup();
    const size = await screen.findByLabelText('Session size (questions)');
    await user.clear(size);
    await user.type(size, '30');
    await user.click(screen.getByRole('button', { name: 'Save settings' }));
    await waitFor(() => expect(size).toHaveAttribute('aria-invalid', 'true'));
    expect(screen.getByText('sessionSize is out of range')).toBeInTheDocument();
    expect(fetchMock.callsTo('PATCH /api/settings')[0].body).toEqual({ sessionSize: 30 });
  });

  it('validates the range before sending anything', async () => {
    const { fetchMock } = renderApp('/progress');
    const user = userEvent.setup();
    const goal = await screen.findByLabelText('Daily goal (answers)');
    await user.clear(goal);
    await user.type(goal, '0');
    await user.click(screen.getByRole('button', { name: 'Save settings' }));
    expect(await screen.findByText('A whole number from 1 to 500.')).toBeInTheDocument();
    expect(fetchMock.callsTo('PATCH /api/settings')).toHaveLength(0);
  });

  it('exports with a plain download link', async () => {
    renderApp('/progress');
    const link = await screen.findByRole('link', { name: /Export Ada/ });
    expect(link).toHaveAttribute('href', `/api/profiles/${profileA.id}/export`);
    expect(link).toHaveAttribute('download');
  });

  it('imports a file, selects the new learner and lists skipped questions', async () => {
    const imported = { id: 'p-new', name: 'Ada (imported)', createdAt: '2026-09-24T00:00:00.000Z' };
    const { fetchMock } = renderApp('/progress', {
      'POST /api/profiles/import': {
        status: 201,
        data: {
          profile: imported,
          imported: { cardStates: 3, attempts: 9, flags: 1 },
          skipped: { unknownQuestionIds: ['old-q-1'] },
        },
      },
    });
    const user = userEvent.setup();
    const input = await screen.findByLabelText('Import a learner from an export file');
    const doc = {
      format: 'stack-ready-profile',
      version: 1,
      exportedAt: 'x',
      profile: { name: 'Ada', createdAt: 'x' },
      settings: {},
      cardStates: [],
      attempts: [],
      flags: [],
    };
    await user.upload(input, new File([JSON.stringify(doc)], 'ada.json', { type: 'application/json' }));

    expect(
      await screen.findByText(
        (_, el) => el?.tagName === 'SPAN' && /^Imported as “Ada \(imported\)”: 9 answers/.test(el.textContent ?? ''),
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('old-q-1')).toBeInTheDocument();
    expect(fetchMock.callsTo('POST /api/profiles/import')[0].body).toMatchObject({ format: 'stack-ready-profile' });
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Learner' })).toHaveValue('p-new'));
  });

  it('rejects a file that is not an export without calling the API', async () => {
    const { fetchMock } = renderApp('/progress');
    const user = userEvent.setup();
    const input = await screen.findByLabelText('Import a learner from an export file');
    await user.upload(input, new File(['{"hello":1}'], 'x.json', { type: 'application/json' }));
    expect(await screen.findByText(/not a Stack Ready export/)).toBeInTheDocument();
    expect(fetchMock.callsTo('POST /api/profiles/import')).toHaveLength(0);
  });

  it('explains 409 last_profile when deleting', async () => {
    renderApp('/progress', {
      'DELETE /api/profiles/:id': {
        status: 409,
        error: { code: 'last_profile', message: 'Cannot delete the last profile.' },
      },
    });
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Delete learner' }));
    await user.click(screen.getByRole('button', { name: 'Yes, delete' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/only learner/);
  });

  it('deleting the active learner falls back to another', async () => {
    renderApp('/progress', { 'DELETE /api/profiles/:id': { status: 204, data: null } });
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Delete learner' }));
    await user.click(screen.getByRole('button', { name: 'Yes, delete' }));
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Learner' })).toHaveValue(profileB.id));
  });
});

describe('flags', () => {
  it('Dashboard and Progress offer a flagged drill', async () => {
    renderApp('/', { 'GET /api/flags': { data: [flag] } });
    expect(await screen.findByRole('link', { name: 'Flagged 1' })).toHaveAttribute('href', '/drill?mode=flagged');
  });

  it('flags a question from the feedback and saves a note', async () => {
    const { fetchMock } = renderApp('/drill?mode=daily', {
      'POST /api/sessions': { data: makeSession([mcq]) },
      'POST /api/answers': { data: makeResult() },
      'PUT /api/questions/:id/flag': (req) => ({
        data: { questionId: req.params.id, note: (req.body as { note?: string }).note ?? '', createdAt: 'now' },
      }),
      'GET /api/questions/:id': {
        data: {
          question: mcq,
          state: {
            attempts: 4,
            correct: 2,
            reps: 1,
            lapses: 1,
            mastered: false,
            due: false,
            dueAt: new Date(Date.now() + 86_400_000 * 6).toISOString(),
            intervalDays: 6,
            lastAnsweredAt: null,
          },
          flag: null,
          reveal: null,
          history: [
            {
              id: 3,
              correct: false,
              gaveUp: false,
              elapsedMs: 1000,
              answeredAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
            },
          ],
        },
      },
    });
    const user = userEvent.setup();
    await screen.findByRole('heading', { level: 2, name: /typeof null/ });
    await user.keyboard('2{Enter}');
    await user.click(await screen.findByRole('button', { name: /Flag for later/ }));
    const toggle = await screen.findByRole('button', { name: /Flagged/ });
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await user.type(screen.getByLabelText('Note for this flag'), 'check the spec');
    await user.click(screen.getByRole('button', { name: 'Save note' }));
    await waitFor(() => expect(fetchMock.callsTo('PUT /api/questions/:id/flag')).toHaveLength(2));
    expect(fetchMock.callsTo('PUT /api/questions/:id/flag')[1].body).toEqual({ note: 'check the spec' });
    // No answer was re-submitted by pressing Enter/clicking inside the flag controls.
    expect(fetchMock.callsTo('POST /api/answers')).toHaveLength(1);

    // The history line loads lazily, on request.
    expect(fetchMock.callsTo('GET /api/questions/:id')).toHaveLength(0);
    await user.click(screen.getByRole('button', { name: 'Your history with this question' }));
    expect(
      await screen.findByText(/Seen 4× · 2\/4 correct · last wrong 3 days ago · next in 6 days/),
    ).toBeInTheDocument();
  });

  it('the module question list marks flagged questions', async () => {
    renderApp('/module/js-values', {
      'GET /api/modules/:id': {
        data: {
          module: {
            id: 'js-values',
            trackId: 'js',
            title: 'Values',
            blurb: '',
            primer: 'Hi',
            objectives: [],
            estMinutes: 6,
          },
          questions: [
            { ...mcq, state: { attempts: 1, correct: 1, mastered: false, due: false, dueAt: null, flagged: true } },
          ],
        },
      },
    });
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /Questions · 2/ }));
    await screen.findByText('Flagged:');
    const list = document.querySelector('.question-list') as HTMLElement;
    expect(within(list).getByText('Flagged:')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Flagged only \(1\)/ })).toBeInTheDocument();
  });
});

describe('shell', () => {
  it('adding a learner mid-drill asks before dropping the session', async () => {
    const { fetchMock } = renderApp('/drill?mode=daily', {
      'POST /api/sessions': { data: makeSession([mcq, { ...mcq, id: 'js-values-9' }]) },
      'POST /api/answers': { data: makeResult() },
      'POST /api/profiles': { status: 201, data: { id: 'p-c', name: 'Cy', createdAt: 'now' } },
    });
    const user = userEvent.setup();
    await screen.findByRole('heading', { level: 2, name: /typeof null/ });
    await user.keyboard('2{Enter}');
    await screen.findByRole('button', { name: 'Next question' });

    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await user.click(screen.getByRole('button', { name: 'New learner' }));
    await user.type(screen.getByLabelText('New learner name'), 'Cy{Enter}');
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(fetchMock.callsTo('POST /api/profiles')).toHaveLength(0);
    // Declined: the drill is untouched.
    expect(screen.getByRole('button', { name: 'Next question' })).toBeInTheDocument();

    confirm.mockReturnValue(true);
    await user.click(screen.getByRole('button', { name: 'Add' }));
    await waitFor(() => expect(fetchMock.callsTo('POST /api/profiles')).toHaveLength(1));
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Learner' })).toHaveValue('p-c'));
  });
});

describe('routes', () => {
  it('an unknown module renders Not found at once and never calls the API', async () => {
    const { fetchMock } = renderApp('/module/..%2Fprogress');
    expect(await screen.findByRole('heading', { name: 'Not found' })).toBeInTheDocument();
    expect(fetchMock.calls.some((c) => c.path.startsWith('/api/modules'))).toBe(false);
    // Still inside the shell: the nav survives.
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe('Not found · Stack Ready'));
  });

  it('the Labs page shows generated counts and survives a module id the curriculum lacks', async () => {
    renderApp('/labs');
    expect(await screen.findByRole('heading', { level: 1, name: 'Code labs' })).toBeInTheDocument();
    // js-classes is not in the test curriculum: it renders as plain text, not a broken link.
    expect(screen.getByText('js-classes')).not.toHaveAttribute('href');
    expect(screen.getByRole('button', { name: /JavaScript — \d+ problems/ })).toHaveAttribute('aria-expanded', 'true');
  });

  it('the dashboard copy follows the curriculum, not a hard-coded seven stages', async () => {
    renderApp('/', { 'GET /api/progress': { data: makeProgress() } });
    expect(await screen.findByText(/^2 stages, 2 modules, 3 questions/)).toBeInTheDocument();
    expect(screen.getByText(/Opens at 35% mastery of “Stage one”/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Daily goal: 0 of 20 answers/ })).toBeInTheDocument();
  });
});

describe('buildHeatmap', () => {
  it('never repeats a date across a DST change and hides future days', () => {
    vi.stubEnv('TZ', 'America/New_York');
    const cells = buildHeatmap([], new Date(2026, 3, 10, 0, 30));
    const dates = cells.map((c) => c.date);
    expect(new Set(dates).size).toBe(dates.length);
    const todayIndex = dates.indexOf('2026-04-10');
    expect(todayIndex).toBeGreaterThan(-1);
    expect(cells.slice(todayIndex + 1).every((c) => c.future)).toBe(true);
    expect(cells[todayIndex].future).toBe(false);
    vi.unstubAllEnvs();
  });
});
