import { clamp } from "../../../../../libs/clamp.js";
import copy from "../../../../../libs/copy.js";
import { mergeDeep } from "../../../../../libs/deepMerge.js";
import { baseModuleCharacteristics } from "../../../../../libs/hayat/modules.js";
import { MODULES_CALCULATION_FUNCTIONS } from "../../../../../modules/modules.js";
import { log } from "../../../../controls/step-logs/log.js";
import { registerClass } from "../../../../save&load/objectCollector.js";
import MAP_OBJECTS_IDS from "../mapObjectsIds.constant.js";
import { registerSteps } from "../step/stepInfoCollector.js";

export default class BaseModule {
  static LOAD_FALLBACK = {
    state: "offline",
    previousState: "offline",
    inOnlineSteps: 0,
    inStageSteps: 0,
    functionsSharedData: {
      perStep: {},
      perState: {},
      uncleared: {},
    },
  }

  static LOAD_CRASH = new Set(['uuid', 'characteristics', 'parent']);


  characteristics = copy(baseModuleCharacteristics);

  /** offline / online / active / overload */
  state = "offline";
  previousState = "offline";

  uuid = "";
  parent = null;

  inOnlineSteps = 0;
  inStageSteps = 0;

  functionsSharedData = {
    perStep: {},
    perState: {},
    uncleared: {},
  };

  constructor(data = {}) {
    this.characteristics = mergeDeep(this.characteristics, data);
  }

  get fullType() {
    return this.characteristics.main.type + " | " + this.characteristics.main.category;
  }

  get name() {
    return "module " + this.uuid + " " + this.characteristics.main.name;
  }

  get path() {
    return (this.parent?.path || '') + " > " + "module " + this.uuid + " " + this.characteristics.main.name
  }

  applyModifiers(mods, activeModules) {
    const interference = this.characteristics.interference * (activeModules[this.fullType] - 1);

    if (this.characteristics.initFunctions && this.characteristics.initFunctions !== "") {
      const modificator = {},
        module = this,
        parent = this.parent,
        target = this.parent.children[MAP_OBJECTS_IDS.CONTACT_CONTROLLER]?.target || null;

      let m = this.characteristics.initFunctions;
      (this.characteristics.initFunctions
        .match(/<\[[^\]]+]>/g) || [])
        .forEach((v) =>
          m = m.replace(v, `MODULES_CALCULATION_FUNCTIONS["${v.slice(2, -2)}"](modificator, module, parent, target)`)
        );
      
      eval(m);
    }

    for (let mod of this.characteristics.modificators[this.state]) {
      let modif;
      if (typeof mod.modificator == "number") {
        modif = mod.modificator;
      } else {
        const modificator = mod.modificator,
          module = this,
          parent = this.parent,
          target = this.parent.children[MAP_OBJECTS_IDS.CONTACT_CONTROLLER]?.target || null;

        let m = mod.modificator;
        (mod.modificator
          .match(/<\[[^\]]+]>/g) || [])
          .forEach((v) =>
            m = m.replace(v, `MODULES_CALCULATION_FUNCTIONS["${v.slice(2, -2)}"](modificator, module, parent, target)`)
          );
        
        modif = eval(m);
      }
      modif *= mod.isAffectedByInterference ? clamp(1 - interference, 0, 1) : 1;

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

    if (["online", "active", "overload"].includes(this.state)) {
      this.inOnlineSteps += 1;
    }

    this.inOnlineSteps != 0 &&
      log(
        this.path,
        `next | in online for ${this.inOnlineSteps}`
      );
    if (this.previousState != this.state) {
      log(
        this.path,
        `next | state changed ${this.previousState} -> ${this.state}`
      );

      this.functionsSharedData.perState = {};
      this.inStageSteps = 0;
    } else {
      this.inStageSteps++;
    }

    this.previousState = this.state;

    if (this.characteristics.activation == "active") {
      if (this.state == "active" && this.characteristics.cycle <= this.inStageSteps + 1 && this.characteristics.reload) {
        this.setState("online");

        log(
          this.path,
          `next | cycle ended, reloading (${this.characteristics.reload} steps)`
        );
        this.inStageSteps = 0;
      } else if (this.state == "online" && this.characteristics.reload <= this.inStageSteps + 1 && this.characteristics.cycle) {
        this.setState("active");

        log(
          this.path,
          `next | reload ended, cycle (${this.characteristics.cycle} steps)`
        );
        this.inStageSteps = 0;
      }
    }
  }

  step(index, objectsData) {}

  finalize(objectsData) {
    this.functionsSharedData.perStep = {};
  }

  setState(state) {
    if (!["offline", "online", "active", "overload"].includes(state)) {
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


  getAdditionalInfo() {
    return null;
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

  getChildrenWithOverridableValues(parent = "this") {
    return [];
  }

  save() {
    return {
      class: this.constructor.name,
      state: this.state,
      uuid: this.uuid,
      characteristics: this.characteristics,

      previousState: this.previousState,
      inOnlineSteps: this.inOnlineSteps,
      inStageSteps: this.inStageSteps,

      functionsSharedData: this.functionsSharedData,
    };
  }

  load(data) {
    this.characteristics = data.characteristics;
    this.uuid = data.uuid;
    this.state = data.state;
    this.previousState = data.previousState;
    this.inOnlineSteps = data.inOnlineSteps;
    this.inStageSteps = data.inStageSteps;
    this.functionsSharedData = data.functionsSharedData;
  }

  afterLoad() {
    for (let param of this.constructor.LOAD_CRASH) {
      if (this[param] === null || this[param] === undefined) throw new Error(`${this.path} | Param ${param} not loaded.`);
    }

    for (let param in this.constructor.LOAD_FALLBACK) {
      if (this[param] === null || this[param] === undefined) {
        this[param] = this.constructor.LOAD_FALLBACK[param];

        console.warn(`${this.path} | Param ${param} is corrupted and replaced with fallback.`)
      }
    }
  }
}

registerClass(BaseModule);
registerSteps(BaseModule, 0, []);
