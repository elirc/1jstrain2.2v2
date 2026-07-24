/**
 * MODULE JS-05 — Strings, templates and regular expressions
 * ==========================================================
 *
 * Strings are immutable: every "modification" returns a new string. The
 * methods worth memorising:
 *
 *   .slice(start, end)          negative indexes allowed
 *   .split(sep) / arr.join(sep)
 *   .trim() / .trimStart() / .trimEnd()
 *   .padStart(len, char) / .padEnd()
 *   .replace(a, b)              first match only for a string/non-global regex
 *   .replaceAll(a, b)
 *   .match(re) / .matchAll(re)  matchAll needs the /g flag
 *   .startsWith / .endsWith / .includes
 *   `template ${expressions}`
 *
 * Regex crash course:
 *   \d digit  \w word char  \s whitespace  . any char
 *   +  1 or more   * 0 or more   ? optional   {2,4} range
 *   [abc] class   [^abc] negated   (x) capture group   (?:x) non-capturing
 *   ^ start  $ end   | alternation
 *   flags: g global, i case-insensitive, m multiline
 *
 * Run:  npx vitest run tests/js/05-strings-and-regex.test.js
 */

/**
 * PROBLEM 1 — slugify.
 *
 * Rules: lowercase the whole string; every RUN of characters that is not
 * a-z or 0-9 becomes a single hyphen; strip leading and trailing hyphens.
 *
 *   slugify('  Hello, World!  ')      -> 'hello-world'
 *   slugify('Node.js & React 19')     -> 'node-js-react-19'
 *   slugify('already-a-slug')         -> 'already-a-slug'
 *   slugify('__mixed  _ separators')  -> 'mixed-separators'
 *   slugify('!!!')                    -> ''
 *
 * @param {string} input
 * @returns {string}
 */
export function slugify(input) {
  throw new Error('TODO');
}

/**
 * PROBLEM 2 — titleCase.
 *
 * Uppercase the first letter of each word, lowercase the rest. Words are
 * separated by single spaces after trimming; collapse runs of whitespace.
 *
 *   titleCase('the QUICK brown fOx') -> 'The Quick Brown Fox'
 *   titleCase('  hello   world ')    -> 'Hello World'
 *   titleCase('')                    -> ''
 *
 * @param {string} input
 * @returns {string}
 */
export function titleCase(input) {
  throw new Error('TODO');
}

/**
 * PROBLEM 3 — truncate.
 *
 * If the string is longer than `max`, cut it and append `suffix` so that the
 * TOTAL length is exactly `max`. If `max` is shorter than the suffix, return
 * the suffix truncated to `max`.
 *
 *   truncate('Hello world', 8)          -> 'Hello w…'    (default suffix '…')
 *   truncate('Hello world', 8, '...')   -> 'Hello...'
 *   truncate('Hi', 8)                   -> 'Hi'
 *   truncate('Hello', 2, '...')         -> '..'
 *
 * @param {string} input
 * @param {number} max
 * @param {string} [suffix='…']
 * @returns {string}
 */
export function truncate(input, max, suffix = '…') {
  throw new Error('TODO');
}

/**
 * PROBLEM 4 — A tiny template engine.
 *
 * Replace every `{{key}}` (optional inner whitespace) with `data[key]`.
 * Missing keys become an empty string. Values are coerced with String().
 *
 *   render('Hi {{name}}, you are {{ age }}', { name: 'Ada', age: 36 })
 *     -> 'Hi Ada, you are 36'
 *   render('{{a}}{{a}}', { a: 'x' }) -> 'xx'
 *   render('{{missing}}!', {})       -> '!'
 *
 * @param {string} template
 * @param {Record<string, unknown>} data
 * @returns {string}
 */
export function render(template, data) {
  throw new Error('TODO');
}

/**
 * PROBLEM 5 — maskEmail.
 *
 * Keep the first and last character of the local part, mask the middle with
 * '*', keep the domain. Local parts of 1 or 2 characters are fully masked
 * with the same number of stars. Return the input unchanged if there is no
 * '@' or the local part is empty.
 *
 *   maskEmail('ada.lovelace@example.com') -> 'a**********e@example.com'
 *   maskEmail('ab@x.io')                  -> '**@x.io'
 *   maskEmail('a@x.io')                   -> '*@x.io'
 *   maskEmail('nope')                     -> 'nope'
 *
 * @param {string} email
 * @returns {string}
 */
export function maskEmail(email) {
  throw new Error('TODO');
}

