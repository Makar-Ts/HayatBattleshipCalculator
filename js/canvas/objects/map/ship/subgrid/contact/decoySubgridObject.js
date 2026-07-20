import { registerClass } from "../../../../../../save&load/objectCollector.js";
import { registerLayers } from "../../../../../layers/layersInfoCollector.js";
import { registerSteps } from "../../../step/stepInfoCollector.js";
import ContactSubgridObject from "./contactSubgridObject.js";

export default class DecoySubgridObject extends ContactSubgridObject {
  decoy = true;
  contactOptions = {
    hide: false,
    destroy: false,
  }

  step() {}
}

registerClass(DecoySubgridObject);
registerSteps(DecoySubgridObject, 0, []);
registerLayers(DecoySubgridObject, ['subgrid', 'subgrid-contact', 'dynamic', 'decoy'], 0);