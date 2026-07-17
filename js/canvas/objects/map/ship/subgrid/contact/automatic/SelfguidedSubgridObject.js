import { clamp } from "../../../../../../../../libs/clamp.js";
import { ObjectConnection } from "../../../../../../../../libs/connection.js";
import { calc, point } from "../../../../../../../../libs/vector/point.js";
import { log } from "../../../../../../../controls/step-logs/log.js";
import { EVENTS } from "../../../../../../../events.js";
import { registerClass } from "../../../../../../../save&load/objectCollector.js";
import { registerLayers } from "../../../../../../layers/layersInfoCollector.js";
import { objects } from "../../../../../../map.js";
import MAP_OBJECTS_IDS from "../../../../mapObjectsIds.constant.js";
import { registerSteps } from "../../../../step/stepInfoCollector.js";
import ExplosiveSubgridObject from "../explosiveSubgridObject.js";

export default class SelfguidedSubgridObject extends ExplosiveSubgridObject {
  target = new ObjectConnection(() => objects);
  _commandAccel = {
    fwd: 0,
    lat: 0
  };


  constructor(x, y, direction, velocity, controlledBy = null, battleshipChars = {}, activationDelay = 0) {
    super(x, y, direction, velocity, controlledBy, battleshipChars, activationDelay);

    this.target.Connection = controlledBy?.parent.children[MAP_OBJECTS_IDS.CONTACT_CONTROLLER].target;
  }


  save(realParent = null) {
    return {
      ...super.save(realParent),
      target: this.target.Connection?.path ?? null,
    };
  }

  load(data, loadChildren = false) {
    super.load(data, false);
    
    this.target.storeConnection(data.target ?? null);

    loadChildren && super.loadChildren(data);
  }

  afterLoad() {
    this.target.forceLoadConnection(); // загружаем как объект

    super.afterLoad();
  }


