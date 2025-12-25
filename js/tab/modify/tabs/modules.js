import format, { addPlus } from "../../../../libs/format.js";
import { moduleSizeToSP } from "../../../../libs/hayat/modules.js";
import { modules } from "../../../../modules/modules.js";
import { objects } from "../../../canvas/map.js";
import { check_id } from "../../../canvas/map/check_id.js";
import BaseModule from "../../../canvas/objects/map/module/baseModule.js";
import SubgridLauncherModule from "../../../canvas/objects/map/module/subgrid/subgridLauncherModule.js";
import { DroneLauncherModule } from "../../../canvas/objects/map/module/subgrid/droneLauncherModule.js";
import BasicTask from "../../../canvas/objects/map/tasks/basicTask.js";
import { EVENTS } from "../../../events.js";
import { createObject } from "../../../save&load/load.js";
import { groupHTMLTemplate, optionHTMLTemplate, registerSelect } from "../../../ui/multilayered-select/multilayered-select.js";

const htmlTemplate = `<div class="module" id="{0}">
  <div class="statbar">
    <div class="state">{1}{2}</div>
    <div class="name">
      <label>{3}</label>
      <span>{4}</span>
      <span>{5}</span>
    </div>
  </div>
  {6}
  <div class="modifiers-container">
    {7}
  </div>
</div>`

const states = {
  'offline': '⭕', 
  'online': '🔘', 
  'active': '🟢', 
  'overload': '💢'
}

export default class {
  constructor() {
    $('#modal-maneuver-types-modules-all > .options').html(
      Object.entries(
        Object.entries(modules)
          .reduce((acc, [n, v]) => {
            if (v.main.type in acc) {
              if (v.main.category in acc[v.main.type]) {
                acc[v.main.type][v.main.category].push(n);
              } else {
                acc[v.main.type][v.main.category] = [n];
              }
            } else {
              acc[v.main.type] = {
                [v.main.category]: [n],
              }
            }

            return acc;
          }, {})
      ).map(([type, c]) => format(
        groupHTMLTemplate,
        type,
        Object.entries(c).map(([category, names]) => format(
          groupHTMLTemplate,
          category,
          names.map(n => format(optionHTMLTemplate, n, n)).join('\n')
        )).join('\n')
      )).join('\n')
    )
    registerSelect('#modal-maneuver-types-modules-all')

    $('#modal-maneuver-types-modules-add').on('click', (e) => this.onModuleAdd(e))

    $(window).click(() => $('#modal-maneuver-types-modules-contextmenu').attr('data-active', 'false'))
    $('#modal-maneuver-types-modules-contextmenu').click((e) => e.stopPropagation())
  }

  onSelectionEnded(nextSelection) {
    $('#modal-maneuver-types-modules-contextmenu').attr('data-active', 'false')
  }

  onSelectionStarted(prevSelection) {
    let id = $("#modal-maneuver-id").val();
    if (!id && check_id(id)) return;

    this.onIdChange(id);
  }

  onIdChange(id) {
    if (!this.checkIfCompatable(id)) {
      return;
    }

    this.updateModules(id);
  }

  onComplete(modal, id) {

  }

  onModuleAdd() {
    let id = $("#modal-maneuver-id").val();
    if (!id && check_id(id)) return;

    const module = $('#modal-maneuver-types-modules-all').attr('value');
    const position = $('#modal-maneuver-types-modules-pos').val();

    document.dispatchEvent(
      new CustomEvent(
        EVENTS.MAP.FUNCTION,
        {
          detail: {
            id: id,
            func: "addModule",
            attr: [ createObject(modules[module].main.class ?? "BaseModule", modules[module]), position ],
            redraw: false,
          }
        }
      )
    )

    this.updateModules(id);
  }

  updateModuleState(uuid, state) {
    let id = $("#modal-maneuver-id").val();
    if (!id && check_id(id)) return;

    document.dispatchEvent(
      new CustomEvent(EVENTS.MAP.FUNCTION, {
        detail: {
          id: id,
          func: "newTask",
          attr: [ new BasicTask(
            (target, origin) => {
              const t = target.getModule(origin.data.uuid)
              t && t.setState(origin.data.state)
            }, { uuid: uuid, state: state }, "changeModuleState-"+uuid
          ), true ],
          redraw: false,
        }
      }
    ))
  }

  removeModuleStateUpdate(uuid) {
    let id = $("#modal-maneuver-id").val();
    if (!id && check_id(id)) return;

    document.dispatchEvent(
      new CustomEvent(EVENTS.MAP.FUNCTION, {
        detail: {
          id: id,
          func: "deleteTask",
          attr: [ "changeModuleState-"+uuid ],
          redraw: false,
        }
      }
    ))
  }

