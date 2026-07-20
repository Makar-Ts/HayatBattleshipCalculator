import { toCurrentCanvasSize } from "../../../../../../libs/canvas.js";
import { lerp } from "../../../../../../libs/math.js";
import ENV from "../../../../../enviroments/env.js";
import { registerClass } from "../../../../../save&load/objectCollector.js";
import { registerLayers } from "../../../../layers/layersInfoCollector.js";
import { currentlySimulatedFrame } from "../../../../map.js";
import StandartObject from "../../../standartObject.js";

export default class JammingShower extends StandartObject {
  static _noisePattern = null;
  static _lastUpdate = -1;

  static _generateNoisePattern(ctx, size = 64, blockSize = 1) {
    // Итоговый размер паттерна (в пикселях холста)
    const patternSize = size * blockSize;

    const offscreen = document.createElement('canvas');
    offscreen.width = offscreen.height = patternSize;
    const offCtx = offscreen.getContext('2d');

    const imageData = offCtx.createImageData(patternSize, patternSize);
    const data = imageData.data;

    // Генерируем случайные значения для каждого блока (i, j)
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            const gray = Math.random() * 255;
            const alpha = Math.random() * 200 + 55;

            // Заполняем блок размером blockSize × blockSize одним цветом
            for (let dy = 0; dy < blockSize; dy++) {
                for (let dx = 0; dx < blockSize; dx++) {
                    const pixelIndex = (
                        (i * blockSize + dy) * patternSize +
                        (j * blockSize + dx)
                    ) * 4;

                    data[pixelIndex]     = gray;
                    data[pixelIndex + 1] = gray;
                    data[pixelIndex + 2] = gray;
                    data[pixelIndex + 3] = alpha;
                }
            }
        }
    }

    offCtx.putImageData(imageData, 0, 0);
    return ctx.createPattern(offscreen, 'repeat');
  }


  constructor() {
    super(0, 0);
  }

  _сolor = lerp(60, 100, Math.random());
  draw(canvas, ctx, toCanvas, style) {
    super.draw(canvas, ctx, toCanvas, style);

    if (!this.parent) return;

    const jamming = this.parent.currentCharacteristics?.constant.body.jamming ?? 0;
    if (jamming <= 0) return;

    const innerRadius = this.parent.size;
    const outerRadius = jamming * 100;

    if (outerRadius <= innerRadius) return;

    const { x, y } = toCanvas({
      x: this.parent._x,
      y: this.parent._y,
    });

    const inner = toCanvas(innerRadius);
    const outer = toCanvas(outerRadius);

    const gradient = ctx.createRadialGradient(
      x, y, inner,
      x, y, outer
    );

    const defaultAlpha = jamming / 500;
    for (let i = 0; i <= 32; i++) {
      const t = i / 32;
      const alpha = 1 - t * t;

      gradient.addColorStop(
        t,
        `rgba(${this._сolor}, ${this._сolor}, ${this._сolor * 1.2}, ${alpha * defaultAlpha})`
      );
    }

    gradient.addColorStop(1, `rgba(${this._сolor},${this._сolor},${this._сolor * 1.2},${defaultAlpha})`);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, outer, 0, Math.PI * 2);
    ctx.fill();

    // if (JammingShower._lastUpdate !== currentlySimulatedFrame) {
    //   JammingShower._noisePattern = JammingShower._generateNoisePattern(ctx, 4, 16);
    //   JammingShower._lastUpdate = currentlySimulatedFrame;
    // }
    // if (JammingShower._noisePattern) {
    //   ctx.save();
    //   ctx.globalCompositeOperation = 'multiply'; // или 'multiply', 'screen'
    //   ctx.fillStyle = JammingShower._noisePattern;
    //   ctx.globalAlpha = defaultAlpha;
    //   ctx.beginPath();
    //   ctx.arc(x, y, outer, 0, Math.PI * 2);
    //   ctx.fill();
    //   ctx.restore();
    // }
  }
}

registerClass(JammingShower);
registerLayers(JammingShower, ["hud", "jamming"], 0);