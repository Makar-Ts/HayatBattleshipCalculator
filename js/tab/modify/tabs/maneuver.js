import { objects } from "../../../canvas/map.js";
import { check_id } from "../../../canvas/map/check_id.js";
import { EVENTS } from "../../../events.js";

export default class {
  constructor() {}

  onSelectionEnded(nextSelection) {}

  onSelectionStarted(prevSelection) {
    let id = $("#modal-maneuver-id").val();
    if (!id && check_id(id)) return;

    this.onIdChange(id);
  }

  onIdChange(id) {
    const isComp = this.isCompatableForManeuver(id);

    $("#modal-maneuver-types-maneuver-vel").prop('disabled', !isComp);
    $("#modal-maneuver-types-maneuver-dir").prop('disabled', !isComp);
    $("#modal-maneuver-complete").prop('disabled', !isComp);
  }

  onComplete(modal, id) {
    let vel = +$("#modal-maneuver-types-maneuver-vel").val();
    let dir = +$("#modal-maneuver-types-maneuver-dir").val();

    document.dispatchEvent(
      new CustomEvent(EVENTS.MAP.FUNCTION, {
        detail: {
          id: id,
          func: (obj) => {
            obj.direction = dir || obj.direction;
            vel && obj.applyForce(vel);
          },
          redraw: true,
        },
      })
    );
  }


  isCompatableForManeuver(id) {
    return objects[id] && ('direction' in objects[id] && 'applyForce' in objects[id]);
  }
}