  onModuleClick(e) {
    console.log(e)

    let id = $("#modal-maneuver-id").val();
    if (!id && check_id(id)) return;

    const uuid = e.currentTarget.id;

    const contextmenu = $('#modal-maneuver-types-modules-contextmenu');
    contextmenu.attr('data-active', 'true');
    contextmenu.css('top', e.clientY)
    contextmenu.css('left', e.clientX)

    const changeTask = objects[id].tasks.find(v => v.id == "changeModuleState-"+uuid && v.data.uuid == uuid)
    const module = objects[id].getModule(uuid);


    $('#modal-maneuver-types-modules-contextmenu .state > *')
      .attr('data-active', '')
      .off('click')
      .on('click', (e) => {
        const isactive = $(e.currentTarget).attr('data-active');
        if (isactive == 'true') return;
        
        if (isactive == "changeto") {
          this.removeModuleStateUpdate(uuid);
        } else {
          this.updateModuleState(uuid, e.currentTarget.id);
        }

        this.updateModules(id);
      })


    if (module.characteristics.activation == "passive") {
      $('#modal-maneuver-types-modules-contextmenu .state > #active').attr('data-active', "false");
      $('#modal-maneuver-types-modules-contextmenu .state > #overload').attr('data-active', "false");
    }

    $('#modal-maneuver-types-modules-contextmenu .state > #'+module.state).attr('data-active', 'true')
    if (changeTask) {
      $('#modal-maneuver-types-modules-contextmenu .state > #'+changeTask.data.state).attr('data-active', 'changeto')
    }

    $('#modal-maneuver-types-modules-contextmenu #delete').off('click').on('click', () => {
      document.dispatchEvent(
        new CustomEvent(EVENTS.MAP.FUNCTION, {
          detail: {
            id: id,
            func: "removeModule",
            attr: [ uuid ],
            redraw: false,
          }
        })
      )

      this.updateModules(id);
    })

    return false;
  }


  updateModules(id) {
    $('#modal-maneuver-types-modules-contextmenu').attr('data-active', 'false')

    const container = $('#modal-maneuver-types-modules-container')
    container.html('')

    let text = [];
    const generate = (ofobj) => {
      for (let r of ofobj) {
        const changeTask = objects[id].tasks.find(v => v.id == "changeModuleState-"+r.uuid && v.data.uuid == r.uuid)
        const info = r.getAdditionalInfo();

        text.push(format(
          htmlTemplate, 
          r.uuid, 
          states[r.state],
          changeTask ? `<label>${states[changeTask.data.state]}</label>` : '',
          r.characteristics.main.name,
          r.fullType,
          r.uuid,
          info ?? '',
          r.characteristics.modificators[r.state].map(
            v => `<span>${
                v.characteristic.startsWith('constant.') ? 'const' : 'dnmc'
              }</span><span>${
                v.target
              }</span><div>${
                v.characteristic.replace('constant.', '')
              }</div><label>${
                v.modificationType == "percent" 
                  ? addPlus(Math.round((v.modificator - 1)*100))+"%" 
                  : addPlus(v.modificator)
              }</label>${
                v.isAffectedByInterference ? '♒︎' : '══'
              }`
          ).join('\n')
        ))
      }
    }
    
    if (objects[id].internalModules.length != 0) {
      text.push(`<p>Internal Modules ${
        objects[id].internalModules.reduce((acc, v) => acc+moduleSizeToSP[v.characteristics.main.size], 0)
      } / ${objects[id].currentCharacteristics.constant.slots.internal}</p>`);
      generate(objects[id].internalModules);
    }
    
    if (objects[id].externalModules.length != 0) {
      text.push(`<p>External Modules ${
        objects[id].externalModules.reduce((acc, v) => acc+moduleSizeToSP[v.characteristics.main.size], 0)
      } / ${objects[id].currentCharacteristics.constant.slots.external}</p>`);
      generate(objects[id].externalModules);
    }

    if (objects[id].otherModules.length != 0) {
      text.push(`<p>Other Modules</p>`);
      generate(objects[id].otherModules);
    }

    container.html(text.join('\n'))

    $('#modal-maneuver-types-modules-container .module').on('contextmenu', (e) => this.onModuleClick(e))
  }

  checkIfCompatable(id) {
    return objects[id] && (
      'internalModules' in objects[id] &&
      'externalModules' in objects[id] &&
      'otherModules' in objects[id]
    )
  }
}