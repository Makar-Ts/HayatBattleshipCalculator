import format from "../../../../libs/format.js";
import { objects } from "../../../canvas/map.js";
import { check_id } from "../../../canvas/map/check_id.js";
import { EVENTS } from "../../../events.js";
import { groupHTMLTemplate, optionHTMLTemplate, registerSelect } from "../../../ui/multilayered-select/multilayered-select.js";

export default class {
  currentOverridableValues = [];
  targets = {};
  
  constructor() {
    $('#modal-maneuver-types-override-target').on('change', (e) => {
      const path = $(e.target).attr('value')

      if (path == ".this") {
        this.currentOverridableValues = this.targets.getValues();
      } else {
        let curObj = this.targets;

        for (let p of path.replace('.this.', '').split(".")) {
          console.log(p, curObj);
          curObj = curObj.children.find(v => v.id == p);
        }

        this.currentOverridableValues = curObj.getValues();
      }

      this.changeOverrideValues();
    })
  }

  onSelectionEnded(nextSelection) {
    $('#modal-maneuver-types-override-container').html("");
    $('#modal-maneuver-types-override-target > .options').html("");
  }

  onSelectionStarted(prevSelection) {
    let id = $("#modal-maneuver-id").val();
    if (!id && check_id(id)) return;

    this.onIdChange(id);
  }

  onIdChange(id) {
    this.currentOverridableValues = objects[id].getOverridableValues();
    this.targets = {
      id: 'this',
      getValues: () => objects[id].getOverridableValues(),
      children: objects[id].getChildrenWithOverridableValues()
    }

    const parce = (obj, path="") => {
      let text = "";

      if ('getValues' in obj) {
        /** @type {string} */
        let name = obj.id;
        if (name.startsWith('module')) {
          console.log(name)
          name = name.replace('module ', '');
          const splitted = name.split(' ');
          name = `[${splitted[0].split('-')[0]}] ${splitted.slice(1).join(' ')}`;
        }

        text += format(optionHTMLTemplate, path+"."+obj.id, name)
      }

      if (obj.children.length != 0) {
        text += format(groupHTMLTemplate, obj.id, obj.children.map(v => parce(v, path+"."+obj.id)).join('\n'))
      }

      return text;
    }

    $('#modal-maneuver-types-override-target > .options').html(parce(this.targets));
    registerSelect('#modal-maneuver-types-override-target');

    // $('#modal-maneuver-types-override-target').html("");
    // let select = $('#modal-maneuver-types-override-target')[0];
    // for (let data of this.targets) {
    //   const option = document.createElement('option');
    //   option.value = data.id;
    //   option.innerText = data.id;

    //   select.appendChild(option);
    // }

    this.changeOverrideValues();
  }

  onComplete(modal, id) {
    for (let data of this.currentOverridableValues) {
      const elem = $('#modal-maneuver-types-override-'+data.name+' > input')[0];
      let val = elem.value;

      if (data.type == 'checkbox') val = !!elem.checked;
      else if (!val) continue;

      data.func(val);
    }

    document.dispatchEvent(
      new CustomEvent(EVENTS.OVERLAY.FUNCTION, {
        detail: {
          id: "modal-maneuver-crosshair",
          func: "moveTo",
          attr: [objects[id]._x, objects[id]._y],
          redraw: true,
        },
      })
    );

    document.dispatchEvent(new Event(EVENTS.MAP.REDRAW));

    this.changeOverrideValues();
  }

  
  changeOverrideValues() {
    const body = $('#modal-maneuver-types-override-container')[0];
    body.innerHTML = "";

    for (let data of this.currentOverridableValues) {
      const containerDiv = document.createElement('div');
      containerDiv.id = 'modal-maneuver-types-override-' + data.name;

      const label = document.createElement('p');
      label.textContent = data.name + ': ';

      const input = document.createElement('input');
      input.type = data.type;
      if (data.type === "color") {
        input.value = data.current();
      } else {
        input.placeholder = data.current();
      }
      input.classList = 'fit';

      if (data.type == 'checkbox') {
        input.checked = data.current();
      }

      containerDiv.appendChild(label);
      containerDiv.appendChild(input);

      body.appendChild(containerDiv);
    }
  }
}