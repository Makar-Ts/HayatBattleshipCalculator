import { clamp } from "../../../../../libs/clamp.js";
import copy from "../../../../../libs/copy.js";
import { mergeDeep } from "../../../../../libs/deepMerge.js";
import { baseModuleCharacteristics } from "../../../../../libs/hayat/modules.js";
import { registerClass } from "../../../../save&load/objectCollector.js";

export default class BaseModule {
  characteristics = copy(baseModuleCharacteristics);

  /** offline / online / active / overload */
  state = "offline";
  previousState = "offline";

  uuid = "";

  inOnlineSteps = 0;

  constructor(data={}) {
    this.characteristics = mergeDeep(this.characteristics, data)
  }

  get fullType() {
    return this.characteristics.main.type + " | " + this.characteristics.main.category;
  }


  applyModifiers(mods, activeModules) {
    const interference = this.characteristics.interference * (activeModules[this.fullType] - 1);

    for (let mod of this.characteristics.modificators[this.state]) {
      const modif = mod.modificator * (mod.isAffectedByInterference ? clamp(1 - interference, 0, 1) : 1);

      if (mod.characteristic in mods[mod.target][mod.modificationType]) {
        mods[mod.target][mod.modificationType][mod.characteristic] += modif;
      } else {
        mods[mod.target][mod.modificationType][mod.characteristic] = modif;
      }
    }

    return mods;
  }


  next() {
    if (this.previousState != this.state && this.state == "offline") {
      this.inOnlineSteps = 0;
    }

    if (['online', 'active', 'overload'].includes(this.state)) {
      this.inOnlineSteps += 1;
    }

    this.previousState = this.state;
  }


  setState(state) {
    if (!['offline', 'online', 'active', 'overload'].includes(state)) {
      if (this.previousState != "offline") {
        this.previousState == this.state;
      }

      this.state = "offline";
      return;
    }

    if (this.previousState != this.state) {
      this.previousState == this.state;
    }
    this.state = state;
  }


  getOverridableValues() {
    return [
      {
        name: "state",
        type: "text",
        current: () => this.state,
        func: (val) => {
          this.setState(val);
        },
      },
      {
        name: "inOnlineSteps",
        type: "number",
        current: () => this.inOnlineSteps,
        func: (val) => {
          this.inOnlineSteps = val;
        },
      },
    ];
  }

  getChildrenWithOverridableValues(parent='this') {
    return []
  }


  save() {
    return {
      class: this.constructor.name,
      state: this.state,
      uuid: this.uuid,
      characteristics: this.characteristics,

      previousState: this.previousState,
      inOnlineSteps: this.inOnlineSteps,
    };
  }

  load(data) {
    this.characteristics = data.characteristics;
    this.uuid = data.uuid;
    this.state = data.state;
    this.previousState = data.previousState;
    this.inOnlineSteps = data.inOnlineSteps;
  }
}

registerClass(BaseModule)