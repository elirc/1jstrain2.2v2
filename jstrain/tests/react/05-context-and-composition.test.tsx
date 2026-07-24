import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  CartProvider,
  CartSummary,
  Layout,
  StorePage,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  ThemeProvider,
  ThemeToggle,
  Toggle,
  useCart,
  useTheme,
} from '@ex/react/05-context-and-composition';

/** Silence the expected React error log when a component throws on purpose. */
function expectRenderToThrow(ui: ReactElement, message: string | RegExp) {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    expect(() => render(ui)).toThrow(message);
  } finally {
    spy.mockRestore();
  }
}

describe('P1/P2 ThemeProvider + useTheme', () => {
  it('provides the theme and toggles it', async () => {
    const user = userEvent.setup({ delay: null });
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    const button = screen.getByRole('button', { name: 'Theme: light' });
    await user.click(button);
    expect(screen.getByRole('button', { name: 'Theme: dark' })).toBeInTheDocument();
  });

  it('honours the initial theme', () => {
    render(
      <ThemeProvider initial="dark">
        <ThemeToggle />
      </ThemeProvider>,
    );
    expect(screen.getByRole('button', { name: 'Theme: dark' })).toBeInTheDocument();
  });

  it('throws a helpful error outside a provider', () => {
    expectRenderToThrow(<ThemeToggle />, 'useTheme must be used inside a ThemeProvider');
  });

  it('keeps the context value stable between unrelated renders', () => {
    const seen: unknown[] = [];
    function Spy() {
      seen.push(useTheme());
      return null;
    }
    const { rerender } = render(
      <ThemeProvider>
        <Spy />
      </ThemeProvider>,
    );
    rerender(
      <ThemeProvider>
        <Spy />
      </ThemeProvider>,
    );
    expect(seen[0]).toBe(seen[1]);
  });
});

describe('P3 Tabs', () => {
  const ui = (
    <Tabs defaultId="a">
      <TabList>
        <Tab id="a">First</Tab>
        <Tab id="b">Second</Tab>
      </TabList>
      <TabPanel id="a">First panel</TabPanel>
      <TabPanel id="b">Second panel</TabPanel>
    </Tabs>
  );

  it('shows only the selected panel', () => {
    render(ui);
    expect(screen.getByText('First panel')).toBeInTheDocument();
    expect(screen.queryByText('Second panel')).not.toBeInTheDocument();
  });

  it('switches panels on click', async () => {
    const user = userEvent.setup({ delay: null });
    render(ui);
    await user.click(screen.getByRole('tab', { name: 'Second' }));
    expect(screen.getByText('Second panel')).toBeInTheDocument();
    expect(screen.queryByText('First panel')).not.toBeInTheDocument();
  });

  it('exposes the right ARIA wiring', async () => {
    const user = userEvent.setup({ delay: null });
    render(ui);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'First' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Second' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'panel-a');

    await user.click(screen.getByRole('tab', { name: 'Second' }));
    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'panel-b');
  });

  it('throws when used outside <Tabs>', () => {
    expectRenderToThrow(<Tab id="a">Orphan</Tab>, 'Tabs components must be used inside <Tabs>');
  });
});

describe('P4 Toggle render prop', () => {
  it('hands state and a setter to the child function', async () => {
    const user = userEvent.setup({ delay: null });
    render(
      <Toggle>
        {({ on, toggle }) => (
          <button type="button" onClick={toggle}>
            {on ? 'On' : 'Off'}
          </button>
        )}
      </Toggle>,
    );
    await user.click(screen.getByRole('button', { name: 'Off' }));
    expect(screen.getByRole('button', { name: 'On' })).toBeInTheDocument();
  });

  it('honours the initial value', () => {
    render(<Toggle initial>{({ on }) => <p>{String(on)}</p>}</Toggle>);
    expect(screen.getByText('true')).toBeInTheDocument();
  });
});

describe('P5 Layout', () => {
  it('renders the slots it was given', () => {
    render(
      <Layout header={<h1>Head</h1>} sidebar={<nav>Nav</nav>} footer={<small>Foot</small>}>
        <p>Body</p>
      </Layout>,
    );
    expect(screen.getByRole('banner')).toHaveTextContent('Head');
    expect(screen.getByRole('complementary')).toHaveTextContent('Nav');
    expect(screen.getByRole('main')).toHaveTextContent('Body');
    expect(screen.getByRole('contentinfo')).toHaveTextContent('Foot');
  });

  it('omits the optional slots', () => {
    render(
      <Layout header={<h1>Head</h1>}>
        <p>Body</p>
      </Layout>,
    );
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
  });
});

