import { toCurrentCanvasSize } from '../../libs/canvas.js';
import { point } from '../../libs/vector/point.js';
import { EVENTS } from '../events.js'
import { settings } from '../settings/settings.js';
import { spatialGrid } from './map.js';

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


export function drawGrid(canvas, ctx, toCanvas, size, grid, offset) {
  ctx.lineWidth = toCurrentCanvasSize(canvas, 10);
  ctx.strokeStyle = style.getPropertyValue('--border');

  ctx.font = toCurrentCanvasSize(canvas, 100) + "px Consolas";
  ctx.textAlign = 'left';
  ctx.textBaseline = 'hanging';
  ctx.fillStyle = style.getPropertyValue('--border');

  const padding = toCurrentCanvasSize(canvas, 50);

  for (let index = Math.floor(-offset.x / grid); index <= Math.floor((-offset.x + size) / grid); index++) {
    let pos = toCanvas({ x: index * grid });
    ctx.beginPath();

    ctx.moveTo(pos, 0);
    ctx.lineTo(pos, canvas.height);

    ctx.stroke();
    ctx.fillText(`${index * grid}m`, pos + padding, padding);
  }

  for (let index = Math.floor(-offset.y / grid); index <= Math.floor((-offset.y + size) / grid); index++) {
    let pos = toCanvas({ y: index * grid });
    ctx.beginPath();

    ctx.moveTo(0, pos);
    ctx.lineTo(canvas.width, pos);

    ctx.stroke();
    ctx.fillText(`${index * grid}m`, padding, pos + padding);
  }
}

/**
 * Визуализация Spatial Grid – окрашивает ячейки с объектами и выводит их количество.
 * Управляется через settings.showSpatialGrid.
 */
function drawSpatialGrid() {
  if (!settings.showSpatialGrid) return;
  if (!spatialGrid) return;

  const cellSize = spatialGrid.cellSize;
  const { size, offset } = mapProps;

  const startX = Math.floor(-offset.x / cellSize);
  const endX = Math.floor((-offset.x + size) / cellSize);
  const startY = Math.floor(-offset.y / cellSize);
  const endY = Math.floor((-offset.y + size) / cellSize);

  ctx.save();

  ctx.strokeStyle = 'rgba(100, 200, 255, 0.5)';
  ctx.lineWidth = 1;

  ctx.font = '25px Consolas';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';

  for (let cx = startX; cx <= endX; cx++) {
    for (let cy = startY; cy <= endY; cy++) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
      const key = `${cx},${cy}`;
      const cellSet = spatialGrid.grid.get(key);
      if (!cellSet || cellSet.size === 0) continue;

      const x1 = cx * cellSize;
      const y1 = cy * cellSize;
      const x2 = (cx + 1) * cellSize;
      const y2 = (cy + 1) * cellSize;

      const p1 = toCanvas({ x: x1, y: y1 });
      const p2 = toCanvas({ x: x2, y: y2 });

      const left = Math.min(p1.x, p2.x);
      const right = Math.max(p1.x, p2.x);
      const top = Math.min(p1.y, p2.y);
      const bottom = Math.max(p1.y, p2.y);

      const width = right - left;
      const height = bottom - top;

      ctx.fillRect(left, top, width, height);
      ctx.strokeRect(left, top, width, height);

      const count = cellSet.size;
      const padding = 2;
      ctx.fillStyle = 'rgba(100, 200, 255, 0.5)';
      ctx.fillText(String(count), left + padding, top + padding);
    }
  }

  ctx.restore();
}

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
  };

  const gridDraw = (size, grid, offset, AF = false) => {
    const d = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      drawGrid(canvas, ctx, toCanvas, size, grid, offset);
      drawSpatialGrid();
    };

    if (AF) {
      requestAnimationFrame(d);
    } else {
      d();
    }
  };

  gridDraw(mapProps.size, mapProps.grid, mapProps.offset);



  function generateNiceSteps(max) {
    const steps = [];
    const multipliers = [1, 2, 5];
    let order = 1;
    while (order <= max) {
      for (const m of multipliers) {
        const step = m * order;
        if (step > max) return steps;
        steps.push(step);
      }
      order *= 10;
    }
    return steps;
  }


  const TARGET_CELLS = 10;

  function findBracket(ideal, steps) {
    if (ideal <= steps[0]) return { low: steps[0], high: null };
    for (let i = 1; i < steps.length; i++) {
      if (ideal < steps[i]) {
        return { low: steps[i - 1], high: steps[i] };
      }
    }
    return { low: steps[steps.length - 1], high: null };
  }


  const HYSTERESIS = 0.15;

  function chooseGrid(currentGrid, ideal, steps) {
    const bracket = findBracket(ideal, steps);
    if (bracket.high === null) {
      return Math.max(bracket.low, currentGrid);
    }

    const { low, high } = bracket;
    const midpoint = (low + high) / 2;

    if (currentGrid === low) {
      if (ideal > midpoint * (1 + HYSTERESIS)) return high;
      return low;
    } else if (currentGrid === high) {
      if (ideal < midpoint * (1 - HYSTERESIS)) return low;
      return high;
    } else {
      return ideal <= midpoint ? low : high;
    }
  }


  const niceSteps = generateNiceSteps(1_000_000);

  document.addEventListener(EVENTS.MAP_SET_CHANGED, (e) => {
    let { size, grid, offset } = e.detail;

    canvas.width = settings.gridResolution;
    canvas.height = settings.gridResolution;
    raito = canvas.width / size;

    if (settings.autoResizeGrid) {
      const idealStep = size / TARGET_CELLS;
      grid = chooseGrid(mapProps.grid, idealStep, niceSteps);
    }

    mapProps = {...mapProps, ...e.detail, grid};
    gridDraw(size, grid, mapProps.offset);
  })
}

export { canvas, ctx, style, mapProps, toCanvas, fromCanvas }