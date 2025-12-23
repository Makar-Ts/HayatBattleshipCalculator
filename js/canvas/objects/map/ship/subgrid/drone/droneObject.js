import { limitVector } from "../../../../../../../libs/limitVector.js";
import { calc, point } from "../../../../../../../libs/vector/point.js";
import { log } from "../../../../../../controls/step-logs/log.js";
import { registerClass } from "../../../../../../save&load/objectCollector.js";
import { registerLayers } from "../../../../../layers/layersInfoCollector.js";
import { objects } from "../../../../../map.js";
import MAP_OBJECTS_IDS from "../../../mapObjectsIds.constant.js";
import SIMULATION_STATES, { parceSimulationState } from "../../../step/simulationStates.constant.js";
import { registerSteps } from "../../../step/stepInfoCollector.js";
import SubgridObject from "../subgridObject.js";

export default class DroneObject extends SubgridObject {
  pursuitTarget = null;
  goToBackup = false;

  
  get safeDistance() {
    if (!this.controlledBy.Connection) {
      return this.currentCharacteristics?.constant?.body?.subgrid?.drone?.safe_distance ?? 100;
    }

    const state = this.controlledBy.Connection.state;
    if (state != "offline") {
      return this.currentCharacteristics?.constant?.body?.subgrid?.drone?.safe_distance ?? 100;
    }

    return this.controlledBy.Connection.backupDistance;
  }


  step(index, objectsData) {
    let data = super.step(index, objectsData);

    if (index === 0 && this.controlledBy.Connection) {
      const targetController = this.children[MAP_OBJECTS_IDS.CONTACT_CONTROLLER];
      if (this.controlledBy.Connection.state == "overload") {
        targetController.currentTarget = 1;
      } else if (this.controlledBy.Connection.state != "overload") {
        targetController.currentTarget = 0;
      }
    } if (index === 2) {
      this.updateTarget();

      if (this.checkArmor) {
        this.visible = false;
        this.active = false;
        this.collision = false;

        this.destroy();
      }
    }

    return data;
  }


  get checkArmor() {
    return this.currentCharacteristics.dynamic.hp.hull <= 0;
  }


  physicsSimulationStep(step, dt, objectsData) {
    const data = super.physicsSimulationStep(step, dt, objectsData);

    if (!this.active || this.goToBackup) return data;

    if (this.checkArmor) {
      this.destroy();

      return { ...data, delete: true };
    }

    // ---- проверки и базовые параметры ----
    const guidanceDelay = this.currentCharacteristics?.constant?.body?.subgrid?.guidanceDelay ?? 0;
    this.updateTarget();

    if (!this.pursuitTarget || !this.isFueled || ((guidanceDelay - this._livetime - dt*step) > 0)) {
      return data;
    }

    const maxForce = (this.currentCharacteristics?.constant?.acceleration ?? 100) * this.mass;
    const saveDistance = this.safeDistance + this.size + (this.pursuitTarget.size ?? 30);
    const calculationDistance = saveDistance + this.velocity.length;
    const calculationDistanceSqr = calculationDistance * calculationDistance;
    const rpos = calc(() => (point(this.pursuitTarget._x, this.pursuitTarget._y) - point(this._x, this._y)));


    const state = this.controlledBy.Connection.state;
    if (state == "offline" && rpos.length - (saveDistance * 1.2) <= 0) {
      log(this.path, `Backup was successfull to ${this.controlledBy.Connection.parent.id}`);
      this.destroy();
      this.goToBackup = true;

      return { ...data, delete: true };
    }


    const velocityLength = this.velocity.length;
    const normalizedVelocity = this.velocity.normalize();
    const vectorToTarget = rpos.normalize();
    const d = vectorToTarget.dot(normalizedVelocity);
    const v = this.velocity;
    const vLong = calc(() => vectorToTarget * v.dot(vectorToTarget));
    const vLat = calc(() => v - vLong);

    const lateralDamping = state == "offline" ? 1 : 0;

    const lateralForce = calc(() => vLat * (-lateralDamping * this.mass));


    const rangeToRadius = rpos.length - saveDistance - velocityLength * d;
    
    const mult = rangeToRadius < 0 ? 0.2 + (rangeToRadius / saveDistance) : 1;
    let resultedForce = calc(() => vectorToTarget * maxForce * mult + lateralForce);

    for (let obj of Object.values(objects)) {
      const rx = obj._x - this._x;
      const ry = obj._y - this._y;
      const dot = this.velocity.normalize().dot(point(rx, ry).normalize());
      if (dot <= 0) continue;

      const vel = (obj.velocity ?? point(0, 0));
      const vell = vel.length;
      let vdot;
      if (vell > 0) {
        vdot = this.velocity.normalize().dot(vel.normalize());
      } else {
        vdot = 0;
      }
      const sqrRange = rx*rx + ry*ry + Math.pow(obj.size ?? 30, 2) - Math.pow(vell, 2) * vdot - Math.pow(velocityLength, 2) * dot;

      if (sqrRange >= calculationDistanceSqr) continue;


      const range = Math.sqrt(sqrRange);

      const vectorToObj = calc(() => (point(this._x, this._y) - point(obj._x, obj._y))).normalize()
      const mult = (maxForce * (1 - range / calculationDistance) * dot);

      resultedForce = calc(() => resultedForce + vectorToObj * mult)
    }

    resultedForce = limitVector(resultedForce, maxForce);

    const a = Math.atan2(-resultedForce.y, resultedForce.x);

    const delta = (this._direction - 90) / 180 * Math.PI - a;
    const rotatingSpeed = 270 * dt;

    this._direction -= Math.min(delta * 180 / Math.PI, rotatingSpeed);

    return {
      ...data,
      forces: [...(data?.forces ?? []), { x: resultedForce.x, y: resultedForce.y }]
    };
  }


  updateTarget() {
    if (!this.controlledBy.Connection) {
      this.pursuitTarget = null;
      return;
    }
    const state = this.controlledBy.Connection.state;

    if (state == "active") {
      if (this.children[MAP_OBJECTS_IDS.CONTACT_CONTROLLER]) {
        const c = this.children[MAP_OBJECTS_IDS.CONTACT_CONTROLLER];

        if (c.target) {
          this.pursuitTarget = c.target;
          return;
        }
      }
    } else {
      this.pursuitTarget = this.controlledBy.Connection.parent;
    }
  }


  destroy() {
    if (parceSimulationState(this.state)[0] == SIMULATION_STATES.FINALIZE) {
      if (this.controlledBy.Connection) {
        if (this.goToBackup) {
          this.controlledBy.Connection.backup();
        } else {
          this.controlledBy.Connection.droneDestroyed();
        }
      }
    }

    super.destroy();
  }


  finalize(objectsData) {
    this._kill ||= this.checkArmor;

    return super.finalize(objectsData);
  }
}

registerClass(DroneObject);
registerSteps(DroneObject, 1, []);
registerLayers(DroneObject, ['subgrid', 'drone', 'dynamic'], 0);
