/**
 * MODULE REACT-06 — Building a real feature
 * ==========================================
 *
 * One feature, built the way you would at work: pure helpers first, then a
 * hook that owns the state, then dumb components, then the screen that wires
 * them together. Each layer is testable on its own — which is exactly why it
 * is built this way.
 *
 * The feature: a task table with search, status filter, sorting, pagination
 * and an optimistic "done" toggle.
 *
 * Run:  npx vitest run tests/react/06-building-a-feature.test.tsx
 */
import { useCallback, useMemo, useState, type ReactNode } from 'react';

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

/**
 * PROBLEM 1 — A pure filter.
 *
 * Keep tasks whose title OR assignee contains `query` (case-insensitive,
 * trimmed) and which match `status`. An empty query matches everything.
 * Never mutate the input.
 */
export function filterTasks(
  tasks: readonly Task[],
  { query, status }: { query: string; status: StatusFilter },
): Task[] {
  throw new Error('TODO');
}

/**
 * PROBLEM 2 — A pure sort.
 *
 * Sort a COPY. Strings use localeCompare; priority is numeric.
 * Ties break by `title` ascending so the order is always deterministic.
 */
export function sortTasks(tasks: readonly Task[], sort: Sort): Task[] {
  throw new Error('TODO');
}

/**
 * PROBLEM 3 — Pure pagination.
 *
 * Return `{ items, page, totalPages }` for a 1-based page number.
 * `totalPages` is at least 1 even when there is nothing to show, and `page`
 * is clamped into 1..totalPages (so deleting the last item on page 3 does not
 * strand the user on an empty page).
 */
export function paginate<T>(
  items: readonly T[],
  page: number,
  pageSize: number,
): { items: T[]; page: number; totalPages: number } {
  throw new Error('TODO');
}

/**
 * PROBLEM 4 — The hook that owns the screen's state.
 *
 * Combine the three helpers. Return:
 *   visible      the tasks for the current page
 *   total        how many tasks matched the filter (before pagination)
 *   page, totalPages
 *   query, setQuery          (changing it goes back to page 1)
 *   status, setStatus        (changing it goes back to page 1)
 *   sort, toggleSort(key)    (same key flips direction, new key starts 'asc')
 *   setPage
 *
 * Derive everything you can — only query, status, sort and page are state.
 */
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
  throw new Error('TODO');
}

/**
 * PROBLEM 5 — A sortable column header.
 *
 * Render a `<th>` containing a `<button>` whose text is `{label}` plus
 * ' ▲' when this column is the active ascending sort, ' ▼' when descending,
 * and nothing when it is not the active column.
 *
 * The `<th>` carries `aria-sort` of 'ascending' | 'descending' | 'none'.
 */
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
  throw new Error('TODO');
}

/**
 * PROBLEM 6 — Pagination controls.
 *
 * Render:
 *   <nav aria-label="Pagination">
 *     <button>Previous</button>
 *     <span>Page {page} of {totalPages}</span>
 *     <button>Next</button>
 *   </nav>
 *
 * 'Previous' is disabled on page 1, 'Next' on the last page.
 */
export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  throw new Error('TODO');
}

/**
 * PROBLEM 7 — An optimistic toggle.
 *
 * Render a checkbox labelled with the task title, checked when done.
 *
 * On change: flip the checkbox IMMEDIATELY (optimistically), then call
 * `onToggle(task.id, nextDone)`. If that promise rejects, roll the checkbox
 * back and render `<p role="alert">Could not save</p>`.
 *
 * While the request is in flight the checkbox is disabled.
 */
export function TaskRow({
  task,
  onToggle,
}: {
  task: Task;
  onToggle: (id: string, done: boolean) => Promise<void>;
}) {
  throw new Error('TODO');
}

/**
 * PROBLEM 8 — The whole screen.
 *
 * Render:
 *   - a search input labelled 'Search tasks'
 *   - a select labelled 'Status' with options 'all' | 'open' | 'done'
 *   - a `<table>` with a header row of SortableHeaders for Title, Assignee and
 *     Priority, plus a fourth `<th>Done</th>`
 *   - one `<tr>` per visible task: title, assignee, priority, and a TaskRow
 *   - `<p>No tasks match</p>` instead of the table body rows when nothing
 *     matched
 *   - a Pagination below, and a `<p data-testid="count">{total} tasks</p>`
 */
export function TaskTable({
  tasks,
  onToggle,
  pageSize = 5,
}: {
  tasks: Task[];
  onToggle: (id: string, done: boolean) => Promise<void>;
  pageSize?: number;
}) {
  throw new Error('TODO');
}
