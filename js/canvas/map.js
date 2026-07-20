import { mergeDeep } from "../../libs/deepMerge.js";
import intentFromObject from "../../libs/generatePhysicsIntentFromObject.js";
import { compareVersions } from "../../libs/utils.js";
import { point } from "../../libs/vector/point.js";
import { computeCenteredSquare } from "../controls/map.js";
import { log } from "../controls/step-logs/log.js";
import ENV from "../enviroments/env.js";
import { EVENTS } from "../events.js";
import { stepLoading, updateLoading } from "../loading.js";
import PhysicsEngine from "../physics/engine.js";
import { DEFAULT_SAVE_FILE, loadJSON } from "../save&load/load.js";
import { settings } from "../settings/settings.js";
import { mapProps } from "./grid.js";
import check_id from "./map/check_id.js";
import layers from './layers/main.js';

import get_in_area from "./map/get_in_area.js";
import { MAX_INTER_STEPS } from "./objects/map/step/stepInfoCollector.js";
import { getZIndexIfCorrectLayer } from "./layers/layersInfoCollector.js";
import { activeLayers } from "../tab/render.js";
import { Effect } from "./objects/map/step/effects/effect.js";
import { uuidv4 } from "../../libs/uuid.js";
import { SpatialGrid } from "../physics/spatialGrid.js";
import BasicStaticObject from "./objects/map/step/basicStaticObject.js";
import BasicMovingObject from "./objects/map/step/basicMovingObject.js";

let canvas;
let ctx;
let style;
let objects;
let effects;
let toCanvas;

/** @type {SpatialGrid<BasicStaticObject | BasicMovingObject>} */
let spatialGrid = new SpatialGrid(ENV.SPATIAL_GRID_CELL_SIZE);

let currentlySimulatedFrame = -1;
/** @type {(effect: Effect) => string} */
let registerEffect;


function collectRenderObjects(obj, layers, renderRowAcc) {
  if (obj.visible) {
    const z = getZIndexIfCorrectLayer(obj, layers);
    if (z !== null) {
      if (!renderRowAcc[z]) renderRowAcc[z] = [];
      renderRowAcc[z].push(
        (canvas, ctx, toCanvas, style) => obj.draw(canvas, ctx, toCanvas, style)
      );

      obj.getChildrenRenderRow(layers, renderRowAcc)
    }
  }
}

export function drawObjects(canvas, ctx, toCanvas, style, activeLayers) {
  const layers = activeLayers;
  const renderRow = {};

  for (let i in objects) {
    collectRenderObjects(objects[i], layers, renderRow);
  }

  for (let i in effects) {
    collectRenderObjects(effects[i], layers, renderRow);
  }

  const sortedKeys = Object.keys(renderRow).map(Number).sort((a, b) => a - b);
  for (let i of sortedKeys) {
    for (let render of renderRow[i]) {
      render(canvas, ctx, toCanvas, style);
    }
  }
}


