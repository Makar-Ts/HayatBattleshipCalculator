import { ObjectConnection } from "../../../../../../../../libs/connection.js";
import { calc, point } from "../../../../../../../../libs/vector/point.js";
import { log } from "../../../../../../../controls/step-logs/log.js";
import { EVENTS } from "../../../../../../../events.js";
import { registerClass } from "../../../../../../../save&load/objectCollector.js";
import { registerLayers } from "../../../../../../layers/layersInfoCollector.js";
import { objects } from "../../../../../../map.js";
import MAP_OBJECTS_IDS from "../../../../mapObjectsIds.constant.js";
import { registerSteps } from "../../../../step/stepInfoCollector.js";
import ExplosiveSubgridObject from "../explosiveSubgridObject.js";

export default class SelfguidedSubgridObject extends ExplosiveSubgridObject {
  target = new ObjectConnection(() => objects);


  constructor(x, y, direction, velocity, controlledBy = null, battleshipChars = {}, activationDelay = 0) {
    super(x, y, direction, velocity, controlledBy, battleshipChars, activationDelay);

    this.target.Connection = controlledBy?.parent.children[MAP_OBJECTS_IDS.CONTACT_CONTROLLER].target;
  }


  save(realParent = null) {
    return {
      ...super.save(realParent),
      target: this.target.Connection?.path ?? null,
    };
  }

  load(data, loadChildren = false) {
    super.load(data, false);
    
    this.target.storeConnection(data.target ?? null);

    loadChildren && super.loadChildren(data);
  }

  afterLoad() {
    this.target.forceLoadConnection(); // загружаем как объект

    super.afterLoad();
  }


