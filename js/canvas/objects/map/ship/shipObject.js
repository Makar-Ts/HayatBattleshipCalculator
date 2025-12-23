import { clampCharacteristics } from "../../../../../libs/clamp.js";
import copy from "../../../../../libs/copy.js";
import { mergeDeep } from "../../../../../libs/deepMerge.js";
import { getByPath } from "../../../../../libs/getByPath.js";
import {
  baseBattleshipCharacteristics,
  battleshipCharacteristicsClampRules,
  energyToHeating,
  energyToKineticDamage,
  overheatDamage,
  passiveBarrierRegeneration,
  tonnageToAcceleration,
  tonnageToCaptureRange,
  tonnageToManeuverabilityBonus,
} from "../../../../../libs/hayat/battleships.js";
import { collisionPoint } from "../../../../../libs/math.js";
import { uuidv4 } from "../../../../../libs/uuid.js";
import { calc, point } from "../../../../../libs/vector/point.js";
import { log } from "../../../../controls/step-logs/log.js";
import { load } from "../../../../save&load/load.js";
import { registerClass } from "../../../../save&load/objectCollector.js";
import { registerLayers } from "../../../layers/layersInfoCollector.js";
import { objects } from "../../../map.js";
import BasicMovingObject from "../step/basicMovingObject.js";
import { registerSteps } from "../step/stepInfoCollector.js";

export default class ShipObject extends BasicMovingObject {
  static LOAD_FALLBACK = {
    ...super.LOAD_FALLBACK,
    dices: {
      contactQuality: 10,
      maneuvering: 0,
    },
    externalModules: [],
    internalModules: [],
    otherModules: [],
  }

  static LOAD_CRASH = new Set([
    ...super.LOAD_CRASH,
    'baseCharacteristics',
    'currentCharacteristics',
  ]);

  baseCharacteristics = copy(baseBattleshipCharacteristics);
  currentCharacteristics = copy(baseBattleshipCharacteristics);

  dices = {
    contactQuality: 10,
    maneuvering: 0,
  };

  externalModules = [];
  internalModules = [];
  otherModules = [];

  constructor(x, y, direction, velocity, battleshipChars = {}) {
    super(x, y, direction, velocity);

    this.baseCharacteristics = mergeDeep(this.baseCharacteristics, battleshipChars);

    this.baseCharacteristics.constant.capture_range =
      tonnageToCaptureRange[this.baseCharacteristics.constant.body.tonnage];
    this.baseCharacteristics.constant.maneuverability +=
      tonnageToManeuverabilityBonus[this.baseCharacteristics.constant.body.tonnage];
    this.baseCharacteristics.constant.acceleration = this.baseCharacteristics.constant.acceleration == 0 ?
      tonnageToAcceleration[this.baseCharacteristics.constant.body.tonnage] : this.baseCharacteristics.constant.acceleration;

    this.currentCharacteristics = copy(this.baseCharacteristics);
  }

  get allModules() {
    return [...this.externalModules, ...this.internalModules, ...this.otherModules];
  }

  get size() {
    return this.baseCharacteristics.constant.body.signature;
  }

  get mass() {
    return this.currentCharacteristics.constant.body.mass;
  }

  get bounciness() {
    return this.currentCharacteristics.constant.collision_energy_distribution.velocity;
  }

  get layers() {
    return this.currentCharacteristics.constant.body.layers;
  }

  typeToModules(type) {
    return {
      ext: this.externalModules,
      int: this.internalModules,
      otr: this.otherModules,
      all: this.allModules,
    }[type];
  }

  //region step

  next() {
    let data = super.next();

    this.recalculateCharacteristics();

    log(this.path, `next | processing modules`);

    for (let m of this.allModules) {
      data = {
        ...data,
        ...m.next(),
      };
    }

    return data;
  }

