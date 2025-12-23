import { ObjectConnection } from "../../../../../../libs/connection.js";
import { objectFromPath } from "../../../../../../libs/pathResolver.js";
import { log } from "../../../../../controls/step-logs/log.js";
import { EVENTS } from "../../../../../events.js";
import { registerClass } from "../../../../../save&load/objectCollector.js";
import { registerLayers } from "../../../../layers/layersInfoCollector.js";
import { objects } from "../../../../map.js";
import SIMULATION_STATES, { generateSimulationState, parceSimulationState } from "../../step/simulationStates.constant.js";
import { registerSteps } from "../../step/stepInfoCollector.js";
import ShipObject from "../shipObject.js";

export default class SubgridObject extends ShipObject {
  static LOAD_FALLBACK = {
    ...super.LOAD_FALLBACK,
    activationInfo: {
      delay: 0,
      correctionId: null,
    }
  }

  static LOAD_CRASH = new Set([
    ...super.LOAD_CRASH,
    'active',
  ]);


  controlledBy = new ObjectConnection(() => objects);

  active = false;
  activationInfo = {
    delay: 0,
    correctionId: null,
  };

  constructor(x, y, direction, velocity, controlledBy = null, battleshipChars = {}, activationInfo = null) {
    super(x, y, direction, velocity, battleshipChars);
    this.controlledBy.Connection = controlledBy;

    if (activationInfo) this.activationInfo = activationInfo;
    if (this.activationInfo.delay <= 0 || this.activationInfo.correctionId === null) this.active = true;
    else {
      this.visible = false;
      this.collision = false;
    }
  }


  get isFueled() {
    return (this.currentCharacteristics?.constant?.body?.subgrid?.fuel ?? -1) === -1 || 
            this.currentCharacteristics?.dynamic?.fuel > 0
  }


  step(index, objectsData) {
    if (index === 1 && this.isFueled) {
      this.currentCharacteristics.dynamic.fuel -= this._step;
    }

    return super.step(index, objectsData);
  }


  physicsSimulationStep(step, dt, objectsData) {
    if (this.active) {
      if (!this.currentCharacteristics.constant.body.subgrid.autonomus && !this.controlledBy.Connection) {
        this.destroy();
        
        return { delete: true };
      }

      return super.physicsSimulationStep(step, dt, objectsData);
    } else if (this.activationInfo.delay - this._livetime - dt*step <= 0) {
      if (!this.controlledBy.Connection || this.activationInfo.correctionId === null) {
        this.destroy();

        return;
      }

      this.controlledBy.Connection.applyCorrection(this.activationInfo.correctionId, this);

      this.active = true;
      this.visible = true;
      this.collision = true;

      const data = super.physicsSimulationStep(step, dt, objectsData);

      return {
        ...data,
        register: true,
      };
    }
  }


  finalize(objectsData) {
    this._kill ||= !this.currentCharacteristics.constant.body.subgrid.autonomus && !this.controlledBy.Connection;

    return super.finalize(objectsData);
  }


  destroy() {
    if (parceSimulationState(this.state)[0] == SIMULATION_STATES.PHYSICS_SIMULATION) {
      this.visible = false;
      this.collision = false;
    }

    super.destroy();
  }


  save(realParent = null) {
    return {
      ...super.save(realParent),
      active: this.active,
      activationInfo: this.activationInfo,
      controlledBy: this.controlledBy.Connection?.path ?? null,
    };
  }

  load(data, loadChildren = false) {
    super.load(data, false);
    
    this.active = data.active;
    this.activationInfo = data.activationInfo;
    this.controlledBy.storeConnection(data.controlledBy ?? null);

    loadChildren && super.loadChildren(data);
  }

  afterLoad() {
    this.controlledBy.forceLoadConnection(); // загружаем как объект

    super.afterLoad();
  }
}

registerClass(SubgridObject);
registerSteps(SubgridObject, 1, []);
registerLayers(SubgridObject, ['subgrid', 'dynamic'], 0);
