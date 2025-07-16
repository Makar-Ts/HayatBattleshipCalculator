import { fromCanvas } from "../js/canvas/overlay.js";
import ENV from "../js/enviroments/env.js";
import { settings } from "../js/settings/settings.js";

/**
 * mouse position on MAP
 * @param {Canvas} canvas 
 * @param {PointerEvent} evt 
 * @returns {{x: number, y: number}}
 */
export function getMousePos(canvas, evt) {
  var rect = canvas.getBoundingClientRect();
  return {
    x: fromCanvas(((evt.clientX - rect.left) / (rect.right - rect.left)) * canvas.width),
    y: fromCanvas(((evt.clientY - rect.top) / (rect.bottom - rect.top)) * canvas.height),
  };
}

/**
 * 
 * @param {Canvas} canvas 
 * @param {number} origSize 
 * @returns {number}
 */
export function toCurrentCanvasSize(canvas, origSize) {
  return (canvas.width / ENV.DEFAULT_CANVAS_SIZE) * origSize * settings.hudSize;
}

/**
 * 
 * @param {Canvas} canvas 
 * @param {object} object 
 * @returns {object}
 */
export function settingsObjectToCanvasSize(canvas, object) {
  const out = {};

  for (let i in object) {
    if (typeof object[i] == "number") {
      out[i] = toCurrentCanvasSize(canvas, object[i]);
    } else if (typeof object[i] == "object") {
      out[i] = settingsObjectToCanvasSize(canvas, object[i]);
    }
  }

  return out;
}

export function toRealDirection(dir) {
  return -((dir - 180) % 360);
}

window.toRealDirection = toRealDirection;


export function fromOverlayToMap(pos) {
  return pos / settings.overlayResolution * settings.mapResolution
}

export function fromMapToOverlay(pos) {
  return pos / settings.mapResolution * settings.overlayResolution
}