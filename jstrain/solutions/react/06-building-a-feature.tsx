/** Reference solutions for MODULE REACT-06. */
import { useCallback, useMemo, useState } from 'react';

export interface Task {
  id: string;
  title: string;
  assignee: string;
  priority: 1 | 2 | 3;
  done: boolean;
}

export type StatusFilter = 'all' | 'open' | 'done';
export type SortKey = 'title' | 'assignee' | 'priority';
export interface Sort {
  key: SortKey;
  direction: 'asc' | 'desc';
}

export function filterTasks(
  tasks: readonly Task[],
  { query, status }: { query: string; status: StatusFilter },
): Task[] {
  const needle = query.trim().toLowerCase();
  return tasks.filter((task) => {
    const matchesQuery =
      needle === '' ||
      task.title.toLowerCase().includes(needle) ||
      task.assignee.toLowerCase().includes(needle);
    const matchesStatus =
      status === 'all' || (status === 'done' ? task.done : !task.done);
    return matchesQuery && matchesStatus;
  });
}

export function sortTasks(tasks: readonly Task[], sort: Sort): Task[] {
  const factor = sort.direction === 'desc' ? -1 : 1;
  return [...tasks].sort((a, b) => {
    let result: number;
    if (sort.key === 'priority') {
      result = a.priority - b.priority;
    } else {
      result = a[sort.key].localeCompare(b[sort.key]);
    }
    return factor * result || a.title.localeCompare(b.title);
  });
}

export function paginate<T>(
  items: readonly T[],
  page: number,
  pageSize: number,
): { items: T[]; page: number; totalPages: number } {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(1, Math.trunc(page)), totalPages);
  const start = (safePage - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), page: safePage, totalPages };
}

export interface TaskTableState {
  visible: Task[];
  total: number;
  page: number;
  totalPages: number;
  query: string;
  setQuery: (query: string) => void;
  status: StatusFilter;
  setStatus: (status: StatusFilter) => void;
  sort: Sort;
  toggleSort: (key: SortKey) => void;
  setPage: (page: number) => void;
}

export function useTaskTable(tasks: readonly Task[], pageSize = 5): TaskTableState {
  const [query, setQueryState] = useState('');
  const [status, setStatusState] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<Sort>({ key: 'title', direction: 'asc' });
  const [page, setPage] = useState(1);

  const matched = useMemo(() => filterTasks(tasks, { query, status }), [tasks, query, status]);
  const sorted = useMemo(() => sortTasks(matched, sort), [matched, sort]);
  const paged = useMemo(() => paginate(sorted, page, pageSize), [sorted, page, pageSize]);

  const setQuery = useCallback((next: string) => {
    setQueryState(next);
    setPage(1);
  }, []);

  const setStatus = useCallback((next: StatusFilter) => {
    setStatusState(next);
    setPage(1);
  }, []);

  const toggleSort = useCallback((key: SortKey) => {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' },
    );
    setPage(1);
  }, []);

  return {
    visible: paged.items,
    total: matched.length,
    page: paged.page,
    totalPages: paged.totalPages,
    query,
    setQuery,
    status,
    setStatus,
    sort,
    toggleSort,
    setPage,
  };
}

export function SortableHeader({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  sort: Sort;
  onSort: (key: SortKey) => void;
}) {
  const active = sort.key === sortKey;
  const ariaSort = active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none';
  const marker = active ? (sort.direction === 'asc' ? ' ▲' : ' ▼') : '';

  return (
    <th aria-sort={ariaSort}>
      <button type="button" onClick={() => onSort(sortKey)}>
        {label}
        {marker}
      </button>
    </th>
  );
}

export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  return (
    <nav aria-label="Pagination">
      <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Previous
      </button>
      <span>
        Page {page} of {totalPages}
      </span>
      <button type="button" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        Next
      </button>
    </nav>
  );
}

export function TaskRow({
  task,
  onToggle,
}: {
  task: Task;
  onToggle: (id: string, done: boolean) => Promise<void>;
}) {
  const [optimisticDone, setOptimisticDone] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const done = optimisticDone ?? task.done;

  const handleChange = async () => {
    const next = !done;
    setOptimisticDone(next); // show it straight away
    setSaving(true);
    setFailed(false);
    try {
      await onToggle(task.id, next);
    } catch {
      setOptimisticDone(null); // roll back to the prop value
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };

  const id = `task-${task.id}`;
  return (
    <span>
      <label htmlFor={id}>{task.title}</label>
      <input id={id} type="checkbox" checked={done} disabled={saving} onChange={handleChange} />
      {failed && <p role="alert">Could not save</p>}
    </span>
  );
}

export function TaskTable({
  tasks,
  onToggle,
  pageSize = 5,
}: {
  tasks: Task[];
  onToggle: (id: string, done: boolean) => Promise<void>;
  pageSize?: number;
}) {
  const table = useTaskTable(tasks, pageSize);

  return (
    <div>
      <label htmlFor="task-search">Search tasks</label>
      <input
        id="task-search"
        value={table.query}
        onChange={(event) => table.setQuery(event.target.value)}
      />

      <label htmlFor="task-status">Status</label>
      <select
        id="task-status"
        value={table.status}
        onChange={(event) => table.setStatus(event.target.value as StatusFilter)}
      >
        <option value="all">all</option>
        <option value="open">open</option>
        <option value="done">done</option>
      </select>

      <table>
        <thead>
          <tr>
            <SortableHeader
              label="Title"
              sortKey="title"
              sort={table.sort}
              onSort={table.toggleSort}
            />
            <SortableHeader
              label="Assignee"
              sortKey="assignee"
              sort={table.sort}
              onSort={table.toggleSort}
            />
            <SortableHeader
              label="Priority"
              sortKey="priority"
              sort={table.sort}
              onSort={table.toggleSort}
            />
            <th>Done</th>
          </tr>
        </thead>
        <tbody>
          {table.visible.map((task) => (
            <tr key={task.id}>
              <td>{task.title}</td>
              <td>{task.assignee}</td>
              <td>{task.priority}</td>
              <td>
                <TaskRow task={task} onToggle={onToggle} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {table.total === 0 && <p>No tasks match</p>}

      <Pagination page={table.page} totalPages={table.totalPages} onChange={table.setPage} />
      <p data-testid="count">{table.total} tasks</p>
    </div>
  );
}
