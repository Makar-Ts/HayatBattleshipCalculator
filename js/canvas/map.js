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
import { checkObjectRenderVisibility, getZIndexes, getZIndexIfCorrectLayer } from "./layers/layersInfoCollector.js";
import { addRecordStringAny } from "../../libs/addRecordStringAny.js";
import { activeLayers } from "../tab/render.js";

let canvas;
let ctx;
let style;
let objects;
let toCanvas;


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

  const redrawMap = () => {
    requestAnimationFrame(() => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const layers = activeLayers;
      const renderRow = {};

      for (let i in objects) {
        collectRenderObjects(objects[i], layers, renderRow);
      }

      const sortedKeys = Object.keys(renderRow).map(Number).sort((a, b) => a - b);
      for (let i of sortedKeys) {
        for (let render of renderRow[i]) {
          render(canvas, ctx, toCanvas, style);
        }
      }
    })
  };

  get_in_area();
  check_id(objects);
  layers();


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

    for (let id of Object.keys(objects)) {
      if (!objects[id].collision) continue;
      physics.registerIntent(intentFromObject(objects[id]));
    }

    console.log(" ------ setup sim ------ ")

    stepLoading('step', 1);
    log('system', `physics simulation...`);
    const exportPhysicsState = () => {
      const physRes = physics.exportStates();

      for (let id of Object.keys(objects)) {
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

      log('system', `done! export states...`);
    
      exportPhysicsState();
      
      console.log(" ------ after simulation ------ ")

      for (let i of Object.keys(objects)) {
        objects[i].afterSimulation?.(prevData);

        stepLoading('step', 1);
      }

      log('system', `done!`);
      stepLoading('step', 1);


      console.log(" ------ finalize ------ ")

      for (let i of Object.keys(objects)) {
        objects[i].finalize(prevData);

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

      const callback = {};
      for (let i of Object.keys(objects)) {
        const f = objects[i].physicsSimulationStep?.(step, dt, prevData);

        if (f !== undefined && objects[i]) callback[i] = {
          ...f,
          objectRef: intentFromObject(objects[i]),
        };
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

    next();
    sim(0);
  });


  document.addEventListener(EVENTS.RESET, () => {
    objects = {};
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

export { ctx, canvas, style, objects, toCanvas }