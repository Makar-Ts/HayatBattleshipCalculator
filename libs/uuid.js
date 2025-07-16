/**
 * 
 * @returns {string} 5-digit uuid
 */
export default function uuid() {
  return "10000".replace(/[018]/g, c =>
    (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
  );
}

/**
 * 
 * @returns {string} uuid4
 */
export function uuidv4() {
  return "10000000-1000-4000-8000-100000000000-".replace(/[018]/g, c =>
    (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
  ) + Date.now();
}