describe('P6 CartProvider + useCart', () => {
  const wrapper = ({ children }: { children: ReactNode }) => <CartProvider>{children}</CartProvider>;

  it('starts empty', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    expect(result.current.items).toEqual([]);
    expect(result.current.total).toBe(0);
  });

  it('adds items and totals them', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.add({ id: 'a', name: 'Desk', price: 100 }));
    act(() => result.current.add({ id: 'b', name: 'Lamp', price: 25.5, quantity: 2 }));
    expect(result.current.items).toHaveLength(2);
    expect(result.current.total).toBe(151);
  });

  it('increases the quantity of an existing line', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.add({ id: 'a', name: 'Desk', price: 10 }));
    act(() => result.current.add({ id: 'a', name: 'Desk', price: 10, quantity: 2 }));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].quantity).toBe(3);
    expect(result.current.total).toBe(30);
  });

  it('sets a quantity, removing the line at zero', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.add({ id: 'a', name: 'Desk', price: 10 }));
    act(() => result.current.setQuantity('a', 5));
    expect(result.current.total).toBe(50);
    act(() => result.current.setQuantity('a', 0));
    expect(result.current.items).toEqual([]);
  });

  it('removes and clears', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.add({ id: 'a', name: 'Desk', price: 10 }));
    act(() => result.current.add({ id: 'b', name: 'Lamp', price: 10 }));
    act(() => result.current.remove('a'));
    expect(result.current.items.map((i) => i.id)).toEqual(['b']);
    act(() => result.current.clear());
    expect(result.current.items).toEqual([]);
  });

  it('rounds the total to two decimals', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.add({ id: 'a', name: 'x', price: 0.1, quantity: 3 }));
    expect(result.current.total).toBe(0.3);
  });

  it('throws outside a provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(() => renderHook(() => useCart())).toThrow('useCart must be used inside a CartProvider');
    } finally {
      spy.mockRestore();
    }
  });
});

describe('P7 CartSummary', () => {
  function Harness() {
    const { add } = useCart();
    return (
      <div>
        <button type="button" onClick={() => add({ id: 'a', name: 'Desk', price: 12.5 })}>
          Add desk
        </button>
        <CartSummary />
      </div>
    );
  }

  it('shows the empty state', () => {
    render(
      <CartProvider>
        <CartSummary />
      </CartProvider>,
    );
    expect(screen.getByText('Cart is empty')).toBeInTheDocument();
    expect(screen.getByTestId('total')).toHaveTextContent('Total: $0.00');
  });

  it('lists lines and updates the total', async () => {
    const user = userEvent.setup({ delay: null });
    render(
      <CartProvider>
        <Harness />
      </CartProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Add desk' }));
    await user.click(screen.getByRole('button', { name: 'Add desk' }));

    expect(screen.getByRole('listitem')).toHaveTextContent('Desk x2 — $25.00');
    expect(screen.getByTestId('total')).toHaveTextContent('Total: $25.00');
  });

  it('removes a line', async () => {
    const user = userEvent.setup({ delay: null });
    render(
      <CartProvider>
        <Harness />
      </CartProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Add desk' }));
    await user.click(screen.getByRole('button', { name: 'Remove Desk' }));
    expect(screen.getByText('Cart is empty')).toBeInTheDocument();
  });
});

describe('P8 StorePage', () => {
  it('composes the providers, layout and tabs', async () => {
    const user = userEvent.setup({ delay: null });
    render(<StorePage />);

    expect(screen.getByRole('banner')).toHaveTextContent('Theme: light');
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByText('Cart is empty')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Help' }));
    expect(screen.getByText('Ask us anything')).toBeInTheDocument();
    expect(screen.queryByText('Cart is empty')).not.toBeInTheDocument();
  });

  it('still toggles the theme from inside the layout', async () => {
    const user = userEvent.setup({ delay: null });
    render(<StorePage />);
    await user.click(screen.getByRole('button', { name: 'Theme: light' }));
    expect(screen.getByRole('button', { name: 'Theme: dark' })).toBeInTheDocument();
  });
});
