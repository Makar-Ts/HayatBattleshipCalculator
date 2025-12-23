import { log } from "../../../../controls/step-logs/log.js";
import { registerClass } from "../../../../save&load/objectCollector.js";
import { registerLayers } from "../../../layers/layersInfoCollector.js";
import { objects } from "../../../map.js";
import BasicStepObject from "./basicStepObject.js";
import { registerSteps } from "./stepInfoCollector.js";

export default class BasicStaticObject extends BasicStepObject {
  static LOAD_FALLBACK = {
    ...super.LOAD_FALLBACK,
    collision: true,
    size: 30,
    mass: 1,
    bounciness: 0,
    layers: ["static"],
  }

  static LOAD_CRASH = new Set(
    super.LOAD_CRASH
  );

  constructor(x, y) {
    super(x, y);
  }

  collision = true;
  size = 30;
  mass = 1;
  bounciness = 0;
  layers = ["static"];


  getOverridableValues() {
    return [
      ...super.getOverridableValues(),
      {
        name: "collision",
        type: "checkbox",
        current: () => this.collision,
        func: (val) => {
          this.collision = val;
        },
      },
      {
        name: "size",
        type: "number",
        current: () => this.size,
        func: (val) => {
          this.size = +val;
        },
      },
      {
        name: "mass",
        type: "number",
        current: () => this.mass,
        func: (val) => {
          this.mass = +val;
        },
      },
      {
        name: "bounciness",
        type: "number",
        current: () => this.bounciness,
        func: (val) => {
          this.bounciness = +val;
        },
      },
    ];
  }


  physicsSimulationStep(step, objectsData) {
    const phys = objectsData[this.id]?._physics;
    if (phys) {
      this._x = phys.pos.x;
      this._y = phys.pos.y;
      this.velocity = phys.vel;
    }
  }


  finalize(objectsData) {
    const phys = objectsData[this.id]?._physics;
    if (phys) {
      this._x = phys.pos.x;
      this._y = phys.pos.y;
      // this.velocity = phys.vel;
    }

    const collisions = objectsData._physics_collisions || [];
    for (const c of collisions) {
      if (c.a === this.id || c.b === this.id) {
        const targetObj = objects[c.a === this.id ? c.b : c.a];
        if (!targetObj) continue;

        this.onCollision(
          c,
          targetObj
        );
      }
    }

    super.finalize(objectsData);
  }

  onCollision(collision, target) {
    let energy = collision.energy;
    if (energy === undefined) {
        energy = 0.5 * impulse * Math.abs(relVel);
    }

    log(this.path, `onCollision | collision!<br>
      ----------- | with ${target.path}<br>
      ----------- | collision: ${collision.point.x}m x ${collision.point.y}m<br>
      ----------- | energy: ${(Math.round(energy / 1000)).toLocaleString('en-US', { maximumFractionDigits: 1, notation: "compact" })} kJ<br>
      ----------- | resulted impulse: ${this.impulse}<br>`)

    return energy;
  }


  save(realParent = null) {
    return {
      ...super.save(realParent),
      collision: this.collision,
      size: this.size,
      mass: this.mass,
      bounciness: this.bounciness,
      layers: this.layers,
    };
  }

  load(data, loadChildren = false) {
    super.load(data, false);
    this.collision = data.collision;
    this.size = data.size;
    this.mass = data.mass;
    this.bounciness = data.bounciness;
    this.layers = data.layers;

    loadChildren && super.loadChildren(data);
  }
}

registerClass(BasicStaticObject)
registerSteps(BasicStaticObject, 0, [])
registerLayers(BasicStaticObject, ['static'], 0);