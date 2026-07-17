import { hexToRgb, rgbaO } from "../../../../../../../libs/color.js";
import { getLocalPositionWithOverride, getLocalVelocity } from "../../../../../../../libs/getLocalPosition.js";
import { lerp } from "../../../../../../../libs/math.js";
import { point } from "../../../../../../../libs/vector/point.js";
import { calculateRelativeData } from "../../../../../../controls/show_rdata.js";
import { registerClass } from "../../../../../../save&load/objectCollector.js";
import { registerLayers } from "../../../../../layers/layersInfoCollector.js";
import { registerEffect } from "../../../../../map.js";
import { registerSteps } from "../../stepInfoCollector.js";
import { ParticleSystem } from "../particleSystem/particleSystem.js";
import { ModuleEffect } from "./moduleEffect.js";


/*
"settings": {
  "beamColor": "#FF000077",
  "beamSize": 20,

  "flashColor": "#FF0000BB",
  "flashSize": 40,

  "effectivnessImpact": 1
}
*/


export class LaserAttackModuleEffect extends ModuleEffect {
  isWeapon = true;
  _flashPS = undefined;

  step(index, objectsData) {
    let data = super.step(index, objectsData);
  
    if (index === 1) {
      const attackResult = this.effectModule.functionsSharedData.perStep;

      this.succsessfulAttack = attackResult.hit;
      this.attackEffectivness = attackResult.effectivness;

      this.effectiveRange = this.effectModule.characteristics.additionalInfo.effectiveRange;
      this.maxRange = this.effectModule.characteristics.additionalInfo.maxRange;

      this.effectTarget = this.effectParent.children[MAP_OBJECTS_IDS.CONTACT_CONTROLLER]?.target || null;


      this.beamColor = hexToRgb(this.settings.beamColor);
      this.flashColor = hexToRgb(this.settings.flashColor);

      if (this.succsessfulAttack) {
        const fsize = this.settings.flashSize;
        const plife = 0.1;

        this._flashPS = new ParticleSystem({
          x: 0, 
          y: 0, 
          direction: 0,
          velocity: point(0, 0),
          simulateVelocity: false,

          startVelocityFunc: (p) => point(0, (Math.random() + 0.5) * fsize * 15),
          startRotationFunc: (p) => Math.random() * 360,

          frequency: 0.01,
          lifetime: plife,

          colorFunc: (p) => rgbaO(this.flashColor, this.flashColor.a * (1 - (p.age / plife))),
          sizeFunc: (p) => {
            if (p.age === 0) {
              return [lerp(fsize / 8, fsize / 4, Math.random()), lerp(fsize / 4, fsize, Math.random())];
            } else {
              return [p.size[0] * 0.976, p.size[1]];
            }
          },
          rotFunc: (p) => p.direction,
          velFunc: (p) => p.velocity,
        })

        registerEffect(this._flashPS);
      }
    }

    return data;
  }


  destroy() {
    if (this._flashPS) {
      this._flashPS.visible = false;
      this._flashPS.destroy();
    }

    this.visible = false;
    super.destroy();
  }



