import { registerClass } from "../../../../../../save&load/objectCollector.js";
import { objects } from "../../../../../map.js";
import SIMULATION_STATES, { parceSimulationState } from "../../../step/simulationStates.constant.js";
import { registerSteps } from "../../../step/stepInfoCollector.js";
import ContactSubgridObject from "./contactSubgridObject.js";
import { log } from "../../../../../../controls/step-logs/log.js";
import { registerLayers } from "../../../../../layers/layersInfoCollector.js";

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

      const mdsqr = apf.min_distance * apf.min_distance;
      const layers = apf.triggers.layers ?? ['all'];
      const noLayerFilter = layers.includes('all');
      const minSize = apf.triggers.min_size ?? 0;

      for (let obj of Object.values(objects)) {
        const rx = obj._x - this._x;
        const ry = obj._y - this._y;
        const range = rx*rx + ry*ry - Math.pow(obj.size ?? 0, 2);

        if (range > mdsqr) continue;
        if ((obj.size ?? 0) < minSize) continue;
        if (noLayerFilter || (obj.layers).some(v => layers.includes(v))) {
          log(this.path, `Active PF triggered by ${obj.id}`);
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

    
    for (let obj of Object.values(objects)) {
      if (obj.id === this.id || !obj.collision) continue;
      if (!("applyDamage" in obj) || !("currentCharacteristics" in obj)) continue;

      const rx = obj._x - this._x;
      const ry = obj._y - this._y;
      const range = rx*rx + ry*ry - Math.pow(obj.size ?? 0, 2);

      if (range > (radius*radius)) continue;

      const mult = Math.pow(1 - Math.sqrt(range) / radius, falloff)
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
