import { settingsObjectToCanvasSize, toCurrentCanvasSize } from "../../../../../../libs/canvas.js";
import { clamp } from "../../../../../../libs/clamp.js";
import { registerClass } from "../../../../../save&load/objectCollector.js";
import StandartObject from "../../../standartObject.js";

export default class ShipStatsHUD extends StandartObject {
  distance = -300;
  bar = {
    height: 250,
    width: 40,
    padding: 7,
    border: 7,
    gap: 30,
  };

  constructor(distance = -300, bar = {}) {
    super(0, 0);

    this.distance = distance;
    this.bar = { ...this.bar, ...bar };
  }

  drawBar(canvas, ctx, toCanvas, style, x, y, cur, max, rectColor) {
    const filled = cur / max;
    const overflow = Math.max(filled - 1, 0)

    const bar = settingsObjectToCanvasSize(canvas, this.bar)

    const barHeight = bar.height + bar.height * overflow;

    ctx.fillStyle = style.getPropertyValue("--hud");
    ctx.fillRect(
      x - bar.border,
      y - barHeight / 2 - bar.border,
      bar.width + bar.border * 2,
      barHeight + bar.border * 2
    );

    ctx.clearRect(
      x - bar.border,
      y - barHeight / 2,
      bar.width + bar.border * 2,
      barHeight
    );

    ctx.fillStyle = rectColor;
    const height = (bar.height) * filled - bar.padding * 2;
    ctx.fillRect(
      x + bar.padding,
      y + (barHeight / 2) - bar.padding - height,
      bar.width - bar.padding * 2,
      height
    );

    if (overflow > 0) {
      ctx.fillStyle = style.getPropertyValue("--accent");
      ctx.fillRect(
        x,
        y - bar.height / 2 - bar.border,
        bar.width,
        bar.border
      );
      ctx.fillRect(
        x,
        y + bar.height / 2,
        bar.width,
        bar.border
      );
    }

    ctx.fillStyle = rectColor;
    ctx.save();
    ctx.font = "bold "+(bar.width * 2 - bar.border * 2) + "px Consolas";
    ctx.textBaseline = "middle";
    
    ctx.translate(x + bar.border * 2, y + (barHeight / 2));
    ctx.rotate(Math.PI/2);
    ctx.textAlign = "left";
    ctx.fillText(""+(Math.round(cur * 100)/100), bar.padding + bar.border, 0);
    ctx.textAlign = "right";
    ctx.fillText(""+(Math.round(max * 100)/100), - barHeight - bar.padding - bar.border, 0);
    ctx.restore();
  }

  draw(canvas, ctx, toCanvas, style) {
    super.draw(canvas, ctx, toCanvas, style);

    if (!this.parent) return;

    const bar = settingsObjectToCanvasSize(canvas, this.bar)
    const distance = toCurrentCanvasSize(canvas, this.distance)

    ctx.strokeStyle = style.getPropertyValue("--hud");
    ctx.lineWidth = toCurrentCanvasSize(canvas, 7);
    ctx.fillStyle = style.getPropertyValue("--hud");

    const par_x = toCanvas(this.parent._x);
    const par_y = toCanvas(this.parent._y);
    const c = this.parent.currentCharacteristics;

    this.drawBar(
      canvas,
      ctx,
      toCanvas,
      style,
      par_x + distance - (bar.width + bar.gap) * 0,
      par_y,
      c.dynamic.temperature * 100,
      c.constant.temperature * 100,
      style.getPropertyValue("--hud-temperature")
    );

    this.drawBar(
      canvas,
      ctx,
      toCanvas,
      style,
      par_x + distance - (bar.width + bar.gap) * 1,
      par_y,
      c.dynamic.charge,
      c.constant.capacitor.charge,
      style.getPropertyValue("--hud-power")
    );

    this.drawBar(
      canvas,
      ctx,
      toCanvas,
      style,
      par_x + distance - (bar.width + bar.gap) * 3,
      par_y,
      c.dynamic.hp.hull,
      c.constant.hp.hull,
      style.getPropertyValue("--hud-hull")
    );

    this.drawBar(
      canvas,
      ctx,
      toCanvas,
      style,
      par_x + distance - (bar.width + bar.gap) * 4,
      par_y,
      c.dynamic.hp.armor,
      c.constant.hp.armor,
      style.getPropertyValue("--hud-armor")
    );

    this.drawBar(
      canvas,
      ctx,
      toCanvas,
      style,
      par_x + distance - (bar.width + bar.gap) * 5,
      par_y,
      c.dynamic.hp.barrier,
      c.constant.hp.barrier,
      style.getPropertyValue("--hud-barrier")
    );
  }


  getOverridableValues() {
    return [
      ...super.getOverridableValues(),
      {
        name: "distance",
        type: "number",
        current: () => this.distance,
        func: (val) => {
          this.distance = +val;
        },
      },
      {
        name: "bar-height",
        type: "number",
        current: () => this.bar.height,
        func: (val) => {
          this.bar.height = +val;
        },
      },
      {
        name: "bar-width",
        type: "number",
        current: () => this.bar.width,
        func: (val) => {
          this.bar.width = +val;
        },
      },
      {
        name: "bar-padding",
        type: "number",
        current: () => this.bar.padding,
        func: (val) => {
          this.bar.padding = +val;
        },
      },
      {
        name: "bar-border",
        type: "number",
        current: () => this.bar.border,
        func: (val) => {
          this.bar.border = +val;
        },
      },
      {
        name: "bar-gap",
        type: "number",
        current: () => this.bar.gap,
        func: (val) => {
          this.bar.gap = +val;
        },
    },
    ];
  }


  save(realParent = null) {
    return {
      ...super.save(realParent),
      distance: this.distance,
      bar: this.bar,
    };
  }

  load(data, loadChildren = false) {
    super.load(data, false);
    this.distance = data.distance;
    this.bar = data.bar;

    loadChildren && super.loadChildren(data);
  }
}

registerClass(ShipStatsHUD);
