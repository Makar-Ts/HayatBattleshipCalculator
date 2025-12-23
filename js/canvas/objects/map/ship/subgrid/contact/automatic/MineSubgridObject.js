import { limitVector } from "../../../../../../../../libs/limitVector.js";
import { calc } from "../../../../../../../../libs/vector/point.js";
import { registerClass } from "../../../../../../../save&load/objectCollector.js";
import { registerLayers } from "../../../../../../layers/layersInfoCollector.js";
import { registerSteps } from "../../../../step/stepInfoCollector.js";
import ExplosiveSubgridObject from "../explosiveSubgridObject.js";

export default class MineSubgridObject extends ExplosiveSubgridObject {
  physicsSimulationStep(step, dt, objectsData) {
    const data = super.physicsSimulationStep(step, dt, objectsData);

    if (this.isCollided || !this.active) return data;

    const guidanceDelay = this.currentCharacteristics?.constant?.body?.subgrid?.guidanceDelay ?? 0;

    if ((guidanceDelay - this._livetime - dt*step) > 0) {
      return data;
    }


    const nv = calc(() => this.velocity * -1);
    const lnv = limitVector(nv, this.currentCharacteristics.constant.acceleration);


    return {
      ...data,
      forces: [...(data?.forces ?? []), { x: lnv.x * this.mass, y: lnv.y * this.mass }]
    };
  }
}

registerClass(MineSubgridObject);
registerSteps(MineSubgridObject, 0, []);
registerLayers(MineSubgridObject, ['subgrid', 'subgrid-contact', 'subgrid-explosive', 'mine', 'dynamic'], 0);
