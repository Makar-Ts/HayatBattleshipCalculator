import { point } from "./vector/point.js";

/**
 *
 * @param {string} value
 * @param {string | RegExp} compareTo
 * @returns {boolean}
 */
export function stringOrRegex(value, compareTo) {
  return typeof compareTo == "string" ? value == compareTo : compareTo.test(value);
}

export function isElementInViewport(el) {
  var rect = el.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}


export function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  const maxLength = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < maxLength; i++) {
    const num1 = parts1[i] === undefined ? 0 : parts1[i];
    const num2 = parts2[i] === undefined ? 0 : parts2[i];

    if (num1 > num2) {
      return 1; // v1 is greater than v2
    }
    if (num1 < num2) {
      return -1; // v1 is less than v2
    }
  }

  return 0; // Versions are equal
}

export function randomDirection() {
  return point(Math.random() * 2 - 1, Math.random() * 2 - 1);
}