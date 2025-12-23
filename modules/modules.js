import BaseModule from "../js/canvas/objects/map/module/baseModule.js";
import ShipObject from "../js/canvas/objects/map/ship/shipObject.js";
import { calculateRelativeData } from "../js/controls/show_rdata.js";
import { log } from "../js/controls/step-logs/log.js";
import { updateLoading } from "../js/loading.js";
import { clamp } from "../libs/clamp.js";
import { getFullManeuverability } from "../libs/hayat/battleships.js";
import { point } from "../libs/vector/point.js";

let isReady = false;
let modules = {};
let onReady = () => {};
let setReadyFunction = (func) => {
  onReady = func;
};

export default function init() {
  const loadModules = async (list) => {
    const len = Object.keys(list).length;
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
const MODULES_CALCULATION_FUNCTIONS = {
  RENContactor: (modificator, module, parent, target) => {
    if (!target || !parent) return 0;

    const range = point(() => point(target._x, target._y) - point(parent._x, parent._y)).length;
    const EWRes = 1 - target.currentCharacteristics.constant.resistance.EW;
    const EWDist =
      target.currentCharacteristics.constant.modulemodifier.offence.EW.effective_distance_modifier;
    const EWMod =
      target.currentCharacteristics.constant.modulemodifier.offence.EW.EW_strenght_modifier;

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

  LaserAttack: (modificator, module, parent, target) => {
    if (parent.state != "step 0" || module.functionsSharedData.perStep.processed) return 0;

    module.functionsSharedData.perStep.hit          = false;
    module.functionsSharedData.perStep.effectivness = 0;
    module.functionsSharedData.perStep.damage       = 0;
    module.functionsSharedData.perStep.heating      = 0;

    if (!target || !parent) return 0;

    const contactQuality = parent.dices.contactQuality;
    const resultAccuracy =
      contactQuality -
      getFullManeuverability(target.currentCharacteristics, target.dices.maneuvering);

    const { angularVelocity } = calculateRelativeData(parent, target);
    const angularPenalty =
      clamp(Math.abs(angularVelocity) / module.characteristics.additionalInfo.tracking - 0.75, 0, 0.3) / 0.3;

    const chance = clamp(0.5 + resultAccuracy * 0.15, 0, 1) * (1 - angularPenalty);
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
        `function | (data applied only in step calculation)<br>
-------- | ${random} <= ${chance}, hit calculated<br>
-------- | ${module.functionsSharedData.perStep.damage}dmg ${module.functionsSharedData.perStep.heating}heat`
      );
    } else {
      log(
        module.path,
        `function | (data applied only in step calculation)<br>
-------- | ${random} > ${chance}, missed`
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

    const contactQuality = parent.dices.contactQuality;

    const range = point(() => point(target._x, target._y) - point(parent._x, parent._y)).length;
    const penalty =
      ((range - module.characteristics.additionalInfo.effectiveRange) /
        module.characteristics.additionalInfo.penaltyStep) *
      module.characteristics.additionalInfo.penalty;

    const resultAccuracy =
      contactQuality -
      getFullManeuverability(target.currentCharacteristics, target.dices.maneuvering) -
      (penalty > 0 ? penalty : 0);

    const { angularVelocity } = calculateRelativeData(parent, target);
    const angularPenalty =
      clamp(Math.abs(angularVelocity) / module.characteristics.additionalInfo.tracking - 0.75, 0, 0.3) / 0.3;

    const chance = clamp(0.5 + resultAccuracy * 0.15, 0, 1) * (1 - angularPenalty);
    const random = Math.random();

    if (random <= chance) {
      
      module.functionsSharedData.perStep.damage  = module.characteristics.additionalInfo.baseDamage * parent.currentCharacteristics.constant.modulemodifier.offence.ballistic.damage_modifier ;
      module.functionsSharedData.perStep.heating = module.characteristics.additionalInfo.targetHeating;
      module.functionsSharedData.perStep.hit = true;
      log(
        module.path,
        `function | (data applied only in step calculation)<br>
-------- | ${random} <= ${chance}, hit calculated<br>
-------- | ${module.functionsSharedData.perStep.damage}dmg ${module.functionsSharedData.perStep.heating}heat`
      );

    } else {
      log(
        module.path,
        `function | (data applied only in step calculation)<br>
-------- | ${random} > ${chance}, missed`
      );
    }

    module.functionsSharedData.perStep.processed = true;
    return 0;
  },


//  _    _ _____ ______  _______ _______  _____  ______  _______
//   \  /    |   |_____] |______ |       |     | |     \ |______
//    \/   __|__ |_____] |______ |_____  |_____| |_____/ |______
//                                                              
//                  ⠄⠄⠄⠄⠄⠄⠄⣀⣠⣤⣤⣤⣤⣀⡀
//                  ⠄⠄⠄⣠⣤⢶⣻⣿⣻⣿⣿⣿⣿⣿⣿⣦⣤⣀
//                  ⠄⠄⣼⣺⢷⣻⣽⣾⣿⢿⣿⣷⣿⣿⢿⣿⣿⣿⣇
//                  ⠠⡍⢾⣺⢽⡳⣻⡺⣽⢝⢗⢯⣻⢽⣻⣿⣿⣿⣿⢿⡄
//                  ⡨⣖⢹⠜⢅⢫⢊⢎⠜⢌⠣⢑⠡⣹⡸⣜⣯⣿⢿⣻⣷
//                  ⢜⢔⡹⡭⣪⢼⠽⠷⠧⣳⢘⢔⡝⠾⠽⢿⣷⣿⣟⢷⣟
//                  ⢸⢘⢼⠿⠟⠁⠄⠄⡀⠄⠃⠑⡌⠄⠄⠈⠙⠿⣷⢽⣻
//                  ⢌⠂⠅⠄⠄⠄⠄⠄⠄⡀⣲⣢⢂⠄⠄⠄⠄⠄⠈⣯⠏
//                  ⠐⠨⡂⠄⠄⠄⠄⠄⡀⡔⠋⢻⣤⡀⠄⠄⢀⠄⢸⣯⠇
//                  ⠈⣕⠝⠒⠄⠄⠒⢉⠪⠄⠄⠄⢿⠜⠑⠢⠠⡒⡺⣿⠖
//                  ⠄⠐⠅⠁⡀⠄⠐⢔⠁⠄⠄⠄⢀⢇⢌⠄⠄⠄⠸⠕
//                  ⠄⠄⠂⠄⠄⠨⣔⡝⠼⡄⠂⣦⡆⣿⣲⠐⠑⠁⠄⠃
//                  ⠄⠄⠄⠄⠄⠄⠃⢫⢛⣙⡊⣜⣏⡝⣝⠆
//                  ⠄⠄⠄⠄⠄⠄⠈⠈⠁⠁⠁⠈⠈⠊
//                     Мне стыдно перед богом...

EntropicDisintegrator: (modificator, module, parent, target) => {
    if (module.functionsSharedData.perStep.processed) return 0;

    // Инициализация данных модуля при первом запуске
    if (!module.functionsSharedData.persistent) {
      module.functionsSharedData.persistent = {
        continuousSteps: 0,
        bonusMultiplier: 1,
        wasActiveLastStep: false
      };
    }

    // Сброс данных текущего шага
    module.functionsSharedData.perStep.hit = false;
    module.functionsSharedData.perStep.effectivness = 0;
    module.functionsSharedData.perStep.damage = 0;
    module.functionsSharedData.perStep.heating = 0;

    // Проверяем состояние модуля - активен ли он сейчас
    const isActive = (parent.state === "step 0" && module.state === "active");
    
    // Получаем модификаторы из характеристик корабля
    const bonusCapModifier = parent.currentCharacteristics.constant.precursor?.desintegrator?.bonus_cap_modifier || 1;
    const perStepBonusModifier = parent.currentCharacteristics.constant.precursor?.desintegrator?.per_step_bonus_modifier || 1;
    
    if (isActive && module.functionsSharedData.persistent.wasActiveLastStep) {
      // Увеличиваем накопленный множитель
      module.functionsSharedData.persistent.continuousSteps++;
      const effectivePerStepBonus = module.characteristics.additionalInfo.perStepBonus * perStepBonusModifier;
      const effectiveBonusCap = module.characteristics.additionalInfo.bonusCap * bonusCapModifier;
      
      module.functionsSharedData.persistent.bonusMultiplier = Math.min(
        1 + (module.functionsSharedData.persistent.continuousSteps * effectivePerStepBonus),
        effectiveBonusCap
      );
    } else if (isActive && !module.functionsSharedData.persistent.wasActiveLastStep) {
      // Первый шаг активности после перерыва
      module.functionsSharedData.persistent.continuousSteps = 1;
      const effectivePerStepBonus = module.characteristics.additionalInfo.perStepBonus * perStepBonusModifier;
      module.functionsSharedData.persistent.bonusMultiplier = 1 + effectivePerStepBonus;
    } else {
      // Модуль неактивен - сбрасываем бонус
      module.functionsSharedData.persistent.continuousSteps = 0;
      module.functionsSharedData.persistent.bonusMultiplier = 1;
    }

    module.functionsSharedData.persistent.wasActiveLastStep = isActive;

    if (!isActive || parent.state != "step 0") {
      module.functionsSharedData.perStep.processed = true;
      return 0;
    }

    if (!target || !parent) {
      module.functionsSharedData.perStep.processed = true;
      return 0;
    }

    // Используем логику лазеров для попадания
    const contactQuality = parent.dices.contactQuality;
    const resultAccuracy = contactQuality - getFullManeuverability(target.currentCharacteristics, target.dices.maneuvering);

    const { angularVelocity } = calculateRelativeData(parent, target);
    const angularPenalty = clamp(Math.abs(angularVelocity) / module.characteristics.additionalInfo.tracking - 0.75, 0, 0.3) / 0.3;

    const chance = clamp(0.5 + resultAccuracy * 0.15, 0, 1) * (1 - angularPenalty);
    const random = Math.random();

    if (random <= chance) {
      const range = point(() => point(target._x, target._y) - point(parent._x, parent._y)).length;
      const effectivness = 1 - clamp(
        (range - module.characteristics.additionalInfo.effectiveRange) /
        (module.characteristics.additionalInfo.maxRange - module.characteristics.additionalInfo.effectiveRange),
        0, 1
      );

      // Базовый урон * накопленный множитель
      const totalDamage = module.characteristics.additionalInfo.baseDamage * module.functionsSharedData.persistent.bonusMultiplier * effectivness;

      module.functionsSharedData.perStep.hit = true;
      module.functionsSharedData.perStep.effectivness = effectivness;
      module.functionsSharedData.perStep.damage = totalDamage;
      module.functionsSharedData.perStep.heating = module.characteristics.additionalInfo.targetHeating * effectivness;

      log(
        module.path,
        `entropic disintegrator | (data applied only in step calculation)<br>
-------- | ${random} <= ${chance}, hit calculated<br>
-------- | continuous steps: ${module.functionsSharedData.persistent.continuousSteps}<br>
-------- | damage multiplier: ${module.functionsSharedData.persistent.bonusMultiplier.toFixed(2)}x (${((module.functionsSharedData.persistent.bonusMultiplier - 1) * 100).toFixed(1)}%)<br>
-------- | total: ${totalDamage.toFixed(1)}dmg ${module.functionsSharedData.perStep.heating.toFixed(3)}heat`
      );
    } else {
      log(
        module.path,
        `entropic disintegrator | ${random} > ${chance}, missed<br>
-------- | damage multiplier: ${module.functionsSharedData.persistent.bonusMultiplier.toFixed(2)}x (${((module.functionsSharedData.persistent.bonusMultiplier - 1) * 100).toFixed(1)}%)`
      );
    }

    module.functionsSharedData.perStep.processed = true;
    return 0;
  },
};

const AdaptiveMembrane = (modificator, module, parent, target) => {
    if (module.functionsSharedData.perStep.processed) return 0;

    // Инициализация данных модуля при первом запуске
    if (!module.functionsSharedData.persistent) {
        module.functionsSharedData.persistent = {
            currentResistances: {
                thermal: 0,
                kinetic: 0,
                explosive: 0,
                electromagnetic: 0,
            },
            steps: 0,
            wasActiveLastStep: false,
        };
    }

    // Сброс данных текущего шага
    module.functionsSharedData.perStep.hit = false;
    module.functionsSharedData.perStep.effectiveness = 0;
    module.functionsSharedData.perStep.damage = 0;

    // Проверяем состояние модуля - активен ли он сейчас
    const isActive = (parent.state === "step 0" && module.state === "active");

    if (isActive && module.functionsSharedData.persistent.wasActiveLastStep) {
        // Увеличиваем количество шагов
        module.functionsSharedData.persistent.steps++;
    } else if (isActive && !module.functionsSharedData.persistent.wasActiveLastStep) {
        // Первый шаг активности после перерыва
        module.functionsSharedData.persistent.steps = 1;
    } else {
        // Модуль неактивен - сбрасываем шаги
        module.functionsSharedData.persistent.steps = 0;
    }

    module.functionsSharedData.persistent.wasActiveLastStep = isActive;

    if (!isActive || parent.state !== "step 0") {
        module.functionsSharedData.perStep.processed = true;
        return 0;
    }

    if (!target || !parent) {
        module.functionsSharedData.perStep.processed = true;
        return 0;
    }

    // Получаем модификаторы из характеристик корабля
    const bonusCap = module.characteristics.additionalInfo.bonusCap;
    const perStepBonus = module.characteristics.additionalInfo.perStepBonus;

    // Распределяем сопротивления
    const resistances = {
        thermal: target.currentCharacteristics.constant.resistance.thermal.armor,
        kinetic: target.currentCharacteristics.constant.resistance.kinetic.armor,
        explosive: target.currentCharacteristics.constant.resistance.high_explosive.armor,
        electromagnetic: target.currentCharacteristics.constant.resistance.electro_magnetic.armor,
    };

    // Суммируем сопротивления
    const totalResistance = Object.values(resistances).reduce((acc, val) => acc + val, 0);

    // Проверяем, не превышает ли сумма сопротивлений максимальное значение
    if (totalResistance > bonusCap) {
        module.functionsSharedData.perStep.hit = true;
        module.functionsSharedData.perStep.effectiveness = 0; // Сопротивление слишком высоко
        log(module.path, `Adaptive Membrane | Resistance exceeded: ${totalResistance} > ${bonusCap}`);
    } else {
        // Распределяем сопротивления
        const effectiveResistance = Object.entries(resistances).reduce((acc, [key, value]) => {
            const distribution = Math.min(value, perStepBonus);
            acc[key] = distribution;
            return acc;
        }, {});

        // Обновляем текущие сопротивления
        module.functionsSharedData.currentResistances = effectiveResistance;

        module.functionsSharedData.perStep.hit = true;
        module.functionsSharedData.perStep.effectiveness = 1 - (totalResistance / bonusCap); // Эффективность
        module.functionsSharedData.perStep.damage = effectiveResistance; // Урон

        log(module.path, `Adaptive Membrane | Effective Resistance: ${effectiveResistance}, Total Resistance: ${totalResistance}`);
    }

    module.functionsSharedData.perStep.processed = true;
    return 0;
};

export { MODULES_CALCULATION_FUNCTIONS };
