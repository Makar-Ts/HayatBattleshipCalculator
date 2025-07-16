/**
 * 
 * @param {string} value 
 * @param {string | RegExp} compareTo 
 * @returns {boolean}
 */
export function stringOrRegex(value, compareTo) {
  return typeof compareTo == "string" ? value == compareTo : compareTo.test(value);
}