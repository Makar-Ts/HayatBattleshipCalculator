import { toRealDirection } from "../../../../libs/canvas.js";
import BasicStepObject from "./basicStepObject.js";
import { calc, point } from "../../../../libs/vector/vector.js";
import { registerClass } from "../../../save&load/objectCollector.js";

export default class BasicMovingObject extends BasicStepObject {
  velocity = point(0, 0);
  _direction = 0;

  constructor(x, y, direction, velocity) {
    super(x, y, 6);

    this.direction = direction || 0;
    if (velocity) this.applyForce(velocity);
  }

  applyForce(amount) {
    this.velocity = calc(
      () =>
        this.velocity +
        point(
          Math.sin((this._direction / 180) * Math.PI),
          Math.cos((this._direction / 180) * Math.PI)
        ) *
          amount
    );
  }

  get direction() {
    return toRealDirection(this._direction);
  }

  set direction(val) {
    if (val == 0) return (this._direction = 180);

    return (this._direction = -val + 180);
  }

  next() {
    super.next();

    this.moveTo(this._x + this.velocity.x * this._step, this._y + this.velocity.y * this._step);
  }

  getOverridableValues() {
    return [
      ...super.getOverridableValues(),
      // {
      //   name: "velocity_x",
      //   type: "number",
      //   current: () => Math.round(this.velocity.x * 1000) / 1000,
      //   func: (val) => {
      //     this.velocity.x = val;
      //   },
      // },
      // {
      //   name: "velocity_y",
      //   type: "number",
      //   current: () => Math.round(this.velocity.y * 1000) / 1000,
      //   func: (val) => {
      //     this.velocity.y = val;
      //   },
      // },
      {
        name: "direction",
        type: "number",
        current: () => Math.round(this.direction * 1000) / 1000,
        func: (val) => {
          this.direction = val;
        },
      },
      {
        name: "speed",
        type: "number",
        current: () => Math.round(this.velocity.length * 1000) / 1000,
        func: (val) => {
          this.velocity = point(() => point(
            Math.sin((this._direction / 180) * Math.PI),
            Math.cos((this._direction / 180) * Math.PI)
          ) * val);
        },
      },
    ];
  }


  save(realParent = null) {
    return {
      ...super.save(realParent),
      velocity: [this.velocity.x, this.velocity.y],
      direction: this._direction,
    };
  }

  load(data, loadChildren = false) {
    super.load(data, false);
    this.velocity = point(data.velocity[0], data.velocity[1]);
    this._direction = data.direction;

    loadChildren && super.loadChildren(data);
  }
}

registerClass(BasicMovingObject);
