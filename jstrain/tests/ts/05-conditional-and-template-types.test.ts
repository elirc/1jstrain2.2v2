import { describe, expect, it, vi } from 'vitest';
import { camelizeKeys, createEmitter } from '@ex/ts/05-conditional-and-template-types';

type AppEvents = {
  login: { userId: string };
  logout: { reason: string };
};

describe('P11 createEmitter', () => {
  it('calls handlers with the payload', () => {
    const bus = createEmitter<AppEvents>();
    const handler = vi.fn();
    bus.on('login', handler);
    bus.emit('login', { userId: 'u1' });
    expect(handler).toHaveBeenCalledWith({ userId: 'u1' });
  });

  it('keeps events separate', () => {
    const bus = createEmitter<AppEvents>();
    const onLogin = vi.fn();
    bus.on('login', onLogin);
    bus.emit('logout', { reason: 'timeout' });
    expect(onLogin).not.toHaveBeenCalled();
  });

  it('supports several handlers', () => {
    const bus = createEmitter<AppEvents>();
    const a = vi.fn();
    const b = vi.fn();
    bus.on('login', a);
    bus.on('login', b);
    bus.emit('login', { userId: 'u1' });
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('unsubscribes via the returned function', () => {
    const bus = createEmitter<AppEvents>();
    const handler = vi.fn();
    const off = bus.on('login', handler);
    off();
    bus.emit('login', { userId: 'u1' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('unsubscribes via off()', () => {
    const bus = createEmitter<AppEvents>();
    const handler = vi.fn();
    bus.on('login', handler);
    bus.off('login', handler);
    bus.emit('login', { userId: 'u1' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('does nothing when nobody is listening', () => {
    const bus = createEmitter<AppEvents>();
    expect(() => bus.emit('login', { userId: 'u1' })).not.toThrow();
  });
});

describe('P12 camelizeKeys', () => {
  it('converts snake_case keys', () => {
    expect(camelizeKeys({ user_id: 1, created_at: 'now', name: 'Ada' })).toEqual({
      userId: 1,
      createdAt: 'now',
      name: 'Ada',
    });
  });

  it('handles multi-segment keys', () => {
    expect(camelizeKeys({ a_b_c_d: true })).toEqual({ aBCD: true });
  });

  it('leaves values untouched', () => {
    const nested = { deep_key: 1 };
    expect(camelizeKeys({ outer_key: nested }).outerKey).toBe(nested);
  });

  it('handles an empty object', () => {
    expect(camelizeKeys({})).toEqual({});
  });
});
