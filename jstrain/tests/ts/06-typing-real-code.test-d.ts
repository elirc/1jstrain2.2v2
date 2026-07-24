/** TYPE-LEVEL tests for MODULE TS-06. Run with: npm run test:types */
import { describe, expectTypeOf, it } from 'vitest';
import {
  type ActionOf,
  isNumberValue,
  isStringValue,
  objectOf,
  type OrderId,
  parseIds,
  type PayloadOf,
  request,
  RequestBuilder,
  ROUTES,
  routePath,
  type TodoAction,
  todoReducer,
  type TodoState,
  toOrderId,
  toUserId,
  type UserId,
} from '@ex/ts/06-typing-real-code';

describe('P1 branded ids', () => {
  it('is still usable as a string', () => {
    const id = toUserId('u1');
    expectTypeOf(id).toMatchTypeOf<string>();
    expectTypeOf(id.toUpperCase()).toEqualTypeOf<string>();
  });

  it('refuses a plain string where a UserId is required', () => {
    const takesUserId = (id: UserId) => id;
    takesUserId(toUserId('u1'));
    // @ts-expect-error a plain string is not a UserId
    takesUserId('u1');
  });

  it('keeps UserId and OrderId apart', () => {
    const takesUserId = (id: UserId) => id;
    const orderId: OrderId = toOrderId('o1');
    // @ts-expect-error an OrderId is not a UserId
    takesUserId(orderId);
  });
});

describe('P2 parseIds overloads', () => {
  it('returns one id for a string and an array for an array', () => {
    expectTypeOf(parseIds('u1')).toEqualTypeOf<UserId>();
    expectTypeOf(parseIds(['u1'])).toEqualTypeOf<UserId[]>();
  });

  it('rejects other inputs', () => {
    // @ts-expect-error a number is neither overload
    parseIds(1);
  });
});

describe('P3 TodoAction', () => {
  it('is the four-member union', () => {
    expectTypeOf<TodoAction>().toEqualTypeOf<
      | { type: 'add'; payload: { text: string } }
      | { type: 'toggle'; payload: { id: string } }
      | { type: 'remove'; payload: { id: string } }
      | { type: 'clearCompleted' }
    >();
  });

  it('rejects an unknown action type', () => {
    // @ts-expect-error 'archive' is not an action
    const bad: TodoAction = { type: 'archive', payload: { id: '1' } };
    void bad;
  });

  it('rejects a mismatched payload', () => {
    // @ts-expect-error toggle takes an id, not text
    const bad: TodoAction = { type: 'toggle', payload: { text: 'x' } };
    void bad;
  });
});

describe('P4 todoReducer', () => {
  it('takes and returns TodoState', () => {
    expectTypeOf(todoReducer).parameters.toEqualTypeOf<[TodoState, TodoAction]>();
    expectTypeOf(todoReducer).returns.toEqualTypeOf<TodoState>();
  });
});

describe('P5 ActionOf / PayloadOf', () => {
  it('extracts one member of the union', () => {
    expectTypeOf<ActionOf<'add'>>().toEqualTypeOf<{
      type: 'add';
      payload: { text: string };
    }>();
  });

  it('extracts the payload', () => {
    expectTypeOf<PayloadOf<'add'>>().toEqualTypeOf<{ text: string }>();
    expectTypeOf<PayloadOf<'toggle'>>().toEqualTypeOf<{ id: string }>();
  });

  it('is undefined for an action with no payload', () => {
    expectTypeOf<PayloadOf<'clearCompleted'>>().toEqualTypeOf<undefined>();
  });

  it('rejects a type that is not an action type', () => {
    // @ts-expect-error 'archive' is not a TodoAction['type']
    type Bad = ActionOf<'archive'>;
    type _ = Bad;
  });
});

describe('P6 request', () => {
  it('takes its result type from the validator', () => {
    const validateUser = (value: unknown) => (value ? ({ id: 'u1' } as { id: string }) : null);
    expectTypeOf(
      request('/u', validateUser, async () => ({})),
    ).toEqualTypeOf<Promise<{ id: string }>>();
  });
});

describe('P7 objectOf', () => {
  it('builds the validated shape from the field validators', () => {
    const validate = objectOf({ id: isStringValue, age: isNumberValue });
    expectTypeOf(validate({})).toEqualTypeOf<{ id: string; age: number } | null>();
  });
});

describe('P8/P9 ROUTES with satisfies', () => {
  it('keeps the literal keys instead of widening to string', () => {
    expectTypeOf<keyof typeof ROUTES>().toEqualTypeOf<'home' | 'profile' | 'settings'>();
  });

  it('keeps the literal path values', () => {
    expectTypeOf(ROUTES.home.path).toEqualTypeOf<'/'>();
  });

  it('rejects a route name that does not exist', () => {
    // @ts-expect-error 'admin' is not a route
    routePath('admin');
  });
});

describe('P10 RequestBuilder', () => {
  it('returns `this` from every step so chaining keeps the type', () => {
    expectTypeOf(new RequestBuilder('/x').method('POST')).toEqualTypeOf<RequestBuilder>();
    expectTypeOf(new RequestBuilder('/x').method('POST').header('a', 'b')).toEqualTypeOf<
      RequestBuilder
    >();
  });

  it('rejects an unsupported method', () => {
    // @ts-expect-error PATCH is not in the union
    new RequestBuilder('/x').method('PATCH');
  });

  it('keeps `this` typing through a subclass', () => {
    class TracedBuilder extends RequestBuilder {
      trace(): this {
        return this;
      }
    }
    expectTypeOf(new TracedBuilder('/x').method('POST')).toEqualTypeOf<TracedBuilder>();
    new TracedBuilder('/x').method('POST').trace();
  });
});
