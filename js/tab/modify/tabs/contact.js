import { getMousePos } from "../../../../libs/canvas.js";
import format from "../../../../libs/format.js";
import { point } from "../../../../libs/vector/point.js";
import { mapProps } from "../../../canvas/grid.js";
import { objects } from "../../../canvas/map.js";
import { check_id } from "../../../canvas/map/check_id.js";
import { getInArea } from "../../../canvas/map/get_in_area.js";
import MAP_OBJECTS_IDS from "../../../canvas/objects/map/mapObjectsIds.constant.js";
import LongTask from "../../../canvas/objects/map/tasks/longTask.js";
import TASKS from "../../../canvas/objects/map/tasks/tasks.constant.js";
import TargetPoint from "../../../canvas/objects/overlay/target.js";
import { EVENTS } from "../../../events.js";

const HTMLTemplate = `<div>
  <label>{0}</label>
  <label>{1}</label>
</div>
<div id="modal-maneuver-types-contact-data-progress" class="progress" 
    style="--progress: {2}%; --progress-content: '{3} / {4}';"></div>
<button id="modal-maneuver-types-contact-data-stop" class="fit">Stop capturing</button>`
const HTMLTemplateWithoutProgress = `<div>
  <label>{0}</label>
  <label>{1}</label>
</div>
<button id="modal-maneuver-types-contact-data-stop" class="fit">Stop capturing</button>
<button id="modal-maneuver-types-contact-data-set" class="fit">Set as current</button>`

export default class {
  constructor() {
    this.id = $("#modal-maneuver-types-contact-id");
    this.aimButton = $("#modal-maneuver-types-contact-aim");
    this.contains = $("#modal-maneuver-types-contact-contains");

    this.currentTargetContainer = $('#modal-maneuver-types-contact-data');


    this.isAiming = false;
    this.aimButton.attr("data-active", "false");

    this.id.on("input", (e) => {
      const tid = e.target.value;
      if (!tid || !check_id(tid)) return;

      let id = $("#modal-maneuver-id").val();
      if (!id || !check_id(id)) return;

      if (tid == id) {
        this.id.val(
          Object.keys(objects)[0] != id ? Object.keys(objects)[0] : Object.keys(objects)[1]
        );
      }

      this.onBothIdsRight(id, tid);
    });

    $("#overlay").click((e) => {
      if (!this.isAiming) return;

      const { x, y } = getMousePos($("#overlay")[0], e);
      const clicked = getInArea(x * mapProps.size, y * mapProps.size);

      if (clicked.length == 0) return;

      this.id.val(clicked[0].id);
      this.id.trigger("input");
    });

    this.aimButton.on("click", () => {
      if (this.aimButton.attr("data-active") == "false") {
        this.aimButton.attr("data-active", "true");
        this.isAiming = true;
      } else {
        this.aimButton.attr("data-active", "false");
        this.isAiming = false;
      }
    });

    document.addEventListener(EVENTS.CALCULATION_ENDED, () => {
      let id = $("#modal-maneuver-id").val();
      if (!id || !check_id(id)) return;

      if ($("#modal-maneuver-types-contact").attr('data-active') == "false" ||
          $("#modal-maneuver").attr('data-active') == "false") return;

      this.onIdChange(id);
    })
  }

  onSelectionEnded(nextSelection) {
    this.isAiming = false;
    this.aimButton.attr("data-active", "false");

    document.dispatchEvent(
      new CustomEvent(EVENTS.OVERLAY.DELETE, {
        detail: {
          id: "modal-maneuver-target",
          redraw: true,
        },
      })
    );
  }

  onSelectionStarted(prevSelection) {
    let id = $("#modal-maneuver-id").val();
    if (!id || !check_id(id)) {
      const cur = Object.keys(objects)[0];
      $("#modal-maneuver-types-contact-id").val(cur);

      document.dispatchEvent(
        new CustomEvent(EVENTS.OVERLAY.NEW, {
          detail: {
            object: new TargetPoint(objects[cur]._x, objects[cur]._y),
            id: "modal-maneuver-target",
            redraw: true,
          },
        })
      );

      return;
    }

    this.updateCurrentTarget(id);

    document.dispatchEvent(
      new CustomEvent(EVENTS.OVERLAY.NEW, {
        detail: {
          object: new TargetPoint(),
          id: "modal-maneuver-target",
          redraw: false,
        },
      })
    );

    if (this.id.val() && check_id(this.id.val())) {
      this.onBothIdsRight(id, this.id.val());
    }
  }

  onIdChange(id) {
    this.updateCurrentTarget(id);

    if (this.id.val() && check_id(this.id.val())) {
      this.onBothIdsRight(id, this.id.val());
    }
  }


