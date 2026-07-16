import { toCurrentCanvasSize } from "../../../../../../../../libs/canvas.js";
import { point } from "../../../../../../../../libs/vector/point.js";
import { Particle } from "./particle.js";


function drawHexagon(ctx, centerX, centerY, radius) {
  ctx.beginPath();
  
  for (let i = 0; i < 6; i++) {
    // Calculate the angle for each vertex (60 degrees or PI/3 apart)
    // Adding Math.PI / 6 rotates it to have a flat top (Pointy-topped vs Flat-topped)
    let angle = (Math.PI / 3) * i; 
    
    let x = centerX + radius * Math.cos(angle);
    let y = centerY + radius * Math.sin(angle);
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  
  ctx.closePath(); // Closes the path by connecting the last point to the first
  
  ctx.fill();
}


export class HexParticle extends Particle {
  draw(canvas, ctx, toCanvas, style) {
    const pos = toCanvas({ x: this.x, y: this.y });
    const x = pos.x;
    const y = pos.y;
    const width = toCanvas(this.size[0]);
    const height = toCanvas(this.size[1]);

    const radians = (this.direction * Math.PI) / 180;

    ctx.save();
    ctx.fillStyle = this.color;
    ctx.translate(x, y);
    ctx.rotate(radians);
    drawHexagon(ctx, 0, 0, Math.max(width, height));
    ctx.restore();
  }
}