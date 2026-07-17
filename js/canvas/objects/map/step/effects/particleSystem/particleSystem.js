import { getLocalPosition, getLocalVelocity } from "../../../../../../../libs/getLocalPosition.js";
import { point, Point } from "../../../../../../../libs/vector/point.js";
import { calc } from "../../../../../../../libs/vector/vector.js";
import ENV from "../../../../../../enviroments/env.js";
import { registerClass } from "../../../../../../save&load/objectCollector.js";
import { registerLayers } from "../../../../../layers/layersInfoCollector.js";
import { registerSteps } from "../../stepInfoCollector.js";
import { Effect } from "../effect.js";
import { Particle } from "./particles/particle.js";

  /**
 * @typedef {Object} ParticleSystemOptions
 * @property {number} [x=0]
 * @property {number} [y=0]
 * @property {number} [direction=0]
 * @property {Point} [velocity]
 * @property {boolean} [simulateVelocity=false]
 * @property {typeof Particle} [particle=Particle]
 * @property {number} [frequency=1]
 * @property {number} lifetime
 * @property {number} [emitTime=6]
 * @property {number} [systemLifetime=6]
 * @property {number} [maxEmmitedParticles=-1]
 * @property {(p: ParticleSystem) => Point} [startOffsetFunc]
 * @property {(p: ParticleSystem) => Point} [startVelocityFunc]
 * @property {(p: ParticleSystem) => number} [startRotationFunc]
 * @property {(p: Particle) => string} [colorFunc]
 * @property {(p: Particle) => [number, number]} [sizeFunc]
 * @property {(p: Particle) => Point} [velFunc]
 * @property {(p: Particle) => number} [rotFunc]
 */

export class ParticleSystem extends Effect {
  /** @type {Particle} */
  particles = [];
  _seq = 0;

  /**
   * @param {ParticleSystemOptions} options
   */
  constructor({
    x = 0,
    y = 0,
    direction = 0,
    velocity = point(0, 0),
    simulateVelocity = false,

    startOffsetFunc = () => point(0, 0),
    startVelocityFunc = () => point(0, 0),
    startRotationFunc = (p) => p.direction,

    particle = Particle,

    frequency = 1,
    lifetime,
    emitTime = ENV.STEP,
    systemLifetime = ENV.STEP,
    maxEmmitedParticles = -1,

    colorFunc = () => "rgba(255,255,255,0.9)",
    sizeFunc = (p) => p.size,
    velFunc = (p) => p.velocity,
    rotFunc = (p) => p.direction,
  } = {}) {
    super(systemLifetime, false);

    this._x = x;
    this._y = y;
    this.direction = direction;
    this.velocity = velocity;
    this.simulateVelocity = simulateVelocity;

    this.startOffsetFunc = startOffsetFunc;
    this.startVelocityFunc = startVelocityFunc;
    this.startRotationFunc = startRotationFunc;

    this.particle = particle;
    this.frequency = frequency;
    this.particleMaxLifetime = lifetime;
    this.emitTime = emitTime;
    this.maxEmmitedParticles = maxEmmitedParticles;

    this.colorFunc = colorFunc;
    this.sizeFunc = sizeFunc;
    this.velFunc = velFunc;
    this.rotFunc = rotFunc;

    this.emit = true;
  }

  spawn(count = 1) {
    for (let i = 0; i < count; i += 1) {
      this.particles.push(this._createParticle());
    }
  }

  _createParticle() {
    const offset = this.startOffsetFunc(this);
    const velocity = this.startVelocityFunc(this);
    const rotation = this.direction + this.startRotationFunc(this);
    const basePosition = getLocalPosition(this, offset.x, offset.y);
    const baseVelocity = calc(() => getLocalVelocity(rotation, velocity.x, velocity.y) + this.velocity)
    const lifetime = this.particleMaxLifetime;
    this._seq += 1;
    const particle = new this.particle(
      basePosition.x, basePosition.y, 
      baseVelocity, 
      lifetime, 
      rotation, 
      this._seq
    );

    return particle;
  }

  draw(canvas, ctx, toCanvas, style) {
    for (const particle of this.particles) {
      particle.draw(canvas, ctx, toCanvas, style);
    }
  }

  physicsSimulationStep(step, objectsData) {
    const result = super.physicsSimulationStep(step, objectsData);
    if (result?.delete) {
      return result;
    }

    if (this.simulateVelocity) {
      this._x += this.velocity.x * this.__dt;
      this._y += this.velocity.y * this.__dt;
    }

    if ((this._livetime <= this.emitTime || this.emitTime === -1) && this.emit && (this.maxEmmitedParticles === -1 || this._seq < this.maxEmmitedParticles)) {
      if (this.frequency <= this.__dt) {
        const amount = Math.floor(this.__dt / this.frequency);
        this.spawn(this.maxEmmitedParticles !== -1 ? Math.min(amount, this.maxEmmitedParticles - this._seq) : amount)
      } else if ((this._livetime % this.frequency) <= this.__dt) {
        this.spawn(1);
      }
    }

    this.particles = this.particles.filter(
      (particle) => particle.update(
        this.__dt, 
        this.colorFunc(particle), 
        this.sizeFunc(particle), 
        this.velFunc(particle), 
        this.rotFunc(particle)
      )
    );
    return {};
  }
}

registerClass(ParticleSystem)
registerSteps(ParticleSystem, 0, [])
registerLayers(ParticleSystem, ['effect', 'particle-system'], 1);