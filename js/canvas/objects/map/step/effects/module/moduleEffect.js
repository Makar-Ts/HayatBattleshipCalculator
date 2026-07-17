import ENV from "../../../../../../enviroments/env.js";
import { ShipEffectController } from "../../../ship/hud/shipEffectController.js";
import ShipObject from "../../../ship/shipObject.js";
import { Effect } from "../effect.js";

export class ModuleEffect extends Effect {
  isWeapon = false;

  /**
   * @param {number} effectIndex 
   * @param {ShipEffectController} controller
   * @param {BaseModule} module 
   * @param {ShipObject} parent 
   * @param {ShipObject} target 
   */
  constructor(effectIndex, controller, module, parent) {
    super(ENV.STEP, true);

    this.controller = controller;

    this.effectModule = module;
    this.effectIndex = effectIndex;
    this.settings = this.effectModule.characteristics.effects[effectIndex].settings;

    this.effectParent = parent;
  }
}
