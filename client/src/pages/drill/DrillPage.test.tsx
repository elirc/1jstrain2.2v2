import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { deferred, type MockResult } from '../../test/fetchMock';
import { makeProgress, makeResult, makeSession, mcq, multi, renderApp, short } from '../../test/fixtures';

async function startDrill(path: string, handlers: Parameters<typeof renderApp>[1]) {
  const app = renderApp(path, handlers);
  await screen.findByRole('heading', { level: 2, name: /typeof null|Which are falsy|not found/ });
  return { ...app, user: userEvent.setup() };
}

const statusText = () =>
  screen
    .getAllByRole('status')
    .map((el) => el.textContent ?? '')
    .join(' | ');

describe('DrillPage', () => {
  // 21 (B4, B13) + 37
  it('digit selects a choice and a double Enter submits exactly once, with the choice id', async () => {
    const gate = deferred<MockResult>();
    const { user, fetchMock } = await startDrill('/drill?mode=daily', {
      'POST /api/sessions': { data: makeSession([mcq, multi]) },
      'POST /api/answers': () => gate.promise,
    });

    await user.keyboard('2');
    expect(screen.getByRole('radio', { name: /"object"/ })).toBeChecked();

    await user.keyboard('{Enter}{Enter}');
    await act(async () => {
      gate.resolve({ data: makeResult() });
      await gate.promise;
    });

    const posts = fetchMock.callsTo('POST /api/answers');
    expect(posts).toHaveLength(1);
    expect(posts[0].body).toMatchObject({ questionId: 'js-values-1', response: 'js-values-1-c0' });
    // The session request left `limit` out, so the learner's sessionSize applies.
    expect(fetchMock.callsTo('POST /api/sessions')[0].body).toEqual({ mode: 'daily' });
  });

  // 22 (B4)
  it('Enter on a focused nav link navigates instead of submitting', async () => {
    const { user, fetchMock, router } = await startDrill('/drill?mode=daily', {
      'POST /api/sessions': { data: makeSession([mcq]) },
    });
    await user.keyboard('2');
    screen.getByRole('link', { name: 'Tracks' }).focus();
    await user.keyboard('{Enter}');
    await waitFor(() => expect(router.state.location.pathname).toBe('/tracks'));
    expect(fetchMock.callsTo('POST /api/answers')).toHaveLength(0);
  });

  // 23
  it('digits typed into the short-answer box stay in the box', async () => {
    const { user, fetchMock } = await startDrill('/drill?mode=daily', {
      'POST /api/sessions': { data: makeSession([short]) },
      'POST /api/answers': { data: makeResult({ answer: ['404'], answerChoiceIds: undefined }) },
    });
    const input = screen.getByRole('textbox', { name: 'Your answer' });
    expect(input).toHaveFocus();
    await user.keyboard('404');
    expect(input).toHaveValue('404');
    expect(fetchMock.callsTo('POST /api/answers')).toHaveLength(0);
    await user.keyboard('{Enter}');
    await waitFor(() => expect(fetchMock.callsTo('POST /api/answers')).toHaveLength(1));
    expect(fetchMock.callsTo('POST /api/answers')[0].body).toMatchObject({ response: '404' });
  });

  // 24 (B4)
  it('Ctrl+1 is not intercepted', async () => {
    await startDrill('/drill?mode=daily', { 'POST /api/sessions': { data: makeSession([mcq]) } });
    const notPrevented = fireEvent.keyDown(document.body, { key: '1', ctrlKey: true });
    expect(notPrevented).toBe(true);
    expect(screen.getAllByRole('radio').some((r) => (r as HTMLInputElement).checked)).toBe(false);
    // Autorepeat is ignored as well.
    expect(fireEvent.keyDown(document.body, { key: '1', repeat: true })).toBe(true);
  });

  // 25 (B1)
  it('"Another round" starts a new session with the same scope', async () => {
    const { user, fetchMock } = await startDrill('/drill?mode=track&trackId=js', {
      'POST /api/sessions': { data: makeSession([mcq], { mode: 'track', trackId: 'js' }) },
      'POST /api/answers': { data: makeResult() },
    });
    await user.click(screen.getByRole('radio', { name: /"object"/ }));
    await user.click(screen.getByRole('button', { name: 'Check answer' }));
    await user.click(await screen.findByRole('button', { name: 'Finish' }));
    await user.click(await screen.findByRole('button', { name: 'Another round' }));
    await waitFor(() => expect(fetchMock.callsTo('POST /api/sessions')).toHaveLength(2));
    expect(fetchMock.callsTo('POST /api/sessions')[1].body).toEqual({ mode: 'track', trackId: 'js' });
    expect(await screen.findByRole('heading', { level: 2, name: /typeof null/ })).toBeInTheDocument();
  });

  // 26 (B14)
  it('the verdict is announced', async () => {
    const { user, fetchMock } = await startDrill('/drill?mode=daily', {
      'POST /api/sessions': { data: makeSession([mcq, multi]) },
      'POST /api/answers': { data: makeResult() },
    });
    await user.keyboard('2{Enter}');
    await waitFor(() => expect(statusText()).toMatch(/Correct/));
    expect(statusText()).toMatch(/learned · back in 1 day/);
    // Progress refreshes from the event path, right after the grade (J32).
    await waitFor(() => expect(fetchMock.callsTo('GET /api/progress').length).toBeGreaterThanOrEqual(2));
    expect(screen.getByRole('button', { name: 'Next question' })).toHaveFocus();
  });

  // 27 (B19)
  it('a wrong multi answer marks the missed correct choice', async () => {
    const { user } = await startDrill('/drill?mode=daily', {
      'POST /api/sessions': { data: makeSession([multi]) },
      'POST /api/answers': {
        data: makeResult({
          correct: false,
          outcome: 'failed',
          xpEarned: 2,
          answer: [0, 1],
          answerChoiceIds: ['js-values-2-c1', 'js-values-2-c0'],
          intervalDays: 0,
          nextDueAt: new Date(Date.now() + 10 * 60_000).toISOString(),
        }),
      },
    });
    await user.click(screen.getByRole('checkbox', { name: /`0`|^0/ }));
    await user.click(screen.getByRole('button', { name: 'Check answer' }));
    await waitFor(() => expect(statusText()).toMatch(/Not quite/));
    const missed = screen.getByRole('checkbox', { name: /missed/ });
    expect(missed).toHaveAccessibleName(/""/);
    expect(missed.closest('label')).toHaveClass('is-missed');
    expect(screen.getByRole('checkbox', { name: /your answer, correct/ })).toBeChecked();
    // Still focusable after grading, not disabled.
    expect(missed).not.toBeDisabled();
    expect(statusText()).toMatch(/back in 10 minutes/);
  });

  // 38
  it('a practice outcome says the schedule is unchanged, not "back in Nd"', async () => {
    const { user } = await startDrill('/drill?mode=daily', {
      'POST /api/sessions': { data: makeSession([{ ...mcq, reason: 'practice' }]) },
      'POST /api/answers': {
        data: makeResult({
          outcome: 'practice',
          xpEarned: 1,
          intervalDays: 4,
          nextDueAt: new Date(Date.now() + 3 * 86_400_000).toISOString(),
        }),
      },
    });
    expect(screen.getByText('extra practice')).toBeInTheDocument();
    await user.keyboard('2{Enter}');
    await waitFor(() => expect(statusText()).toMatch(/your schedule is unchanged · still due in 3 days/));
    expect(statusText()).not.toMatch(/back in/);
  });

  it('"Show me the answer" (key 0) gives up and reveals', async () => {
    const { user, fetchMock } = await startDrill('/drill?mode=daily', {
      'POST /api/sessions': { data: makeSession([mcq, multi]) },
      'POST /api/answers': {
        data: makeResult({ correct: false, outcome: 'failed', xpEarned: 0, intervalDays: 0 }),
      },
    });
    await user.keyboard('0');
    await waitFor(() => expect(statusText()).toMatch(/Answer shown/));
    const body = fetchMock.callsTo('POST /api/answers')[0].body as Record<string, unknown>;
    expect(body).toMatchObject({ questionId: 'js-values-1', giveUp: true });
    expect('response' in body).toBe(false);
    expect(screen.getByRole('radio', { name: /correct answer/ })).toHaveAccessibleName(/"object"/);
  });

  it('an invalid_response keeps the draft and shows an inline error', async () => {
    const { user } = await startDrill('/drill?mode=daily', {
      'POST /api/sessions': { data: makeSession([mcq]) },
      'POST /api/answers': {
        status: 400,
        error: { code: 'invalid_response', message: 'Unknown choice id.' },
      },
    });
    await user.keyboard('2{Enter}');
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/Nothing was recorded/);
    expect(screen.getByRole('radio', { name: /"object"/ })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Check answer' })).toBeEnabled();
  });

  it('order questions render the server order and move items with focus kept', async () => {
    const orderQ = {
      id: 'o',
      moduleId: 'js-values',
      trackId: 'js' as const,
      type: 'order' as const,
      difficulty: 1 as const,
      prompt: 'Order these',
      choices: [
        { id: 'o-c2', text: 'third' },
        { id: 'o-c0', text: 'first' },
        { id: 'o-c1', text: 'second' },
      ],
      tags: [],
    };
    const { fetchMock } = renderApp('/drill?mode=daily', {
      'POST /api/sessions': { data: makeSession([orderQ]) },
      'POST /api/answers': {
        data: makeResult({ correct: true, answer: [0, 1, 2], answerChoiceIds: ['o-c0', 'o-c1', 'o-c2'] }),
      },
    });
    const u = userEvent.setup();
    const list = await screen.findByRole('list', { name: 'Items to order' });
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((li) => li.textContent?.slice(1, 6)),
    ).toEqual(['third', 'first', 'secon']);
    const down = screen.getByRole('button', { name: 'Move “third” down' });
    await u.click(down);
    expect(screen.getByRole('button', { name: 'Move “third” down' })).toHaveFocus();
    expect(statusText()).toMatch(/Moved “third” to position 2 of 3/);
    await u.click(screen.getByRole('button', { name: 'Move “third” down' }));
    // At the bottom the down button is disabled, so focus moves to its sibling.
    expect(screen.getByRole('button', { name: 'Move “third” up' })).toHaveFocus();
    await u.click(screen.getByRole('button', { name: 'Check answer' }));
    await waitFor(() => expect(fetchMock.callsTo('POST /api/answers')).toHaveLength(1));
    expect(fetchMock.callsTo('POST /api/answers')[0].body).toMatchObject({ response: ['o-c0', 'o-c1', 'o-c2'] });
  });

  it('a milestone whose refresh lands after moving on is announced once, on the card on screen', async () => {
    // The first progress load is the baseline; every refresh is held back and
    // then answers "level 2". A fast learner presses Enter before it lands.
    const gate = deferred<MockResult>();
    let progressCalls = 0;
    const { user, fetchMock } = await startDrill('/drill?mode=daily', {
      'GET /api/progress': () => (++progressCalls === 1 ? { data: makeProgress() } : gate.promise),
      'POST /api/sessions': { data: makeSession([mcq, multi]) },
      'POST /api/answers': { data: makeResult() },
    });

    await user.keyboard('2{Enter}');
    await waitFor(() => expect(statusText()).toMatch(/Correct/));
    await user.keyboard('{Enter}'); // next, before the refresh has landed
    await screen.findByRole('heading', { level: 2, name: /Which are falsy/ });
    expect(screen.queryByText(/Level up/)).toBeNull();

    await act(async () => {
      gate.resolve({
        data: makeProgress({
          level: { level: 2, title: 'Junior', xp: 100, nextTitle: 'Mid', nextAtXp: 300, progressToNext: 0 },
        }),
      });
      await gate.promise;
    });
    // The line lands on the card that is on screen, not on the one that earned it.
    expect(await screen.findByText(/Level up: Junior/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /Which are falsy/ })).toBeInTheDocument();

    // Answering the second question refreshes again with the same snapshot: no repeat.
    await user.click(screen.getByRole('checkbox', { name: /`0`|^0/ }));
    await user.keyboard('{Enter}');
    await waitFor(() => expect(fetchMock.callsTo('POST /api/answers')).toHaveLength(2));
    await waitFor(() => expect(fetchMock.callsTo('GET /api/progress').length).toBeGreaterThanOrEqual(3));
    await waitFor(() => expect(statusText()).toMatch(/Correct/));
    expect(screen.getAllByText(/Level up: Junior/)).toHaveLength(1);
  });

  it('navigating to the same drill URL mid-session asks first, because the route remounts', async () => {
    const { user, fetchMock, router } = await startDrill('/drill?mode=daily', {
      'POST /api/sessions': { data: makeSession([mcq, multi]) },
      'POST /api/answers': { data: makeResult() },
    });
    await user.keyboard('2{Enter}');
    await waitFor(() => expect(statusText()).toMatch(/Correct/));

    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await act(async () => {
      await router.navigate('/drill?mode=daily');
    });
    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    // Declined: the graded card is still there and no second session was started.
    expect(statusText()).toMatch(/Correct/);
    expect(fetchMock.callsTo('POST /api/sessions')).toHaveLength(1);

    confirm.mockReturnValue(true);
    await act(async () => {
      await router.navigate('/drill?mode=daily');
    });
    await waitFor(() => expect(fetchMock.callsTo('POST /api/sessions')).toHaveLength(2));
  });

  it('the short-answer hint row does not advertise 0 while the answer box has focus', async () => {
    await startDrill('/drill?mode=daily', { 'POST /api/sessions': { data: makeSession([short]) } });
    // Focus lands in an effect after mount, so wait for it rather than asserting synchronously.
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Your answer' })).toHaveFocus());
    expect(document.querySelector('.kbd-hints')?.textContent).not.toMatch(/show answer/);
    // The button is still there for the mouse and for Tab.
    expect(screen.getByRole('button', { name: 'Show me the answer' })).toBeInTheDocument();
  });

  it('the summary shows a typed answer verbatim, not as Markdown', async () => {
    const { user } = await startDrill('/drill?mode=daily', {
      'POST /api/sessions': { data: makeSession([short]) },
      'POST /api/answers': {
        data: makeResult({
          correct: false,
          outcome: 'failed',
          xpEarned: 2,
          answer: ['`404`'],
          answerChoiceIds: undefined,
        }),
      },
    });
    await user.keyboard('*x*`{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Finish' }));
    const yours = await screen.findByText('*x*`', { selector: 'code' });
    expect(yours).toBeInTheDocument();
    expect(screen.getByText('`404`', { selector: 'code' })).toBeInTheDocument();
    expect(document.querySelector('.summary-answers em')).toBeNull();
  });
});