  _missAngle = undefined;
  _missSign = undefined;
  draw(canvas, ctx, toCanvas, style) {
    if (this._kill || !this.visible) return;

    if (!this.effectTarget || !this.effectParent) {
      this.destroy();

      return;
    }

    const offset = this.controller.getWeaponEffectOffset(this.id);
    const relData = calculateRelativeData(this.effectParent, this.effectTarget);
    const shotPoint = getLocalPositionWithOverride(
      this.effectTarget,
      0,
      this.effectTarget.size,
      -relData.adir
    )
    const startPos = getLocalPositionWithOverride(
      this.effectParent, 
      0, 
      -this.effectParent.size, 
      -relData.adir+offset
    );

    const beam = point(() => shotPoint - startPos);
    const beamLength = beam.length;


    const cstartPos = toCanvas(startPos);
    const cshotPoint = toCanvas(shotPoint);

    if (this.succsessfulAttack) {
      const alpha = this.beamColor.a * lerp(1, this.attackEffectivness, this.settings.effectivnessImpact);
      console.log(this.beamColor, this.attackEffectivness, this.settings.effectivnessImpact, alpha)

      if (this.effectiveRange >= beamLength) {
        ctx.strokeStyle = rgbaO(this.beamColor, alpha);
        ctx.lineWidth = toCanvas(this.settings.beamSize);
        ctx.beginPath();
        ctx.moveTo(cstartPos.x, cstartPos.y);
        ctx.lineTo(cshotPoint.x, cshotPoint.y);
        ctx.stroke();
      } else {
        const dir = beam.normalize();
        const effectiveEnd = point(() => startPos + dir * this.effectiveRange);
        const ceffectiveEnd = toCanvas(effectiveEnd);

        ctx.strokeStyle = rgbaO(this.beamColor, alpha);
        ctx.lineWidth = toCanvas(this.settings.beamSize);
        ctx.beginPath();
        ctx.moveTo(cstartPos.x, cstartPos.y);
        ctx.lineTo(ceffectiveEnd.x, ceffectiveEnd.y);
        ctx.stroke();

        const gradient = ctx.createLinearGradient(
          ceffectiveEnd.x,
          ceffectiveEnd.y,
          cshotPoint.x,
          cshotPoint.y
        );
        gradient.addColorStop(0, ctx.strokeStyle);
        if (this.maxRange <= beamLength) {
          gradient.addColorStop((this.maxRange - this.effectiveRange) / (beamLength - this.effectiveRange), rgbaO(this.beamColor, 0));
        } else {
          gradient.addColorStop(1, rgbaO(this.beamColor, alpha * ((beamLength - this.effectiveRange) / (this.maxRange - this.effectiveRange))));
        }
        

        ctx.strokeStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(ceffectiveEnd.x, ceffectiveEnd.y);
        ctx.lineTo(cshotPoint.x, cshotPoint.y);
        ctx.stroke();
      }

      if (this.maxRange <= beamLength) {
        this._flashPS.visible = false;
      } else {
        this._flashPS.visible = true;
        this._flashPS._x = shotPoint.x;
        this._flashPS._y = shotPoint.y;
        this._flashPS.velocity.x = this.effectTarget.velocity.x;
        this._flashPS.velocity.y = this.effectTarget.velocity.y;
      }
    } else {
      if (this._livetime >= 1) {
        this.destroy();
        return;
      }

      const sign = relData.angularVelocity < 0 ? -1 : 1;
      const dir = beam.normalize();

      if (this._missAngle === undefined) {
        this._missSign = (Math.abs(relData.angularVelocity) < 1 ? (Math.random() * 2 - 1) : sign) * 0.1;
        this._missAngle = Math.abs(relData.angularVelocity) < 1 ? (-5 * (Math.random() + 0.5)) * this._missSign : -relData.angularVelocity * sign + (Math.random() * 2 - 1) * 2;
      }

      const rdir = getLocalVelocity(this._missAngle + this._livetime * this.effectModule.characteristics.additionalInfo.tracking * this._missSign, dir.x, dir.y);
      const missPoint = point(() => startPos + rdir * this.maxRange);
      const effectiveEnd = point(() => startPos + rdir * this.effectiveRange);

      const cmissPoint = toCanvas(missPoint);
      const ceffectiveEnd = toCanvas(effectiveEnd);

      ctx.strokeStyle = rgbaO(this.beamColor, this.beamColor.a * (1 - this._livetime));
      ctx.lineWidth = toCanvas(this.settings.beamSize);
      ctx.beginPath();
      ctx.moveTo(cstartPos.x, cstartPos.y);
      ctx.lineTo(ceffectiveEnd.x, ceffectiveEnd.y);
      ctx.stroke();

      const gradient = ctx.createLinearGradient(
        ceffectiveEnd.x,
        ceffectiveEnd.y,
        cmissPoint.x,
        cmissPoint.y
      );
      gradient.addColorStop(0, ctx.strokeStyle);
      gradient.addColorStop(1, rgbaO(this.beamColor, 0));

      ctx.strokeStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(ceffectiveEnd.x, ceffectiveEnd.y);
      ctx.lineTo(cmissPoint.x, cmissPoint.y);
      ctx.stroke();
    }
  }
}


registerClass(LaserAttackModuleEffect)
registerSteps(LaserAttackModuleEffect, 1, [])
registerLayers(LaserAttackModuleEffect, ['effect', 'module-effect', 'laser-attack'], 1);