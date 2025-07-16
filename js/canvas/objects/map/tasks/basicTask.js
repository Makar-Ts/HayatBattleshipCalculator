import { uuidv4 } from "../../../../../libs/uuid.js";
import { loadFunction } from "../../../../save&load/load.js";
import { registerClass } from "../../../../save&load/objectCollector.js";
import { saveFunction } from "../../../../save&load/save.js";

export default class BasicTask {
  function = (target, origin) => {};
  data = {};
  id = "";

  constructor(func=(target, origin) => {}, data={}, id=uuidv4()) {
    this.function = func;
    this.data = data;
    this.id = id;
  }

  do(target) {
    this.function(target, this);
  }


  save() {
    return {
      class: this.constructor.name,
      id: this.id,
      data: this.data,
      function: saveFunction(this.function)
    };
  }

  load(data) {
    this.id = data.id;
    this.data = data.data;
    this.function = loadFunction(data.function)
  }
}

registerClass(BasicTask)