import ENV from "../../../../../enviroments/env.js";
import { registerClass } from "../../../../../save&load/objectCollector.js";
import { registerLayers } from "../../../../layers/layersInfoCollector.js";
import BasicStaticObject from "../basicStaticObject.js";
import { registerSteps } from "../stepInfoCollector.js";

export class Effect extends BasicStaticObject {
  _maxLifetime = 0;
  _deleteOnSimEnd = true;
  __dt = this._step / ENV.PHYSICS_ENGINE_STEPS;


  constructor(lifetime = ENV.STEP, deleteOnSimEnd = true) {
    super(0, 0);

    this.collision = false;
    this.layers = ["effect"];
    this.size = 1;
    this.mass = 1;

    this._maxLifetime = lifetime;
    this._deleteOnSimEnd = deleteOnSimEnd;
  }


  register(id) {
    this.id = id;
  }


  physicsSimulationStep(step, objectsData) {
    this._livetime += this.__dt;

    if (this._livetime >= this._maxLifetime && this._maxLifetime !== -1) {
      this.visible = false;
      this.destroy();
      return {
        delete: true
      };
    }
  }

  finalize(objectsData) {
    super.finalize(objectsData);

    this._livetime -= this._step;

    if (this._deleteOnSimEnd || (this._livetime >= this._maxLifetime && this._maxLifetime !== -1)) {
      this.destroy();
    }
  }


  save(realParent = null) {
    return false;
  }

  load(data, loadChildren = false) {
    super.load(data, false);
    this._maxLifetime = data.maxLifetime;

    loadChildren && super.loadChildren(data);
  }
}

registerClass(Effect)
registerSteps(Effect, 0, [])
registerLayers(Effect, ['effect'], 1);