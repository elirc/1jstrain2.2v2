import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  Counter,
  Disclosure,
  ItemManager,
  LoginForm,
  MessageInput,
  MultiSelect,
  SearchableList,
  SettingsPanel,
  TemperatureConverter,
  TripleCounter,
} from '@ex/react/02-state-and-events';

describe('P1 Counter', () => {
  it('starts at zero and counts up', async () => {
    const user = userEvent.setup({ delay: null });
    render(<Counter />);
    expect(screen.getByTestId('count')).toHaveTextContent('0');
    await user.click(screen.getByRole('button', { name: '+' }));
    await user.click(screen.getByRole('button', { name: '+' }));
    expect(screen.getByTestId('count')).toHaveTextContent('2');
  });

  it('counts down but never below zero', async () => {
    const user = userEvent.setup({ delay: null });
    render(<Counter initial={1} />);
    await user.click(screen.getByRole('button', { name: '-' }));
    expect(screen.getByTestId('count')).toHaveTextContent('0');
    await user.click(screen.getByRole('button', { name: '-' }));
    expect(screen.getByTestId('count')).toHaveTextContent('0');
  });

  it('resets to the initial value', async () => {
    const user = userEvent.setup({ delay: null });
    render(<Counter initial={5} />);
    await user.click(screen.getByRole('button', { name: '+' }));
    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.getByTestId('count')).toHaveTextContent('5');
  });
});

