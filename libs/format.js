/**
 * Format string by {index}
 * @param {string} str 
 * @param  {...any} values 
 * @returns {string}
 */
export default function format(str, ...values) {
  return str.replace(/{(\d+)}/g, function(match, index) {
    return typeof values[index] !== 'undefined' ? values[index] : match;
  });
}

/**
 * Add + if needed
 * @param {number} v 
 * @returns {string}
 */
export function addPlus(v) {
  return v >= 0 ? "+"+v : String(v)
}