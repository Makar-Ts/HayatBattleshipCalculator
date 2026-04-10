import BaseModule from "../js/canvas/objects/map/module/baseModule.js";
import ShipObject from "../js/canvas/objects/map/ship/shipObject.js";
import { calculateRelativeData } from "../js/controls/show_rdata.js";
import { log } from "../js/controls/step-logs/log.js";
import { updateLoading } from "../js/loading.js";
import { clamp } from "../libs/clamp.js";
import { getFullManeuverability, tonnageToResolution } from "../libs/hayat/battleships.js";
import { point } from "../libs/vector/point.js";

let isReady = false;
let modules = {};
let onReady = () => {};
let setReadyFunction = (func) => {
  onReady = func;
};

export default function init() {
  const loadModules = async (list) => {
    const externalSources = JSON.parse(localStorage.getItem('dataSources') ?? '[]');
    let externalParce = {};
    let functionsParce = [];
    for (let source of externalSources) {
      if (source.set.modules) {
        const l = await (await fetch(source.url + '/modules/modules.json')).json();
        for (let [name, path] of Object.entries(l)) {
          externalParce[name] = source.url + "/modules/" + path;
        }

        console.log(`External Data Source ${source.url} with ${Object.keys(l).length} modules`)
      } 

      if (source.set.modulesFunctions) {
        functionsParce.push(source.url + "/modules/modules.js");

        console.log(`External Data Source ${source.url} with functions`)
      }
    }

    const len = Object.keys(list).length + Object.keys(externalParce).length + functionsParce.length;
    let amount = 0;
    updateLoading("modules", len, 0, 0);
    for (let [name, path] of Object.entries(list)) {
      const data = await (await fetch("./modules/" + path)).json();

      if (data?.external) {
        const out = {};
        const parent = ("./modules/" + path).replace(/[^\/]+.json/, "");

        for (let [k, v] of Object.entries(data.external)) {
          out[k] = await (await fetch(parent + v)).json();
        }

        data.external = out;
      }

      modules[name] = data;

      amount++;
      updateLoading("modules", len, 0, amount);
    }

    for (let [name, path] of Object.entries(externalParce)) {
      const data = await (await fetch(path)).json();

      if (data?.external) {
        const out = {};
        const parent = path.replace(/[^\/]+.json/, "");

        for (let [k, v] of Object.entries(data.external)) {
          out[k] = await (await fetch(parent + v)).json();
        }

        data.external = out;
      }

      modules[name] = data;

      amount++;
      updateLoading("modules", len, 0, amount);
    }

    for (let toLoad of functionsParce) {
      const loaded = (await import(toLoad)).default;

      if (typeof loaded == "object") {
        MODULES_CALCULATION_FUNCTIONS = {
          ...MODULES_CALCULATION_FUNCTIONS,
          ...loaded
        }
      }

      amount++;
      updateLoading("modules", len, 0, amount);
    }
  };

  fetch("./modules/modules.json")
    .then((response) => response.json())
    .then((v) => {
      loadModules(v)
        .then(() => {
          isReady = true;

          console.log(' ------ loaded modules ------');
          console.log(modules);

          onReady();
        })
        .catch((e) => {
          console.log(e);

          alert("Cannot load modules data!");
        });
    })
    .catch((e) => {
      console.log(e);

      alert("Cannot load modules paths!");
    });
}

export { isReady, modules, setReadyFunction };

