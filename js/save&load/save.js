import { mapProps } from "../canvas/grid.js";
import { objects } from "../canvas/map.js";

export function saveFunction(func) {
  const entire = func.toString().replace(/\n/g, '');
  let args = entire.slice(entire.indexOf("(") + 1, entire.indexOf(")"));
  let body = entire.slice(entire.indexOf(")") + 1).trim();

  if (body.startsWith('{') && body.endsWith('}')) {
    body = body.slice(1, -1);
  } else {
    if (body.match(/=> *{/)) {
      body = body.replace(/=> *{/, '').slice(undefined, -1);
    } else {
      body = body.replace('=>', 'return');
    }
  }

  return { args, body }
}


export function getJSONedData() {
  return {
    map: {...mapProps},
    objects: Object.entries(objects).reduce((acc, [id, v]) => {
      acc[id] = v.save();

      return acc;
    }, {})
  }
}