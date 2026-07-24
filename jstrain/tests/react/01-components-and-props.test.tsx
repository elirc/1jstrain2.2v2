import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  Badge,
  Greeting,
  List,
  Panel,
  ProductCard,
  RoleSummary,
  StarRating,
  TeamPanel,
  UnreadBadge,
  UserList,
  type User,
} from '@ex/react/01-components-and-props';

const users: User[] = [
  { id: 'u1', name: 'Ada', role: 'admin' },
  { id: 'u2', name: 'Bob', role: 'member' },
  { id: 'u3', name: 'Cyd', role: 'member' },
];

describe('P1 Greeting', () => {
  it('greets by name', () => {
    render(<Greeting name="Ada" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Hello, Ada!');
  });

  it('falls back to stranger', () => {
    render(<Greeting />);
    expect(screen.getByRole('heading')).toHaveTextContent('Hello, stranger!');
  });

  it('treats an empty name as missing', () => {
    render(<Greeting name="" />);
    expect(screen.getByRole('heading')).toHaveTextContent('Hello, stranger!');
  });
});

describe('P2 ProductCard', () => {
  it('shows the title and a formatted price', () => {
    render(<ProductCard title="Desk" price={12.5} />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Desk');
    expect(screen.getByText('$12.50')).toBeInTheDocument();
  });

  it('always shows two decimals', () => {
    render(<ProductCard title="Desk" price={10} />);
    expect(screen.getByText('$10.00')).toBeInTheDocument();
  });

  it('renders the description only when given', () => {
    const { unmount } = render(<ProductCard title="Desk" price={1} description="A nice desk" />);
    expect(screen.getByText('A nice desk')).toBeInTheDocument();
    unmount();

    render(<ProductCard title="Desk" price={1} />);
    expect(screen.queryByText('A nice desk')).not.toBeInTheDocument();
  });

  it('shows "Sold out" only when out of stock', () => {
    const { unmount } = render(<ProductCard title="Desk" price={1} inStock={false} />);
    expect(screen.getByText('Sold out')).toBeInTheDocument();
    unmount();

    render(<ProductCard title="Desk" price={1} />);
    expect(screen.queryByText('Sold out')).not.toBeInTheDocument();
  });
});

describe('P3 UserList', () => {
  it('renders one list item per user', () => {
    render(<UserList users={users} />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items.map((li) => li.textContent)).toEqual(['Ada', 'Bob', 'Cyd']);
  });

  it('renders an empty state instead of an empty list', () => {
    render(<UserList users={[]} />);
    expect(screen.getByText('No users')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});

describe('P4 Panel', () => {
  it('renders a title and its children', () => {
    render(
      <Panel title="Settings">
        <button type="button">Save</button>
      </Panel>,
    );
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Settings');
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('accepts several children', () => {
    render(
      <Panel title="x">
        <p>one</p>
        <p>two</p>
      </Panel>,
    );
    expect(screen.getByText('one')).toBeInTheDocument();
    expect(screen.getByText('two')).toBeInTheDocument();
  });
});

describe('P5 Badge', () => {
  it('defaults to the neutral variant', () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText('New')).toHaveClass('badge', 'badge--neutral');
  });

  it('applies the requested variant', () => {
    render(<Badge variant="danger">Late</Badge>);
    expect(screen.getByText('Late')).toHaveClass('badge--danger');
  });
});

describe('P6 UnreadBadge', () => {
  it('shows the count when there is one', () => {
    render(<UnreadBadge count={3} />);
    expect(screen.getByText(/You have 3 unread messages/)).toBeInTheDocument();
  });

  it('renders NOTHING for zero — not a stray "0"', () => {
    const { container } = render(<UnreadBadge count={0} />);
    expect(container).toBeEmptyDOMElement();
    expect(container.textContent).toBe('');
  });

  it('renders nothing for a negative count', () => {
    const { container } = render(<UnreadBadge count={-1} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('P7 RoleSummary', () => {
  it('counts users per role, alphabetically', () => {
    render(<RoleSummary users={users} />);
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'admin: 1',
      'member: 2',
    ]);
  });

  it('omits roles with nobody in them', () => {
    render(<RoleSummary users={[{ id: 'u1', name: 'Ada', role: 'admin' }]} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });

  it('renders an empty list for no users', () => {
    render(<RoleSummary users={[]} />);
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });
});

describe('P8 List', () => {
  it('renders each item through renderItem', () => {
    render(
      <List
        items={users}
        getKey={(user) => user.id}
        renderItem={(user) => <span>{user.name.toUpperCase()}</span>}
      />,
    );
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'ADA',
      'BOB',
      'CYD',
    ]);
  });

  it('renders the EmptyState when there is nothing', () => {
    render(
      <List
        items={[]}
        getKey={() => 'x'}
        renderItem={() => null}
        EmptyState={() => <p>Nothing here</p>}
      />,
    );
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('renders nothing when empty and no EmptyState is given', () => {
    const { container } = render(<List items={[]} getKey={() => 'x'} renderItem={() => null} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('P9 StarRating', () => {
  it('renders five stars with the right number filled', () => {
    render(<StarRating rating={3} />);
    const widget = screen.getByRole('img');
    expect(widget).toHaveAccessibleName('3 out of 5 stars');
    expect(widget.textContent).toBe('★★★☆☆');
  });

  it('rounds to the nearest star', () => {
    render(<StarRating rating={3.6} />);
    expect(screen.getByRole('img').textContent).toBe('★★★★☆');
  });

  it('clamps out-of-range ratings', () => {
    const { unmount } = render(<StarRating rating={9} />);
    expect(screen.getByRole('img').textContent).toBe('★★★★★');
    unmount();

    render(<StarRating rating={-2} />);
    expect(screen.getByRole('img').textContent).toBe('☆☆☆☆☆');
  });
});

describe('P10 TeamPanel', () => {
  it('renders the panel, the users and a count', () => {
    render(<TeamPanel users={users} />);
    expect(screen.getByRole('heading', { name: 'Team' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText('3 members')).toBeInTheDocument();
  });

  it('uses the singular for one member', () => {
    render(<TeamPanel users={[users[0]]} />);
    expect(screen.getByText('1 member')).toBeInTheDocument();
  });

  it('omits the count line when the team is empty', () => {
    render(<TeamPanel users={[]} />);
    const panel = screen.getByRole('heading', { name: 'Team' }).closest('section');
    expect(panel).not.toBeNull();
    expect(within(panel as HTMLElement).getByText('No users')).toBeInTheDocument();
    expect(screen.queryByText(/members?$/)).not.toBeInTheDocument();
  });
});