  step(index, objectsData) {
    let data = super.step(index, objectsData);

    log(this.path, `step ${index} | processing modules`);

    for (let m of this.allModules) {
      data = {
        ...data,
        ...m.step(index, objectsData),
      };
    }

    if (index == 1) {
      const mods = this.recalculateCharacteristics(true);

      const c = this.currentCharacteristics;

      let heating = c.constant.heating;
      let ohDamage = 0;

      if (c.dynamic.temperature > c.constant.temperature) {
        ohDamage = overheatDamage(
          c.constant.hp.hull,
          c.dynamic.temperature,
          c.constant.temperature
        );
      }

      let barrierRegen = passiveBarrierRegeneration(
        c.constant.barrier,
        c.dynamic.hp.barrier,
        c.constant.hp.barrier
      );

      let generation = c.constant.capacitor.generation;

      c.dynamic.temperature += heating;
      c.dynamic.hp.hull     -= ohDamage;
      c.dynamic.hp.barrier  += barrierRegen;
      c.dynamic.charge      += generation;

      this.currentCharacteristics = clampCharacteristics(c, battleshipCharacteristicsClampRules);

      const damage = Object.entries(this.applyDamage());

      const healLog = {};
      for (let [m, v] of Object.entries(mods.this.number)) {
        if (m.startsWith('dynamic.hp.')) {
          healLog[m.replace('dynamic.hp.', '')] = v;
        }
      }

      for (let [m, v] of Object.entries(mods.this.percent)) {
        if (m.startsWith('dynamic.hp.')) {
          const name = m.replace('dynamic.hp.', '');
          if (name in healLog) healLog[name] = v;
        }
      }

      log(this.path, `step ${index} | statsChange (no clamp):<br>
                       ------ | Heating: ${heating}<br>
                       ------ | Overheat Damage: ${ohDamage}<br>
                       ------ | Barrier Regen: ${barrierRegen}<br>
                       ------ | Generation: ${generation}<br>
                       ------ | Damage Recived:<br>${
damage.map(([n, v])=> `------ | - | ${n}: ${v}`).join('<br>')}<br>
                       ------ | Damage Healed:<br>${Object.entries(healLog)
.map(([n, v]) =>      `------ | - | ${n}: ${v}`).join('<br>')}`);
    }

    return data;
  }

  onCollision(collision, target) {
    const energy = super.onCollision(collision, target);

    const damage = energy * energyToKineticDamage * ((
      this.currentCharacteristics.constant.collision_energy_distribution.damage +
      (target.currentCharacteristics?.constant?.collision_energy_distribution?.damage ?? 0.69)
    ) / 2);
    const heat = energy * energyToHeating * ((
      this.currentCharacteristics.constant.collision_energy_distribution.heat +
      (target.currentCharacteristics?.constant?.collision_energy_distribution?.heat ?? 0.01)
    ) / 2);

    log(this.path, `onCollision | ${damage}dmg ${heat}heat`)

    this.currentCharacteristics.dynamic.recived_damage.kinetic += damage;
    this.currentCharacteristics.dynamic.temperature += heat;
    this.applyDamage()
  }


  afterSimulation(objectsData) {
    super.afterSimulation(objectsData);

    for (let m of this.allModules) {
      m.afterSimulation?.(objectsData);
    }
  }


  finalize(objectsData) {
    let data = super.finalize(objectsData);

    log(this.path, `finalize | processing modules`);

    for (let m of this.allModules) {
      data = {
        ...data,
        ...m.finalize(objectsData),
      };
    }

    return data;
  }

  //region characteristics

