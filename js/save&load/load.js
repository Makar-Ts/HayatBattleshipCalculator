import { EVENTS } from "../events.js";
import { closeLoading, openLoading, updateLoading } from "../loading.js";
import classes from "./objectCollector.js";

function Wrapper(constructorFunc) {
  var _constructorFunc = constructorFunc;

  this.constructorFunc = function () {
    return _constructorFunc;
  };
}

/**
 * Load object from data
 * @param {string} id 
 * @param {object} data 
 * @param {object | null} parent 
 * @returns {object | undefined} if parent="module" returns loaded object
 */
export function load(id, data, parent = null) {
  const wrap = new Wrapper(classes[data.class]);
  const cfunc = wrap.constructorFunc();
  const object = new cfunc();

  object.load(data, true);

  if (parent == "module") return object;

  if (data.parent == "inherted" && parent) {
    parent.setChildren(id, object);
  } else {
    document.dispatchEvent(
      new CustomEvent(EVENTS.MAP.NEW, {
        detail: {
          id: id,
          object: object,
          redraw: false,
        },
      })
    );
  }
}

/**
 * 
 * @param {{
 *   args: string;
 *   body: string;
 * }} data 
 * @returns {Function}
 */
export function loadFunction(data) {
  return new Function(data.args, data.body);
}

export function loadJSON(json) {
  openLoading('level');
  const length = Object.keys(json).length+1;
  updateLoading('level', length, 0, 0)

  document.dispatchEvent(new Event(EVENTS.RESET))

  document.dispatchEvent(
    new CustomEvent(EVENTS.MAP_SET_CHANGED, {
      detail: {
        size: json.map.size,
        grid: json.map.grid,
      },
    })
  );

  updateLoading('level', length, 0, 1)

  let counter = 1;
  for (let [i, v] of Object.entries(json.objects)) {
    load(i, v);

    counter++;
    updateLoading('level', length, 0, counter)
  }

  document.dispatchEvent(new Event(EVENTS.MAP.REDRAW));
  updateLoading('level', length, 0, counter+1)
  closeLoading();
}

const DEFAULT_SAVE_FILE = {
  map: {
    size: 10000,
    grid: 500,
  },
  objects: [],
}

export { DEFAULT_SAVE_FILE }