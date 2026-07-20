import { EVENTS } from "./events.js";

let loadbars = {
  default: {
    id: "loading-inital-bar-default",
    max: 1,
    min: 0,
    cur: 0,
  },
  modules: {
    id: "loading-inital-bar-modules",
    max: 1,
    min: 0,
    cur: 0,
  },
  battleships: {
    id: "loading-inital-bar-battleships",
    max: 1,
    min: 0,
    cur: 0,
  },
  level: {
    container_id: "loading-level",
    id: "loading-level-bar",
    max: 1,
    min: 0,
    cur: 0,
  },
  step: {
    id: "step-process-bar",
    max: 1,
    min: 0,
    cur: 0,
  }
};

/**
 * Open loading modal
 * @param {string} id loadbar id
 */
let openLoading = (id) => {};

/**
 * Close loading modal
 */
let closeLoading = () => {};

/**
 * Update loadbar
 * @param {string} id loadbar id
 * @param {number} max maximum loading value
 * @param {number} min minimum loading value
 * @param {number} cur current loading value
 */
let updateLoading = (id, max, min, cur) => {};

/**
 * Update progress
 * @param {string} id loadbar id
 * @param {number} step number to add to current progress
 */
let stepLoading = (id, step) => {};

export default function init() {
  document.addEventListener(EVENTS.LOADING.OPEN, (e) => {
    openLoading(e.detail.id);
  })

  document.addEventListener(EVENTS.LOADING.CLOSE, (e) => {
    closeLoading();
  })

  document.addEventListener(EVENTS.LOADING.UPDATE, (e) => {
    updateLoading(...e.detail);
  })


  openLoading = (id) => {
    $('#loading-modals').attr('data-active', 'true');
    $('#loading-modals > *').attr('data-active', 'false');

    $('#'+loadbars[id].container_id).attr('data-active', 'true');
  }

  closeLoading = () => {
    $('#loading-modals').attr('data-active', 'false');
  }

  updateLoading = (id, dmax, dmin, dcur) => {
    loadbars[id] = {...loadbars[id], ...{ max: dmax, min: dmin, cur: dcur }};

    const { max, min, cur } = loadbars[id];
    $('#'+loadbars[id].id).css('--progress', (cur - min) / (max - min));
  }

  stepLoading = (id, step) => {
    const { max, min } = loadbars[id];
    loadbars[id].cur += step;
    $('#'+loadbars[id].id).css('--progress', (loadbars[id].cur - min) / (max - min));
  }
}

export { openLoading, closeLoading, updateLoading, stepLoading }