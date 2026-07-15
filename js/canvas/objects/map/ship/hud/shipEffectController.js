import { Bezier } from "../../../../../../libs/beizer/bezier.js";
import { getLocalPosition, getLocalVelocity } from "../../../../../../libs/getLocalPosition.js";
import { calc, point } from "../../../../../../libs/vector/point.js";
import { registerClass } from "../../../../../save&load/objectCollector.js";
import { registerLayers } from "../../../../layers/layersInfoCollector.js";
import { registerEffect } from "../../../../map.js";
import BasicStepObject from "../../step/basicStepObject.js";
import { ParticleSystem } from "../../step/effects/particleSystem/particleSystem.js";
import { registerSteps } from "../../step/stepInfoCollector.js";

export class ShipEffectController extends BasicStepObject {
  /** @type {ParticleSystem | undefined} */
  _thrustParticleSystem = undefined;


  get combinedForcesLength() {
    return this.parent.forces.reduce((acc, v) => {
      acc.x += v.x
      acc.y += v.y

      return acc;
    }, point(0, 0)).length
  }

  next() {
    super.next();

    if (this.parent.forces?.length && this.combinedForcesLength > 0) {
      const pos = getLocalPosition(this.parent, 0, this.parent.size);
      const size = this.parent.size;
      const particleLifetime = 0.3;
      const b = new Bezier(0, 0, 0, 2, 1, 0);
      const startVel = this.combinedForcesLength / 1000000;
      console.log(startVel)

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
            (Math.random() + 0.5) * -(this.combinedForcesLength / 1000000)
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
          const s = (-Math.pow(p.age / particleLifetime, 2) * 0.5 + 1) * 10;
          return [s, s];
        },

        velFunc: (p) => p.velocity,

        rotFunc: (p) =>
          p.direction + 15 * ((p.seq % 40 - 20) / 20),
      });

      registerEffect(this._thrustParticleSystem);
    }
  }

  physicsSimulationStep(step, delta, objectsData) {
    if (!this._thrustParticleSystem) return;

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
}

registerClass(ShipEffectController)
registerSteps(ShipEffectController, 0, [])
registerLayers(ShipEffectController, ['effect', 'ship-effects'], 1);