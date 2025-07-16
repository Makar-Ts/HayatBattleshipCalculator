import { objects } from "../../../canvas/map.js";
import { check_id } from "../../../canvas/map/check_id.js";
import BasicTask from "../../../canvas/objects/map/tasks/basicTask.js";
import TASKS from "../../../canvas/objects/map/tasks/tasks.constant.js";
import AccentPoint from "../../../canvas/objects/overlay/accentPoint.js";
import { EVENTS } from "../../../events.js";

export default class {
  constructor() {
    $("#modal-maneuver-types-jump_cal-dist").on("input", (e) => {
      let id = $("#modal-maneuver-id").val();

      if (!id && check_id(id)) return;

      this.setAccentPoint(id, +e.target.value || 0);
    });
  }

  onSelectionEnded(nextSelection) {
    document.dispatchEvent(
      new CustomEvent(EVENTS.OVERLAY.DELETE, {
        detail: {
          id: "modal-maneuver-jump_calc-accent",
          redraw: true,
        },
      })
    );
  }

  onSelectionStarted(prevSelection) {
    document.dispatchEvent(
      new CustomEvent(EVENTS.OVERLAY.NEW, {
        detail: {
          object: new AccentPoint(500, 500),
          id: "modal-maneuver-jump_calc-accent",
          redraw: false,
        },
      })
    );

    let id = $("#modal-maneuver-id").val();
    if (!id && check_id(id)) return;

    this.onIdChange(id);
  }

  onIdChange(id) {
    const isComp = this.isCompatableForJump(id);
    $('#modal-maneuver-types-jump_cal-dist').prop('disabled', !isComp)
    $("#modal-maneuver-complete").prop('disabled', !isComp)

    document.dispatchEvent(
      new CustomEvent(EVENTS.OVERLAY.FUNCTION, {
        detail: {
          id: "modal-maneuver-jump_calc-accent",
          func: "setVisible",
          attr: [ isComp ],
          redraw: true,
        },
      })
    );

    if (!isComp) return;

    this.setAccentPoint(id, +$("#modal-maneuver-types-jump_cal-dist").val() || 0);
  }

  onComplete(modal, id) {
    let dist = +$("#modal-maneuver-types-jump_cal-dist").val();

    document.dispatchEvent(
      new CustomEvent(EVENTS.MAP.FUNCTION, {
        detail: {
          id: id,
          func: "newTask",
          attr: [ new BasicTask(
            (target, origin) => {
              const x = target._x + Math.sin((target._direction / 180) * Math.PI) * origin.data.distance;
              const y = target._y + Math.cos((target._direction / 180) * Math.PI) * origin.data.distance;

              target.moveTo(x, y);
            }, { distance: dist }, TASKS.HYPERJUMP
          ), true ],
          redraw: false,
        },
      })
    );

    document.dispatchEvent(
      new CustomEvent(EVENTS.OVERLAY.FUNCTION, {
        detail: {
          id: "modal-maneuver-crosshair",
          func: "moveTo",
          attr: [objects[id]._x, objects[id]._y],
          redraw: false,
        },
      })
    );

    this.setAccentPoint(id, dist);
  }


  isCompatableForJump(id) {
    return objects[id] && '_direction' in objects[id];
  }

  calculateJump(id, dist) {
    const x = objects[id]._x + Math.sin((objects[id]._direction / 180) * Math.PI) * dist;
    const y = objects[id]._y + Math.cos((objects[id]._direction / 180) * Math.PI) * dist;

    return [x, y];
  };

  setAccentPoint(id, dist) {
    if (!this.isCompatableForJump(id)) return;

    const pos = this.calculateJump(id, dist);

    $('#modal-maneuver-types-jump_cal-x').text(pos[0]);
    $('#modal-maneuver-types-jump_cal-y').text(pos[1]);

    document.dispatchEvent(
      new CustomEvent(EVENTS.OVERLAY.FUNCTION, {
        detail: {
          id: "modal-maneuver-jump_calc-accent",
          func: "moveTo",
          attr: [...pos, objects[id]._x, objects[id]._y],
          redraw: true,
        },
      })
    );
  };
}