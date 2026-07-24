import { act, render, renderHook, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  filterTasks,
  Pagination,
  paginate,
  SortableHeader,
  sortTasks,
  TaskRow,
  TaskTable,
  useTaskTable,
  type Sort,
  type Task,
} from '@ex/react/06-building-a-feature';

const task = (id: string, title: string, assignee: string, priority: 1 | 2 | 3, done = false): Task => ({
  id,
  title,
  assignee,
  priority,
  done,
});

const tasks: Task[] = [
  task('1', 'Write docs', 'ada', 2),
  task('2', 'Fix login', 'bob', 1, true),
  task('3', 'Add tests', 'ada', 3),
  task('4', 'Review PR', 'cyd', 1),
  task('5', 'Ship release', 'bob', 2, true),
  task('6', 'Plan sprint', 'ada', 3),
];

describe('P1 filterTasks', () => {
  it('matches title or assignee, case-insensitively', () => {
    expect(filterTasks(tasks, { query: 'ADA', status: 'all' }).map((t) => t.id)).toEqual([
      '1',
      '3',
      '6',
    ]);
    expect(filterTasks(tasks, { query: 'login', status: 'all' }).map((t) => t.id)).toEqual(['2']);
  });

  it('trims the query and treats an empty one as "everything"', () => {
    expect(filterTasks(tasks, { query: '   ', status: 'all' })).toHaveLength(6);
    expect(filterTasks(tasks, { query: '  ada  ', status: 'all' })).toHaveLength(3);
  });

  it('filters by status', () => {
    expect(filterTasks(tasks, { query: '', status: 'done' }).map((t) => t.id)).toEqual(['2', '5']);
    expect(filterTasks(tasks, { query: '', status: 'open' })).toHaveLength(4);
  });

  it('combines both filters', () => {
    expect(filterTasks(tasks, { query: 'bob', status: 'open' })).toHaveLength(0);
  });

  it('does not mutate the input', () => {
    const copy = [...tasks];
    filterTasks(tasks, { query: 'a', status: 'all' });
    expect(tasks).toEqual(copy);
  });
});

describe('P2 sortTasks', () => {
  it('sorts by title', () => {
    expect(sortTasks(tasks, { key: 'title', direction: 'asc' })[0].title).toBe('Add tests');
    expect(sortTasks(tasks, { key: 'title', direction: 'desc' })[0].title).toBe('Write docs');
  });

  it('sorts by priority numerically', () => {
    expect(sortTasks(tasks, { key: 'priority', direction: 'asc' }).map((t) => t.priority)).toEqual([
      1, 1, 2, 2, 3, 3,
    ]);
  });

  it('breaks ties by title', () => {
    const sorted = sortTasks(tasks, { key: 'assignee', direction: 'asc' });
    expect(sorted.slice(0, 3).map((t) => t.title)).toEqual([
      'Add tests',
      'Plan sprint',
      'Write docs',
    ]);
  });

  it('does not mutate the input', () => {
    const copy = [...tasks];
    sortTasks(tasks, { key: 'title', direction: 'desc' });
    expect(tasks).toEqual(copy);
  });
});

describe('P3 paginate', () => {
  const items = [1, 2, 3, 4, 5, 6, 7];

  it('slices a page', () => {
    expect(paginate(items, 1, 3)).toEqual({ items: [1, 2, 3], page: 1, totalPages: 3 });
    expect(paginate(items, 3, 3)).toEqual({ items: [7], page: 3, totalPages: 3 });
  });

  it('clamps an out-of-range page', () => {
    expect(paginate(items, 99, 3).page).toBe(3);
    expect(paginate(items, 0, 3).page).toBe(1);
    expect(paginate(items, -5, 3).items).toEqual([1, 2, 3]);
  });

  it('always reports at least one page', () => {
    expect(paginate([], 1, 3)).toEqual({ items: [], page: 1, totalPages: 1 });
  });
});

