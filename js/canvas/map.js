import { EVENTS } from "../events.js";
import { DEFAULT_SAVE_FILE, loadJSON } from "../save&load/load.js";
import { settings } from "../settings/settings.js";
import { mapProps } from "./grid.js";
import check_id from "./map/check_id.js";

import get_in_area from "./map/get_in_area.js";

let canvas;
let ctx;
let style;
let objects;
let toCanvas;

export default function init() {
  canvas = document.getElementById("map");
  ctx = canvas.getContext("2d");
  style = window.getComputedStyle(canvas);

  objects = {};

  canvas.width = settings.mapResolution;
  canvas.height = settings.mapResolution;

  let raito = canvas.width / mapProps.size;

  toCanvas = (pos) => pos * raito;

  const redrawMap = () => {
    requestAnimationFrame(() => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i of Object.keys(objects)) {
        objects[i].visible && objects[i].draw(canvas, ctx, toCanvas, style);
      }
    })
  };

  get_in_area();
  check_id(objects);


  document.addEventListener(EVENTS.MAP_SET_CHANGED, (e) => {
    const { size, grid } = e.detail;

    canvas.width = settings.mapResolution;
    canvas.height = settings.mapResolution;
    raito = canvas.width / size;

    redrawMap();
  });

  document.addEventListener(EVENTS.MAP.NEW, (e) => {
    const { object, id, redraw } = e.detail;

    object.id = id;
    objects[id] = object;
    if (redraw) redrawMap();
  });

  document.addEventListener(EVENTS.MAP.DELETE, (e) => {
    const { id, redraw } = e.detail;

    delete objects[id];
    if (redraw) redrawMap();
  });

  document.addEventListener(EVENTS.MAP.FUNCTION, (e) => {
    const { id, func, attr, redraw } = e.detail;

    if (typeof func === "function") {
      func(objects[id]);
    } else {
      objects[id][func](...attr);
    }
    if (redraw) redrawMap();
  });

  document.addEventListener(EVENTS.MAP.REDRAW, (e) => {
    redrawMap();
  });

  document.addEventListener(EVENTS.MAP.STEP, (e) => {
    console.log(objects);
    for (let i of Object.keys(objects)) {
      objects[i].next();
    }

    document.dispatchEvent(new Event(EVENTS.CALCULATION_ENDED))

    redrawMap();
  });


  document.addEventListener(EVENTS.RESET, () => {
    objects = {};
    redrawMap();
  })


  if (settings.saveLastState && settings.lastState != "{}") {
    try {
      loadJSON(JSON.parse(settings.lastState));
    } catch (e) {
      console.log(e);
      if (confirm("Error on loading last state, remove it?")) {
        if (confirm("Save last state in file?")) {
          var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(settings.lastState);
          var dlAnchorElem = document.getElementById('modal-map_load-types-load-anchor');
          dlAnchorElem.setAttribute("href", dataStr);
          dlAnchorElem.setAttribute("download", `${uuidv4()}_${Date.now()}.json`);
          dlAnchorElem.click();
        }

        settings.lastState = JSON.stringify(DEFAULT_SAVE_FILE);
      }

      objects = {};
    }
  }
}

export { ctx, canvas, style, objects, toCanvas }