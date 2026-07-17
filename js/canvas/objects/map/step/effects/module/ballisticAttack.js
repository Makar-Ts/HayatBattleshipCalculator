import { hexToRgb } from "../../../../../../../libs/color.js";
import { getLocalPositionWithOverride } from "../../../../../../../libs/getLocalPosition.js";
import { lerp } from "../../../../../../../libs/math.js";
import { point } from "../../../../../../../libs/vector/point.js";
import { calculateRelativeData } from "../../../../../../controls/show_rdata.js";
import { registerClass } from "../../../../../../save&load/objectCollector.js";
import { registerLayers } from "../../../../../layers/layersInfoCollector.js";
import { registerEffect } from "../../../../../map.js";
import { registerSteps } from "../../stepInfoCollector.js";
import { bulletParticleFactory } from "../particleSystem/particles/ammoParticle.js";
import { ParticleSystem } from "../particleSystem/particleSystem.js";
import { ModuleEffect } from "./moduleEffect.js";


/*
"settings": {
  "ammoSize": [5, 20],
  "tracerColor": "#FFFF00",
  "ammoSpeed": 3000,
  "spread": 0.5,
  "maxFlyTime": 1,

  "burst": 15,
  "ammoFrequency": 0.01
}
*/


export class BallisticAttackModuleEffect extends ModuleEffect {
  isWeapon = true;
  _firePS = undefined;

  step(index, objectsData) {
    let data = super.step(index, objectsData);
  
    if (index === 1) {
      const attackResult = this.effectModule.functionsSharedData.perStep;

      this.succsessfulAttack = attackResult.hit;

      this.effectiveRange = this.effectModule.characteristics.additionalInfo.effectiveRange;

      this.effectTarget = this.effectParent.children[MAP_OBJECTS_IDS.CONTACT_CONTROLLER]?.target || null;


      this.tracerColor = hexToRgb(this.settings.tracerColor);

      const asize = this.settings.ammoSize;
      const plife = this.settings.maxFlyTime;

      this._firePS = new ParticleSystem({
        x: this.effectParent._x, 
        y: this.effectParent._y, 
        direction: 0,
        velocity: point(0, 0),
        simulateVelocity: false,

        startVelocityFunc: (p) => point(0, -lerp(0.8, 1, Math.random()) * this.settings.ammoSpeed),
        startRotationFunc: (p) => lerp(-2, 2, Math.random()),

        particle: bulletParticleFactory(this.succsessfulAttack ? this.effectTarget : undefined, this.settings.spread),
        frequency: this.settings.ammoFrequency,
        lifetime: plife,
        maxEmmitedParticles: this.settings.burst,

        colorFunc: (p) => this.settings.tracerColor,
        sizeFunc: (p) => asize,
        rotFunc: (p) => p.direction,
        velFunc: (p) => p.velocity,
      })
      this._firePS.emit = false;

      registerEffect(this._firePS);
    }

    return data;
  }


  destroy() {
    if (this._firePS) {
      this._firePS.visible = false;
      this._firePS.destroy();
    }

    this.visible = false;
    super.destroy();
  }


  draw(canvas, ctx, toCanvas, style) {
    if (this._kill || !this.visible || !this._firePS) return;

    if (!this.effectTarget || !this.effectParent) {
      this.destroy();

      return;
    }

    const offset = this.controller.getWeaponEffectOffset(this.id);
    const relData = calculateRelativeData(this.effectParent, this.effectTarget);
    const startPos = getLocalPositionWithOverride(
      this.effectParent, 
      0, 
      -this.effectParent.size, 
      -relData.adir+offset
    );

    this._firePS._x = startPos.x;
    this._firePS._y = startPos.y;
    this._firePS.direction = -relData.adir;
    this._firePS.velocity.x = this.effectParent.velocity.x;
    this._firePS.velocity.y = this.effectParent.velocity.y;
    this._firePS.emit = true;
  }
}

registerClass(BallisticAttackModuleEffect)
registerSteps(BallisticAttackModuleEffect, 1, [])
registerLayers(BallisticAttackModuleEffect, ['effect', 'module-effect', 'laser-attack'], 1);