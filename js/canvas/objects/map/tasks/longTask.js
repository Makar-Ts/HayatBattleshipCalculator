import { registerClass } from "../../../../save&load/objectCollector.js";
import BasicTask from "./basicTask.js";

export default class LongTask extends BasicTask {
  lifetime = 0;
  maxSteps = 0;

  constructor(func=(target, origin) => {}, data={}, maxSteps=0, id) {
    super(func, data, id);

    this.maxSteps = maxSteps;
  }

  do(target) {
    (++this.lifetime) >= this.maxSteps && this.function(target, this);

    return this.lifetime < this.maxSteps;
  }

  save() {
    return {
      ...super.save(),
      lifetime: this.lifetime,
      maxSteps: this.maxSteps,
    }
  }

  load(data) {
    super.load(data);

    this.lifetime = data.lifetime;
    this.maxSteps = data.maxSteps;
  }
}

registerClass(LongTask)