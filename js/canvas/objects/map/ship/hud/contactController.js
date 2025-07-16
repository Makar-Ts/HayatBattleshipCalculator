import { toCurrentCanvasSize } from "../../../../../../libs/canvas.js";
import { getExternalTangentPoints, lerp } from "../../../../../../libs/math.js";
import { point } from "../../../../../../libs/vector/point.js";
import { EVENTS } from "../../../../../events.js";
import { registerClass } from "../../../../../save&load/objectCollector.js";
import { objects } from "../../../../map.js";
import BasicStepObject from "../../basicStepObject.js";
import MAP_OBJECTS_IDS from "../../mapObjectsIds.constant.js";
import TASKS from "../../tasks/tasks.constant.js";

export class ContactController extends BasicStepObject {
  capturedTargets = [];
  currentTarget = null;

  constructor() {
    super();

    document.addEventListener(EVENTS.CALCULATION_ENDED, () => {
      if (!this.parent) return;

      const capRange = this.parent.currentCharacteristics.constant.capture_range;

      this.capturedTargets = this.capturedTargets.filter(v => {
        if (!objects[v]) return false;

        const range = Math.round(
          point(
            () =>
              point(objects[v]._x, objects[v]._y) -
              point(this.parent._x, this.parent._y)
          ).length
        );

        return range <= capRange;
      })

      
    });
  }

  addTarget(id) {
    if (this.capturedTargets.indexOf(id) == -1) {
      this.capturedTargets.push(id);

      if (this.currentTarget === null) {
        this.currentTarget = 0;
      }
    }
  }

  setMainTarget(id) {
    this.filterTargets();
    const index = this.capturedTargets.indexOf(id);

    if (index != -1) this.currentTarget = index;
  }

  removeTarget(id) {
    this.capturedTargets = this.capturedTargets.filter(v => v != id);
  }

  filterTargets() {
    this.capturedTargets = this.capturedTargets.filter(v => objects[v])
  }

  get target() {
    this.filterTargets();

    if (this.capturedTargets.length != 0) {
      if (this.currentTarget === null || !this.capturedTargets[this.currentTarget]) {
        this.currentTarget = 0;
      }

      return objects[this.capturedTargets[this.currentTarget]];
    }

    return null;
  }

  next() {
    if (!this.parent) return;
    if (this.target) return;

    const tasks = this.parent.getAllTasks(TASKS.CONTACT);
    if (tasks.length == 0) return;

    for (let i of tasks) {
      const target = objects[i.data.id];

      if (!target) {
        this.parent.deleteTask(TASKS.CONTACT, { id: i.data.id });

        return;
      }
    }
  }

