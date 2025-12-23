import { toCurrentCanvasSize } from '../../libs/canvas.js';
import { point } from '../../libs/vector/point.js';
import { EVENTS } from '../events.js'
import { settings } from '../settings/settings.js';

let canvas;
let ctx;
let style;

let mapProps = {
  size: 10000,
  grid: 500,
  offset: { x: 0, y: 0 },
};

let toCanvas = (pos) => 0;
let fromCanvas = (pos) => 0;

export default function init() {
  canvas = document.getElementById('grid');
  ctx = canvas.getContext("2d");
  style = window.getComputedStyle(canvas);

  canvas.width = settings.gridResolution;
  canvas.height = settings.gridResolution;

  let raito = canvas.width / mapProps.size;

  toCanvas = (pos) => {
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


  const drawGrid = (size, grid, offset) => { 
    requestAnimationFrame(() => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = toCurrentCanvasSize(canvas, 10);
      ctx.strokeStyle = style.getPropertyValue('--border')

      ctx.font = toCurrentCanvasSize(canvas, 100) + "px Consolas";
      ctx.textAlign = 'left';
      ctx.textBaseline = 'hanging';
      ctx.fillStyle = style.getPropertyValue('--border');

      const padding = toCurrentCanvasSize(canvas, 50);

      for (let index = Math.floor(-offset.x / grid); index < Math.floor((-offset.x + size) / grid); index++) {
        let pos = toCanvas({ x: index * grid })
        ctx.beginPath()

        ctx.moveTo(pos, 0);
        ctx.lineTo(pos, canvas.height);

        ctx.stroke();
        ctx.fillText(`${index * grid}m`, pos + padding, padding);
      }

      for (let index = Math.floor(-offset.y / grid); index < Math.floor((-offset.y + size) / grid); index++) {
        let pos = toCanvas({ y: index * grid })
        ctx.beginPath()

        ctx.moveTo(0, pos);
        ctx.lineTo(canvas.width, pos);

        ctx.stroke();
        ctx.fillText(`${index * grid}m`, padding, pos + padding);
      }
    })
  }


  drawGrid(mapProps.size, mapProps.grid, mapProps.offset);

  document.addEventListener(EVENTS.MAP_SET_CHANGED, (e) => {
    const { size, grid, offset } = e.detail;

    canvas.width = settings.gridResolution;
    canvas.height = settings.gridResolution;
    raito = canvas.width / size;

    mapProps = {...mapProps, ...e.detail};
    drawGrid(size, grid, mapProps.offset);
  })
}

export { canvas, ctx, style, mapProps, toCanvas, fromCanvas }