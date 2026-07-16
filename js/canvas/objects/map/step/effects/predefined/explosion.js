import { registerEffect } from "../../../../../map.js";
import { ParticleSystem } from "../particleSystem/particleSystem.js";
import { Bezier } from "../../../../../../../libs/beizer/bezier.js";
import { point } from "../../../../../../../libs/vector/point.js";
import { rgba } from "../../../../../../../libs/color.js";
import { HexParticle } from "../particleSystem/particles/hexParticle.js";


export const ExplosionColors = {
  // Кинетический (осколки, металл, пыль)
  kinetic: {
    primary: [255, 245, 220],   // бело-желтые искры
    secondary: [160, 160, 160], // сталь/пыль
  },

  // Обычный ВВ
  high_explosive: {
    primary: [255, 235, 120],   // яркое ядро
    secondary: [255, 90, 20],   // оранжево-красный огонь
  },

  // Электромагнитный
  electro_magnetic: {
    primary: [80, 255, 255],    // яркий циан
    secondary: [70, 120, 255],  // синий
  },

  // Термобарический / тепловой
  thermal: {
    primary: [255, 255, 230],   // почти белый центр
    secondary: [255, 40, 10],   // раскаленный красный
  },
};


export function createExplosion(
    x,
    y,
    startVelocity = point(0, 0),
    power = 100,
    color1 = [255, 220, 120],
    color2 = [255, 80, 20],
) {
  // ---------------- SMOKE ----------------

  const smokeLifetime = 1.8;

  registerEffect(
    new ParticleSystem({
      x,
      y,

      velocity: startVelocity,
      simulateVelocity: true,

      particle: HexParticle,
      frequency: 0.003,
      emitTime: 0.15,
      lifetime: smokeLifetime,

      startVelocityFunc: () => {
        const a = Math.random() * Math.PI * 2;
        const s = power * 0.35 * Math.random();

        return point(Math.cos(a) * s, Math.sin(a) * s);
      },
      startRotationFunc: () => Math.random() * 360,

      colorFunc: (p) => {
        const t = p.age / smokeLifetime;
        return `rgba(70,70,70,${0.35 * (1 - t)})`;
      },

      sizeFunc: (p) => {
        const t = p.age / smokeLifetime;
        const s = power * (0.2 + t * 0.9);
        return [s, s];
      },

      velFunc: (p) => point(p.velocity.x * 0.992, p.velocity.y * 0.992),
    }),
  );

  // ---------------- FIREBALL ----------------

  const fireLifetime = 0.35;
  const fireAlpha = new Bezier(0, 1, 0.2, 1, 1, 0);

  registerEffect(
    new ParticleSystem({
      x,
      y,

      velocity: startVelocity,
      simulateVelocity: true,

      particle: HexParticle,
      frequency: 0.0015,
      emitTime: 0.05,
      lifetime: fireLifetime,

      startOffsetFunc: () => point(0, 0),

      startVelocityFunc: () => {
        const a = Math.random() * Math.PI * 2;
        const s = (0.4 + Math.random() * 0.6) * power * 2;

        return point(Math.cos(a) * s, Math.sin(a) * s);
      },

      startRotationFunc: () => Math.random() * 360,

      colorFunc: (p) => {
        const t = p.age / fireLifetime;
        const alpha = fireAlpha.compute(t).y;

        return rgba(color2, alpha);
      },

      sizeFunc: (p) => {
        const t = p.age / fireLifetime;
        const s = (1 - t * 0.7) * power * 0.35;
        return [s, s];
      },

      velFunc: (p) => point(p.velocity.x * 0.985, p.velocity.y * 0.985),

      rotFunc: (p) => p.rotation,
    }),
  );

  // ---------------- SPARKS ----------------

  const sparkLifetime = 0.8;

  registerEffect(
    new ParticleSystem({
      x,
      y,

      velocity: startVelocity,
      simulateVelocity: true,

      frequency: 0.0003,
      emitTime: 0.02,
      lifetime: sparkLifetime,

      startVelocityFunc: () => {
        const a = Math.random() * Math.PI * 2;
        const s = Math.sqrt(power * 6) * (2 + Math.random()) * 10;

        return point(Math.cos(a) * s, Math.sin(a) * s);
      },
      startRotationFunc: () => Math.random() * 360,

      colorFunc: (p) => {
        const a = 1 - p.age / sparkLifetime;
        return rgba(color1, a);
      },

      sizeFunc: (p) => {
        const s = (1 - p.age / sparkLifetime) * Math.sqrt(power * 6) / 2;
        return [s, s * 5];
      },

      velFunc: (p) => point(p.velocity.x * 0.995, p.velocity.y * 0.995),
    }),
  );

  // ---------------- SHOCKWAVE ----------------

  const waveLifetime = 0.25;

  registerEffect(
    new ParticleSystem({
      x,
      y,

      velocity: startVelocity,

      particle: HexParticle,
      frequency: 1,
      lifetime: waveLifetime,
      systemLifetime: waveLifetime,
      simulateVelocity: true,

      startVelocityFunc: () => point(0, 0),
      startRotationFunc: () => Math.random() * 360,

      colorFunc: (p) => {
        const a = 1 - p.age / waveLifetime;
        return `rgba(255,255,255,${a * 0.35})`;
      },

      sizeFunc: (p) => {
        const t = p.age / waveLifetime;
        const r = power * (0.5 + t * 2.5);
        return [r, r];
      },

      velFunc: (p) => p.velocity,
    }),
  );
}