  getOverridableValues() {
    return [
      ...super.getOverridableValues(),
      {
        name: "dice_contact-quality",
        type: "number",
        current: () => this.dices.contactQuality,
        func: (val) => {
          this.dices.contact_quality = +val;
        },
      },
      {
        name: "dice_maneuvering",
        type: "number",
        current: () => this.dices.maneuvering,
        func: (val) => {
          this.dices.maneuvering = +val;
        },
      },
      {
        name: "barrier",
        type: "number",
        current: () => Math.round(this.currentCharacteristics.dynamic.hp.barrier * 1000) / 1000,
        func: (val) => {
          this.currentCharacteristics.dynamic.hp.barrier = +val;
        },
      },
      {
        name: "armor",
        type: "number",
        current: () => Math.round(this.currentCharacteristics.dynamic.hp.armor * 1000) / 1000,
        func: (val) => {
          this.currentCharacteristics.dynamic.hp.armor = +val;
        },
      },
      {
        name: "hull",
        type: "number",
        current: () => Math.round(this.currentCharacteristics.dynamic.hp.hull * 1000) / 1000,
        func: (val) => {
          this.currentCharacteristics.dynamic.hp.hull = +val;
        },
      },
      {
        name: "temperature",
        type: "number",
        current: () => Math.round(this.currentCharacteristics.dynamic.temperature * 1000) / 1000,
        func: (val) => {
          this.currentCharacteristics.dynamic.temperature = +val;
        },
      },
      {
        name: "charge",
        type: "number",
        current: () => Math.round(this.currentCharacteristics.dynamic.charge * 1000) / 1000,
        func: (val) => {
          this.currentCharacteristics.dynamic.charge = +val;
        },
      },
    ];
  }

  getChildrenWithOverridableValues() {
    return [
      ...super.getChildrenWithOverridableValues(),
      {
        id: "externalModules",
        children: this.externalModules.map((v) => ({
          id: v.characteristics.main.name,
          getValues: () => v.getOverridableValues(),
          children: [],
        })),
      },
      {
        id: "internalModules",
        children: this.internalModules.map((v) => ({
          id: v.characteristics.main.name,
          getValues: () => v.getOverridableValues(),
          children: [],
        })),
      },
      {
        id: "otherModules",
        children: this.otherModules.map((v) => ({
          id: v.characteristics.main.name,
          getValues: () => v.getOverridableValues(),
          children: [],
        })),
      },
    ];
  }

  calculateModifiers(externalEffectCalculation = true) {
    const activeModules = this.allModules.reduce((acc, v) => {
      if (v.fullType in acc) {
        acc[v.fullType] += 1;
      } else {
        acc[v.fullType] = 1;
      }

      return acc;
    }, {});

    let mods = {
      this: {
        number: {},
        percent: {},
      },
      target: {
        number: {},
        percent: {},
      },
      area: {
        number: {},
        percent: {},
      },
    };

    for (let mod of this.allModules) {
      mods = mod.applyModifiers(mods, activeModules);
    }

    if (externalEffectCalculation) {
      const event = new CustomEvent("calculateModifiers", {
        detail: {
          ship: this,
          mods: {
            number: {},
            percent: {},
          },
        },
      });
      document.dispatchEvent(event);

      for (let [m, v] of Object.entries(event.detail.mods.number)) {
        if (m in mods.this.number) {
          mods.this.number[m] += v;
        } else {
          mods.this.number[m] = v;
        }
      }

      for (let [m, v] of Object.entries(event.detail.mods.percent)) {
        if (m in mods.this.percent) {
          mods.this.percent[m] += v;
        } else {
          mods.this.percent[m] = v;
        }
      }
    }

    return mods;
  }

  recalculateCharacteristics(applyDynamic = false) {
    const mods = this.calculateModifiers();

    this.currentCharacteristics = mergeDeep(copy(this.baseCharacteristics), {
      dynamic: this.currentCharacteristics.dynamic,
    });

    for (let [path, number] of Object.entries(mods.this.number)) {
      if (!applyDynamic && path.startsWith("dynamic")) continue;

      const [a, l] = getByPath(this.currentCharacteristics, path);
      a[l] += number;
    }

    for (let [path, percent] of Object.entries(mods.this.percent)) {
      if (!applyDynamic && path.startsWith("dynamic")) continue;

      const [a, l] = getByPath(this.currentCharacteristics, path);
      a[l] *= percent;
    }

    this.currentCharacteristics = clampCharacteristics(
      this.currentCharacteristics,
      battleshipCharacteristicsClampRules
    );

    return mods;
  }

