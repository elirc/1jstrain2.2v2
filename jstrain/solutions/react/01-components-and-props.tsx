/** Reference solutions for MODULE REACT-01. */
import type { ReactNode } from 'react';

export function Greeting({ name }: { name?: string }) {
  return <h1>Hello, {name || 'stranger'}!</h1>;
}

export interface ProductCardProps {
  title: string;
  price: number;
  description?: string;
  inStock?: boolean;
}

export function ProductCard({ title, price, description, inStock = true }: ProductCardProps) {
  return (
    <article>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      <span>${price.toFixed(2)}</span>
      {!inStock && <strong>Sold out</strong>}
    </article>
  );
}

export interface User {
  id: string;
  name: string;
  role: 'admin' | 'member';
}

export function UserList({ users }: { users: User[] }) {
  if (users.length === 0) return <p>No users</p>;
  return (
    <ul>
      {users.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}

export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3>{title}</h3>
      <div>{children}</div>
    </section>
  );
}

export function Badge({
  variant = 'neutral',
  children,
}: {
  variant?: 'neutral' | 'success' | 'danger';
  children: ReactNode;
}) {
  return <span className={`badge badge--${variant}`}>{children}</span>;
}

export function UnreadBadge({ count }: { count: number }) {
  // `count > 0 &&` — not `count &&`, which would render a literal 0.
  if (count <= 0) return null;
  return <p>You have {count} unread messages</p>;
}

export function RoleSummary({ users }: { users: User[] }) {
  const counts = new Map<string, number>();
  for (const user of users) {
    counts.set(user.role, (counts.get(user.role) ?? 0) + 1);
  }
  const rows = [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <ul>
      {rows.map(([role, count]) => (
        <li key={role}>
          {role}: {count}
        </li>
      ))}
    </ul>
  );
}

export interface ListProps<T> {
  items: T[];
  getKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  EmptyState?: () => ReactNode;
}

export function List<T>({ items, getKey, renderItem, EmptyState }: ListProps<T>) {
  if (items.length === 0) return EmptyState ? <EmptyState /> : null;
  return (
    <ul>
      {items.map((item) => (
        <li key={getKey(item)}>{renderItem(item)}</li>
      ))}
    </ul>
  );
}

export function StarRating({ rating }: { rating: number }) {
  const filled = Math.min(5, Math.max(0, Math.round(rating)));
  return (
    <div role="img" aria-label={`${filled} out of 5 stars`}>
      {[0, 1, 2, 3, 4].map((index) => (
        <span key={index}>{index < filled ? '★' : '☆'}</span>
      ))}
    </div>
  );
}

export function TeamPanel({ users }: { users: User[] }) {
  return (
    <Panel title="Team">
      <UserList users={users} />
      {users.length > 0 && <p>{users.length === 1 ? '1 member' : `${users.length} members`}</p>}
    </Panel>
  );
}
