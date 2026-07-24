import { act, render, renderHook, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DailyTable, Dashboard, Metric, TopPages, useAnalytics } from '@ex/capstone/02-dashboard';

const raw = [
  { id: 'e1', userId: 'u1', type: 'pageview', path: '/home', durationMs: 100, at: '2024-03-01T01:00:00Z' },
  { id: 'e2', userId: 'u2', type: 'pageview', path: '/home', durationMs: 300, at: '2024-03-01T02:00:00Z' },
  { id: 'e3', userId: 'u1', type: 'click', path: '/pricing', durationMs: 50, at: '2024-03-01T03:00:00Z' },
  {
    id: 'e4',
    userId: 'u3',
    type: 'purchase',
    path: '/checkout',
    durationMs: 900,
    at: '2024-03-02T05:00:00Z',
    revenue: 42.5,
  },
  { id: 'bad', userId: '', type: 'pageview', path: '/x', durationMs: 1, at: '2024-03-01T00:00:00Z' },
];

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

describe('P1 useAnalytics', () => {
  it('loads and builds a report', async () => {
    const loadRaw = vi.fn(async () => raw);
    const { result } = renderHook(() => useAnalytics(loadRaw));
    expect(result.current.status).toBe('loading');

    await flush();
    expect(result.current.status).toBe('ready');
    expect(result.current.report?.totals.events).toBe(4);
    expect(result.current.report?.rejected).toBe(1);
  });

  it('captures an error', async () => {
    // NOTE: the loader must keep a stable identity, or the effect that depends
    // on it re-runs on every render — an infinite loop.
    const failing = async () => Promise.reject(new Error('offline'));
    const { result } = renderHook(() => useAnalytics(failing));
    await flush();
    expect(result.current.status).toBe('error');
    expect(result.current.error?.message).toBe('offline');
    expect(result.current.report).toBe(null);
  });

  it('reloads on demand', async () => {
    const loadRaw = vi.fn(async () => raw);
    const { result } = renderHook(() => useAnalytics(loadRaw));
    await flush();
    expect(loadRaw).toHaveBeenCalledTimes(1);

    await act(async () => {
      result.current.reload();
    });
    await flush();
    expect(loadRaw).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe('ready');
  });

  it('re-derives on an options change WITHOUT re-fetching', async () => {
    const loadRaw = vi.fn(async () => raw);
    const { result, rerender } = renderHook(({ options }) => useAnalytics(loadRaw, options), {
      initialProps: { options: {} as { from?: string } },
    });
    await flush();
    expect(result.current.report?.totals.events).toBe(4);

    rerender({ options: { from: '2024-03-02' } });
    expect(loadRaw).toHaveBeenCalledTimes(1);
    expect(result.current.report?.totals.events).toBe(1);
  });

  it('ignores a stale response', async () => {
    let resolveFirst!: (value: unknown) => void;
    const first = new Promise<unknown>((res) => {
      resolveFirst = res;
    });
    const loaders = [() => first, async () => raw];
    let call = 0;
    const loadRaw = vi.fn(() => loaders[call++]());

    const { result, rerender } = renderHook(({ load }) => useAnalytics(load), {
      initialProps: { load: loadRaw },
    });
    // Swap in a new loader identity, which starts a second request.
    rerender({ load: vi.fn(async () => raw) });
    await flush();
    expect(result.current.report?.totals.events).toBe(4);

    await act(async () => {
      resolveFirst([]);
      await Promise.resolve();
    });
    expect(result.current.report?.totals.events).toBe(4);
  });
});

describe('P2 Metric', () => {
  it('renders a labelled tile', () => {
    render(<Metric label="Events" value={42} />);
    const tile = screen.getByRole('group', { name: 'Events' });
    expect(within(tile).getByTestId('metric-label')).toHaveTextContent('Events');
    expect(within(tile).getByTestId('metric-value')).toHaveTextContent('42');
  });

  it('renders a hint only when given', () => {
    const { unmount } = render(<Metric label="Events" value={1} hint="2 rejected" />);
    expect(screen.getByText('2 rejected')).toBeInTheDocument();
    unmount();

    render(<Metric label="Events" value={1} />);
    expect(screen.queryByText('2 rejected')).not.toBeInTheDocument();
  });
});

