import { clamp } from "../clamp.js";

const tonnage = {
  null: "Индустриальный",
  0: "Шаттл",
  1: "Корвет",
  2: "Фрегат",
  3: "Эсминец",
  4: "Крейсер",
  5: "Линейный крейсер",
  6: "Линкор",
  7: "Дредноут",
  8: "Корабль автономного развёртывания",
  9: "Титан",
};

const tonnageToCaptureRange = [
  5000, 10000, 25000, 35000, 50000, 60000, 100000, 300000, 500000, 500000,
];

const tonnageToManeuverabilityBonus = [5, 4, 3, 2, 1, 0, -2, -4, -6, -10];

const tonnageToAcceleration = [900, 600, 420, 300, 180, 120, 90, 60, 30, 18];

export { tonnage, tonnageToCaptureRange, tonnageToManeuverabilityBonus, tonnageToAcceleration };


const baseBattleshipCharacteristics = {
  dynamic: {
    hp: {
      /** текущее значение корпуса */
      hull: 100,
      /** текущее значение брони */
      armor: 100,
      /** текущее значение барьера */
      barrier: 100,
    },
    /** текущее значение нагрева */
    temperature: 0,
    /** заряд конденсатора */
    charge: 0,
  },
  constant: {
    body: {
      /** тоннаж */
      tonnage: 0,
      /** поколение ядра */
      core: 0,
      /** масса */
      mass: 0,
      containers: {
        /** трюм */
        storage: 0,
        /** ангар */
        hangar: 0,
      },
      /** радиус сигнатуры */
      signature: 0,
    },
    /** максимальное ускорение */
    acceleration: 0,
    /** дальность прыжка (СДЕЛАЙ ЭТО ПЛЕЙСХОЛДЕРОМ JUMP CALCULATION!!!!) */
    jumpdistance: 0,
    /** маневренность */
    maneuverability: 0,
    /** сила сенсоров */
    sensors_power: 0,
    /** дальность захвата */
    capture_range: 5000,
    capacitor: {
      /** максимальный заряд */
      charge: 0,
      /** перезарядка за ход */
      generation: 0,
    },
    slots: {
      /** внешные слоты ОМ */
      external: 0,
      /** инженерные слоты ОМ */
      internal: 0,
    },
    hp: {
      /** максимальное значение корпуса */
      hull: 100,
      /** максимальное значение брони */
      armor: 100,
      /** максимальное значение барьера */
      barrier: 100,
    },
    /** максимальное значение нагрева */
    temperature: 1,
    /** нагрев за ход */
    heating: 0,
    resistance: {
      /** кинетическая сопротивляемость */
      kinetic: {
        hull: 0,
        armor: 0,
        barrier: 0,
      },
      /** фугасная сопротивляемость */
      high_explosive: {
        hull: 0,
        armor: 0,
        barrier: 0,
      },
      /** ЭМ сопротивляемость */
      electro_magnetic: {
        hull: 0,
        armor: 0,
        barrier: 0,
      },
      /** тепловая сопротивляемость */
      thermal: {
        hull: 0,
        armor: 0,
        barrier: 0,
      },
      /** Сопротивляемость к РЭБ */
      EW: 0,
    },
    barrier: {
      /** стабильная пассивная регенерация */
      passive_regeneration: 0.01,
      resonance: {
        /** резонансная частота */
        frequency: 0.3,
        /** тенденция к резонансу */
        tendency: 0.01,
        /** резонансный диапазон */
        range: 0.4,
      },
    },

    modulemodifier: {
      /** Модификаторы для вооружения */
      offence: {
        /** Модификаторы для баллистики */
        ballistic: {
          effective_distance_modifier: 1,
          damage_modifier: 1,
          tracking_modifier: 1,
          capacitor_consumption_modifier: 1,
          heating_modifier: 1,
          target_heating_modifier: 1
        },
        /** Модификаторы для лазеров */
        laser: {
          effective_distance_modifier: 1,
          damage_modifier: 1,
          tracking_modifier: 1,
          capacitor_consumption_modifier: 1,
          heating_modifier: 1,
          target_heating_modifier: 1
        },
        /** Модификаторы для ПУ */
        launcher: {
          on_hit_damage_modifier: 1,
          fuel_modifier: 1,
          acceleration_modifier: 1,
          explosion_signature_modifier: 1,
          capacitor_consumption_modifier: 1,
          heating_modifier: 1,
          on_hitheating_modifier: 1
        },
        /** Модификаторы для АОЕ атак */
        bomb: {
          effective_distance_modifier: 1,
          damage_modifier: 1,
          capacitor_consumption_modifier: 1,
          heating_modifier: 1,
        },
        /** Модификаторы для дезинтеграторов */
        desintegrator: {
          effective_distance_modifier: 1,
          damage_modifier: 1,
          tracking_modifier: 1,
          capacitor_consumption_modifier: 1,
          heating_modifier: 1,
          target_heating_modifier: 1,
          /** Бонус урону от каждой атаки */
          per_shot_bonus_modifier: 1,
          /** Потолок бонуса */
          max_stack_modifier: 1,
        },
        /** Модификаторы силы НАШИХ средств Радиоэлектронной Борьбы */
        EW: {
          effective_distance_modifier: 1,
          capacitor_consumption_modifier: 1,
          heating_modifier: 1,
          target_heating_modifier: 1,
          /** Основной бонус, накладывающийся на все последующие сверху */
          EW_strenght_modifier: 1,
          /** Чисто для профильных особенностей и каких-то мега узкоспециализированных штуковин */
          tracking_disruption_modifier: 1,
          stasis_modifier: 1,
          maneuverability_disruption_modifier: 1,
          contact_quality_disruption_modifier: 1,
          signature_painting_modifier: 1,
          capacitor_disruption_modifier: 1
        },
        /** Модификаторы субтел этого тела */
        vehicle: {
          vehicle_damage_modifier: 1,
          vehicle_acceleration_modifier: 1,
          vehicle_target_heating_modifier: 1,
          vehicle_effective_distance_modifier: 1,
          vehicle_signature_modifier: 1,
          vehicle_maneuverability_modifier: 1,
          vehicle_hp_modifier: 1
        }
      },
      /** Модификаторы работы инженерных модулей */
      engineering: {
        /** Бонус ремонта */
        /** Барьера */
        barrier: {
          passive_recharge_modifier: 1,
          active_recharge_modifier: 1
        },
        /** Брони */
        armor: {
          active_repair_modifier: 1
        },

        hardener: {
          active: {
            barrier: {
              effectiveness_modifier: 1,
              capacitor_consumption_modifier: 1,
              heating_modifier: 1
            },
            armor: {
              effectiveness_modifier: 1,
              capacitor_consumption_modifier: 1,
              heating_modifier: 1
            }
          },
          passive: {
            barrier: {
              effectiveness_modifier: 1
            },
            armor: {
              effectiveness_modifier: 1
            }
          }
        },
        mobility: {
          micro_distortion_drive: {
            effectiveness_modifier: 1,
            capacitor_consumption_modifier: 1,
            heating_modifier: 1,
            signature_penalty_modifier: 1
          },
          afterburner: {
            effectiveness_modifier: 1,
            capacitor_consumption_modifier: 1,
            heating_modifier: 1
          }
        }

      },
      /** Модификаторы работы модулей поддержки флота и дистанционного снабжения. */
      /** Отсюда же берут баффы и аппараты снабжения и поддержки. */
      support: {
        effective_distance_modifier: 1,
        capacitor_consumption_modifier: 1,
        heating_modifier: 1,
        /** Основной бонус, накладывающийся на все последующие сверху */
        support_strenght_modifier: 1,
        /** Чисто для профильных особенностей и каких-то мега узкоспециализированных штуковин */
        tracking_support_modifier: 1,
        acceleration_support_modifier: 1,
        maneuverability_support_modifier: 1,
        contact_quality_support_modifier: 1,
        signature_suppression_modifier: 1,
        capacitor_injection_modifier: 1,
        shield_injection_modifier: 1,
        armor_repair_modifier: 1,
      }
    }
  },
};