/**
 * PROBLEM 6 — parseQuery.
 *
 * Parse a query string into an object. Handle a leading '?', URL-decoding,
 * `+` as a space, keys without a value (-> ''), and repeated keys (-> array).
 *
 *   parseQuery('?a=1&b=two&a=3&flag&q=hello+world%21')
 *     -> { a: ['1','3'], b: 'two', flag: '', q: 'hello world!' }
 *   parseQuery('') -> {}
 *
 * @param {string} search
 * @returns {Record<string, string | string[]>}
 */
export function parseQuery(search) {
  throw new Error('TODO');
}

/**
 * PROBLEM 7 — buildQuery.
 *
 * The inverse. Skip null/undefined values; arrays repeat the key; everything
 * is URL-encoded; no leading '?'. Keys keep insertion order.
 *
 *   buildQuery({ a: 1, b: 'hello world', c: null, d: ['x','y'], e: false })
 *     -> 'a=1&b=hello%20world&d=x&d=y&e=false'
 *
 * @param {Record<string, unknown>} params
 * @returns {string}
 */
export function buildQuery(params) {
  throw new Error('TODO');
}

/**
 * PROBLEM 8 — camelCase <-> kebab-case.
 *
 *   camelToKebab('backgroundColor') -> 'background-color'
 *   camelToKebab('parseHTMLString') -> 'parse-html-string'
 *   kebabToCamel('background-color') -> 'backgroundColor'
 *   kebabToCamel('--custom-prop')    -> 'customProp'
 *
 * @param {string} input
 * @returns {string}
 */
export function camelToKebab(input) {
  throw new Error('TODO');
}

/**
 * @param {string} input
 * @returns {string}
 */
export function kebabToCamel(input) {
  throw new Error('TODO');
}

/**
 * PROBLEM 9 — wordFrequencies.
 *
 * Count words case-insensitively, ignoring punctuation. A word is a run of
 * letters, digits or apostrophes. Return an array of `[word, count]` pairs
 * sorted by count descending, then alphabetically.
 *
 *   wordFrequencies("The cat. The CAT! A dog?")
 *     -> [['cat', 2], ['the', 2], ['a', 1], ['dog', 1]]
 *
 * @param {string} text
 * @returns {Array<[string, number]>}
 */
export function wordFrequencies(text) {
  throw new Error('TODO');
}

/**
 * PROBLEM 10 — isPalindrome.
 *
 * Ignore case, spaces and punctuation.
 *   isPalindrome('A man, a plan, a canal: Panama') -> true
 *   isPalindrome('hello')                          -> false
 *   isPalindrome('')                               -> true
 *
 * @param {string} input
 * @returns {boolean}
 */
export function isPalindrome(input) {
  throw new Error('TODO');
}

/**
 * PROBLEM 11 — Extract markdown links.
 *
 * Find every `[text](url)` and return `{ text, url }` objects in order.
 * Ignore image syntax `![alt](url)`.
 *
 *   extractLinks('see [docs](https://a.dev) and ![img](x.png) and [b](/b)')
 *     -> [{ text: 'docs', url: 'https://a.dev' }, { text: 'b', url: '/b' }]
 *
 * Hint: `String.prototype.matchAll` with a /g regex, and a negative lookbehind
 * `(?<!!)` for the image case.
 *
 * @param {string} markdown
 * @returns {Array<{ text: string, url: string }>}
 */
export function extractLinks(markdown) {
  throw new Error('TODO');
}

/**
 * PROBLEM 12 — Password rules.
 *
 * Return the list of unmet requirements, in this exact order:
 *   'at least 8 characters'
 *   'an uppercase letter'
 *   'a lowercase letter'
 *   'a number'
 *   'a symbol'                 (anything that is not a letter or a digit)
 *
 * An empty array means the password is valid.
 *
 * @param {string} password
 * @returns {string[]}
 */
export function passwordProblems(password) {
  throw new Error('TODO');
}

/**
 * PROBLEM 13 — formatList.
 *
 * Join with commas and a final 'and' (Oxford comma from three items up).
 *   formatList([])                    -> ''
 *   formatList(['a'])                 -> 'a'
 *   formatList(['a','b'])             -> 'a and b'
 *   formatList(['a','b','c'])         -> 'a, b, and c'
 *
 * @param {string[]} items
 * @returns {string}
 */
export function formatList(items) {
  throw new Error('TODO');
}

/**
 * PROBLEM 14 — Parse a log line.
 *
 * Lines look like:
 *   '2024-03-01T10:15:00Z ERROR api.users Request failed after 30s'
 *   <iso timestamp> <LEVEL> <logger> <message (may contain spaces)>
 *
 * Return `{ timestamp, level, logger, message }`, or `null` if the line does
 * not match. Level must be one of DEBUG, INFO, WARN, ERROR.
 *
 * @param {string} line
 * @returns {{ timestamp: string, level: string, logger: string, message: string } | null}
 */
export function parseLogLine(line) {
  throw new Error('TODO');
}