describe('P4 useTaskTable', () => {
  it('paginates the sorted, filtered list', () => {
    const { result } = renderHook(() => useTaskTable(tasks, 2));
    expect(result.current.total).toBe(6);
    expect(result.current.totalPages).toBe(3);
    expect(result.current.visible.map((t) => t.title)).toEqual(['Add tests', 'Fix login']);
  });

  it('filters and resets to page 1', () => {
    const { result } = renderHook(() => useTaskTable(tasks, 2));
    act(() => result.current.setPage(3));
    expect(result.current.page).toBe(3);

    act(() => result.current.setQuery('ada'));
    expect(result.current.page).toBe(1);
    expect(result.current.total).toBe(3);
  });

  it('filters by status', () => {
    const { result } = renderHook(() => useTaskTable(tasks, 10));
    act(() => result.current.setStatus('done'));
    expect(result.current.visible.map((t) => t.id)).toEqual(['2', '5']);
  });

  it('toggles the sort direction on the same key', () => {
    const { result } = renderHook(() => useTaskTable(tasks, 10));
    expect(result.current.sort).toEqual({ key: 'title', direction: 'asc' });

    act(() => result.current.toggleSort('title'));
    expect(result.current.sort).toEqual({ key: 'title', direction: 'desc' });

    act(() => result.current.toggleSort('priority'));
    expect(result.current.sort).toEqual({ key: 'priority', direction: 'asc' });
  });

  it('clamps the page when the filter shrinks the list', () => {
    const { result } = renderHook(() => useTaskTable(tasks, 2));
    act(() => result.current.setPage(3));
    act(() => result.current.setStatus('done'));
    expect(result.current.page).toBe(1);
    expect(result.current.visible).toHaveLength(2);
  });
});

describe('P5 SortableHeader', () => {
  const renderHeader = (sort: Sort, onSort = vi.fn()) => {
    render(
      <table>
        <thead>
          <tr>
            <SortableHeader label="Title" sortKey="title" sort={sort} onSort={onSort} />
          </tr>
        </thead>
      </table>,
    );
    return onSort;
  };

  it('marks the active ascending column', () => {
    renderHeader({ key: 'title', direction: 'asc' });
    expect(screen.getByRole('columnheader')).toHaveAttribute('aria-sort', 'ascending');
    expect(screen.getByRole('button')).toHaveTextContent('Title ▲');
  });

  it('marks the active descending column', () => {
    renderHeader({ key: 'title', direction: 'desc' });
    expect(screen.getByRole('columnheader')).toHaveAttribute('aria-sort', 'descending');
    expect(screen.getByRole('button')).toHaveTextContent('Title ▼');
  });

  it('shows no marker on an inactive column', () => {
    renderHeader({ key: 'priority', direction: 'asc' });
    expect(screen.getByRole('columnheader')).toHaveAttribute('aria-sort', 'none');
    expect(screen.getByRole('button').textContent).toBe('Title');
  });

  it('reports clicks', async () => {
    const user = userEvent.setup({ delay: null });
    const onSort = renderHeader({ key: 'priority', direction: 'asc' });
    await user.click(screen.getByRole('button'));
    expect(onSort).toHaveBeenCalledWith('title');
  });
});

