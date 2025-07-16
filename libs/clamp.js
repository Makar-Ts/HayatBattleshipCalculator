/**
 * clamp
 * @param {number} v 
 * @param {number} min 
 * @param {number} max 
 * @returns clamped value
 */
export function clamp(v, min, max) {
  return Math.min(Math.max(v, min), max);
};

/**
 * Clamp characteristics
 * @param {object} characteristics 
 * @param {object} clampRules 
 * @returns {object} clamped data
 */
export function clampCharacteristics(characteristics, clampRules) {
  function applyClamp(root, current, rules) {
    Object.entries(rules).forEach(([key, rule]) => {
      const currentValue = current[key];
      
      if (currentValue === undefined) {
        return;
      }

      if (typeof rule === 'object' && !Array.isArray(rule) && rule !== null) {
        if (typeof currentValue === 'object' && currentValue !== null) {
          applyClamp(root, currentValue, rule);
        }
        return;
      }

      if (Array.isArray(rule)) {
        if (rule.length !== 2) {
          return;
        }
        const [min, max] = rule;
        current[key] = clamp(currentValue, min, max);
      } else if (typeof rule === 'function') {
        current[key] = rule(root, currentValue);
      }
    });
  }

  applyClamp(characteristics, characteristics, clampRules);
  return characteristics;
}