describe('P3 DailyTable', () => {
  const days = [
    {
      day: '2024-03-01',
      events: 3,
      uniqueUsers: 2,
      byType: { pageview: 2, click: 1, purchase: 0 },
      revenue: 0,
      p95DurationMs: 300,
    },
    {
      day: '2024-03-02',
      events: 1,
      uniqueUsers: 1,
      byType: { pageview: 0, click: 0, purchase: 1 },
      revenue: 42.5,
      p95DurationMs: 900,
    },
  ];

  it('renders one row per day', () => {
    render(<DailyTable days={days} />);
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(3); // header + 2
    expect(within(rows[1]).getAllByRole('cell').map((c) => c.textContent)).toEqual([
      '2024-03-01',
      '3',
      '2',
      '$0.00',
    ]);
    expect(within(rows[2]).getAllByRole('cell')[3]).toHaveTextContent('$42.50');
  });

  it('has a caption', () => {
    render(<DailyTable days={days} />);
    expect(screen.getByRole('table', { name: 'Daily breakdown' })).toBeInTheDocument();
  });

  it('shows an empty state instead of an empty table', () => {
    render(<DailyTable days={[]} />);
    expect(screen.getByText('No activity')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});

describe('P4 TopPages', () => {
  it('renders an ordered list', () => {
    render(
      <TopPages
        pages={[
          { path: '/home', events: 3, uniqueUsers: 2 },
          { path: '/pricing', events: 1, uniqueUsers: 1 },
        ]}
      />,
    );
    expect(screen.getByRole('list')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      '/home — 3 events',
      '/pricing — 1 events',
    ]);
  });

  it('renders nothing when empty', () => {
    const { container } = render(<TopPages pages={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('P5 Dashboard', () => {
  it('shows a loading state, then the report', async () => {
    render(<Dashboard loadRaw={async () => raw} />);
    expect(screen.getByText('Loading analytics…')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    expect(await screen.findByRole('group', { name: 'Events' })).toHaveTextContent('4');
    expect(screen.getByRole('group', { name: 'Users' })).toHaveTextContent('3');
    expect(screen.getByRole('group', { name: 'Revenue' })).toHaveTextContent('$42.50');
    expect(screen.getByRole('table', { name: 'Daily breakdown' })).toBeInTheDocument();
  });

  it('reports rejected records as a hint', async () => {
    render(<Dashboard loadRaw={async () => raw} />);
    expect(await screen.findByText('1 rejected')).toBeInTheDocument();
  });

  it('omits the hint when nothing was rejected', async () => {
    render(<Dashboard loadRaw={async () => raw.slice(0, 3)} />);
    await screen.findByRole('group', { name: 'Events' });
    expect(screen.queryByText(/rejected/)).not.toBeInTheDocument();
  });

  it('filters by date without re-fetching', async () => {
    const user = userEvent.setup({ delay: null });
    const loadRaw = vi.fn(async () => raw);
    render(<Dashboard loadRaw={loadRaw} />);
    await screen.findByRole('group', { name: 'Events' });
    expect(loadRaw).toHaveBeenCalledTimes(1);

    await user.type(screen.getByLabelText('From'), '2024-03-02');
    expect(screen.getByRole('group', { name: 'Events' })).toHaveTextContent('1');
    expect(loadRaw).toHaveBeenCalledTimes(1);
  });

  it('refreshes on demand', async () => {
    const user = userEvent.setup({ delay: null });
    const loadRaw = vi.fn(async () => raw);
    render(<Dashboard loadRaw={loadRaw} />);
    await screen.findByRole('group', { name: 'Events' });

    await user.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(loadRaw).toHaveBeenCalledTimes(2);
  });

  it('shows an error with a retry', async () => {
    const user = userEvent.setup({ delay: null });
    let attempt = 0;
    const loadRaw = vi.fn(async () => {
      attempt += 1;
      if (attempt === 1) throw new Error('offline');
      return raw;
    });

    render(<Dashboard loadRaw={loadRaw} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('offline');

    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('group', { name: 'Events' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('always shows the heading', async () => {
    render(<Dashboard loadRaw={async () => []} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Analytics' })).toBeInTheDocument();
    await flush(); // let the load settle before the test ends
  });
});
