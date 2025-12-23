import { log } from "../../../../../../controls/step-logs/log.js";
import { registerClass } from "../../../../../../save&load/objectCollector.js";
import { registerLayers } from "../../../../../layers/layersInfoCollector.js";
import { registerSteps } from "../../../step/stepInfoCollector.js";
import SubgridObject from "../subgridObject.js";

export default class ContactSubgridObject extends SubgridObject {
  static LOAD_FALLBACK = {
    ...super.LOAD_FALLBACK,
    contactOptions: {
      hide: true,
      destroy: true,
    }
  }

  static LOAD_CRASH = new Set(
    super.LOAD_CRASH
  );


  isCollided = false;
  contactOptions = {
    hide: true,
    destroy: true,
  }


  onContact(collidedTargetId) {}

  physicsSimulationStep(step, dt, objectsData) {
    const data = super.physicsSimulationStep(step, dt, objectsData);

    if (this.isCollided || !this.active) return data;

    if (this.currentCharacteristics.dynamic.hp.hull <= 0) {
      this.destroy();

      return {
        delete: true
      };
    }

    const collisions = objectsData._physics_collisions || [];
    for (const c of collisions) {
      if (c.a === this.id || c.b === this.id) {
        this.isCollided = true;
        this.visible = !this.contactOptions.hide;

        const target = c.a === this.id ? c.b : c.a;
        log(this.path, `Contact with ${target}`);
        this.onContact(target);
        if (this.contactOptions.destroy) this._kill = true;

        return {
          delete: this.contactOptions.hide
        };
      }
    }

    return data;
  }


  finalize(objectsData) {
    let destruct = false;
    const selfDestruct = this.currentCharacteristics.constant.body.subgrid?.self_destruct_in;
    if (selfDestruct && selfDestruct != -1) {
      destruct = this._livetime >= this.currentCharacteristics.constant.body.subgrid?.self_destruct_in;
    }

    

    this._kill ||= destruct || this.currentCharacteristics.dynamic.hp.hull <= 0
    
    this.isCollided = false;

    return super.finalize(objectsData);
  }


  save(realParent = null) {
    return {
      ...super.save(realParent),
      contactOptions: this.contactOptions,
    };
  }

  load(data, loadChildren = false) {
    super.load(data, false);
    
    this.contactOptions = data.contactOptions;

    loadChildren && super.loadChildren(data);
  }
}

registerClass(ContactSubgridObject);
registerSteps(ContactSubgridObject, 0, []);
registerLayers(ContactSubgridObject, ['subgrid', 'subgrid-contact', 'dynamic'], 0);
