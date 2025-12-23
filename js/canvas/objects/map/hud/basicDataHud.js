import StandartObject from "../../standartObject.js";
import { saveFunction } from "../../../../save&load/save.js";
import { loadFunction } from "../../../../save&load/load.js";
import { registerClass } from "../../../../save&load/objectCollector.js";
import { toCurrentCanvasSize } from "../../../../../libs/canvas.js";
import { registerLayers } from "../../../layers/layersInfoCollector.js";

export default class BasicDataHud extends StandartObject {
  data = [];
  length = 300;
  padding = 100;
  direction = 45;

  constructor(data, length, padding, direction) {
    super()

    this.data = data || [];
    this.length = length || 400;
    this.padding = padding || 150;
    this.direction = direction || 60;
  }

  draw(canvas, ctx, toCanvas, style) {
    super.draw(canvas, ctx, toCanvas, style);

    if (!this.parent) return;

    const length = toCurrentCanvasSize(canvas, 300);
    const padding = toCurrentCanvasSize(canvas, 100);

    ctx.strokeStyle = style.getPropertyValue("--hud");
    ctx.lineWidth = toCurrentCanvasSize(canvas, 7);

    ctx.font = toCurrentCanvasSize(canvas, 70) + "px Consolas";
    ctx.textAlign = "left";
    ctx.textBaseline = "hanging";
    ctx.fillStyle = style.getPropertyValue("--hud");

    let text = []
    let height = 0
    for (let i of this.data) {
      text.push(i.func(this))
      height += toCurrentCanvasSize(canvas, 80)
    }

    const x_offset = Math.sin((this.direction / 180) * Math.PI);
    const y_offset = Math.cos((this.direction / 180) * Math.PI);

    const par_x = toCanvas({ x: this.parent._x })
    const par_y = toCanvas({ y: this.parent._y })

    ctx.beginPath();

    ctx.moveTo(par_x + x_offset * padding, par_y + y_offset * padding);
    ctx.lineTo(
      par_x + x_offset * padding + x_offset * length,
      par_y + y_offset * padding + y_offset * length
    );
    ctx.moveTo(
      par_x + x_offset * padding + x_offset * length + x_offset * padding,
      par_y + y_offset * padding + y_offset * length + y_offset * padding - height/2
    );
    ctx.lineTo(
      par_x + x_offset * padding + x_offset * length + x_offset * padding,
      par_y + y_offset * padding + y_offset * length + y_offset * padding + height/2
    );

    ctx.stroke()

    let y = par_y + y_offset * padding + y_offset * length + y_offset * padding - height/2;
    let x = par_x + x_offset * padding + x_offset * length + x_offset * padding + toCurrentCanvasSize(canvas, 50);
    for (let [i, str] of Object.entries(text)) { 
      ctx.fillText(str, x, y + toCurrentCanvasSize(canvas, 80) * Number(i))
    }
  }


  getOverridableValues() {
    return [
      ...super.getOverridableValues(),
      {
        name: "length",
        type: "number",
        current: () => this.length,
        func: (val) => {
          this.length = +val;
        },
      },
      {
        name: "padding",
        type: "number",
        current: () => this.padding,
        func: (val) => {
          this.padding = +val;
        },
      },
      {
        name: "direction",
        type: "number",
        current: () => this.direction,
        func: (val) => {
          this.direction = +val;
        },
      },
    ];
  }


  save(realParent=null) {
    return {
      ...super.save(realParent),
      data: this.data.map(v => ({ func: saveFunction(v.func) })),
      length: this.length,
      padding: this.padding,
      direction: this.direction,
    }
  }

  load(data, loadChildren=false) {
    super.load(data, false);
    this.data = data.data.map(v => ({ func: loadFunction(v.func) }))
    this.length = data.length;
    this.padding = data.padding;
    this.direction = data.direction;

    loadChildren && super.loadChildren(data);
  } 
}

registerClass(BasicDataHud)
registerLayers(BasicDataHud, ['hud', 'basic-hud'], 3);