// ==========================================
// --- HAYAT TARGETING CORE FUNCTION ---
// ==========================================
function calculateHitChance(parent, target, module, currentContactBonus) {
  // 1. ВСТРЕЧНЫЙ БРОСОК: Контакт vs Уклонение
  const targetManeuverability = getFullManeuverability(target.currentCharacteristics, target.dices.maneuvering);
  const delta = currentContactBonus - targetManeuverability;
  const baseContactChance = 1 / (1 + Math.exp(-delta / 5));

  // 2. РАЗРЕШЕНИЕ СЕНСОРОВ
  const moduleAddInfo = module.characteristics.additionalInfo;
  const isAutonomous = moduleAddInfo.resolution !== undefined;
  
  // ИСПРАВЛЕНИЕ 1: Правильный путь к тоннажу стреляющего корабля
  const shipTonnage = parent.currentCharacteristics?.constant?.body?.tonnage ?? 4;
  const shipResolution = tonnageToResolution[shipTonnage] || 100;
  
  const baseResolution = isAutonomous ? moduleAddInfo.resolution : shipResolution;
  
  const auxMultiplier = parent.currentCharacteristics?.constant?.module_modifiers?.['sensors>resolution_multiplier'] || 1.0;
  const effectiveResolution = baseResolution * auxMultiplier;
  
  const targetSignature = target.currentCharacteristics?.constant?.body?.signature || 1;
  const signatureRatio = effectiveResolution / targetSignature;

  // 3. ДИНАМИЧЕСКАЯ ОШИБКА
  const { angularVelocity } = calculateRelativeData(parent, target);
  const tracking = moduleAddInfo.tracking || 1; 
  
  const angularVelocityDeg = Math.abs(angularVelocity); 
  
  let trackingError = 0;
  if (angularVelocityDeg > 0.1) {
    const speedFactor = angularVelocityDeg / tracking;
    trackingError = Math.pow(speedFactor * signatureRatio, 2);
  }

  // 4. СТАТИЧЕСКАЯ ОШИБКА
  let precisionError = 0;
  if (signatureRatio > 1.0) {
    const forgivenessFactor = 2.0; 
    precisionError = Math.pow((signatureRatio - 1) / forgivenessFactor, 2);
  }

  // 5. ИТОГ
  const chance = baseContactChance * Math.pow(0.5, trackingError + precisionError);

  return chance;
}

/**
 * @type { Record<string, 
 * (
 *    modificator: {
 *      target: string,
 *      characteristic: string,
 *      modificationType: string,
 *      modificator: number | string,
 *      isAffectedByInterference: boolean
 *    }, 
 *    module: BaseModule,
 *    parent: ShipObject,
 *    target: ShipObject
 *  ) => number }
 */
