import { settingsObjectToCanvasSize, toCurrentCanvasSize } from "../../../../libs/canvas.js";
import { registerClass } from "../../../save&load/objectCollector.js";
import StandartObject from "../standartObject.js";

export default class TargetPoint extends StandartObject {
  settings = {
    radius: {
      inner: 100,
      outer: 200,
    },
    lineWidth: 20
  }

  constructor(x=0, y=0, settings={}) {
    super(x, y);

    this.settings = {...this.settings, ...settings};
  }

  draw(canvas, ctx, toCanvas, style) {
    super.draw(canvas, ctx, toCanvas, style);

    ctx.strokeStyle = style.getPropertyValue("--target");
    ctx.lineWidth = toCurrentCanvasSize(canvas, this.lineWidth);

    const settings = settingsObjectToCanvasSize(canvas, this.settings);
    const x = toCanvas(this._x);
    const y = toCanvas(this._y);
    
    ctx.beginPath();
    ctx.moveTo(x, y+settings.radius.inner);
    ctx.lineTo(x, y+settings.radius.outer);

    ctx.moveTo(x, y-settings.radius.inner);
    ctx.lineTo(x, y-settings.radius.outer);

    ctx.moveTo(x+settings.radius.inner, y);
    ctx.lineTo(x+settings.radius.outer, y);

    ctx.moveTo(x-settings.radius.inner, y);
    ctx.lineTo(x-settings.radius.outer, y);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(x, y, (settings.radius.inner + settings.radius.outer) / 2, 0, Math.PI * 2);
    ctx.stroke();
  }
}

registerClass(TargetPoint)