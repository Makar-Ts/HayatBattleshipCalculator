/** @type {Record<string, { layers: Set<string>, zIndex: number }>} */
const classToLayers = {};
/** @type {Set<string>} */
const allLayers = new Set();

/**
 * 
 * @param {class} cls
 * @param {Array<string>} layers
 * @param {number} zIndex
 */
export function registerLayers(cls, layers, zIndex) { 
  layers = [...layers, cls.name];

  classToLayers[cls.name] = {
    layers: new Set(layers),
    zIndex: zIndex,
  };

  layers.forEach((v) => allLayers.add(v));
}

/**
 * 
 * @param {object} object 
 * @param {Set<string> | Array<string>} enabledLayers 
 * @param {number} zIndex 
 */
export function checkObjectRenderVisibility(object, enabledLayers, zIndex) {
  if (enabledLayers === null) enabledLayers = allLayers;
  else enabledLayers = new Set(enabledLayers);

  let current = object;
  let obj = classToLayers[current.constructor.name];
  while (!obj) {
    current = Object.getPrototypeOf(Object.getPrototypeOf(current))
    obj = classToLayers[current.constructor.name];
  }

  if (obj.zIndex !== zIndex) return false;

  return  enabledLayers.has(current.constructor.name) || 
          Array.from(obj.layers.values()).some(v => enabledLayers.has(v));
}

/**
 * 
 * @returns {string[]}
 */
export function getZIndexes() {
  return Array.from(Object.values(classToLayers).reduce((acc, v) => {
    return acc.add(v.zIndex);
  }, new Set()))
}

export { allLayers, classToLayers };