  physicsSimulationStep(step, dt, objectsData) {
    const data = super.physicsSimulationStep(step, dt, objectsData);

    if (this.isCollided || !this.active) return data;

    // ---- проверки и базовые параметры ----
    const target = this.target?.Connection;
    const guidanceDelay = this.currentCharacteristics?.constant?.body?.subgrid?.guidanceDelay ?? 0;

    if (!target || !this.isFueled || (guidanceDelay - this._livetime - dt*step) > 0) {
      return data;
    }

    // thrust — сила (Н), mass — масса (кг)
    const maxAccel = this.currentCharacteristics?.constant?.acceleration ?? 50; // m/s^2
    const mass = (this.currentCharacteristics?.constant?.body?.mass) ?? 1;

    const rotationSpeed = this.currentCharacteristics?.constant?.body?.subgrid?.guidance?.rotation ?? 60;
    const sidePowerScale = this.currentCharacteristics?.constant?.body?.subgrid?.guidance?.side_scale ?? 0.3;
    const responseTime = 1 / (this.currentCharacteristics?.constant?.body?.subgrid?.guidance?.response_time || 0.15);
    const isSolidDrive = (this.currentCharacteristics?.constant?.body?.subgrid?.solid_drive ?? false);


    // Позиции и скорости
    const Rp = { x: this._x, y: this._y };
    const T = { x: target._x, y: target._y };
    const Vm = { x: this.velocity?.x || 0, y: this.velocity?.y || 0 };
    const Vt = { x: target.velocity?.x || 0, y: target.velocity?.y || 0 };

    // Относительный вектор и расстояние
    const R = {
      x: T.x - Rp.x,
      y: T.y - Rp.y
    };
    const range = Math.hypot(R.x, R.y) || 1e-6;
    const LOS = {
      x: R.x / range,
      y: R.y / range
    };

    // Относительная скорость (v_target - v_missile)
    const Vr = {
      x: Vt.x - Vm.x,
      y: Vt.y - Vm.y
    };

    // Скорость изменения дальности.
    // < 0 - сближение
    // > 0 - удаление
    const rangeRate = Vr.x * LOS.x + Vr.y * LOS.y;


    const pf = this.currentCharacteristics.constant.body.subgrid.poximity_fuse;
    if (pf) {
      const ppf = pf.passive;
      
      if (ppf &&
        (ppf.trigger_activation_delay ?? 0) - this._livetime - dt*step <= 0 &&
        target.currentCharacteristics
      ) {
        const virtualSignature = target.currentCharacteristics.constant.body.signature;

        if (virtualSignature != target.size) {
          const md = ppf.min_distance;

          // подрыв в виртуальной сигнатуре
          if (range <= virtualSignature && (range - target.size) <= md && rangeRate > 0) {
            log(this.path, `Passive PF triggered by ${obj.id}`);
            this.destroy();

            return {
              delete: true
            };
          }
        }
      }
    }


    const normal = {
      x: -LOS.y,
      y: LOS.x
    };

    const closingVelocity = -rangeRate;

    const losRate =
        (Vr.x * normal.x + Vr.y * normal.y) / range;


    let targetAccel = {
      x: 0,
      y: 0
    };

    if (this._lastTargetVelocity) {
      targetAccel.x =
        (Vt.x - this._lastTargetVelocity.x) / dt;

      targetAccel.y =
        (Vt.y - this._lastTargetVelocity.y) / dt;
    }

    this._lastTargetVelocity = {
      x: Vt.x,
      y: Vt.y
    };


    const accelNormal =
      targetAccel.x * normal.x +
      targetAccel.y * normal.y;
    

    const N = 4;
    const K = 1;

    const aPN =
      N *
      Math.max(0, closingVelocity) *
      losRate;

    const aAPN =
      aPN +
      K * accelNormal;
    

    let ax =
      normal.x * aAPN +
      LOS.x * maxAccel * 0.25;

    let ay =
      normal.y * aAPN +
      LOS.y * maxAccel * 0.25;



    const angle = Math.atan2(-ay, ax);

    let delta = (this._direction - 90) / 180 * Math.PI - angle;
    delta = Math.atan2(
      Math.sin(delta),
      Math.cos(delta)
    );

    const rotatingSpeed = rotationSpeed * dt;

    const deltaDeg = delta * 180 / Math.PI;

    this._direction -= clamp(
      deltaDeg,
      -rotatingSpeed,
      rotatingSpeed
    );
    
    

    let aFinalX = ax;
    let aFinalY = ay;


    const rad = (this._direction - 90) * Math.PI / 180;

    const forward = {
      x: Math.cos(rad),
      y: -Math.sin(rad)
    };

    const lateral = {
      x: -forward.y,
      y: forward.x
    };


    const maxForwardAccel = maxAccel;
    const maxLateralAccel = maxAccel * sidePowerScale;

    const forwardAccel = isSolidDrive ? maxForwardAccel : clamp(
      aFinalX * forward.x + aFinalY * forward.y,
      -maxLateralAccel,
      maxForwardAccel
    );
    const lateralAccel = clamp(
      aFinalX * lateral.x + aFinalY * lateral.y,
      -maxLateralAccel,
      maxLateralAccel
    );

    this._commandAccel.fwd +=
      (forwardAccel - this._commandAccel.fwd)
      * responseTime
      * dt;

    this._commandAccel.lat +=
      (lateralAccel - this._commandAccel.lat)
      * responseTime
      * dt;


    aFinalX =
      forward.x * this._commandAccel.fwd +
      lateral.x * this._commandAccel.lat;

    aFinalY =
      forward.y * this._commandAccel.fwd +
      lateral.y * this._commandAccel.lat;
    

    return {
      ...data,
      forces: [...(data?.forces ?? []), { x: aFinalX * mass, y: aFinalY * mass }]
    };
  }
}

registerClass(SelfguidedSubgridObject);
registerSteps(SelfguidedSubgridObject, 0, []);
registerLayers(SelfguidedSubgridObject, ['subgrid', 'subgrid-contact', 'subgrid-explosive', 'missile', 'dynamic'], 0);
