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

    const s =
      this.parent.currentCharacteristics.constant.body.signature > 0
        ? this.parent.currentCharacteristics.constant.body.signature
        : 1;
    const length = 2 * Math.PI * (s / 2)

    ctx.setLineDash([
      toCurrentCanvasSize(canvas, clamp(length / 20, 5, 60)),
      toCurrentCanvasSize(canvas, clamp(length / 20, 5, 150)),
    ]);
    ctx.beginPath();
    ctx.arc(toCanvas(this.parent._x), toCanvas(this.parent._y), toCanvas(s), 0, Math.PI * 2);
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);

    if (this.parent.currentCharacteristics.constant.body.signature != this.parent.size) {
      ctx.strokeStyle = style.getPropertyValue("--hud-hull");
      ctx.lineWidth = toCurrentCanvasSize(canvas, 20);

      const sb =
        this.parent.size > 0
          ? this.parent.size
          : 1;
      const lengthb = 2 * Math.PI * (sb / 2)

      ctx.setLineDash([
        toCurrentCanvasSize(canvas, clamp(lengthb / 20, 5, 60)),
        toCurrentCanvasSize(canvas, clamp(lengthb / 20, 5, 150)),
      ]);
      ctx.beginPath();
      ctx.arc(toCanvas(this.parent._x), toCanvas(this.parent._y), toCanvas(sb), 0, Math.PI * 2);
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);
    }
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
