import { registerClass } from "../../../../../../save&load/objectCollector.js";
import { objects, spatialGrid } from "../../../../../map.js";
import SIMULATION_STATES, { parceSimulationState } from "../../../step/simulationStates.constant.js";
import { registerSteps } from "../../../step/stepInfoCollector.js";
import ContactSubgridObject from "./contactSubgridObject.js";
import { log } from "../../../../../../controls/step-logs/log.js";
import { registerLayers } from "../../../../../layers/layersInfoCollector.js";
import { createExplosion, ExplosionColors } from "../../../step/effects/predefined/explosion.js";
import { point } from "../../../../../../../libs/vector/point.js";
import { randomDirection } from "../../../../../../../libs/utils.js";

export default class ExplosiveSubgridObject extends ContactSubgridObject {
  exploded = false;

  physicsSimulationStep(step, dt, objectsData) {
    const data = super.physicsSimulationStep(step, dt, objectsData);
    if (this.isCollided || !this.active || this.exploded) return data;

    const pf = this.currentCharacteristics.constant.body.subgrid.poximity_fuse;
    if (pf) {
      const apf = pf.active;
      
      if (!apf) return data;
      if ((apf.trigger_activation_delay ?? 0) - this._livetime - dt*step > 0) return data;

      const layers = apf.triggers.layers ?? ['all'];
      const noLayerFilter = layers.includes('all');
      const minSize = apf.triggers.min_size ?? 0;
      const vel = this.velocity;

      const ids = spatialGrid.query(this._x, this._y, apf.min_distance * 2);
      for (let entry of ids) {
        const { r2, object } = entry;
        if (object.id === this.controlledBy.Connection?.id) continue;
        if ((object.size ?? 0) < minSize) continue;


        const distanceToTarget = Math.sqrt(r2) || 1e-6;
        const jamStrength = Math.max(object.jammingLevel ?? 0, 0);

        if (jamStrength <= 0 && distanceToTarget > apf.min_distance) continue;

        if (jamStrength > 0) {
          const rd1 = randomDirection();
          const mult1 = jamStrength * distanceToTarget;
          const error1 = point(rd1.x * mult1, rd1.y * mult1);

          const rx = object._x - this._x + error1.x;
          const ry = object._y - this._y + error1.y;
          const distWithError = Math.hypot(rx, ry);
          if (distWithError > apf.min_distance) continue;

          const objV = object.velocity ?? { x: 0, y: 0 };
          const rd2 = randomDirection();
          const mult2 = mult1 / 10;
          const error2 = point(rd2.x * mult2, rd2.y * mult2);
          if ((rx * (objV.x - vel.x + error2.x) + ry * (objV.y - vel.y + error2.y)) <= 0) continue;
        } else {
          const rx = object._x - this._x;
          const ry = object._y - this._y;

          const objV = object.velocity ?? { x: 0, y: 0 };
          if ((rx * (objV.x - vel.x) + ry * (objV.y - vel.y)) <= 0) continue;
        }

        if (noLayerFilter || (object.layers).some(v => layers.includes(v))) {
          log(this.path, `Active PF triggered by ${object.id}`);
          this.destroy();

          return {
            delete: true
          };
        }
      }
    }

    return data;
  }

  applyExplosiveDamage() {
    if (this.exploded) return;

    const { radius, falloff, effect } 
      = this.currentCharacteristics.constant.body.subgrid.explosion 
      ?? { 
        radius: 10, 
        falloff: 2,  
        effect: {
          damage: {
            kinetic: 0,
            high_explosive: 100,
            electro_magnetic: 0,
            thermal: 50
          },
        }
      };

    const ids = spatialGrid.query(this._x, this._y, radius);
    for (let entry of ids) {
      const obj = entry.object;
      const r2 = entry.r2;

      if (obj.id === this.id || !obj.collision) continue;
      if (!("applyDamage" in obj) || !("currentCharacteristics" in obj)) continue;

      const mult = Math.pow(1 - Math.sqrt(r2) / radius, falloff)
      const l = {};

      if (effect.damage) {
        l.damage = {};
        for (let [k, v] of Object.entries(effect.damage)) {
          if (!obj.currentCharacteristics.dynamic.recived_damage[k])
            obj.currentCharacteristics.dynamic.recived_damage[k] = 0;

          const val = v * mult;
          obj.currentCharacteristics.dynamic.recived_damage[k] += val;
          l.damage[k] = val;
        }

        obj.applyDamage();
      }
      
      if (effect.temperature) {
        const val = effect.temperature * mult;
        obj.currentCharacteristics.dynamic.temperature += val;
        l.temperature = val;
      }

      if (effect.charge) {
        const val = effect.charge * mult;
        obj.currentCharacteristics.dynamic.charge += val;
        l.charge = val;
      }

      if (effect.heal) {
        l.hp = {};
        for (let [k, v] of Object.entries(effect.heal)) {
          const val = v * mult;
          obj.currentCharacteristics.dynamic.hp[k] += v * mult;
          l.hp[k] = val;
        }
      }

      log(this.path, `explosion damage:<br>
to: ${obj.id}<br>
${Object.entries(l).map(([k, v]) => 
  typeof v == "object" 
    ? `${k}: ` + Object.entries(v).map(([k1, v1]) => `${k1} - ${v1}` ).join(', ')
    : `${k}: ${v}`
).join('<br>')}`)
    }

    let t = "kinetic", p = 0;
    for (let [k, v] of Object.entries(effect.damage)) {
      if (p < v) {
        p = v;
        t = k;
      }
    }

    createExplosion(this._x, this._y, this.velocity, p * 3, ExplosionColors[t].primary, ExplosionColors[t].secondary);

    this.exploded = true;
  }

  onContact() {
    this.applyExplosiveDamage();
  }

  destroy() {
    if (parceSimulationState(this.state)[0] == SIMULATION_STATES.PHYSICS_SIMULATION) {
      this.applyExplosiveDamage();
    }

    super.destroy();
  }
}

registerClass(ExplosiveSubgridObject);
registerSteps(ExplosiveSubgridObject, 0, []);
registerLayers(ExplosiveSubgridObject, ['subgrid', 'subgrid-contact', 'subgrid-explosive', 'dynamic'], 0);
