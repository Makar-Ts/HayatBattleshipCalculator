/**
 * 
 * @param {object} obj 
 * @param {string} path (delimiter is .)
 * @returns {[object, string]} ref to object that contains last path
 */
export function getByPath(obj, path){
  const paths = path.split('.');

  return [paths.slice(undefined, -1).reduce((o, p) => o?.[p], obj), paths[paths.length - 1]];
};