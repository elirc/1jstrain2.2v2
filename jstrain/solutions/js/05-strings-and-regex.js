/** Reference solutions for MODULE JS-05. */

export function slugify(input) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function titleCase(input) {
  return input
    .trim()
    .split(/\s+/)
    .filter((word) => word !== '')
    .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function truncate(input, max, suffix = '…') {
  if (input.length <= max) return input;
  if (max <= suffix.length) return suffix.slice(0, Math.max(0, max));
  return input.slice(0, max - suffix.length) + suffix;
}

export function render(template, data) {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key) =>
    Object.hasOwn(data, key) && data[key] !== undefined && data[key] !== null
      ? String(data[key])
      : '',
  );
}

export function maskEmail(email) {
  const at = email.indexOf('@');
  if (at <= 0) return email;
  const local = email.slice(0, at);
  const domain = email.slice(at);
  if (local.length <= 2) return '*'.repeat(local.length) + domain;
  return `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}${domain}`;
}

export function parseQuery(search) {
  const out = {};
  const body = search.startsWith('?') ? search.slice(1) : search;
  if (body === '') return out;

  for (const pair of body.split('&')) {
    if (pair === '') continue;
    const eq = pair.indexOf('=');
    const rawKey = eq === -1 ? pair : pair.slice(0, eq);
    const rawValue = eq === -1 ? '' : pair.slice(eq + 1);
    const key = decodeURIComponent(rawKey.replace(/\+/g, ' '));
    const value = decodeURIComponent(rawValue.replace(/\+/g, ' '));

    if (!Object.hasOwn(out, key)) {
      out[key] = value;
    } else if (Array.isArray(out[key])) {
      out[key].push(value);
    } else {
      out[key] = [out[key], value];
    }
  }
  return out;
}

export function buildQuery(params) {
  const parts = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) continue;
    const values = Array.isArray(value) ? value : [value];
    for (const item of values) {
      if (item === null || item === undefined) continue;
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(item))}`);
    }
  }
  return parts.join('&');
}

export function camelToKebab(input) {
  return input
    // parseHTMLString -> parseHTML-String
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    // backgroundColor -> background-Color
    .replace(/([a-z\d])([A-Z])/g, '$1-$2')
    .toLowerCase();
}

export function kebabToCamel(input) {
  return input
    .replace(/^-+/, '')
    .replace(/-+([a-z0-9])/gi, (_match, char) => char.toUpperCase())
    .replace(/-+$/, '');
}

export function wordFrequencies(text) {
  const words = text.toLowerCase().match(/[a-z0-9']+/g) ?? [];
  const counts = new Map();
  for (const word of words) counts.set(word, (counts.get(word) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

export function isPalindrome(input) {
  const cleaned = input.toLowerCase().replace(/[^a-z0-9]/g, '');
  return cleaned === [...cleaned].reverse().join('');
}

export function extractLinks(markdown) {
  const matches = markdown.matchAll(/(?<!!)\[([^\]]*)\]\(([^)\s]*)\)/g);
  return [...matches].map((match) => ({ text: match[1], url: match[2] }));
}

export function passwordProblems(password) {
  const rules = [
    ['at least 8 characters', (p) => p.length >= 8],
    ['an uppercase letter', (p) => /[A-Z]/.test(p)],
    ['a lowercase letter', (p) => /[a-z]/.test(p)],
    ['a number', (p) => /\d/.test(p)],
    ['a symbol', (p) => /[^A-Za-z0-9]/.test(p)],
  ];
  return rules.filter(([, test]) => !test(password)).map(([message]) => message);
}

export function formatList(items) {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

const LOG_LINE =
  /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z) (DEBUG|INFO|WARN|ERROR) (\S+) (.+)$/;

export function parseLogLine(line) {
  const match = LOG_LINE.exec(line.trim());
  if (!match) return null;
  const [, timestamp, level, logger, message] = match;
  return { timestamp, level, logger, message };
}
