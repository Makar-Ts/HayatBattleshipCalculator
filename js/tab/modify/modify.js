import { fromMapToOverlay, getMousePos } from "../../../libs/canvas.js";
import { mapProps } from "../../canvas/grid.js";
import { objects } from "../../canvas/map.js";
import { check_id } from "../../canvas/map/check_id.js";
import { getInArea } from "../../canvas/map/get_in_area.js";
import AccentPoint from "../../canvas/objects/overlay/accentPoint.js";
import CrosshairObject from "../../canvas/objects/overlay/crosshair.js";
import { EVENTS } from "../../events.js";
import __contact from "./tabs/contact.js";
import __delete from "./tabs/delete.js";
import __jump_calc from "./tabs/jump_calc.js";
import __maneuver from "./tabs/maneuver.js";
import __modules from "./tabs/modules.js";
import __override from "./tabs/override.js";
import __tasks from "./tabs/tasks.js";

let enableModifyModal = (id) => {};

export default function init() {
  const tabs = {
    maneuver: new __maneuver(),
    jump_calc: new __jump_calc(),
    modules: new __modules(),
    tasks: new __tasks(),
    override: new __override(),
    delete: new __delete(),
    contact: new __contact(),
  }

  const disableModal = (modal) => {
    is_aiming = false;
    $("#modal-maneuver-aim").attr("data-active", "false");
    modal.attr("data-active", "false");
    tabs[currentType].onSelectionEnded('');

    document.dispatchEvent(
      new CustomEvent(EVENTS.OVERLAY.DELETE, {
        detail: {
          id: "modal-maneuver-crosshair",
          redraw: true,
        },
      })
    );
  };

  enableModifyModal = (id) => {
    $("#modal-maneuver-id").val(id);

    enableModal($("#modal-maneuver"));
  }

  const enableModal = (modal) => {
    modal.attr("data-active", "true");
    tabs[currentType].onSelectionStarted('');

    document.dispatchEvent(
      new CustomEvent(EVENTS.OVERLAY.NEW, {
        detail: {
          object: new CrosshairObject(500, 500, 200),
          id: "modal-maneuver-crosshair",
          redraw: true,
        },
      })
    );

    if ($("#modal-maneuver-id").val() == "") $("#modal-maneuver-id").val(Object.keys(objects)[0]);

    onIdChange();
  };

  $("#tab-maneuver").click(() => {
    let modal = $("#modal-maneuver");

    if (modal.attr("data-active") == "true") {
      disableModal(modal);
    } else {
      enableModal(modal);
    }
  });

  document.addEventListener(EVENTS.CALCULATION_ENDED, (e) => {
    if ($("#modal-maneuver").attr("data-active") != "true") return;

    onIdChange();
  });

  let is_aiming = false;
  $("#modal-maneuver-aim").click(() => {
    is_aiming = !is_aiming;

    $("#modal-maneuver-aim").attr("data-active", is_aiming ? "true" : "false");
  });

  $("#overlay").click((e) => {
    if (!is_aiming) return;

    const { x, y } = getMousePos($("#overlay")[0], e);
    const clicked = getInArea(x * mapProps.size, y * mapProps.size);

    if (clicked.length == 0) return;

    $("#modal-maneuver-id").val(clicked[0].id);

    onIdChange();
  });

  $("#modal-maneuver-id").on("input", () => onIdChange());

  const onIdChange = () => {
    let id = $("#modal-maneuver-id").val();
    const isCorrect = !!check_id(id);

    $("#modal-maneuver-complete").prop('disabled', !isCorrect)
    if (!isCorrect) return;
    const object = objects[id];

    tabs[currentType].onIdChange(id);

    document.dispatchEvent(
      new CustomEvent(EVENTS.OVERLAY.FUNCTION, {
        detail: {
          id: "modal-maneuver-crosshair",
          func: "moveTo",
          attr: [object._x, object._y],
          redraw: true,
        },
      })
    );
  };



  $("#modal-maneuver-complete").click(() => {
    let modal = $("#modal-maneuver");
    let id = $("#modal-maneuver-id").val();

    if (!id && check_id(id)) return;

    tabs[currentType].onComplete(modal, id);
  });

  

  let currentType = "maneuver";
  $("#modal-maneuver-type").on("change", (e) => {
    $("#modal-maneuver-types > *").attr("data-active", "false");
    $("#modal-maneuver-complete").prop('disabled', false)

    let a = e.target.value;
    let b = String(currentType)

    tabs[currentType].onSelectionEnded(a);

    currentType = a;
    $(`#modal-maneuver-types-${currentType}`).attr("data-active", "true");

    tabs[currentType].onSelectionStarted(b);
  });
}

export { enableModifyModal }