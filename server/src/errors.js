/**
 * The API's error vocabulary.
 *
 * Every error the API returns has one of these codes. The error middleware
 * passes a code through only if it is on this list, so a Node system error
 * (`ENOENT`, `EPERM`) or a library's own code can never leak into a response.
 */

export const ERROR_CODES = Object.freeze([
  'invalid_json',
  'validation_failed',
  'invalid_response',
  'profile_required',
  'not_found',
  'last_profile',
  'payload_too_large',
  'internal_error',
]);

/**
 * @param {number} status
 * @param {string} code  one of ERROR_CODES
 * @param {string} message  safe to show to the learner
 * @param {Record<string, unknown>} [details]  e.g. `{ field: 'limit' }`
 */
export function httpError(status, code, message, details) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  if (details) err.details = details;
  return err;
}
