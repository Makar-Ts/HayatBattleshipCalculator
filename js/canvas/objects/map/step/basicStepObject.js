import { log } from "../../../../controls/step-logs/log.js";
import env from "../../../../enviroments/env.js";
import { load } from "../../../../save&load/load.js";
import { registerClass } from "../../../../save&load/objectCollector.js";
import StandartObject from "../../standartObject.js";
import { registerSteps } from "./stepInfoCollector.js";

export default class BasicStepObject extends StandartObject {
  _step = 6;
  _livetime = 0;

  tasks = [];

  constructor(x, y, step) {
    super(x, y);
    this._step = step || env.STEP;
  }

  next() {
    log(this.path, `next | function call`)

    this._livetime += this._step;

    for (let i in this.tasks) {
      if (!this.tasks[i].do(this)) {
        delete this.tasks[i];
      }
    }
    this.tasks = this.tasks.filter((v) => v);

    let data = {};
    for (let i of Object.keys(this.children)) {
      if ("next" in this.children[i]) {
        const out = this.children[i].next();

        if (typeof out === 'boolean') continue;

        data = {
          ...data,
          ...out,
        }
      }
    }

    const d = {
      lifetime: this._livetime,
      ...data,
    };
    log(this.path, `next | children processed: `, data)

    return d;
  }

  step(index, objectsData) {
    log(this.path, `step ${index} | function call`)

    let data = {};

    for (let i of Object.keys(this.children)) {
      if ("step" in this.children[i]) {
        const out = this.children[i].step(index, objectsData);

        data = {
          ...data,
          ...out,
        }
      }
    }

    log(this.path, `step ${index} | children processed: `, data)
    return data;
  }

  finalize(objectsData) {
    log(this.path, `finalize | function call`)
    for (let i of Object.keys(this.children)) {
      "finalize" in this.children[i] && this.children[i].finalize(objectsData);
    }
  }


  getOverridableValues() {
    return [
      ...super.getOverridableValues(),
      {
        name: "step",
        type: "number",
        current: () => this._step,
        func: (val) => {
          this._y = val;
        },
      },
    ];
  }

  newTask(task, overrideWithSameId = false, overrideWithSameIdAndData = false) {
    if (overrideWithSameId) {
      const index = this.tasks.findIndex((v) => v.id == task.id);

      if (index != -1) this.tasks.splice(index, 1);
    }

    if (overrideWithSameIdAndData) {
      const index = this.tasks.findIndex(
        (v) => v.id == task.id && Object.keys(task.data).every((r) => v.data[r] == task.data[r])
      );

      if (index != -1) this.tasks.splice(index, 1);
    }

    this.tasks.push(task);
  }

  getTask(id, data = null) {
    return this.tasks.find(
      (v) => v.id == id && (data ? Object.keys(data).every((r) => v.data[r] == data[r]) : true)
    );
  }

  getAllTasks(id, data = null) {
    return this.tasks.filter(
      (v) => v.id == id && (data ? Object.keys(data).every((r) => v.data[r] == data[r]) : true)
    );
  }

  deleteTask(id, data = null) {
    const index = this.tasks.findIndex(
      (v) => v.id == id && (data ? Object.keys(data).every((r) => v.data[r] == data[r]) : true)
    );

    if (index != -1) this.tasks.splice(index, 1);
  }

  save(realParent = null) {
    return {
      ...super.save(realParent),
      step: this._step,
      livetime: this._livetime,
      tasks: this.tasks.map((v) => v.save()),
    };
  }

  load(data, loadChildren = false) {
    super.load(data, false);
    this._step = data.step;
    this._livetime = data.livetime;
    this.tasks = data.tasks.map((v) => load("", v, "module"));

    loadChildren && super.loadChildren(data);
  }
}

registerClass(BasicStepObject);
registerSteps(BasicStepObject, 0, []);
