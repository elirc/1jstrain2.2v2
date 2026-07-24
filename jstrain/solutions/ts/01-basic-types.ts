/** Reference solutions for MODULE TS-01. */

export type Primitive = string | number | boolean | bigint | symbol | null | undefined;

export type Nullable<T> = T | null | undefined;

export type Point = [number, number];

export function distance(a: [number, number], b: [number, number]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_ORDER: LogLevel[] = ['debug', 'info', 'warn', 'error'];

export function shouldLog(level: string, minimum: string): boolean {
  const levelIndex = LOG_ORDER.indexOf(level as LogLevel);
  const minimumIndex = LOG_ORDER.indexOf(minimum as LogLevel);
  if (levelIndex === -1 || minimumIndex === -1) return false;
  return levelIndex >= minimumIndex;
}

export interface User {
  readonly id: number;
  name: string;
  email?: string;
  readonly roles: readonly string[];
}

export function formatValue(value: string | number | boolean | null | undefined): string {
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'number') return value.toFixed(2);
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  return 'none';
}

export function toCount(value: unknown, fallback: number): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return fallback;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

export const ROLES = ['admin', 'editor', 'viewer'] as const;

export type Role = (typeof ROLES)[number];

export function bestPlayer(scores: Record<string, number>): string | null {
  const entries = Object.entries(scores);
  if (entries.length === 0) return null;
  return entries.reduce((best, entry) => {
    if (entry[1] > best[1]) return entry;
    if (entry[1] === best[1] && entry[0] < best[0]) return entry;
    return best;
  })[0];
}

export function greet(name: string, options?: { greeting?: string; shout?: boolean }): string {
  const { greeting = 'Hello', shout = false } = options ?? {};
  const message = `${greeting}, ${name}!`;
  return shout ? message.toUpperCase() : message;
}

export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(value)}`);
}

export function severity(level: 'debug' | 'info' | 'warn' | 'error'): number {
  switch (level) {
    case 'debug':
      return 10;
    case 'info':
      return 20;
    case 'warn':
      return 30;
    case 'error':
      return 40;
    default:
      // Unreachable — and the compiler proves it.
      return assertNever(level);
  }
}

export type Comparator<T> = (a: T, b: T) => number;

export function byKey<T, K extends keyof T>(key: K): (a: T, b: T) => number {
  return (a, b) => {
    const left = a[key];
    const right = b[key];
    if (typeof left === 'string' && typeof right === 'string') {
      return left.localeCompare(right);
    }
    if (left === right) return 0;
    return left < right ? -1 : 1;
  };
}