  showTargetTemplate(object) {
    if (typeof object == "object" && 'maxSteps' in object) {
      let progress = object.lifetime / object.maxSteps;
      let target = objects[object.data.id];

      if (!target) return;

      const div = document.createElement('div');
      div.innerHTML = format(
        HTMLTemplate, 
        'Capturing target: ', 
        object.data.id,
        progress * 100,
        object.lifetime,
        object.maxSteps
      )
      this.currentTargetContainer[0].appendChild(div);
      let _id = $("#modal-maneuver-id").val();

      $(div).find('button').on('click', () => {
        document.dispatchEvent(new CustomEvent(
          EVENTS.MAP.FUNCTION,
          {
            detail: {
              id: _id,
              func: "deleteTask",
              attr: [ TASKS.CONTACT, { id: object.data.id } ],
              redraw: true,
            }
          }
        ))

        this.updateCurrentTarget(_id);
      })

      return;
    }

    let target, isMain=false;
    if (typeof object == "string") {
      target = objects[object];

      if (!target) return;
    } else {
      isMain = true;
      target = object;
    }

    const div = document.createElement('div');
    div.innerHTML = format(
      HTMLTemplateWithoutProgress, 
      isMain ? 'Current target: ' : 'Captured target: ', 
      target.id,
    )
    this.currentTargetContainer[0].appendChild(div);
    let _id = $("#modal-maneuver-id").val();

    $(div).find('button#modal-maneuver-types-contact-data-stop').on('click', () => {
      document.dispatchEvent(new CustomEvent(
        EVENTS.MAP.FUNCTION,
        {
          detail: {
            id: _id,
            func: (obj) => {
              obj.callChildren(MAP_OBJECTS_IDS.CONTACT_CONTROLLER, (ctr) => { ctr.removeTarget(target.id) })
            },
            redraw: true,
          }
        }
      ))

      this.updateCurrentTarget(_id);
    })

    $(div).find('button#modal-maneuver-types-contact-data-set')
      .attr('data-active', isMain ? 'false' : 'true')
      .on('click', () => {
        document.dispatchEvent(new CustomEvent(
          EVENTS.MAP.FUNCTION,
          {
            detail: {
              id: _id,
              func: (obj) => {
                obj.callChildren(MAP_OBJECTS_IDS.CONTACT_CONTROLLER, (ctr) => { ctr.setMainTarget(target.id) })
              },
              redraw: true,
            }
          }
        ))

        this.updateCurrentTarget(_id);
      })
  }

  updateCurrentTarget(id) {
    const tasks = objects[id].getAllTasks(TASKS.CONTACT);
    const controller = objects[id].children[MAP_OBJECTS_IDS.CONTACT_CONTROLLER];

    if (!controller) return;

    const mainTarget = controller.target;
    const targets = controller.capturedTargets.filter(v => v != mainTarget.id);

    let overall = [...targets, ...tasks];
    if (mainTarget) overall = [mainTarget, ...overall];

    this.currentTargetContainer.html('')
    overall.forEach(v => this.showTargetTemplate(v));
  }

  onBothIdsRight(id, tid) {
    document.dispatchEvent(
      new CustomEvent(EVENTS.OVERLAY.FUNCTION, {
        detail: {
          id: "modal-maneuver-target",
          func: "moveTo",
          attr: [objects[tid]._x, objects[tid]._y],
          redraw: true,
        },
      })
    );

    const capRange = objects[id].currentCharacteristics.constant.capture_range;
    const range = Math.round(
      point(() => point(objects[tid]._x, objects[tid]._y) - point(objects[id]._x, objects[id]._y))
        .length
    );

    if (range > capRange) {
      this.contains.html(`<p>Cannot be captured (range ${range}m > capRange ${capRange}m)</p>`);
    } else {
      if (
        objects[id].currentCharacteristics.constant.body.signature >
        objects[tid].currentCharacteristics.constant.body.signature
      ) {
        this.contains.html(
          `<p>Will be captured in ${Math.round(
            Math.sqrt(
              objects[id].currentCharacteristics.constant.body.signature /
                objects[tid].currentCharacteristics.constant.body.signature
            )
          )} steps (range ${range}m, capRange ${capRange}m)</p>`
        );
      } else {
        this.contains.html(`<p>Instant capture (range ${range}m, capRange ${capRange}m)</p>`);
      }
    }
  }

  onComplete(modal, id) {
    if (this.id.val() && check_id(this.id.val())) {
      const capRange = objects[id].currentCharacteristics.constant.capture_range;
      const range = Math.round(
        point(() => point(objects[this.id.val()]._x, objects[this.id.val()]._y) - point(objects[id]._x, objects[id]._y))
          .length
      );

      if (range > capRange) return;

      document.dispatchEvent(
        new CustomEvent(EVENTS.MAP.FUNCTION, {
          detail: {
            id: id,
            func: "newTask",
            attr: [
              new LongTask(
                (target, origin) => {
                  target.callChildren(MAP_OBJECTS_IDS.CONTACT_CONTROLLER, (cntrl) => {
                    cntrl.addTarget(origin.data.id);
                  });
                },
                { id: this.id.val() },
                Math.round(
                  Math.sqrt(
                    objects[id].currentCharacteristics.constant.body.signature /
                      objects[this.id.val()].currentCharacteristics.constant.body.signature
                  )
                ),
                TASKS.CONTACT
              ),
              false, true
            ],
            redraw: true,
          },
        })
      );

      this.updateCurrentTarget(id);
    }
  }
}
