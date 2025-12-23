import { EVENTS } from "../../events.js";
import { load } from "../../save&load/load.js";
import { registerClass } from "../../save&load/objectCollector.js";
import { registerLayers } from "../layers/layersInfoCollector.js";

export default class StandartObject {
  static LOAD_FALLBACK = {
    _x: 0,
    _y: 0,
    visible: true,
    children: {}
  }

  static LOAD_CRASH = new Set(['id']);


  _x = 0;
  _y = 0;
  visible = true;

  id = "";

  children = {};
  parent = null;

  constructor(x, y) {
    this._x = x || 0;
    this._y = y || 0;
  }

  get name() {
    return this.id;
  }

  get path() {
    if (this.parent) {
      return this.parent.path + " > " + this.name;
    }

    return this.name;
  }

  draw(canvas, ctx, toCanvas, style) {
    for (let i of Object.keys(this.children)) {
      this.children[i].visible && this.children[i].draw(canvas, ctx, toCanvas, style);
    }
  }

  setChildren(id, object) {
    object.parent = this;
    object.id = id;
    this.children[id] = object;
  }

  deleteChildren(id) {
    delete this.children[id];
  }

  callChildren(id, func) {
    if (!this.children[id]) return;

    return func(this.children[id], this);
  }

  moveTo(x, y) {
    this._x = x;
    this._y = y;
  }

  setVisible(v) {
    this.visible = v;
  }

  getOverridableValues() {
    return [
      {
        name: "x",
        type: "number",
        current: () => Math.round(this._x * 100) / 100,
        func: (val) => {
          this._x = +val;
        },
      },
      {
        name: "y",
        type: "number",
        current: () => Math.round(this._y * 100) / 100,
        func: (val) => {
          this._y = +val;
        },
      },
      {
        name: "visible",
        type: "checkbox",
        current: () => this.visible,
        func: (val) => {
          this.visible = val;
        },
      },
    ];
  }

  getChildrenWithOverridableValues() {
    return Object.keys(this.children).map(v => ({
      id: v,
      getValues: () => this.children[v].getOverridableValues(),
      children: this.children[v].getChildrenWithOverridableValues()
    }))
  }


  save(realParent = null) {
    return {
      class: this.constructor.name,
      x: this._x,
      y: this._y,
      visible: this.visible,
      id: this.id,
      parent: realParent == null ? null : this.parent == realParent ? "inherted" : this.parent.id,
      children: Object.keys(this.children).reduce((acc, v) => {
        acc[v] = this.children[v].save(this);

        return acc;
      }, {}),
    };
  }

  load(data, loadChildren = true) {
    this._x = data.x;
    this._y = data.y;
    this.visible = data.visible;

    if (loadChildren) this.loadChildren(data);
  }

  // Рекурсивно загружаем детей
  loadChildren(data) {
    for (let i of Object.keys(data.children)) {
      load(i, data.children[i], this);
    }
  }


  afterLoad() {
    for (let param of this.constructor.LOAD_CRASH) {
      if (this[param] === null || this[param] === undefined) throw new Error(`${this.path} | Param ${param} not loaded.`);
    }

    for (let param in this.constructor.LOAD_FALLBACK) {
      if (this[param] === null || this[param] === undefined) {
        this[param] = this.constructor.LOAD_FALLBACK[param];

        console.warn(`${this.path} | Param ${param} is corrupted and replaced with fallback.`)
      }
    }

    for (let i of Object.keys(this.children)) {
      this.children[i].afterLoad?.();
    }
  }


  destroy() {
    document.dispatchEvent(
      new CustomEvent(EVENTS.MAP.DELETE, {
        detail: {
          id: this.id,
        },
      })
    );
  }
}

registerClass(StandartObject);
registerLayers(StandartObject, [], 0);
