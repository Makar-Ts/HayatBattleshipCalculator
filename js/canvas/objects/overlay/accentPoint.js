import { toCurrentCanvasSize } from "../../../../libs/canvas.js";
import { point } from "../../../../libs/vector/vector.js";
import { registerClass } from "../../../save&load/objectCollector.js";
import StandartObject from "../standartObject.js";

export default class AccentPoint extends StandartObject {
  radius = 200;
  crossSize = 20;
  oX = this._x;
  oY = this._y;

  constructor(x, y, radius=200, crossSize=20) {
    super(x, y);

    this.radius = radius;
    this.crossSize = crossSize;
  }

  draw(canvas, ctx, toCanvas, style) {
    super.draw(canvas, ctx, toCanvas, style);

    ctx.strokeStyle = style.getPropertyValue("--accent");
    ctx.lineWidth = toCurrentCanvasSize(canvas, 20);

    const x = toCanvas(this._x);
    const y = toCanvas(this._y);
    const radius = toCurrentCanvasSize(canvas, this.radius)
    const crossSize = toCurrentCanvasSize(canvas, this.crossSize)

    ctx.beginPath();
    ctx.arc(x, y, radius, 0.05 * Math.PI, 0.45 * Math.PI, false);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y, radius, 0.55 * Math.PI, 0.95 * Math.PI, false);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y, radius, 1.05 * Math.PI, 1.45 * Math.PI, false);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y, radius, 1.55 * Math.PI, 1.95 * Math.PI, false);
    ctx.stroke();

    const dir = point(this._x - this.oX, this._y - this.oY);
    const dir_norm = point(() => dir / dir.length);

    ctx.setLineDash([
      toCurrentCanvasSize(canvas, 140), 
      toCurrentCanvasSize(canvas, 280)
    ])
    ctx.beginPath();
    ctx.moveTo(toCanvas(this.oX), toCanvas(this.oY));
    ctx.lineTo(
      x - dir_norm.x * radius,
      y - dir_norm.y * radius
    )
    ctx.stroke()
    ctx.setLineDash([])

    ctx.lineWidth = toCurrentCanvasSize(canvas, 5);
    ctx.beginPath();
    ctx.moveTo(x - crossSize, y);
    ctx.lineTo(x + crossSize, y);
    ctx.moveTo(x, y - crossSize);
    ctx.lineTo(x, y + crossSize);
    ctx.stroke();
  }

  moveTo(x, y, oX, oY) {
    super.moveTo(x, y);

    this.oX = oX || x;
    this.oY = oY || y;
  }

  save(realParent=null) {
    return {
      ...super.save(realParent),
      size: this.size,
    }
  }

  load(data, loadChildren=false) {
    super.load(data, loadChildren);
    this.size = data.size;
  } 
}

registerClass(AccentPoint);