const battleshipCharacteristicsClampRules = {
  dynamic: {
    hp: {
      hull: (c, v) => clamp(v, 0, c.constant.hp.hull),
      armor: (c, v) => clamp(v, 0, c.constant.hp.armor),
      barrier: (c, v) => clamp(v, 0, c.constant.hp.barrier),
    },
    temperature: (c, v) => v < 0 ? 0 : v,
    charge: (c, v) => clamp(v, 0, c.constant.capacitor.charge),
  },
  constant: {
    capacitor: {
      charge: (c, v) => v < 0 ? 0 : v,
    },
    resistance: {
      kinetic: {
        hull: [0, 1],
        armor: [0, 1],
        barrier: [0, 1],
      },
      high_explosive: {
        hull: [0, 1],
        armor: [0, 1],
        barrier: [0, 1],
      },
      electro_magnetic: {
        hull: [0, 1],
        armor: [0, 1],
        barrier: [0, 1],
      },
      thermal: {
        hull: [0, 1],
        armor: [0, 1],
        barrier: [0, 1],
      },
    }
  },
};

export { baseBattleshipCharacteristics, battleshipCharacteristicsClampRules };


/**
 * 
 * @param {number} maxHull maximum hull capacity value
 * @param {number} curTemp current temperature
 * @param {number} maxTemp maximum temperature
 * @returns {number} temprature damage
 */
const overheatDamage = (maxHull, curTemp, maxTemp) => maxHull * ( curTemp - maxTemp ) / 400;

/**
 * 
 * @param {{ 
 *  passive_regeneration: number; 
 *  resonance: { 
 *    frequency: number; 
 *    tendency: number; 
 *    range: number; 
 * }}} barrierStats 
 * @param {number} curBarrier current barrier value
 * @param {number} maxBarrier maximum barrier value
 * @returns {number} barrier regeneration
 */
const passiveBarrierRegeneration = (barrierStats, curBarrier, maxBarrier) => {
  const curPer = curBarrier / maxBarrier;

  const regenInPer = 
    (barrierStats.resonance.tendency - barrierStats.passive_regeneration) 
      *
    (1 - barrierStats.resonance.range) 
      ** 
        (
          -((curPer - barrierStats.resonance.range) ** 2)
            /
          (barrierStats.resonance.range + barrierStats.resonance.range * curPer)
        ) 
      +
    barrierStats.passive_regeneration
  
  return regenInPer * maxBarrier;
}

export { overheatDamage, passiveBarrierRegeneration }