import format from "../../../../libs/format.js";
import { objects } from "../../../canvas/map.js";
import { check_id } from "../../../canvas/map/check_id.js";
import { EVENTS } from "../../../events.js";

const htmlTemplate = `<div class="task" id="{0}">
  <div class="name">
    <label>{0}</label>
    <span>{1} / {2}</span>
  </div>
  <div class="data">
    {3}
  </div>
</div>`

export default class {
  constructor() {}

  onSelectionEnded(nextSelection) {

  }

  onSelectionStarted(prevSelection) {
    let id = $("#modal-maneuver-id").val();
    if (!id && check_id(id)) return;

    this.onIdChange(id);
  }

  onIdChange(id) {
    const tasks = objects[id].tasks || [];

    const text = [];
    for (let task of tasks) {
      text.push(format(
        htmlTemplate,
        task.id,
        task.lifetime || 1,
        task.maxSteps || 1,
        Object.entries(task.data).map(([k, v]) => `<div>${k}</div><label>${v}</label>`).join('\n')
      ))
    }

    $('#modal-maneuver-types-tasks').html(text.join('\n'))
  }

  onComplete(modal, id) {
    
  }
}