  drawContact(canvas, ctx, toCanvas, style, target, progress, isMain) {
    const lines = getExternalTangentPoints(
      this.parent._x,
      this.parent._y,
      this.parent.currentCharacteristics.constant.body.signature,
      target._x,
      target._y,
      target.currentCharacteristics.constant.body.signature
    );

    if (!lines) return;

    const biCapture =
      target.callChildren(MAP_OBJECTS_IDS.CONTACT_CONTROLLER, (cnt) => {
        return cnt.capturedTargets.includes(this.parent.id);
      }) || target.getTask(TASKS.CONTACT, { id: this.parent.id });

    let posl1, posl2;
    if (
      this.parent.currentCharacteristics.constant.body.signature <
        target.currentCharacteristics.constant.body.signature &&
      biCapture
    ) {
      const dist = toCurrentCanvasSize(canvas, 40);

      const l1_offset = point(() =>
        toCanvas(point(lines[0].p1.x, lines[0].p1.y) - point(this.parent._x, this.parent._y))
      ).normalize();
      const l2_offset = point(() =>
        toCanvas(point(lines[1].p1.x, lines[1].p1.y) - point(this.parent._x, this.parent._y))
      ).normalize();

      ctx.strokeStyle = isMain ? style.getPropertyValue("--accent") : style.getPropertyValue("--target-non-active");
      ctx.lineWidth = toCurrentCanvasSize(canvas, 20);
      ctx.setLineDash([toCurrentCanvasSize(canvas, 60), toCurrentCanvasSize(canvas, 60)]);

      posl1 = [
        toCanvas(lines[0].p1.x) + l1_offset.x * dist,
        toCanvas(lines[0].p1.y) + l1_offset.y * dist,
        toCanvas(lines[0].p2.x) + l1_offset.x * dist,
        toCanvas(lines[0].p2.y) + l1_offset.y * dist,
      ];
      posl2 = [
        toCanvas(lines[1].p1.x) + l2_offset.x * dist,
        toCanvas(lines[1].p1.y) + l2_offset.y * dist,
        toCanvas(lines[1].p2.x) + l2_offset.x * dist,
        toCanvas(lines[1].p2.y) + l2_offset.y * dist,
      ];
    } else {
      ctx.strokeStyle = isMain ? style.getPropertyValue("--accent") : style.getPropertyValue("--target-non-active");
      ctx.lineWidth = toCurrentCanvasSize(canvas, 20);

      posl1 = [
        toCanvas(lines[0].p1.x),
        toCanvas(lines[0].p1.y),
        toCanvas(lines[0].p2.x),
        toCanvas(lines[0].p2.y),
      ];
      posl2 = [
        toCanvas(lines[1].p1.x),
        toCanvas(lines[1].p1.y),
        toCanvas(lines[1].p2.x),
        toCanvas(lines[1].p2.y),
      ];
    }

    ctx.beginPath();
    ctx.moveTo(posl1[0], posl1[1]);
    ctx.lineTo(lerp(posl1[0], posl1[2], progress), lerp(posl1[1], posl1[3], progress));

    ctx.moveTo(posl2[0], posl2[1]);
    ctx.lineTo(lerp(posl2[0], posl2[2], progress), lerp(posl2[1], posl2[3], progress));
    ctx.stroke();

    if (progress < 1) {
      ctx.strokeStyle = style.getPropertyValue("--target");

      ctx.beginPath();
      ctx.moveTo(lerp(posl1[0], posl1[2], progress), lerp(posl1[1], posl1[3], progress));
      ctx.lineTo(posl1[2], posl1[3]);

      ctx.moveTo(lerp(posl2[0], posl2[2], progress), lerp(posl2[1], posl2[3], progress));
      ctx.lineTo(posl2[2], posl2[3]);
      ctx.stroke();
    }

    if (!biCapture) {
      const drawArrow = (x1, y1, x2, y2) => {
        const arrowSize = toCurrentCanvasSize(canvas, 100);

        const x = lerp(x1, x2, 0.5);
        const y = lerp(y1, y2, 0.5);

        const dir = point(() => point(x2, y2) - point(x1, y1)).normalize();

        ctx.beginPath();

        ctx.moveTo(
          x - dir.x * (arrowSize / 2) - dir.y * (arrowSize / 3),
          y - dir.y * (arrowSize / 2) + dir.x * (arrowSize / 3)
        );
        ctx.lineTo(x + dir.x * (arrowSize / 2), y + dir.y * (arrowSize / 2));
        ctx.lineTo(
          x - dir.x * (arrowSize / 2) + dir.y * (arrowSize / 3),
          y - dir.y * (arrowSize / 2) - dir.x * (arrowSize / 3)
        );

        ctx.stroke();
      };

      if (progress < 0.5) {
        ctx.strokeStyle = style.getPropertyValue("--target");
      } else {
        ctx.strokeStyle = isMain ? style.getPropertyValue("--accent") : style.getPropertyValue("--target-non-active")
      }

      drawArrow(...posl1);
      drawArrow(...posl2);
    }

    ctx.setLineDash([]);
  }

  draw(canvas, ctx, toCanvas, style) {
    super.draw(canvas, ctx, toCanvas, style);

    if (!this.parent) return;

    const tasks = this.parent.getAllTasks(TASKS.CONTACT).filter(v => objects[v.data.id]);

    for (let i in tasks) {
      if (i == 0 && !this.target) {
        this.drawContact(canvas, ctx, toCanvas, style, objects[tasks[i].data.id], tasks[i].lifetime / tasks[i].maxSteps, true);
      } else {
        this.drawContact(canvas, ctx, toCanvas, style, objects[tasks[i].data.id], tasks[i].lifetime / tasks[i].maxSteps, false);
      }
    }

    if (this.target) {
      this.drawContact(canvas, ctx, toCanvas, style, this.target, 1, true);

      for (let i in this.capturedTargets) {
        if (i == this.currentTarget) continue;

        this.drawContact(canvas, ctx, toCanvas, style, objects[this.capturedTargets[i]], 1, false);
      }
    }
  }

  save(realParent = null) {
    return {
      ...super.save(realParent),
      capturedTargets: this.capturedTargets,
      currentTarget: this.currentTarget,
    };
  }

  load(data, loadChildren = false) {
    super.load(data, false);
    this.capturedTargets = data.capturedTargets;
    this.currentTarget = data.currentTarget;

    loadChildren && super.loadChildren(data);
  }
}

registerClass(ContactController);
