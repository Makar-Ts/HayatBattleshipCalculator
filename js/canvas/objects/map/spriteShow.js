import { toCurrentCanvasSize } from "../../../../libs/canvas.js";
import { registerClass } from "../../../save&load/objectCollector.js";
import StandartObject from "../standartObject.js";

export default class SpriteShower extends StandartObject {
  image = new Image();
  size = 200;
  isloaded = false;
  color = '#ffffff';

  constructor(src="", color='#ffffff', size=200) {
    super(0, 0);

    this.image.onload = () => {
      this.isloaded = true;
    }
    this.image.onerror = (...args) => {
      console.log(args);

      this.isloaded = false;
    }
    this.image.onabort = (...args) => {
      console.log(args);

      this.isloaded = false;
    }
    this.image.crossOrigin = "Anonymous";
    this.image.src = src;

    this.color = color;
    this.size = size;
  }

  draw(canvas, ctx, toCanvas, style) {
    super.draw(canvas, ctx, toCanvas, style);
  
    if (!this.isloaded || !this.parent) return;

    if (!this.tintedImage || this.lastImage !== this.image) {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = this.image.width;
      tempCanvas.height = this.image.height;
      
      const tempCtx = tempCanvas.getContext('2d');
      
      tempCtx.drawImage(this.image, 0, 0);
      
      tempCtx.globalCompositeOperation = 'source-in';
      tempCtx.fillStyle = this.color;
      tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      
      this.tintedImage = tempCanvas;
      this.lastImage = this.image;
    }

    ctx.save();
    var x = toCanvas(this.parent._x);
    var y = toCanvas(this.parent._y);
    var ratio = this.image.width / this.image.height;
    var width = toCanvas(this.size) * ratio;
    var height = toCanvas(this.size) / ratio;
    var angleInRadians = (this.parent.direction || 0) * Math.PI / 180;

    ctx.translate(x, y);
    ctx.rotate(angleInRadians);
    // Используем обработанное изображение
    ctx.drawImage(this.tintedImage, -width / 2, -height / 2, width, height);
    ctx.restore();
  }


  getOverridableValues() {
    return [
      ...super.getOverridableValues(),
      {
        name: "src",
        type: "text",
        current: () => this.image.src,
        func: (val) => {
          this.image.src = val;
        },
      },
      {
        name: "size",
        type: "number",
        current: () => this.size,
        func: (val) => {
          this.size = +val;
        },
      },
      {
        name: "color",
        type: "text",
        current: () => this.color,
        func: (val) => {
          this.color = val;
        },
      },
    ];
  }


  save(realParent=null) {
    return {
      ...super.save(realParent),
      image: this.image.src,
      size: this.size,
      color: this.color,
    }
  }

  load(data, loadChildren=false) {
    super.load(data, false);
    this.isloaded = false;
    this.image.src = data.image;
    this.size = data.size;
    this.color = data.color;

    loadChildren && super.loadChildren(data);
  } 
}

registerClass(SpriteShower)