  applyDamage() {
    let receivedDamage = Object.entries(this.currentCharacteristics.dynamic.recived_damage)
    let out = {};

    for (let hp of ["barrier", "armor", "hull"]) {
      receivedDamage.sort(
        (a, b) =>
          this.currentCharacteristics.constant.resistance[a[0]][hp] -
          this.currentCharacteristics.constant.resistance[b[0]][hp]
      );

      if (!receivedDamage.some((v) => v[1] > 0)) break;

      let effectiveDamage = receivedDamage.reduce((acc, v) => {
        const resistance = this.currentCharacteristics.constant.resistance[v[0]][hp];
        const damageAfterResistance = v[1] * (1 - resistance);
        return acc + damageAfterResistance;
      }, 0);

      const damageToApply = Math.min(effectiveDamage, this.currentCharacteristics.dynamic.hp[hp]);
      this.currentCharacteristics.dynamic.hp[hp] -= damageToApply;
      out[hp] = damageToApply;

      let remainingDamage = damageToApply;

      for (let i = 0; i < receivedDamage.length && remainingDamage > 0; i++) {
        const resistance =
          this.currentCharacteristics.constant.resistance[receivedDamage[i][0]][hp];

        if (resistance >= 1) continue;

        const effectiveDamageFromThisSource = receivedDamage[i][1] * (1 - resistance);
        const damageToDeduct = Math.min(remainingDamage, effectiveDamageFromThisSource);

        const rawDamageToDeduct = damageToDeduct / (1 - resistance);

        receivedDamage[i][1] = Math.max(0, receivedDamage[i][1] - rawDamageToDeduct);
        remainingDamage -= damageToDeduct;
      }
    }

    this.currentCharacteristics.dynamic.recived_damage = receivedDamage.reduce((acc, v) => {
      acc[v[0]] = v[1];
      return acc;
    }, {});

    return out;
  }

  //region modules

  addModule(module, type = "int") {
    module.uuid = uuidv4();
    module.parent = this;
    this.typeToModules(type).push(module);

    this.recalculateCharacteristics();

    return module.uuid;
  }

  removeModule(id, type = "all") {
    if (typeof id === "number") {
      this.typeToModules(type).splice(id, 1);
    } else {
      if (type != "all") {
        const _id = this.typeToModules(type).findIndex((v) => v.uuid == id);

        if (_id != -1) this.typeToModules(type).splice(_id, 1);
        else return false;
      } else {
        return this.removeModule(id, "int")
          ? true
          : this.removeModule(id, "ext")
          ? true
          : this.removeModule(id, "otr")
          ? true
          : false;
      }
    }

    this.recalculateCharacteristics();
    return true;
  }

  getModule(id, type = "all") {
    return this.typeToModules(type).find((v) => v.uuid == id);
  }

  callModule(id, func, type = "int", recalculate = true) {
    if (typeof id === "number") {
      func(this.typeToModules(type)[id], this);
    } else {
      const obj = this.getModule(id, type);

      if (obj) func(obj, this);
    }

    recalculate && this.recalculateCharacteristics();
  }

  //region save

  save(realParent = null) {
    return {
      ...super.save(realParent),
      baseCharacteristics: this.baseCharacteristics,
      dynamicCharacteristics: this.currentCharacteristics.dynamic,
      externalModules: this.externalModules.map((v) => v.save()),
      internalModules: this.internalModules.map((v) => v.save()),
      otherModules: this.otherModules.map((v) => v.save()),
      dices: this.dices,
    };
  }

  load(data, loadChildren = false) {
    super.load(data, false);
    this.baseCharacteristics = data.baseCharacteristics;
    this.currentCharacteristics = mergeDeep(copy(this.baseCharacteristics), {
      dynamic: data.dynamicCharacteristics,
    });

    this.dices = data.dices;

    for (let md of ["externalModules", "internalModules", "otherModules"]) {
      this[md] = data[md] ? data[md].map((v) => {
        const obj = load("", v, "module");
        obj.parent = this;

        return obj;
      }) : [];
    }

    this.recalculateCharacteristics();

    loadChildren && super.loadChildren(data);
  }

  afterLoad() {
    super.afterLoad();

    for (let md of ["externalModules", "internalModules", "otherModules"]) {
      for (let module of this[md]) {
        module.afterLoad?.();
      }
    }
  }
}

registerClass(ShipObject);
registerSteps(ShipObject, 3, []);
registerLayers(ShipObject, ['battleship', 'dynamic'], 0);