describe('P2 TripleCounter', () => {
  it('adds three per click (proving you used the updater form)', async () => {
    const user = userEvent.setup({ delay: null });
    render(<TripleCounter />);
    await user.click(screen.getByRole('button', { name: 'Add three' }));
    expect(screen.getByText('3')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add three' }));
    expect(screen.getByText('6')).toBeInTheDocument();
  });
});

describe('P3 MessageInput', () => {
  it('is controlled and counts characters', async () => {
    const user = userEvent.setup({ delay: null });
    render(<MessageInput />);
    const input = screen.getByLabelText('Message');
    expect(screen.getByText('0/100 characters')).toBeInTheDocument();
    await user.type(input, 'hello');
    expect(input).toHaveValue('hello');
    expect(screen.getByText('5/100 characters')).toBeInTheDocument();
  });

  it('refuses input past 100 characters', async () => {
    const user = userEvent.setup({ delay: null });
    render(<MessageInput />);
    const input = screen.getByLabelText('Message');
    await user.click(input);
    await user.paste('x'.repeat(100));
    expect(input).toHaveValue('x'.repeat(100));
    await user.type(input, 'y');
    expect(input).toHaveValue('x'.repeat(100));
    expect(screen.getByText('100/100 characters')).toBeInTheDocument();
  });
});

describe('P4 Disclosure', () => {
  it('toggles the details in and out of the DOM', async () => {
    const user = userEvent.setup({ delay: null });
    render(<Disclosure details="The secret" />);
    expect(screen.queryByText('The secret')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Show details' }));
    expect(screen.getByText('The secret')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Hide details' }));
    expect(screen.queryByText('The secret')).not.toBeInTheDocument();
  });
});

describe('P5 SearchableList', () => {
  const items = ['Apple', 'Banana', 'Cherry', 'apricot'];

  it('shows everything before a query is typed', () => {
    render(<SearchableList items={items} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
  });

  it('filters case-insensitively as you type', async () => {
    const user = userEvent.setup({ delay: null });
    render(<SearchableList items={items} />);
    await user.type(screen.getByLabelText('Search'), 'ap');
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Apple',
      'apricot',
    ]);
  });

  it('shows an empty state when nothing matches', async () => {
    const user = userEvent.setup({ delay: null });
    render(<SearchableList items={items} />);
    await user.type(screen.getByLabelText('Search'), 'zzz');
    expect(screen.getByText('No matches')).toBeInTheDocument();
  });

  it('recovers when the query is cleared', async () => {
    const user = userEvent.setup({ delay: null });
    render(<SearchableList items={items} />);
    const input = screen.getByLabelText('Search');
    await user.type(input, 'zzz');
    await user.clear(input);
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
  });
});

describe('P6 LoginForm', () => {
  it('reports both errors on an empty submit', async () => {
    const user = userEvent.setup({ delay: null });
    const onSubmit = vi.fn();
    render(<LoginForm onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(screen.getByText('Enter a valid email')).toBeInTheDocument();
    expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
    expect(screen.getAllByRole('alert')).toHaveLength(2);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('does not validate before submit', async () => {
    const user = userEvent.setup({ delay: null });
    render(<LoginForm onSubmit={vi.fn()} />);
    await user.type(screen.getByLabelText('Email'), 'nope');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('submits valid credentials and clears the password', async () => {
    const user = userEvent.setup({ delay: null });
    const onSubmit = vi.fn();
    render(<LoginForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText('Password'), 'supersecret');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(onSubmit).toHaveBeenCalledWith({
      email: 'ada@example.com',
      password: 'supersecret',
    });
    expect(screen.getByLabelText('Password')).toHaveValue('');
    expect(screen.getByLabelText('Email')).toHaveValue('ada@example.com');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('uses a password field', () => {
    render(<LoginForm onSubmit={vi.fn()} />);
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
  });

  it('clears the errors once the form becomes valid', async () => {
    const user = userEvent.setup({ delay: null });
    render(<LoginForm onSubmit={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getAllByRole('alert')).toHaveLength(2);

    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText('Password'), 'supersecret');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('P7 SettingsPanel', () => {
  it('starts with the defaults', () => {
    render(<SettingsPanel />);
    expect(screen.getByTestId('state')).toHaveTextContent('{"darkMode":false,"fontSize":14}');
  });

  it('updates one field without losing the other', async () => {
    const user = userEvent.setup({ delay: null });
    render(<SettingsPanel />);
    await user.click(screen.getByLabelText('Dark mode'));
    expect(JSON.parse(screen.getByTestId('state').textContent ?? '{}')).toEqual({
      darkMode: true,
      fontSize: 14,
    });

    const size = screen.getByLabelText('Font size');
    await user.clear(size);
    await user.type(size, '20');
    expect(JSON.parse(screen.getByTestId('state').textContent ?? '{}')).toEqual({
      darkMode: true,
      fontSize: 20,
    });
  });
});

describe('P8 ItemManager', () => {
  it('adds an item and clears the input', async () => {
    const user = userEvent.setup({ delay: null });
    render(<ItemManager />);
    await user.type(screen.getByLabelText('New item'), 'milk');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(screen.getByRole('listitem')).toHaveTextContent('milk');
    expect(screen.getByLabelText('New item')).toHaveValue('');
  });

  it('trims and ignores empty input', async () => {
    const user = userEvent.setup({ delay: null });
    render(<ItemManager />);
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);

    await user.type(screen.getByLabelText('New item'), '   bread   ');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByRole('listitem')).toHaveTextContent('bread');
  });

  it('removes the right item', async () => {
    const user = userEvent.setup({ delay: null });
    render(<ItemManager />);
    const input = screen.getByLabelText('New item');
    const add = screen.getByRole('button', { name: 'Add' });

    await user.type(input, 'a');
    await user.click(add);
    await user.type(input, 'b');
    await user.click(add);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: 'Remove a' }));
    const remaining = screen.getAllByRole('listitem');
    expect(remaining).toHaveLength(1);
    expect(remaining[0]).toHaveTextContent('b');
  });
});

describe('P9 MultiSelect', () => {
  const options = ['red', 'green', 'blue'];

  it('starts with nothing selected', () => {
    render(<MultiSelect options={options} />);
    expect(screen.getByText('Selected: none')).toBeInTheDocument();
  });

  it('toggles selections and keeps them sorted', async () => {
    const user = userEvent.setup({ delay: null });
    render(<MultiSelect options={options} />);
    await user.click(screen.getByLabelText('red'));
    await user.click(screen.getByLabelText('blue'));
    expect(screen.getByText('Selected: blue, red')).toBeInTheDocument();

    await user.click(screen.getByLabelText('red'));
    expect(screen.getByText('Selected: blue')).toBeInTheDocument();
  });

  it('reflects the state in the checkboxes', async () => {
    const user = userEvent.setup({ delay: null });
    render(<MultiSelect options={options} />);
    const green = screen.getByLabelText('green');
    expect(green).not.toBeChecked();
    await user.click(green);
    expect(green).toBeChecked();
  });
});

describe('P10 TemperatureConverter', () => {
  it('converts Celsius to Fahrenheit', async () => {
    const user = userEvent.setup({ delay: null });
    render(<TemperatureConverter />);
    await user.type(screen.getByLabelText('Celsius'), '100');
    expect(screen.getByLabelText('Fahrenheit')).toHaveValue('212');
  });

  it('converts Fahrenheit to Celsius', async () => {
    const user = userEvent.setup({ delay: null });
    render(<TemperatureConverter />);
    await user.type(screen.getByLabelText('Fahrenheit'), '32');
    expect(screen.getByLabelText('Celsius')).toHaveValue('0');
  });

  it('rounds to one decimal', async () => {
    const user = userEvent.setup({ delay: null });
    render(<TemperatureConverter />);
    await user.type(screen.getByLabelText('Fahrenheit'), '100');
    expect(screen.getByLabelText('Celsius')).toHaveValue('37.8');
  });

  it('clears the other field for empty or invalid input', async () => {
    const user = userEvent.setup({ delay: null });
    render(<TemperatureConverter />);
    const celsius = screen.getByLabelText('Celsius');
    await user.type(celsius, '10');
    expect(screen.getByLabelText('Fahrenheit')).toHaveValue('50');

    await user.clear(celsius);
    expect(screen.getByLabelText('Fahrenheit')).toHaveValue('');

    await user.type(celsius, 'abc');
    expect(screen.getByLabelText('Fahrenheit')).toHaveValue('');
  });
});
