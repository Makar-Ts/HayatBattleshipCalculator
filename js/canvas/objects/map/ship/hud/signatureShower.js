import { toCurrentCanvasSize } from "../../../../../../libs/canvas.js";
import { clamp } from "../../../../../../libs/clamp.js";
import { registerClass } from "../../../../../save&load/objectCollector.js";
import StandartObject from "../../../standartObject.js";

export default class SignatureShower extends StandartObject {
  lineWidth = 20;

  constructor(lineWidth = 20) {
    super(0, 0);

    this.lineWidth = lineWidth;
  }

  draw(canvas, ctx, toCanvas, style) {
    super.draw(canvas, ctx, toCanvas, style);

    if (!this.parent || !this.parent.currentCharacteristics) return;

    ctx.strokeStyle = style.getPropertyValue("--main");
    ctx.lineWidth = toCurrentCanvasSize(canvas, 20);

    const s = this.parent.currentCharacteristics.constant.body.signature;

    ctx.setLineDash([
      toCurrentCanvasSize(canvas, clamp(s / 20, 5, 60)), 
      toCurrentCanvasSize(canvas, clamp(s / 20, 5, 150))
    ]);
    ctx.beginPath();
    ctx.arc(
      toCanvas(this.parent._x),
      toCanvas(this.parent._y),
      toCanvas(this.parent.currentCharacteristics.constant.body.signature),
      0,
      Math.PI * 2
    );
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([])
  }

  getOverridableValues() {
    return [
      ...super.getOverridableValues(),
      {
        name: "lineWidth",
        type: "number",
        current: () => this.lineWidth,
        func: (val) => {
          this.lineWidth = +val;
        },
      },
    ];
  }


  save(realParent = null) {
    return {
      ...super.save(realParent),
      lineWidth: this.lineWidth,
    };
  }

  load(data, loadChildren = false) {
    super.load(data, false);
    this.lineWidth = data.lineWidth;

    loadChildren && super.loadChildren(data);
  }
}

registerClass(SignatureShower);