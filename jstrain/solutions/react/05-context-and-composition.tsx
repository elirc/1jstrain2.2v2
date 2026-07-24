/** Reference solutions for MODULE REACT-05. */
import { createContext, useContext, useMemo, useReducer, useState, type ReactNode } from 'react';

export interface ThemeValue {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({
  children,
  initial = 'light',
}: {
  children: ReactNode;
  initial?: 'light' | 'dark';
}) {
  const [theme, setTheme] = useState<'light' | 'dark'>(initial);
  // Memoised so consumers do not re-render when nothing they use changed.
  const value = useMemo<ThemeValue>(
    () => ({
      theme,
      toggleTheme: () => setTheme((current) => (current === 'light' ? 'dark' : 'light')),
    }),
    [theme],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (value === null) throw new Error('useTheme must be used inside a ThemeProvider');
  return value;
}

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button type="button" onClick={toggleTheme}>
      Theme: {theme}
    </button>
  );
}

interface TabsValue {
  selected: string;
  select: (id: string) => void;
}

const TabsContext = createContext<TabsValue | null>(null);

function useTabs(): TabsValue {
  const value = useContext(TabsContext);
  if (value === null) throw new Error('Tabs components must be used inside <Tabs>');
  return value;
}

export function Tabs({ children, defaultId }: { children: ReactNode; defaultId: string }) {
  const [selected, setSelected] = useState(defaultId);
  const value = useMemo<TabsValue>(() => ({ selected, select: setSelected }), [selected]);
  return <TabsContext.Provider value={value}>{children}</TabsContext.Provider>;
}

export function TabList({ children }: { children: ReactNode }) {
  useTabs();
  return <div role="tablist">{children}</div>;
}

export function Tab({ id, children }: { id: string; children: ReactNode }) {
  const { selected, select } = useTabs();
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected === id}
      aria-controls={`panel-${id}`}
      onClick={() => select(id)}
    >
      {children}
    </button>
  );
}

export function TabPanel({ id, children }: { id: string; children: ReactNode }) {
  const { selected } = useTabs();
  if (selected !== id) return null;
  return (
    <div role="tabpanel" id={`panel-${id}`}>
      {children}
    </div>
  );
}

export interface ToggleRenderProps {
  on: boolean;
  toggle: () => void;
}

export function Toggle({
  children,
  initial = false,
}: {
  children: (props: ToggleRenderProps) => ReactNode;
  initial?: boolean;
}) {
  const [on, setOn] = useState(initial);
  return <>{children({ on, toggle: () => setOn((value) => !value) })}</>;
}

export function Layout({
  header,
  sidebar,
  footer,
  children,
}: {
  header: ReactNode;
  sidebar?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <header>{header}</header>
      {sidebar && <aside>{sidebar}</aside>}
      <main>{children}</main>
      {footer && <footer>{footer}</footer>}
    </div>
  );
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface CartValue {
  items: CartItem[];
  total: number;
  add: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  remove: (id: string) => void;
  setQuantity: (id: string, quantity: number) => void;
  clear: () => void;
}

type CartAction =
  | { type: 'add'; item: Omit<CartItem, 'quantity'> & { quantity?: number } }
  | { type: 'remove'; id: string }
  | { type: 'setQuantity'; id: string; quantity: number }
  | { type: 'clear' };

function cartReducer(items: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case 'add': {
      const quantity = action.item.quantity ?? 1;
      const existing = items.find((item) => item.id === action.item.id);
      if (existing) {
        return items.map((item) =>
          item.id === action.item.id ? { ...item, quantity: item.quantity + quantity } : item,
        );
      }
      return [...items, { ...action.item, quantity }];
    }
    case 'remove':
      return items.filter((item) => item.id !== action.id);
    case 'setQuantity':
      if (action.quantity <= 0) return items.filter((item) => item.id !== action.id);
      return items.map((item) =>
        item.id === action.id ? { ...item, quantity: action.quantity } : item,
      );
    case 'clear':
      return [];
    default:
      return items;
  }
}

const CartContext = createContext<CartValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, dispatch] = useReducer(cartReducer, []);

  const value = useMemo<CartValue>(() => {
    const total =
      Math.round(items.reduce((sum, item) => sum + item.price * item.quantity, 0) * 100) / 100;
    return {
      items,
      total,
      add: (item) => dispatch({ type: 'add', item }),
      remove: (id) => dispatch({ type: 'remove', id }),
      setQuantity: (id, quantity) => dispatch({ type: 'setQuantity', id, quantity }),
      clear: () => dispatch({ type: 'clear' }),
    };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartValue {
  const value = useContext(CartContext);
  if (value === null) throw new Error('useCart must be used inside a CartProvider');
  return value;
}

export function CartSummary() {
  const { items, total, remove } = useCart();

  return (
    <div>
      {items.length === 0 ? (
        <p>Cart is empty</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              {item.name} x{item.quantity} — ${(item.price * item.quantity).toFixed(2)}
              <button type="button" onClick={() => remove(item.id)}>
                Remove {item.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p data-testid="total">Total: ${total.toFixed(2)}</p>
    </div>
  );
}

export function StorePage() {
  return (
    <ThemeProvider>
      <CartProvider>
        <Layout header={<ThemeToggle />}>
          <Tabs defaultId="cart">
            <TabList>
              <Tab id="cart">Cart</Tab>
              <Tab id="help">Help</Tab>
            </TabList>
            <TabPanel id="cart">
              <CartSummary />
            </TabPanel>
            <TabPanel id="help">
              <p>Ask us anything</p>
            </TabPanel>
          </Tabs>
        </Layout>
      </CartProvider>
    </ThemeProvider>
  );
}