  physicsSimulationStep(step, dt, objectsData) {
    const data = super.physicsSimulationStep(step, dt, objectsData);

    if (this.isCollided || !this.active) return data;

    // ---- проверки и базовые параметры ----
    const target = this.target?.Connection;
    const guidanceDelay = this.currentCharacteristics?.constant?.body?.subgrid?.guidanceDelay ?? 0;

    if (!target || !this.isFueled || (guidanceDelay - this._livetime - dt*step) > 0) {
      return data;
    }

    // thrust — сила (Н), mass — масса (кг)
    const maxAccel = this.currentCharacteristics?.constant?.acceleration ?? 50; // m/s^2
    const mass = (this.currentCharacteristics?.constant?.body?.mass) ?? 1;
    const thrust = maxAccel * mass;
    

    // Позиции и скорости
    const R = { x: this._x, y: this._y };
    const T = { x: target._x, y: target._y };
    const Vm = { x: this.velocity?.x || 0, y: this.velocity?.y || 0 };
    const Vt = { x: target.velocity?.x || 0, y: target.velocity?.y || 0 };

    // Относительный вектор и расстояние
    const rx = T.x - R.x;
    const ry = T.y - R.y;
    const range = Math.hypot(rx, ry) || 1e-6;
    const ux = rx / range;
    const uy = ry / range;
    const nx = -uy;
    const ny = ux;

    // Относительная скорость (v_target - v_missile)
    const vrx = Vt.x - Vm.x;
    const vry = Vt.y - Vm.y;


    const pf = this.currentCharacteristics.constant.body.subgrid.poximity_fuse;
    if (pf) {
      const ppf = pf.passive;
      
      if (ppf &&
        (ppf.trigger_activation_delay ?? 0) - this._livetime - dt*step <= 0 &&
        target.currentCharacteristics
      ) {
        const virtualSignature = target.currentCharacteristics.constant.body.signature;

        if (virtualSignature != target.size) {
          const md = ppf.min_distance;

          if (range <= md && (vrx < 0 || vry < 0)) {
            log(this.path, `Passive PF triggered by ${obj.id}`);
            this.destroy();

            return {
              delete: true
            };
          }
        }
      }
    }


    // Текущая скорость ракеты (модуль)
    const speedM = Math.hypot(Vm.x, Vm.y);

    // LOS rate (угловая скорость линии визирования)
    const losRateNow = (vrx * nx + vry * ny) / range; // rad/s

    // closing velocity (положительное = сближаемся)
    const closingV = -(vrx * ux + vry * uy);

    // -------------------------
    // 1) Предсказание времени до перехвата (итеративно)
    //    модель: цель движется равномерно; ракета может ускоряться вдоль направления к цели
    //    упрощение: ракета в среднем достигает скорости S = speedM + maxAccel * t
    //    решаем уравнение ||relPos + relVel * t|| = S * t  (quadratic), итеративно обновляя S
    // -------------------------
    const relPosDotRelVel = rx * vrx + ry * vry;
    const relVelSq = vrx * vrx + vry * vry;
    const relPosSq = rx * rx + ry * ry;

    // Начальная оценка S и t
    let S = Math.max(speedM, Math.min(speedM + 0.5 * maxAccel, 1e-6)); // стартовое предположение
    if (S < 1e-6) S = 1.0; // избегаем degenerate
    let tIntercept = Math.max(0.01, range / S);

    // Итеративное уточнение (несколько итераций — быстро и стабильно)
    for (let iter = 0; iter < 4; iter++) {
      // Решаем квадратичное уравнение: (relVel^2 - S^2) t^2 + 2(relPos·relVel) t + relPos^2 = 0
      const A = relVelSq - S * S;
      const B = 2 * relPosDotRelVel;
      const C = relPosSq;

      let tCandidate = null;
      if (Math.abs(A) < 1e-6) {
        // линейное решение: B t + C = 0
        if (Math.abs(B) > 1e-9) {
          const tSol = -C / B;
          if (tSol > 0) tCandidate = tSol;
        }
      } else {
        const disc = B * B - 4 * A * C;
        if (disc >= 0) {
          const sqrtD = Math.sqrt(disc);
          const t1 = (-B + sqrtD) / (2 * A);
          const t2 = (-B - sqrtD) / (2 * A);
          // берем наименьший положительный корень
          const tPos = [t1, t2].filter(t => t > 1e-5).sort((a, b) => a - b);
          if (tPos.length) tCandidate = tPos[0];
        }
      }

      // защита: если нет положительного решения — используем грубую оценку
      if (!tCandidate) {
        tCandidate = Math.max(0.01, range / Math.max(1.0, S));
      }

      tIntercept = tCandidate;

      // Обновляем оценку S: предполагаем, что ракета может разогнаться вдоль LOS с accel = maxAccel
      // Простейшая модель: средняя скорость ≈ speedM + 0.5 * maxAccel * t
      const S_new = Math.max(speedM, speedM + 0.5 * maxAccel * Math.min(tIntercept, 5.0));
      // Сглаживание обновления S, чтобы итерации сходились
      S = 0.5 * S + 0.5 * S_new;
    }

    // Вычисляем предсказанную точку перехвата (позиция цели через tIntercept)
    const predictTgtX = T.x + Vt.x * tIntercept;
    const predictTgtY = T.y + Vt.y * tIntercept;

    // Новый относительный вектор к предсказанной точке
    const rxP = predictTgtX - R.x;
    const ryP = predictTgtY - R.y;
    const rangeP = Math.hypot(rxP, ryP) || 1e-6;
    const uxP = rxP / rangeP;
    const uyP = ryP / rangeP;
    const nxP = -uyP;
    const nyP = uxP;

    // Относительная скорость в направлении, важном для предсказания
    const vrxP = Vt.x - Vm.x;
    const vryP = Vt.y - Vm.y;

    // LOS rate относительно предсказанной точки (approx)
    const losRatePred = (vrxP * nxP + vryP * nyP) / rangeP;

    // -------------------------
    // 2) Adaptive PN, но относительно предсказанной точки
    // -------------------------
    const N_base = 2.5;
    const N_max  = 8.0;
    const k_los = 1.0;
    const k_closing = 1.2;
    const V_expected = Math.max(50, S); // эталонная скорость (подстраиваемся под S)

    let N = N_base
          + k_los * Math.min(Math.abs(losRatePred) * rangeP / 100, 6)
          + k_closing * Math.max(0, 1 - ((-(vrxP * uxP + vryP * uyP)) / V_expected));
    N = Math.min(Math.max(N, N_base), N_max);

    // PN команда поперечного ускорения (в сторону, перпендикулярно LOS к пред. точке)
    let aLat = N * Math.max(0, (-(vrxP * uxP + vryP * uyP))) * losRatePred;
    // если closing velocity отрицательное (удаляется) — усиливаем коррекцию
    if (aLat === 0 && losRatePred !== 0) {
      // fallback: используем текущий losRate и S
      aLat = N * S * losRatePred;
    }

    let aCmdX = nxP * aLat;
    let aCmdY = nyP * aLat;

    // Ограничение поперечной составляющей по maxAccel
    const aLatAbs = Math.hypot(aCmdX, aCmdY);
    if (aLatAbs > maxAccel) {
      const scale = maxAccel / aLatAbs;
      aCmdX *= scale;
      aCmdY *= scale;
    }

    // Используем оставшийся доступный ускорение для сокращения дистанции (по LOS к предсказанной точке)
    const usedAccel = Math.hypot(aCmdX, aCmdY);
    if (usedAccel < maxAccel) {
      const remaining = maxAccel - usedAccel;
      // forwardFactor регулирует, какую часть remaining направим вдоль LOS
      const forwardFactor = 0.9;
      aCmdX += uxP * remaining * forwardFactor;
      aCmdY += uyP * remaining * forwardFactor;
    }

    // -------------------------
    // 3) Кинематическая задержка (guidance lag)
    //    экспоненциальный фильтр: a_out = a_prev * exp(-dt/tau) + a_cmd * (1-exp(-dt/tau))
    //    tau — время реакции (в секундах). Малое tau -> быстрая реакция.
    // -------------------------
    const tau = (this.currentCharacteristics?.constant?.guidance?.lag_tau) ?? 0.12; // сек (пример)
    // храним предыдущее командное ускорение в свойстве ракеты
    if (!this._guidanceState) this._guidanceState = { ax: 0, ay: 0 };
    const alpha = 1 - Math.exp(-dt / Math.max(tau, 1e-6));
    this._guidanceState.ax = this._guidanceState.ax * (1 - alpha) + aCmdX * alpha;
    this._guidanceState.ay = this._guidanceState.ay * (1 - alpha) + aCmdY * alpha;

    // Финальная команда (после фильтра)
    let aFinalX = this._guidanceState.ax;
    let aFinalY = this._guidanceState.ay;

    // Ещё раз ограничим по maxAccel (чтобы не выйти за пределы после фильтра)
    const aFinalMag = Math.hypot(aFinalX, aFinalY);
    if (aFinalMag > maxAccel) {
      const scaleFinal = maxAccel / aFinalMag;
      aFinalX *= scaleFinal;
      aFinalY *= scaleFinal;
    }

    // Визуализация: направление ракеты (опционально — ориентируем по вектору ускорения)
    const angle = Math.atan2(-aFinalY, aFinalX);

    const delta = (this._direction - 90) / 180 * Math.PI - angle;
    const rotatingSpeed = 270 * dt;

    this._direction -= Math.min(delta * 180 / Math.PI, rotatingSpeed);

    // Возвращаем массив сил/ускорений: если движок ожидает силы, умножьте на mass.
    // По умолчанию возвращаем ускорение (a = dv/dt).
    return {
      ...data,
      forces: [...(data?.forces ?? []), { x: aFinalX * mass, y: aFinalY * mass }]
    };
  }
}

registerClass(SelfguidedSubgridObject);
registerSteps(SelfguidedSubgridObject, 0, []);
registerLayers(SelfguidedSubgridObject, ['subgrid', 'subgrid-contact', 'subgrid-explosive', 'missile', 'dynamic'], 0);
