import { toCurrentCanvasSize } from "../../../../libs/canvas.js";
import { registerClass } from "../../../save&load/objectCollector.js";
import StandartObject from "../standartObject.js";

export default class CrosshairObject extends StandartObject {
  size = 100;

  constructor(x, y, size=100) {
    super(x, y);

    this.size = size;
  }

  draw(canvas, ctx, toCanvas, style) {
    super.draw(canvas, ctx, toCanvas, style);

    ctx.strokeStyle = style.getPropertyValue("--main");
    ctx.lineWidth = toCurrentCanvasSize(canvas, 20);

    const x = toCanvas(this._x);
    const y = toCanvas(this._y);

    const size = toCurrentCanvasSize(canvas, this.size);

    ctx.strokeRect(
      x - size / 2,
      y - size / 2,
      size,
      size
    );

    ctx.setLineDash([
      toCurrentCanvasSize(canvas, 100),
      toCurrentCanvasSize(canvas, 200)
    ]);
    ctx.beginPath();

    ctx.moveTo(x, 0);
    ctx.lineTo(x, y - size / 2);

    ctx.moveTo(x, y + size / 2);
    ctx.lineTo(x, canvas.height);

    ctx.moveTo(0, y);
    ctx.lineTo(x - size / 2, y);

    ctx.moveTo(x + size / 2, y);
    ctx.lineTo(canvas.width, y);

    ctx.stroke();
    ctx.setLineDash([]);
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

registerClass(CrosshairObject)