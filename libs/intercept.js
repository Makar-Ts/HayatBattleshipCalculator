import { point } from "./vector/point.js";

export function predictInterceptTime({
  shooterPos,
  targetPos,
  targetVel,
  targetAcc,
  bulletSpeed,
  maxTime = 30,
  iterations = 25,
}) {
  let low = 0;
  let high = maxTime;

  for (let i = 0; i < iterations; i++) {
    const t = (low + high) * 0.5;

    const tx = targetPos.x + targetVel.x * t + targetAcc.x * t * t * 0.5;
    const ty = targetPos.y + targetVel.y * t + targetAcc.y * t * t * 0.5;

    const dx = tx - shooterPos.x;
    const dy = ty - shooterPos.y;

    const distance = Math.hypot(dx, dy);

    const bulletTime = distance / bulletSpeed;

    if (bulletTime > t) {
      low = t;
    } else {
      high = t;
    }
  }

  return high;
}

export function getPositionFromTime({
  t,
  targetPos,
  targetVel,
  targetAcc,
}) {
  return point(
    targetPos.x + targetVel.x * t + targetAcc.x * t * t * 0.5,
    targetPos.y + targetVel.y * t + targetAcc.y * t * t * 0.5,
  )
}