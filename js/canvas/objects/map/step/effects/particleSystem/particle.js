import { toCurrentCanvasSize } from "../../../../../../../libs/canvas.js";
import { point } from "../../../../../../../libs/vector/point.js";


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


export class Particle {
  constructor(x, y, velocity, lifetime, direction, seq) {
    this.x = x ?? 0;
    this.y = y ?? 0;
    this.seq = seq;
    this.velocity = velocity || point(0, 0);
    this.maxLifetime = lifetime ?? 0;
    this.age = 0;
    this.color = "rgba(255,255,255,0.9)";
    this.size = [2, 2];
    this.direction = direction;
  }

  update(dt, color, size, velocity, direction) {
    this.age += dt;

    this.color = color;
    this.size = size;
    this.velocity = velocity;
    this.direction = direction;

    this.x += this.velocity.x * dt;
    this.y += this.velocity.y * dt;

    return this.age < this.maxLifetime;
  }

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