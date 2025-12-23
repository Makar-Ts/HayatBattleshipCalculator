import { toCurrentCanvasSize } from "../../../../../libs/canvas.js";
import { point } from "../../../../../libs/vector/point.js";
import { registerClass } from "../../../../save&load/objectCollector.js";
import { registerLayers } from "../../../layers/layersInfoCollector.js";
import StandartObject from "../../standartObject.js";

export default class VectorHud extends StandartObject {
  settings = {
    directionLength: 500,
    nextStepPointSize: 20,
    showRDirection: true,
    showVDirection: true,
    showNextSteps: true,
  };

  constructor(settings = {}) {
    super(0, 0);

    this.settings = { ...this.settings, ...settings };
  }

  draw(canvas, ctx, toCanvas, style) {
    super.draw(canvas, ctx, toCanvas, style);

    if (!this.parent || !("_direction" in this.parent && "velocity" in this.parent)) return;

    ctx.lineWidth = toCurrentCanvasSize(canvas, 20);

    const { x, y } = toCanvas({ x: this.parent._x, y: this.parent._y });

    if (this.settings.showRDirection) {
      ctx.strokeStyle = style.getPropertyValue("--direction");
      const direction = point(
        Math.sin((this.parent._direction / 180) * Math.PI),
        Math.cos((this.parent._direction / 180) * Math.PI)
      );

      const directionLength = toCurrentCanvasSize(canvas, this.settings.directionLength)

      ctx.setLineDash([directionLength / 10, directionLength / 10]);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(
        x + direction.x * directionLength,
        y + direction.y * directionLength
      );
      ctx.stroke();
    }

    const vl = toCanvas(this.parent.velocity.length),
          vx = toCanvas(this.parent.velocity.x),
          vy = toCanvas(this.parent.velocity.y);

    if (this.parent.velocity.length >= 1 && this.settings.showNextSteps) {
      const rectSize = toCurrentCanvasSize(canvas, this.settings.nextStepPointSize)

      ctx.setLineDash([
        Math.abs((vl * this.parent._step) / 16),
        Math.abs((vl * this.parent._step) / 8),
      ]);
      ctx.lineWidth = toCurrentCanvasSize(canvas, 7);
      ctx.strokeStyle = style.getPropertyValue("--direction");
      ctx.fillStyle = style.getPropertyValue("--direction");
      ctx.beginPath();
      ctx.moveTo(x, y);

      let curx = x + vx * this.parent._step,
        cury = y + vy * this.parent._step;

      ctx.lineTo(curx, cury);
      ctx.fillRect(curx - rectSize/2, cury - rectSize/2, rectSize, rectSize);

      let step = 1;

      while (curx > 0 && curx < canvas.width && cury > 0 && cury < canvas.height) {
        step++;

        curx = x + vx * this.parent._step * step;
        cury = y + vy * this.parent._step * step;

        ctx.lineTo(curx, cury);
        ctx.fillRect(curx - rectSize/2, cury - rectSize/2, rectSize, rectSize);
      }
      ctx.stroke();
    }

    ctx.setLineDash([]);

    if (this.settings.showVDirection) {
      ctx.lineWidth = toCurrentCanvasSize(canvas, 20);
      ctx.strokeStyle = style.getPropertyValue("--velocity");

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(
        x + vx * this.parent._step,
        y + vy * this.parent._step
      );
      ctx.stroke();
    }
  }


  getOverridableValues() {
    return [
      ...super.getOverridableValues(),
      {
        name: "settings-directionLength",
        type: "number",
        current: () => this.settings.directionLength,
        func: (val) => {
          this.settings.directionLength = +val;
        },
      },
      {
        name: "settings-nextStepPointSize",
        type: "number",
        current: () => this.settings.nextStepPointSize,
        func: (val) => {
          this.settings.nextStepPointSize = +val;
        },
      },
      {
        name: "settings-showRDirection",
        type: "checkbox",
        current: () => this.settings.showRDirection,
        func: (val) => {
          this.settings.showRDirection = val;
        },
      },
      {
        name: "settings-showVDirection",
        type: "checkbox",
        current: () => this.settings.showVDirection,
        func: (val) => {
          this.settings.showVDirection = val;
        },
      },
      {
        name: "settings-showNextSteps",
        type: "checkbox",
        current: () => this.settings.showNextSteps,
        func: (val) => {
          this.settings.showNextSteps = val;
        },
      },
    ];
  }


  save(realParent=null) {
    return {
      ...super.save(realParent),
      settings: this.settings,
    }
  }

  load(data, loadChildren=false) {
    super.load(data, false);
    this.settings = data.settings;

    loadChildren && super.loadChildren(data);
  } 
}

registerClass(VectorHud);
registerLayers(VectorHud, ['hud', 'vector'], 0);
