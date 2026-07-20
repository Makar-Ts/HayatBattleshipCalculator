import { getMousePos } from "../../libs/canvas.js";
import { LinkedList } from "../../libs/linkedList.js";
import { calc, point } from "../../libs/vector/point.js";
import { mapProps } from "../canvas/grid.js";
import { objects } from "../canvas/map.js";
import CrosshairObject from "../canvas/objects/overlay/crosshair.js";
import { fromCanvas, objectsOnOverlay } from "../canvas/overlay.js";
import { EVENTS } from "../events.js";

function getSquared(v1, v2) {
  const a = Math.abs(v2.x - v1.x);

  return point(v2.x, v1.y + (v2.y - v1.y >= 0 ? a : -a));
}

export function computeCenteredSquare() {
  const items = Object.values(objects).filter(o => o.visible && !o.decoy);
  const padding = fromCanvas(200);

  if (items.length === 0) {
    return null;
  }

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  for (const o of items) {
    const size = o.size ?? 30;

    const left   = o._x - size;
    const right  = o._x + size;
    const top    = o._y - size;
    const bottom = o._y + size;

    if (left < minX)   minX = left;
    if (right > maxX)  maxX = right;
    if (top < minY)    minY = top;
    if (bottom > maxY) maxY = bottom;
  }

  const width  = maxX - minX;
  const height = maxY - minY;

  const size = Math.max(width, height);

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  const half = size / 2;

  return {
    x: cx - half - padding,
    y: cy - half - padding,
    size: size + padding * 2
  };
}


export default function init() {
  const overlay = document.getElementById('overlay');
  const ol = () => document.getElementById('overlay');
  let isDragged = false;
  let dragStart = point(0, 0);

  const history = new LinkedList();
  document.addEventListener('keydown', (event) => {
    const activeElement = document.activeElement;

    if (
      activeElement.tagName === 'INPUT'     || 
      activeElement.tagName === 'TEXTAREA'  || 
      activeElement.tagName === 'SELECT'
    ) {
      return;
    }

    if (event.ctrlKey) {
      if (event.key === 'z' || event.key === 'Z' || event.key === 'я' || event.key === 'Я') {
        const historyPart = history.removeHead();
        if (!historyPart) return;

        const data = {
          ...historyPart,
          byControl: true,
        };

        event.preventDefault(); 

        document.dispatchEvent(new CustomEvent(
          EVENTS.MAP_SET_CHANGED, { detail: data }
        ));
      }


      if (event.key === 'v' || event.key === 'V' || event.key === 'м' || event.key === 'М') {
        const size = computeCenteredSquare();
        if (!size) return;

        event.preventDefault(); 

        const data = { 
          size: size.size, 
          grid: mapProps.grid ?? 500, 
          offset: { 
            x: -size.x,
            y: -size.y
          },
          byControl: true,
        } 
        history.appendNode(structuredClone(mapProps))

        document.dispatchEvent(new CustomEvent(
          EVENTS.MAP_SET_CHANGED, { detail: data }
        ));
      }
    }


    if ((event.key === '=' || event.key === '-') && !event.ctrlKey) {
      const pos1 = point(-mapProps.offset.x, -mapProps.offset.y);
      const pos2 = point(-mapProps.offset.x + mapProps.size, -mapProps.offset.y + mapProps.size);

      const center = calc(() => (pos1 + pos2) / 2);
      const newSize = mapProps.size * (event.key === '=' ? 1.1 : 0.9);

      const data = { 
        size: newSize, 
        grid: mapProps.grid ?? 500, 
        offset: { 
          x: -(center.x - newSize / 2),
          y: -(center.y - newSize / 2)
        },
        byControl: true,
      } 
      history.appendNode(structuredClone(mapProps))

      document.dispatchEvent(new CustomEvent(
        EVENTS.MAP_SET_CHANGED, { detail: data }
      ));
    }
  })


  overlay.addEventListener('mousedown', (e) => {
    if (e.ctrlKey && !isDragged) {
      e.preventDefault();

      isDragged = true;
      const pos = getMousePos(ol(), e);
      dragStart = pos;

      const obj1 = new CrosshairObject(pos.x, pos.y, 0);
      document.dispatchEvent(
        new CustomEvent(EVENTS.OVERLAY.NEW, {
          detail: {
            object: obj1,
            id: "controls-map-crosshair-start1",
            redraw: true,
          },
        })
      );

      const obj2 = new CrosshairObject(pos.x, pos.y, 0);
      document.dispatchEvent(
        new CustomEvent(EVENTS.OVERLAY.NEW, {
          detail: {
            object: obj2,
            id: "controls-map-crosshair-start2",
            redraw: true,
          },
        })
      );
    }
  })

  overlay.addEventListener('mouseup', (e) => {
    if (e.ctrlKey && isDragged) {
      e.preventDefault();

      isDragged = false;
      const cur = getSquared(dragStart, getMousePos(ol(), e));

      const size = Math.round(Math.abs(cur.x - dragStart.x));
      const data = { 
        size, 
        grid: mapProps.grid ?? 500, 
        offset: { 
          x: -Math.min(cur.x, dragStart.x), 
          y: -Math.min(cur.y, dragStart.y)
        },
        byControl: true,
      } 

      history.appendNode(structuredClone(mapProps))

      document.dispatchEvent(
        new CustomEvent(EVENTS.OVERLAY.DELETE, {
          detail: {
            id: "controls-map-crosshair-start1",
            redraw: false,
          },
        })
      );

      document.dispatchEvent(
        new CustomEvent(EVENTS.OVERLAY.DELETE, {
          detail: {
            id: "controls-map-crosshair-start2",
            redraw: true,
          },
        })
      );

      document.dispatchEvent(new CustomEvent(
        EVENTS.MAP_SET_CHANGED, { detail: data }
      ));
    }
  })
  
  $('#overlay').mousemove((e) => {
    if (!isDragged) return;

    const { x, y } = getSquared(dragStart, getMousePos(ol(), e));

    document.dispatchEvent(
      new CustomEvent(EVENTS.OVERLAY.FUNCTION, {
        detail: {
          id: "controls-map-crosshair-start2",
          func: "moveTo",
          attr: [ x, y ],
          redraw: true,
        },
      })
    );
  })
}