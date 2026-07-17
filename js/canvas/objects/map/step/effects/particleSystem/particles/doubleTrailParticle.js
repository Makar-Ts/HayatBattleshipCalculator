import { toCurrentCanvasSize } from "../../../../../../../../libs/canvas.js";
import { Particle } from "./particle.js";

export class DoubleTrailParticle extends Particle {
  draw(canvas, ctx, toCanvas, style) {
    const pos = toCanvas({ x: this.x, y: this.y });
    const x = pos.x;
    const y = pos.y;
    const width = toCanvas(this.size[0]);
    const height = toCanvas(this.size[1]);
    const lineWidth = toCurrentCanvasSize(canvas, 20);

    const radians = (this.direction * Math.PI) / 180;

    ctx.save();
    ctx.fillStyle = this.color;
    ctx.translate(x, y);
    ctx.rotate(radians);
    
    ctx.fillRect(-width, -height/2, lineWidth, height);
    ctx.fillRect(width - lineWidth, -height/2, lineWidth, height);

    ctx.restore();
  }
}