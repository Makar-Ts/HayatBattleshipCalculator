import { getPositionFromTime, predictInterceptTime } from "../../../../../../../../libs/intercept.js";
import { calc, point } from "../../../../../../../../libs/vector/point.js";
import { Particle } from "./particle.js";

export function bulletParticleFactory(target, spread) {
  return class BulletParticle extends Particle {
    get targetAcceleration() {
      return target.forces ? target.forces.reduce((acc, v) => {
        acc.x += v.x / target.mass;
        acc.y += v.y / target.mass;

        return acc;
      }, point(0, 0)) : point(0, 0);
    }

    _randomOffset = undefined;
    _lastTravel = undefined;
    _lost = false;
    update(dt, color, size, velocity, direction) {
      this.age += dt;

      this.color = color;
      this.size = size;

      if (!target) {
        if (!this._lastTravel) this._lastTravel = point(() => this.velocity / dt * 0.0005);
        if (!this._lost) {
          this._lost = true;
          this.maxLifetime *= 2;
        }

        this.x += this._lastTravel.x;
        this.y += this._lastTravel.y;

        return this.age < this.maxLifetime;
      }

      const pos = point(this.x, this.y);
      const tpos = point(target._x, target._y);

      if (point(() => tpos - pos).length <= target.size)
        return false;

      if (!this._randomOffset) {
        this._randomOffset = point(target.size * (Math.random() * 2 - 1) * spread * 0.9, target.size * (Math.random() * 2 - 1) * spread * 0.9);
      }

      const tacc = this.targetAcceleration;

      const predicted = predictInterceptTime({
        bulletSpeed: this.velocity.length,
        shooterPos: pos,
        targetPos: tpos,
        targetVel: target.velocity,
        targetAcc: tacc
      })

      const t = Number.isFinite(predicted)
        ? Math.min(predicted, this.maxLifetime - this.age)
        : this.maxLifetime - this.age;

      const p = getPositionFromTime({
        t: t,
        targetPos: tpos,
        targetVel: target.velocity,
        targetAcc: tacc
      })

      const travel = point(() => 
        (p + this._randomOffset - pos) / Math.floor(t / dt)
      )

      this.x += travel.x;
      this.y += travel.y;

      this._lastTravel = travel;

      this.direction = Math.atan2(-travel.y, travel.x) / Math.PI * 180 - 90;

      return this.age < this.maxLifetime;
    }


  }
}