export default function init() {
  canvas = document.getElementById("map");
  ctx = canvas.getContext("2d");
  style = window.getComputedStyle(canvas);

  objects = {};
  

  canvas.width = settings.mapResolution;
  canvas.height = settings.mapResolution;

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


  const draw = () => {
    if (currentlySimulatedFrame < 0) {
      spatialGrid.rebuild(objects);
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawObjects(canvas, ctx, toCanvas, style, activeLayers);
    document.dispatchEvent(new Event(EVENTS.MAP.REDRAW_COMPLETED));
  }

  const redrawMap = (AF = false) => {
    if (AF) {
      requestAnimationFrame(draw);
    } else {
      draw();
    }
  };


  get_in_area();
  check_id(objects);
  layers();


  effects = {};
  let objectsWithEffects = { ...objects, ...effects };
  registerEffect = (effect) => {
    const id = `effect--${uuidv4()}`;

    effect.register(id);
    effects[id] = effect;

    return id;
  }



  document.addEventListener(EVENTS.MAP_SET_CHANGED, (e) => {
    const { size, grid } = e.detail;

    canvas.width = settings.mapResolution;
    canvas.height = settings.mapResolution;
    raito = canvas.width / size;

    redrawMap(false);
  });

  document.addEventListener(EVENTS.MAP.NEW, (e) => {
    const { object, id, redraw } = e.detail;

    object.id = id;
    objects[id] = object;
    spatialGrid.insert(id, object._x, object._y, object.size ?? 0, object);

    if (redraw) redrawMap();
  });

  document.addEventListener(EVENTS.MAP.DELETE, (e) => {
    const { id, redraw } = e.detail;
    
    if (objects[id]) {
      spatialGrid.remove(id);
      delete objects[id];
    } else {
      delete effects[id];
    }
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
    console.log(" ========================== ")
    console.log(" ------ step started ------ ")
    console.log(" ========================== ")

    console.log(objects);

    updateLoading(
      'step', 
        Object.keys(objects).length 
          * (MAX_INTER_STEPS() + 2) // steps + next + finalize для каждого объекта
        + 4 // промежуточные состояния
        + 4 + ENV.PHYSICS_ENGINE_STEPS + Object.keys(objects).length, // физ движок
      0,
      0
    );

    console.log(" ------ next ------ ")

    let data = {};
    for (let i of Object.keys(objects)) {
      data[i] = objects[i].next();
      stepLoading('step', 1);

      spatialGrid.updateObject(objects[i]);
    }
    
    for (let i of Object.keys(effects)) {
      data[i] = effects[i].next();
      stepLoading('step', 1);
    }

    stepLoading('step', 1);
    console.log(" ------ steps ------ ")

    let prevData = {...data};
    for (let step=0; step < MAX_INTER_STEPS(); step++) {
      console.log(` ------ step ${step} ------ `)
      log('system', `starting ${step} inter step`)
      console.log(prevData)

      for (let i of Object.keys(objects)) {
        data[i] = objects[i].step(step, prevData);
        stepLoading('step', 1);

        spatialGrid.updateObject(objects[i]);
      }

      for (let i of Object.keys(effects)) {
        data[i] = effects[i].step(step, prevData);
        stepLoading('step', 1);
      }

      prevData = mergeDeep(prevData, data);
    }

    console.log(" ------ physics init ------ ")
    stepLoading('step', 1);
    log('system', `init physics engine`);

    const physics = new PhysicsEngine();
    physics.setStep(ENV.STEP, ENV.PHYSICS_ENGINE_STEPS);

    stepLoading('step', 1);
    log('system', `gather object infos`);

    console.log(" ------ register objects ------ ")

    let objectsWithEffects = { ...objects, ...effects };
    for (let id of Object.keys(objectsWithEffects)) {
      if (!objectsWithEffects[id].collision) continue;
      physics.registerIntent(intentFromObject(objectsWithEffects[id]));
    }

    console.log(" ------ setup sim ------ ")

    stepLoading('step', 1);
    log('system', `physics simulation...`);
    const exportPhysicsState = () => {
      const physRes = physics.exportStates();

      objectsWithEffects = { ...objects, ...effects };
      for (let id of Object.keys(objectsWithEffects)) {
        prevData[id] = {
          ...prevData[id],
          _physics: physRes.states[id] ? {
            pos: physRes.states[id].pos,
            vel: physRes.states[id].vel,
            radius: physRes.states[id].radius
          } : prevData[id]?._physics
        };
      }

      prevData._physics_collisions = physRes.collisions;
    }

    console.log(" ------ finalize func ------ ")

    const finalize = () => {
      console.log(" ------ finalize simulation ------ ")

      currentlySimulatedFrame = -1;

      log('system', `done! export states...`);
    
      exportPhysicsState();
      
      console.log(" ------ after simulation ------ ")

      objectsWithEffects = { ...objects, ...effects };
      for (let i of Object.keys(objectsWithEffects)) {
        objectsWithEffects[i].afterSimulation?.(prevData);

        stepLoading('step', 1);
      }

      log('system', `done!`);
      stepLoading('step', 1);


      console.log(" ------ finalize ------ ")

      objectsWithEffects = { ...objects, ...effects };
      for (let i of Object.keys(objectsWithEffects)) {
        objectsWithEffects[i].finalize(prevData);

        stepLoading('step', 1);
      }

      console.log(" ------ calculations ended ------ ")

      document.dispatchEvent(new Event(EVENTS.CALCULATION_ENDED))

      stepLoading('step', 1);

      console.log(" ------ redraw ------ ")
      log('sys', 'map redraw...')
      redrawMap();

      stepLoading('step', 1);

      console.log(" ======================== ")
      console.log(" ------ step ended ------ ")
      console.log(" ======================== ")
    }

    console.log(" ------ onStep func ------ ")

    const dt = ENV.STEP / ENV.PHYSICS_ENGINE_STEPS;
    const onStep = (step) => {
      exportPhysicsState();

      currentlySimulatedFrame = step;

      const callback = {};
      for (let i of Object.keys(objects)) {
        const object = objects[i];
        const f = object.physicsSimulationStep?.(step, dt, prevData);

        if (f !== undefined && object) callback[i] = {
          ...f,
          objectRef: intentFromObject(object),
        };

        spatialGrid.updateObject(object);
      }

      for (let i of Object.keys(effects)) {
        effects[i]?.physicsSimulationStep?.(step, dt, prevData);
      }

      stepLoading('step', 1);

      return callback;
    }

    if (settings.instantSimulation) {
      console.log(" ------ instant simulation ------ ")

      physics.instantSimulate(onStep);

      return finalize();
    }


    const next = physics.simulate(onStep);

    const sim = (deltaTime) => {
      const time = ENV.STEP * 1000 / ENV.PHYSICS_ENGINE_STEPS * (1 / settings.physicsSimulationSpeedupMultiplier);

      setTimeout(() => {
        const start = Date.now();
        const simResult = next();
        if (simResult !== false && simResult % settings.renderPerFrame == 0) {
          if (settings.autoFocusOnSimulation) {
            const size = computeCenteredSquare();
            if (!size) return;

            const data = { 
              size: size.size, 
              grid: mapProps.grid ?? 500, 
              offset: { 
                x: -size.x,
                y: -size.y
              },
            }

            document.dispatchEvent(new CustomEvent(
              EVENTS.MAP_SET_CHANGED, { detail: data }
            ));
          } else {
            redrawMap();
          }
        }

        const delta = Date.now() - start;
        log('system', `physics simulation ${simResult === false ? "last" : simResult} step, delta: ${delta}ms`);

        if (simResult !== false) { sim(delta); }
        else { finalize(); }
      }, time - deltaTime)
    }

    let accumulator = 0;
    const physicsDt = ENV.STEP / ENV.PHYSICS_ENGINE_STEPS; // в секундах
    let lastTime = performance.now();
    let simRunning = true;
    let stepCount = 0;

    function loop(now) {
      if (!simRunning) return;

      const realDelta = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;
      accumulator += realDelta * settings.physicsSimulationSpeedupMultiplier;

      while (accumulator >= physicsDt) {
        const simResult = next();
        if (simResult === false) {
          simRunning = false;
          finalize();
          return;
        }
        accumulator -= physicsDt;
        stepCount++;
      }

      if (stepCount > 0 && (stepCount % settings.renderPerFrame) === 0) {
        if (settings.autoFocusOnSimulation) {
          const size = computeCenteredSquare();
          if (size) {
            const data = { 
              size: size.size, 
              grid: mapProps.grid ?? 500, 
              offset: { 
                x: -size.x,
                y: -size.y
              },
            }

            document.dispatchEvent(new CustomEvent(
              EVENTS.MAP_SET_CHANGED, { detail: data }
            ));
          }
        } else {
          redrawMap();
        }
      }

      requestAnimationFrame(loop);
    }

    requestAnimationFrame(loop);
  });


  document.addEventListener(EVENTS.RESET, () => {
    objects = {};
    effects = {};
    redrawMap();
  })


  document.addEventListener(EVENTS.LOAD_ENDED, () => {
    for (let i of Object.keys(objects)) objects[i].afterLoad?.();
  })


  if (settings.saveLastState && settings.lastState != "{}") {
    try {
      const json = JSON.parse(settings.lastState);

      const version = json.version ?? "0.0.0";
      if (compareVersions(ENV.SUPPORTED_SAVE_VERSION, version) == 1) {
        alert("Unsupported save version.");
        throw new Error("Unsupported save version");
      }

      loadJSON(json);
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

export { ctx, canvas, style, objects, effects, toCanvas, currentlySimulatedFrame, registerEffect, spatialGrid }