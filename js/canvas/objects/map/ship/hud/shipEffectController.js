import { Bezier } from "../../../../../../libs/beizer/bezier.js";
import { hexToRgb } from "../../../../../../libs/color.js";
import { getLocalPosition, getLocalVelocity } from "../../../../../../libs/getLocalPosition.js";
import { calc, point } from "../../../../../../libs/vector/point.js";
import ENV from "../../../../../enviroments/env.js";
import { registerClass } from "../../../../../save&load/objectCollector.js";
import { registerLayers } from "../../../../layers/layersInfoCollector.js";
import { registerEffect } from "../../../../map.js";
import BasicStepObject from "../../step/basicStepObject.js";
import { DoubleTrailParticle } from "../../step/effects/particleSystem/particles/doubleTrailParticle.js";
import { ParticleSystem } from "../../step/effects/particleSystem/particleSystem.js";
import { registerSteps } from "../../step/stepInfoCollector.js";

export class ShipEffectController extends BasicStepObject {
  /** @type {ParticleSystem | undefined} */
  _thrustParticleSystem = undefined;
  _afterlineParticleSystem = undefined;

  constructor() {
    super();
  }


  get combinedForcesLength() {
    return this.parent.forces.reduce((acc, v) => {
      acc.x += v.x
      acc.y += v.y

      return acc;
    }, point(0, 0)).length
  }



  createAfterlinePS() {
    const color = hexToRgb(this.parent.children[MAP_OBJECTS_IDS.SPRITE]?.color ?? "#00FFFF");
    console.log()
    const size = this.parent.size;
    const angle = Math.atan2(-this.parent.velocity.y, this.parent.velocity.x) / Math.PI * 180 - 90;

    const spacing = size / 2;
    const speed = this.parent.velocity.length;

    const a = point(0, 0);
    const particleLifetime = ENV.STEP;
    this._afterlineParticleSystem = new ParticleSystem({
      x: this.parent._x,
      y: this.parent._y,

      direction: angle,
      velocity: point(0, 0),

      startOffsetFunc: (p) => a,

      particle: DoubleTrailParticle,
      frequency: 0.005,
      lifetime: particleLifetime,
      emitTime: -1,
      systemLifetime: -1,

      colorFunc: (p) => {
        const x = p.age / particleLifetime;
        return `rgba(${color.r}, ${color.g}, ${color.b}, ${(1 - x) / 2})`;
      },

      sizeFunc: (p) => {
        const s = size / 2;
        return [size, s];
      },

      velFunc: (p) => a,

      rotFunc: (p) => p.direction,
    })

    registerEffect(this._afterlineParticleSystem);
  }

  createThrurstPS() {
    const size = this.parent.size;
    const pos = getLocalPosition(this.parent, 0, this.parent.size);
    const particleLifetime = 0.3;
    const b = new Bezier(0, 0, 0, 2, 1, 0);
    const startVel = this.combinedForcesLength / 1000000;

    const sizem = this.parent.subgrid ? 4 : 10;
    const velm = this.parent.subgrid ? 2000 : 1;

    this._thrustParticleSystem = new ParticleSystem({
      x: pos.x,
      y: pos.y,

      direction: this.parent._direction,
      velocity: point(this.parent.velocity.x, this.parent.velocity.y),

      startOffsetFunc: (p) => {
        const x = -size + Math.random() * (size + size);

        return point(x, size - Math.sqrt(Math.pow(size, 2) - Math.pow(x, 2)))
      },
      startVelocityFunc: (p) => {
        return point(
          0,
          (Math.random() + 0.5) * -(this.combinedForcesLength / 1000000) * velm
        );
      },
      startRotationFunc: (p) => {
        return Math.random() * 10 - 5;
      },

      frequency: Math.min(0.003, 500 / startVel * 0.003),
      lifetime: particleLifetime,

      colorFunc: (p) => {
        const x = p.age / particleLifetime;
        return `rgba(0, 255, 255, ${b.compute(x).y})`;
      },

      sizeFunc: (p) => {
        const s = (-Math.pow(p.age / particleLifetime, 2) * 0.5 + 1) * sizem;
        return [s, s];
      },

      velFunc: (p) => p.velocity,

      rotFunc: (p) =>
        p.direction + 15 * ((p.seq % 40 - 20) / 20),
    });

    registerEffect(this._thrustParticleSystem);
  }



  next() {
    super.next();

    if (this.parent.forces?.length && this.combinedForcesLength > 0 || this.ignoreNoForces) {
      this.createThrurstPS();
    }
  }

  physicsSimulationStep(step, delta, objectsData) {
    if (!this._afterlineParticleSystem) {
      if (this.parent.velocity.length || (this.parent.forces?.length && this.combinedForcesLength > 0)) {
        this.createAfterlinePS();
      } else {
        return;
      }
    }

    const angle = Math.atan2(-this.parent.velocity.y, this.parent.velocity.x) / Math.PI * 180 - 90;

    this._afterlineParticleSystem.direction = angle;
    this._afterlineParticleSystem._x = this.parent._x;
    this._afterlineParticleSystem._y = this.parent._y;


    if (!this._thrustParticleSystem) {
      if (this.parent.forces?.length && this.combinedForcesLength > 0 || this.ignoreNoForces) {
        this.createThrurstPS();
      } else {
        return;
      }
    }

    const pos = getLocalPosition(this.parent, 0, -this.parent.size);

    this._thrustParticleSystem.direction = this.parent._direction;
    this._thrustParticleSystem._x = pos.x;
    this._thrustParticleSystem._y = pos.y;
    this._thrustParticleSystem.velocity.x = this.parent.velocity.x;
    this._thrustParticleSystem.velocity.y = this.parent.velocity.y;
  }

  finalize(objectsData) {
    let data = super.finalize(objectsData);

    this._thrustParticleSystem = undefined;

    return data;
  }


  onParentDestroy() {
    super.onParentDestroy();

    if (this._thrustParticleSystem) {
      this._thrustParticleSystem.setVisible(false);
      this._thrustParticleSystem.destroy();
    }

    if (this._afterlineParticleSystem) {
      this._afterlineParticleSystem.setVisible(false);
      this._afterlineParticleSystem.destroy();
    }
  }


  save(realParent = null) {
    return {
      ...super.save(realParent),
      ignoreNoForces: this.ignoreNoForces,
    };
  }

  load(data, loadChildren = false) {
    super.load(data, false);
    this.ignoreNoForces = data.ignoreNoForces;

    loadChildren && super.loadChildren(data);
  }
}

registerClass(ShipEffectController)
registerSteps(ShipEffectController, 0, [])
registerLayers(ShipEffectController, ['effect', 'ship-effects'], 1);