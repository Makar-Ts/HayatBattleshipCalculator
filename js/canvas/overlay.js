import { getMousePos } from "../../libs/canvas.js";
import { point } from "../../libs/vector/point.js";
import { EVENTS } from "../events.js";
import { settings } from "../settings/settings.js";
import { mapProps } from "./grid.js";

let canvas;
let ctx;
let style;
let objectsOnOverlay;

let fromCanvas;

export default function init() {
  canvas = document.getElementById("overlay");
  ctx = canvas.getContext("2d");
  style = window.getComputedStyle(canvas);

  objectsOnOverlay = {};

  canvas.width = settings.overlayResolution;
  canvas.height = settings.overlayResolution;

  let raito = canvas.width / mapProps.size;

  const toCanvas = (pos) => {
    if (typeof pos === "number") {
      return pos * raito;
    } else if (typeof pos === "object") {
      let x = null, y = null;
      let direction = false;

      if ('point' in pos) {
        x = pos.point.x;
        y = pos.point.y;
      } else if ('direction' in pos) {
        x = pos.direction.x;
        y = pos.direction.y;
        direction = true;
      } else {
        x = pos.x ?? null;
        y = pos.y ?? null;
      }
      
      if (direction) {
        return point((x ?? 0) * raito, (y ?? 0) * raito);
      } else if (x !== null && y !== null) {
        return point((mapProps.offset.x + x) * raito, (mapProps.offset.y + y) * raito);
      } else if (x !== null) {
        return (mapProps.offset.x + x) * raito;
      } else if (y !== null) {
        return (mapProps.offset.y + y) * raito;
      }
    }
  };
  fromCanvas = (pos) => {
    if (typeof pos === "number") {
      return pos / raito;
    } else if (typeof pos === "object") {
      let x = null, y = null;
      let direction = false;

      if ('point' in pos) {
        x = pos.point.x;
        y = pos.point.y;
      } else if ('direction' in pos) {
        x = pos.direction.x;
        y = pos.direction.y;
        direction = true;
      } else {
        x = pos.x ?? null;
        y = pos.y ?? null;
      }
      
      if (direction) {
        return point((x ?? 0) / raito, (y ?? 0) / raito);
      } else if (x !== null && y !== null) {
        return point(x / raito - mapProps.offset.x, y / raito - mapProps.offset.y);
      } else if (x !== null) {
        return x / raito - mapProps.offset.x;
      } else if (y !== null) {
        return y / raito - mapProps.offset.y;
      }
    }
  }

  const redrawOverlay = (AF = true) => {
    const d = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i of Object.keys(objectsOnOverlay)) {
        objectsOnOverlay[i].visible && objectsOnOverlay[i].draw(canvas, ctx, toCanvas, style);
      }
    }

    if (AF) {
      requestAnimationFrame(d)
    } else {
      d();
    }
  };

  canvas.onclick = (e) => {
    document.dispatchEvent(
      new CustomEvent(EVENTS.ON_MAP_CLICK, {
        detail: getMousePos(canvas, e),
      })
    );
  };

  document.addEventListener(EVENTS.MAP_SET_CHANGED, (e) => {
    const { size, grid } = e.detail;

    canvas.width = settings.overlayResolution;
    canvas.height = settings.overlayResolution;
    raito = canvas.width / size;

    redrawOverlay(false);
  });

  document.addEventListener(EVENTS.OVERLAY.NEW, (e) => {
    const { object, id, redraw } = e.detail;

    object.id = id;
    objectsOnOverlay[id] = object;
    console.log(objectsOnOverlay);
    if (redraw) redrawOverlay();
  });

  document.addEventListener(EVENTS.OVERLAY.DELETE, (e) => {
    const { id, redraw } = e.detail;

    delete objectsOnOverlay[id];
    if (redraw) redrawOverlay();
  });

  document.addEventListener(EVENTS.OVERLAY.FUNCTION, (e) => {
    const { id, func, attr, redraw } = e.detail;

    if (typeof func === "function") {
      func(objectsOnOverlay[id]);
    } else {
      objectsOnOverlay[id][func](...attr);
    }
    if (redraw) redrawOverlay();
  });
}

export { ctx, canvas, style, objectsOnOverlay, fromCanvas }