describe('P6 Pagination', () => {
  it('disables Previous on the first page', () => {
    render(<Pagination page={1} totalPages={3} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
  });

  it('disables Next on the last page', () => {
    render(<Pagination page={3} totalPages={3} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('reports page changes', async () => {
    const user = userEvent.setup({ delay: null });
    const onChange = vi.fn();
    render(<Pagination page={2} totalPages={3} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(onChange).toHaveBeenCalledWith(3);
    await user.click(screen.getByRole('button', { name: 'Previous' }));
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('is a labelled landmark', () => {
    render(<Pagination page={1} totalPages={1} onChange={vi.fn()} />);
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument();
  });
});

describe('P7 TaskRow — optimistic updates', () => {
  it('flips immediately, before the save resolves', async () => {
    const user = userEvent.setup({ delay: null });
    let resolve!: () => void;
    const onToggle = vi.fn(() => new Promise<void>((res) => (resolve = res)));

    render(<TaskRow task={task('1', 'Write docs', 'ada', 1)} onToggle={onToggle} />);
    const checkbox = screen.getByLabelText('Write docs');
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);
    expect(checkbox).toBeChecked(); // optimistic — the promise is still pending
    expect(onToggle).toHaveBeenCalledWith('1', true);

    await act(async () => {
      resolve();
    });
    expect(checkbox).toBeChecked();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('disables the checkbox while saving', async () => {
    const user = userEvent.setup({ delay: null });
    let resolve!: () => void;
    render(
      <TaskRow
        task={task('1', 'Write docs', 'ada', 1)}
        onToggle={() => new Promise<void>((res) => (resolve = res))}
      />,
    );
    await user.click(screen.getByLabelText('Write docs'));
    expect(screen.getByLabelText('Write docs')).toBeDisabled();

    await act(async () => {
      resolve();
    });
    expect(screen.getByLabelText('Write docs')).toBeEnabled();
  });

  it('rolls back and warns when the save fails', async () => {
    const user = userEvent.setup({ delay: null });
    const onToggle = vi.fn(async () => Promise.reject(new Error('offline')));

    render(<TaskRow task={task('1', 'Write docs', 'ada', 1)} onToggle={onToggle} />);
    await user.click(screen.getByLabelText('Write docs'));

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save');
    expect(screen.getByLabelText('Write docs')).not.toBeChecked();
  });

  it('starts from the task prop', () => {
    render(<TaskRow task={task('1', 'Done thing', 'ada', 1, true)} onToggle={vi.fn()} />);
    expect(screen.getByLabelText('Done thing')).toBeChecked();
  });
});

describe('P8 TaskTable', () => {
  const noop = async () => {};

  it('renders a page of tasks with a count', () => {
    render(<TaskTable tasks={tasks} onToggle={noop} pageSize={2} />);
    expect(screen.getByTestId('count')).toHaveTextContent('6 tasks');
    expect(screen.getAllByRole('row')).toHaveLength(3); // header + 2 rows
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
  });

  it('searches', async () => {
    const user = userEvent.setup({ delay: null });
    render(<TaskTable tasks={tasks} onToggle={noop} pageSize={10} />);
    await user.type(screen.getByLabelText('Search tasks'), 'cyd');
    expect(screen.getByTestId('count')).toHaveTextContent('1 tasks');
    expect(screen.getAllByRole('row')).toHaveLength(2);
  });

  it('filters by status', async () => {
    const user = userEvent.setup({ delay: null });
    render(<TaskTable tasks={tasks} onToggle={noop} pageSize={10} />);
    await user.selectOptions(screen.getByLabelText('Status'), 'done');
    expect(screen.getByTestId('count')).toHaveTextContent('2 tasks');
  });

  it('sorts when a header is clicked', async () => {
    const user = userEvent.setup({ delay: null });
    render(<TaskTable tasks={tasks} onToggle={noop} pageSize={10} />);
    const firstCell = () => within(screen.getAllByRole('row')[1]).getAllByRole('cell')[0];
    expect(firstCell()).toHaveTextContent('Add tests');

    await user.click(screen.getByRole('button', { name: /^Title/ }));
    expect(firstCell()).toHaveTextContent('Write docs');
  });

  it('pages through the list', async () => {
    const user = userEvent.setup({ delay: null });
    render(<TaskTable tasks={tasks} onToggle={noop} pageSize={5} />);
    expect(screen.getAllByRole('row')).toHaveLength(6);

    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(2);
  });

  it('shows an empty state', async () => {
    const user = userEvent.setup({ delay: null });
    render(<TaskTable tasks={tasks} onToggle={noop} pageSize={10} />);
    await user.type(screen.getByLabelText('Search tasks'), 'nothing matches this');
    expect(screen.getByText('No tasks match')).toBeInTheDocument();
    expect(screen.getByTestId('count')).toHaveTextContent('0 tasks');
  });

  it('toggles a task through the row', async () => {
    const user = userEvent.setup({ delay: null });
    const onToggle = vi.fn(async () => {});
    render(<TaskTable tasks={tasks} onToggle={onToggle} pageSize={10} />);

    await user.click(screen.getByLabelText('Review PR'));
    expect(onToggle).toHaveBeenCalledWith('4', true);
  });
});