let MODULES_CALCULATION_FUNCTIONS = {
  RENContactor: (modificator, module, parent, target) => {
    if (!target || !parent) return 0;

    const range = point(() => point(target._x, target._y) - point(parent._x, parent._y)).length;
    const EWRes = 1 - target.currentCharacteristics.constant.resistance.EW;
    const EWDist =
      target.currentCharacteristics.constant.module_modifiers['offence>EW>effective_distance_modifier'];
    const EWMod =
      target.currentCharacteristics.constant.module_modifiers['offence>EW>EW_strenght_modifier'];

    const num =
      module.characteristics.additionalInfo.baseDraining *
      (1 -
        clamp(
          (range - module.characteristics.additionalInfo.effectiveRange * EWDist) /
            (module.characteristics.additionalInfo.maxRange -
              module.characteristics.additionalInfo.effectiveRange),
          0,
          1
        )) *
      EWMod *
      EWRes;

    return num > 0 ? -num : 0;
  },

  ыLaserAttack: (modificator, module, parent, target) => {
    if (parent.state != "step 0" || module.functionsSharedData.perStep.processed) return 0;

    module.functionsSharedData.perStep.hit          = false;
    module.functionsSharedData.perStep.effectivness = 0;
    module.functionsSharedData.perStep.damage       = 0;
    module.functionsSharedData.perStep.heating      = 0;

    if (!target || !parent) return 0;

    // Считаем бонус контакта (Дайс + Модификаторы)
    const baseContact = parent.dices.contactQuality || 10;
    const dynamicContactMod = parent.currentCharacteristics.constant.module_modifiers['sensors>contact>bonus'] || 0;
    const currentContactBonus = baseContact + dynamicContactMod;

    // Вызываем новое ядро наведения
    const chance = calculateHitChance(parent, target, module, currentContactBonus);
    const random = Math.random();

    if (random <= chance) {
      const range = point(() => point(target._x, target._y) - point(parent._x, parent._y)).length;
      const effectivness =
        1 -
        clamp(
          (range - module.characteristics.additionalInfo.effectiveRange) /
            (module.characteristics.additionalInfo.maxRange -
              module.characteristics.additionalInfo.effectiveRange),
          0,
          1
        );

      module.functionsSharedData.perStep.hit = true;
      module.functionsSharedData.perStep.effectivness = effectivness;
      module.functionsSharedData.perStep.damage =
        module.characteristics.additionalInfo.baseDamage * effectivness;
      module.functionsSharedData.perStep.heating =
        module.characteristics.additionalInfo.targetHeating * effectivness;

      log(
        module.path,
        `Laser Attack | Chance: ${(chance * 100).toFixed(1)}%<br>
-------- | ${random.toFixed(3)} <= ${chance.toFixed(3)}, hit calculated<br>
-------- | ${module.functionsSharedData.perStep.damage.toFixed(1)}dmg ${module.functionsSharedData.perStep.heating.toFixed(1)}heat`
      );
    } else {
      log(
        module.path,
        `Laser Attack | Chance: ${(chance * 100).toFixed(1)}%<br>
-------- | ${random.toFixed(3)} > ${chance.toFixed(3)}, missed`
      );
    }

    module.functionsSharedData.perStep.processed = true;
    return 0;
  },

  BallisticAttack: (modificator, module, parent, target) => {
    if (parent.state != "step 0" || module.functionsSharedData.perStep.processed) return 0;

    module.functionsSharedData.perStep.hit     = false;
    module.functionsSharedData.perStep.damage  = 0;
    module.functionsSharedData.perStep.heating = 0;

    if (!target || !parent) return 0;

    const range = point(() => point(target._x, target._y) - point(parent._x, parent._y)).length;
    
    // Штраф баллистики за предел эффективной дальности (сохранена твоя логика)
    const penalty =
      ((range - module.characteristics.additionalInfo.effectiveRange) /
        module.characteristics.additionalInfo.penaltyStep) *
      module.characteristics.additionalInfo.penalty;
    const actualPenalty = penalty > 0 ? penalty : 0;

    // Считаем бонус контакта (Дайс + Модификаторы - Штраф дальности)
    const baseContact = parent.dices.contactQuality || 10;
    const dynamicContactMod = parent.currentCharacteristics.constant.module_modifiers?.['sensors>contact>bonus'] || 0;
    const currentContactBonus = baseContact + dynamicContactMod - actualPenalty;

    // Вызываем новое ядро наведения
    const chance = calculateHitChance(parent, target, module, currentContactBonus);
    const random = Math.random();

    if (random <= chance) {
      // Сохранен оригинальный модификатор урона
      let damageMod = parent.currentCharacteristics.constant.module_modifiers?.['offence>ballistic>damage_modifier'] || 1;
      
      module.functionsSharedData.perStep.damage  = module.characteristics.additionalInfo.baseDamage * damageMod;
      module.functionsSharedData.perStep.heating = module.characteristics.additionalInfo.targetHeating;
      module.functionsSharedData.perStep.hit = true;
      
      log(
        module.path,
        `Ballistic Attack | Chance: ${(chance * 100).toFixed(1)}%<br>
-------- | ${random.toFixed(3)} <= ${chance.toFixed(3)}, hit calculated<br>
-------- | ${module.functionsSharedData.perStep.damage.toFixed(1)}dmg ${module.functionsSharedData.perStep.heating.toFixed(1)}heat`
      );

    } else {
      log(
        module.path,
        `Ballistic Attack | Chance: ${(chance * 100).toFixed(1)}%<br>
-------- | ${random.toFixed(3)} > ${chance.toFixed(3)}, missed`
      );
    }

    module.functionsSharedData.perStep.processed = true;
    return 0;
  },
};

export { MODULES_CALCULATION_FUNCTIONS };
