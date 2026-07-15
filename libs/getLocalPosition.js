import { point } from "./vector/point.js";

export function getLocalPosition(object, x, y) {
  const dirRad = ((object._direction ?? object.direction ?? 0) / 180) * Math.PI;

  return point(
    (object._x ?? object.x) + x * Math.cos(-dirRad) - y * Math.sin(-dirRad),
    (object._y ?? object.y) + x * Math.sin(-dirRad) + y * Math.cos(-dirRad)
  );
}

export function getLocalVelocity(object, x, y) {
  const dirRad = ((typeof object === "number" ? object : (object._direction ?? object.direction ?? 0)) / 180) * Math.PI;

  return point(
    x * Math.cos(-dirRad) - y * Math.sin(-dirRad),
    x * Math.sin(-dirRad) + y * Math.cos(-dirRad)
  );
}