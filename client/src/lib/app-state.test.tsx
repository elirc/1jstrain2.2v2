import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { deferred, mockFetch, type MockResult } from '../test/fetchMock';
import { baseRoutes, makeProgress, profileA, profileB, renderApp } from '../test/fixtures';
import { AppProvider, useApp } from './app-state';

function Probe() {
  const app = useApp();
  return (
    <div>
      <p data-testid="who">{app.profile?.name ?? 'none'}</p>
      <p data-testid="xp">{app.progress ? String(app.progress.xp) : 'no progress'}</p>
      <p data-testid="boot">{app.bootError ?? 'ok'}</p>
      <p data-testid="notice">{app.notice ?? ''}</p>
      <button type="button" onClick={() => void app.refreshProgress()}>
        refresh
      </button>
      <button type="button" onClick={() => app.selectProfile(profileB.id)}>
        switch
      </button>
      <button type="button" onClick={app.dismissNotice}>
        dismiss
      </button>
    </div>
  );
}

function renderProbe() {
  return render(
    <AppProvider>
      <Probe />
    </AppProvider>,
  );
}

describe('app state', () => {
  // 34 (B3)
  it('a stale stored profile id falls back to the first profile with no error screen', async () => {
    localStorage.setItem('stack-ready:profile-id', 'deleted-long-ago');
    const { fetchMock } = renderApp('/', {
      'GET /api/progress': (req) =>
        req.headers['x-profile-id'] === profileA.id
          ? { data: makeProgress({ xp: 42 }) }
          : { status: 404, error: { code: 'not_found', message: 'No such profile.' } },
    });

    expect(await screen.findByRole('heading', { name: 'Beginner' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
    // Progress was never requested for the stale id: boot resolved the profile first.
    const ids = fetchMock.callsTo('GET /api/progress').map((c) => c.headers['x-profile-id']);
    expect(ids).not.toContain('deleted-long-ago');
    expect(localStorage.getItem('stack-ready:profile-id')).toBe(profileA.id);
  });

  it('forgets a profile that 404s on progress and falls back to the next one', async () => {
    localStorage.setItem('stack-ready:profile-id', profileB.id);
    mockFetch(
      baseRoutes({
        'GET /api/progress': (req) =>
          req.headers['x-profile-id'] === profileB.id
            ? { status: 404, error: { code: 'not_found', message: 'No such profile.' } }
            : { data: makeProgress({ xp: 7 }) },
      }),
    );
    renderProbe();
    await waitFor(() => expect(screen.getByTestId('xp')).toHaveTextContent('7'));
    expect(screen.getByTestId('who')).toHaveTextContent('Ada');
    expect(screen.getByTestId('boot')).toHaveTextContent('ok');
  });

  // 35 (B5)
  it('a failed progress refresh keeps the page and shows a dismissible error', async () => {
    let fail = false;
    mockFetch(
      baseRoutes({
        'GET /api/progress': () =>
          fail
            ? { status: 500, error: { code: 'internal_error', message: 'Database is locked.' } }
            : { data: makeProgress({ xp: 5 }) },
      }),
    );
    renderProbe();
    await waitFor(() => expect(screen.getByTestId('xp')).toHaveTextContent('5'));

    fail = true;
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'refresh' }));
    await waitFor(() => expect(screen.getByTestId('notice')).toHaveTextContent('Database is locked.'));
    expect(screen.getByTestId('xp')).toHaveTextContent('5'); // last good value kept
    expect(screen.getByTestId('boot')).toHaveTextContent('ok'); // not promoted to fatal

    await user.click(screen.getByRole('button', { name: 'dismiss' }));
    expect(screen.getByTestId('notice')).toHaveTextContent('');
  });

  it('a boot failure offers Retry, which recovers', async () => {
    let up = false;
    renderApp('/', {
      'GET /api/curriculum': (): MockResult =>
        up
          ? { data: (baseRoutes()['GET /api/curriculum'] as { data: unknown }).data }
          : { status: 500, error: { code: 'internal_error', message: 'Boom' } },
    });
    const retry = await screen.findByRole('button', { name: 'Try again' });
    up = true;
    await userEvent.setup().click(retry);
    expect(await screen.findByRole('heading', { name: 'Beginner' })).toBeInTheDocument();
  });

  // 36 (B22)
  it('a late progress response for a previous profile is ignored', async () => {
    const lateA = deferred<MockResult>();
    let firstA = true;
    mockFetch(
      baseRoutes({
        'GET /api/progress': (req) => {
          if (req.headers['x-profile-id'] === profileB.id) return { data: makeProgress({ xp: 222 }) };
          if (firstA) {
            firstA = false;
            return { data: makeProgress({ xp: 111 }) };
          }
          return lateA.promise; // the refresh for A, answered after the switch
        },
      }),
    );
    renderProbe();
    await waitFor(() => expect(screen.getByTestId('xp')).toHaveTextContent('111'));

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'refresh' })); // A's refresh, pending
    await user.click(screen.getByRole('button', { name: 'switch' }));
    await waitFor(() => expect(screen.getByTestId('xp')).toHaveTextContent('222'));

    await act(async () => {
      lateA.resolve({ data: makeProgress({ xp: 999 }) });
      await lateA.promise;
    });
    expect(screen.getByTestId('who')).toHaveTextContent('Bo');
    expect(screen.getByTestId('xp')).toHaveTextContent('222');
  });
});
