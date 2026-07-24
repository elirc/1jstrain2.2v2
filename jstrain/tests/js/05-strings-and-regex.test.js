import { describe, expect, it } from 'vitest';
import {
  buildQuery,
  camelToKebab,
  extractLinks,
  formatList,
  isPalindrome,
  kebabToCamel,
  maskEmail,
  parseLogLine,
  parseQuery,
  passwordProblems,
  render,
  slugify,
  titleCase,
  truncate,
  wordFrequencies,
} from '@ex/js/05-strings-and-regex.js';

describe('P1 slugify', () => {
  it.each([
    ['  Hello, World!  ', 'hello-world'],
    ['Node.js & React 19', 'node-js-react-19'],
    ['already-a-slug', 'already-a-slug'],
    ['__mixed  _ separators', 'mixed-separators'],
    ['!!!', ''],
    ['', ''],
    ['ONE', 'one'],
    ['a---b', 'a-b'],
  ])('slugify(%j) === %j', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
});

describe('P2 titleCase', () => {
  it.each([
    ['the QUICK brown fOx', 'The Quick Brown Fox'],
    ['  hello   world ', 'Hello World'],
    ['', ''],
    ['a', 'A'],
    ['MIXED case HERE', 'Mixed Case Here'],
  ])('titleCase(%j) === %j', (input, expected) => {
    expect(titleCase(input)).toBe(expected);
  });
});

describe('P3 truncate', () => {
  it.each([
    ['Hello world', 8, undefined, 'Hello w…'],
    ['Hello world', 8, '...', 'Hello...'],
    ['Hi', 8, undefined, 'Hi'],
    ['Hello', 5, '...', 'Hello'],
    ['Hello', 2, '...', '..'],
    ['Hello', 0, '...', ''],
  ])('truncate(%j, %i, %j)', (input, max, suffix, expected) => {
    const result = suffix === undefined ? truncate(input, max) : truncate(input, max, suffix);
    expect(result).toBe(expected);
  });

  it('never exceeds max length', () => {
    for (const max of [1, 2, 3, 5, 10]) {
      expect(truncate('the quick brown fox', max).length).toBeLessThanOrEqual(max);
    }
  });
});

describe('P4 render', () => {
  it('substitutes values', () => {
    expect(render('Hi {{name}}, you are {{ age }}', { name: 'Ada', age: 36 })).toBe(
      'Hi Ada, you are 36',
    );
  });

  it('replaces every occurrence', () => {
    expect(render('{{a}}{{a}}', { a: 'x' })).toBe('xx');
  });

  it('renders missing keys as empty', () => {
    expect(render('{{missing}}!', {})).toBe('!');
    expect(render('{{a}}', { a: null })).toBe('');
  });

  it('leaves text without placeholders alone', () => {
    expect(render('plain text', { a: 1 })).toBe('plain text');
  });

  it('coerces non-strings', () => {
    expect(render('{{n}}/{{b}}', { n: 0, b: false })).toBe('0/false');
  });
});

describe('P5 maskEmail', () => {
  it.each([
    ['ada.lovelace@example.com', 'a**********e@example.com'],
    ['abc@x.io', 'a*c@x.io'],
    ['ab@x.io', '**@x.io'],
    ['a@x.io', '*@x.io'],
    ['nope', 'nope'],
    ['@x.io', '@x.io'],
  ])('maskEmail(%j) === %j', (input, expected) => {
    expect(maskEmail(input)).toBe(expected);
  });

  it('keeps the length of the local part', () => {
    const masked = maskEmail('abcdefgh@x.io');
    expect(masked.split('@')[0]).toHaveLength(8);
  });
});

describe('P6 parseQuery', () => {
  it('parses keys, values, arrays and flags', () => {
    expect(parseQuery('?a=1&b=two&a=3&flag&q=hello+world%21')).toEqual({
      a: ['1', '3'],
      b: 'two',
      flag: '',
      q: 'hello world!',
    });
  });

  it('works without the leading question mark', () => {
    expect(parseQuery('x=1')).toEqual({ x: '1' });
  });

  it('returns an empty object for empty input', () => {
    expect(parseQuery('')).toEqual({});
    expect(parseQuery('?')).toEqual({});
  });

  it('decodes encoded keys and values', () => {
    expect(parseQuery('a%20b=c%2Fd')).toEqual({ 'a b': 'c/d' });
  });

  it('keeps everything after the first = in the value', () => {
    expect(parseQuery('token=a=b=c')).toEqual({ token: 'a=b=c' });
  });

  it('collects three repeats into one array', () => {
    expect(parseQuery('a=1&a=2&a=3')).toEqual({ a: ['1', '2', '3'] });
  });
});

describe('P7 buildQuery', () => {
  it('builds a query string', () => {
    expect(buildQuery({ a: 1, b: 'hello world', c: null, d: ['x', 'y'], e: false })).toBe(
      'a=1&b=hello%20world&d=x&d=y&e=false',
    );
  });

  it('skips null and undefined', () => {
    expect(buildQuery({ a: null, b: undefined })).toBe('');
  });

  it('encodes special characters', () => {
    expect(buildQuery({ 'a b': 'c&d=e' })).toBe('a%20b=c%26d%3De');
  });

  it('round-trips with parseQuery', () => {
    const params = { a: '1', b: 'two words', c: ['x', 'y'] };
    expect(parseQuery(buildQuery(params))).toEqual(params);
  });
});

describe('P8 camelToKebab / kebabToCamel', () => {
  it.each([
    ['backgroundColor', 'background-color'],
    ['parseHTMLString', 'parse-html-string'],
    ['already', 'already'],
    ['aB', 'a-b'],
    ['grid2Columns', 'grid2-columns'],
  ])('camelToKebab(%j) === %j', (input, expected) => {
    expect(camelToKebab(input)).toBe(expected);
  });

  it.each([
    ['background-color', 'backgroundColor'],
    ['--custom-prop', 'customProp'],
    ['already', 'already'],
    ['a-b-c', 'aBC'],
  ])('kebabToCamel(%j) === %j', (input, expected) => {
    expect(kebabToCamel(input)).toBe(expected);
  });

  it('round-trips simple names', () => {
    expect(kebabToCamel(camelToKebab('backgroundColor'))).toBe('backgroundColor');
  });
});

describe('P9 wordFrequencies', () => {
  it('counts case-insensitively and sorts by count then alphabetically', () => {
    expect(wordFrequencies('The cat. The CAT! A dog?')).toEqual([
      ['cat', 2],
      ['the', 2],
      ['a', 1],
      ['dog', 1],
    ]);
  });

  it('keeps apostrophes inside words', () => {
    expect(wordFrequencies("don't don't stop")).toEqual([
      ["don't", 2],
      ['stop', 1],
    ]);
  });

  it('handles empty text', () => {
    expect(wordFrequencies('')).toEqual([]);
    expect(wordFrequencies('!!! ???')).toEqual([]);
  });
});

describe('P10 isPalindrome', () => {
  it.each([
    ['A man, a plan, a canal: Panama', true],
    ['racecar', true],
    ['No lemon, no melon', true],
    ['', true],
    ['a', true],
    ['hello', false],
    ['ab', false],
  ])('isPalindrome(%j) === %s', (input, expected) => {
    expect(isPalindrome(input)).toBe(expected);
  });
});

describe('P11 extractLinks', () => {
  it('extracts links but not images', () => {
    expect(extractLinks('see [docs](https://a.dev) and ![img](x.png) and [b](/b)')).toEqual([
      { text: 'docs', url: 'https://a.dev' },
      { text: 'b', url: '/b' },
    ]);
  });

  it('handles no links', () => {
    expect(extractLinks('plain text')).toEqual([]);
  });

  it('handles an empty link text', () => {
    expect(extractLinks('[](/x)')).toEqual([{ text: '', url: '/x' }]);
  });

  it('handles two links on one line', () => {
    expect(extractLinks('[a](1) [b](2)')).toEqual([
      { text: 'a', url: '1' },
      { text: 'b', url: '2' },
    ]);
  });
});

describe('P12 passwordProblems', () => {
  it('accepts a strong password', () => {
    expect(passwordProblems('Str0ng!pass')).toEqual([]);
  });

  it('lists every unmet rule in order', () => {
    expect(passwordProblems('abc')).toEqual([
      'at least 8 characters',
      'an uppercase letter',
      'a number',
      'a symbol',
    ]);
    expect(passwordProblems('')).toEqual([
      'at least 8 characters',
      'an uppercase letter',
      'a lowercase letter',
      'a number',
      'a symbol',
    ]);
  });

  it('counts a space as a symbol', () => {
    expect(passwordProblems('Abcdef1 ')).toEqual([]);
  });
});

describe('P13 formatList', () => {
  it.each([
    [[], ''],
    [['a'], 'a'],
    [['a', 'b'], 'a and b'],
    [['a', 'b', 'c'], 'a, b, and c'],
    [['a', 'b', 'c', 'd'], 'a, b, c, and d'],
  ])('formatList(%j) === %j', (items, expected) => {
    expect(formatList(items)).toBe(expected);
  });
});

describe('P14 parseLogLine', () => {
  it('parses a well-formed line', () => {
    expect(parseLogLine('2024-03-01T10:15:00Z ERROR api.users Request failed after 30s')).toEqual({
      timestamp: '2024-03-01T10:15:00Z',
      level: 'ERROR',
      logger: 'api.users',
      message: 'Request failed after 30s',
    });
  });

  it('keeps spaces in the message', () => {
    const parsed = parseLogLine('2024-03-01T10:15:00Z INFO app  two  spaces');
    expect(parsed.message).toBe(' two  spaces');
  });

  it('rejects malformed lines', () => {
    expect(parseLogLine('nonsense')).toBe(null);
    expect(parseLogLine('2024-03-01T10:15:00Z TRACE app msg')).toBe(null);
    expect(parseLogLine('2024-03-01 ERROR app msg')).toBe(null);
    expect(parseLogLine('2024-03-01T10:15:00Z ERROR app')).toBe(null);
  });

  it('accepts fractional seconds', () => {
    expect(parseLogLine('2024-03-01T10:15:00.123Z WARN db slow query')?.level).toBe('WARN');
  });
});
