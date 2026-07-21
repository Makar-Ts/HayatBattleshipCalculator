import { toCurrentCanvasSize } from "../../../../../../libs/canvas.js";
import { lerp } from "../../../../../../libs/math.js";
import ENV from "../../../../../enviroments/env.js";
import { registerClass } from "../../../../../save&load/objectCollector.js";
import { registerLayers } from "../../../../layers/layersInfoCollector.js";
import { currentlySimulatedFrame } from "../../../../map.js";
import StandartObject from "../../../standartObject.js";


const COLOR_RANGE = [60, 80];
const NOISE_STEPS = 30;


export default class JammingShower extends StandartObject {
  static _textureCache = new Map();

  static _getTexture(color, step) {
    if (this._textureCache.has(`${color}_${step}`)) return this._textureCache.get(`${color}_${step}`);

    const SIZE = 128;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = SIZE;

    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;

    const center = SIZE / 2;

    const gradient = ctx.createRadialGradient(center, center, 0, center, center, center);

    const defaultAlpha = 1;

    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      const alpha = (1 - t * t) * defaultAlpha;

      gradient.addColorStop(t, `rgba(${color},${color},${color * 1.1},${alpha})`);
    }

    gradient.addColorStop(1, `rgba(${color},${color},${color * 1.1},${defaultAlpha})`);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(center, center, center, 0, Math.PI * 2);
    ctx.fill();

    // ---------- шум ----------
    const image = ctx.getImageData(0, 0, SIZE, SIZE);
    const data = image.data;

    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 140;

      data[i] += noise;
      data[i + 1] += noise;
      data[i + 2] += noise;
    }

    ctx.putImageData(image, 0, 0);

    this._textureCache.set(`${color}_${step}`, canvas);

    return canvas;
  }

  constructor() {
    super(0, 0);
  }

  _сolor = Math.round(lerp(COLOR_RANGE[0], COLOR_RANGE[1], Math.random()));
  draw(canvas, ctx, toCanvas, style) {
    super.draw(canvas, ctx, toCanvas, style);

    if (!this.parent) return;

    const jamming = this.parent.currentCharacteristics.constant.body.jamming?.strength;
    const density = Math.max(this.parent.currentCharacteristics.constant.body.jamming?.density ?? 1, 0.01);
    if (jamming <= 0) return;

    const innerRadius = this.parent.size;
    const outerRadius = jamming * 100 / density;

    if (outerRadius <= innerRadius) return;

    const { x, y } = toCanvas({
      x: this.parent._x,
      y: this.parent._y,
    });

    const outer = toCanvas(outerRadius);

    const texture = JammingShower._getTexture(this._сolor, currentlySimulatedFrame % NOISE_STEPS);

    const size = outer * 2;

    ctx.globalAlpha = jamming / 50;

    ctx.drawImage(
      texture,
      x - outer,
      y - outer,
      size,
      size
    );

    ctx.globalAlpha = 1;
  }
}

registerClass(JammingShower);
registerLayers(JammingShower, ["hud", "jamming"], -1);


for (let color = COLOR_RANGE[0]; color <= COLOR_RANGE[1]; color++) {
  for (let step = 0; step < NOISE_STEPS; step++) {
    JammingShower._getTexture(color, step);
  }
}