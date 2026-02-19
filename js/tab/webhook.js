import { addPlus } from "../../libs/format.js";
import { generateProgressbar } from "../../libs/generateProgressbar.js";
import { point } from "../../libs/vector/point.js";
import { drawGrid, mapProps } from "../canvas/grid.js";
import { drawObjects, objects, style } from "../canvas/map.js";
import { check_id } from "../canvas/map/check_id.js";
import { getInArea } from "../canvas/map/get_in_area.js";
import ShipObject from "../canvas/objects/map/ship/shipObject.js";
import SubgridObject from "../canvas/objects/map/ship/subgrid/subgridObject.js";
import SpriteShower from "../canvas/objects/map/spriteShow.js";
import { computeCenteredSquare } from "../controls/map.js";
import { EVENTS } from "../events.js";
import { activeLayers } from "./render.js";


const states = {
  'offline': '⭕', 
  'online': '🔘', 
  'active': '🟢', 
  'overload': '💢'
}


export default function () {
  const button = $('#tab-webhook');
  const modal = $('#modal-webhook');
  const webhook = () => $('#modal-webhook-webhook').val();

  const sendCanvasButton = $('#modal-webhook-send_canvas');


  button.on('click', () => {
    const setTo = modal.attr("data-active") == "true" ? "false" : "true";
    modal.attr("data-active", setTo);
    button.attr("data-active", setTo);
  })


  sendCanvasButton.on('click', () => {
    if (!webhook()) return;

    const computed = computeCenteredSquare();

    if (!computed) {
      alert('No object on the map')
      return;
    }

    const size = { 
      size: computed.size, 
      grid: mapProps.grid ?? 500, 
      offset: { 
        x: -computed.x,
        y: -computed.y
      },
      byControl: true,
    }

    const canvas = document.createElement('canvas');
    canvas.width = 3000;
    canvas.height = 3000;
    const ctx = canvas.getContext("2d");


    let raito = canvas.width / size.size;
    const toCanvas = (pos) => {
      if (typeof pos === "number") {
        return pos * raito;
      } else if (typeof pos === "object") {
        let x = null, y = null;
        let direction = false;

        if ('point' in pos) {
          x = pos.point.x;
          y = pos.point.y;
        } else if ('direction' in pos) {
          x = pos.direction.x;
          y = pos.direction.y;
          direction = true;
        } else {
          x = pos.x ?? null;
          y = pos.y ?? null;
        }
        
        if (direction) {
          return point((x ?? 0) * raito, (y ?? 0) * raito);
        } else if (x !== null && y !== null) {
          return point((size.offset.x + x) * raito, (size.offset.y + y) * raito);
        } else if (x !== null) {
          return (size.offset.x + x) * raito;
        } else if (y !== null) {
          return (size.offset.y + y) * raito;
        }
      }
    };


    console.log(size)
    drawGrid(canvas, ctx, toCanvas, size.size, size.grid, size.offset);
    drawObjects(canvas, ctx, toCanvas, style, activeLayers);


    sendCanvasButton.prop("disabled", true);
    canvas.toBlob(async (blob) => {
      const formData = new FormData();
      formData.append('file', blob, 'battlemap.png');

      try {
        const response = await fetch(webhook(), {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          console.log('Успешно отправлено!');
        } else {
          console.error('Ошибка:', response.status);
        }
      } catch (err) {
        console.error('Ошибка сети:', err);
      } finally {
        sendCanvasButton.prop("disabled", false);
      }
    }, 'image/png');
  })



  const id = $('#modal-webhook-id');
  const aim = $('#modal-webhook-aim');
  let isAiming = false;
  
  aim.on('click', () => {
    isAiming = !isAiming;

    aim.attr("data-active", isAiming ? "true" : "false");
  })

  document.addEventListener(EVENTS.ON_MAP_CLICK, (e) => {
    if (!isAiming) return;

    const clicked = getInArea(e.detail.x, e.detail.y);

    if (clicked.length == 0) return;

    id.val(clicked[0].id);
  });


  const sendShipData = $('#modal-webhook-send_ship_data');

  sendShipData.on('click', async () => {
    if (!webhook()) return;
    if (!check_id(id.val())) return;

    /**
     * @type { ShipObject | SubgridObject }
     */
    const object = objects[id.val()];

    const cutPoint = (n) => Math.round(n * 1000) / 1000;

    const barrier = {
      current: object.currentCharacteristics.dynamic.hp.barrier,
      max: object.baseCharacteristics.dynamic.hp.barrier
    }
    const armor = {
      current: object.currentCharacteristics.dynamic.hp.armor,
      max: object.baseCharacteristics.dynamic.hp.armor
    }
    const hull = {
      current: object.currentCharacteristics.dynamic.hp.hull,
      max: object.baseCharacteristics.dynamic.hp.hull
    }

    const capacitor = {
      current: object.currentCharacteristics.constant.capacitor.charge,
      max: object.baseCharacteristics.constant.capacitor.charge
    }
    const temperature = {
      current: object.currentCharacteristics.dynamic.temperature,
      max: object.baseCharacteristics.constant.temperature
    }

    /** @type { SpriteShower } */
    const image = object.children.image;


    const { internalModules, externalModules, otherModules } = object;
    const formatModule = r => {
      const changeTask = object.tasks.find(v => v.id == "changeModuleState-"+r.uuid && v.data.uuid == r.uuid)

      return { 
        name: `${
          states[r.state] + (changeTask ? '>' + states[changeTask.data.state] : "")
        } ${r.characteristics.main.name}`, 
        value: r.characteristics.modificators[r.state]
          .map(v => `__${
            v.characteristic.startsWith('constant.') ? 'const' : 'dnmc'
          }__ | **${
            v.target}${v.affectedLayers ? '['+v.affectedLayers.join(', ')+']' : ''
          }** | ${v.characteristic.replaceAll('constant.', '')} | **${
          v.modificationType == "percent" 
            ? addPlus(Math.round((v.modificator - 1)*100))+"%" 
            : addPlus(v.modificator)
          }** | ${v.isAffectedByInterference ? '♒︎' : '══'}`)
          .join('\n'), 
        inline: false 
      }
    }


    sendShipData.prop('disabled', true);
    try {
      await fetch(webhook(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username: object.name,
          ...( image 
            ? {avatar_url: image.image.src.replace('http://127.0.0.1:5501/', 'https://makar-ts.github.io/HayatBattleshipCalculator/')} 
            : {}
          ),
          embeds: [
            {
              title: "State Information",
              color: 0x00FF00,
              fields: [ // 🟦 ⬛ 🟧 🟩 ⬜ 🟥
                { 
                  name: `B[${cutPoint(barrier.current)}/${cutPoint(barrier.max)}]`, 
                  value: `${generateProgressbar(barrier.current, 0, barrier.max, 7, { block: '🟦', empty: '⬛' })}`, 
                  inline: true 
                },
                { 
                  name: `A[${cutPoint(armor.current)}/${cutPoint(armor.max)}]`, 
                  value: `${generateProgressbar(armor.current, 0, armor.max, 7, { block: '🟧', empty: '⬛' })}`, 
                  inline: true 
                },
                { 
                  name: `H[${cutPoint(hull.current)}/${cutPoint(hull.max)}]`, 
                  value: `${generateProgressbar(hull.current, 0, hull.max, 7, { block: '⬜', empty: '⬛' })}`, 
                  inline: true 
                },
                
                { 
                  name: `C[${cutPoint(capacitor.current)}/${cutPoint(capacitor.max)}] (${addPlus(cutPoint(object.currentCharacteristics.constant.capacitor.generation))}/step)`, 
                  value: `${generateProgressbar(capacitor.current, 0, capacitor.max, 12, { block: '🟩', empty: '⬛' })}`, 
                  inline: false 
                },
                { 
                  name: `T[${cutPoint(temperature.current)}/${cutPoint(temperature.max)}] (${addPlus(cutPoint(object.currentCharacteristics.constant.heating))}/step)`, 
                  value: `${generateProgressbar(temperature.current, 0, temperature.max, 12, { block: '🟥', empty: '⬛' })}`, 
                  inline: true 
                },
              ],
            },
            ...(internalModules.length ? [{
              title: "Internal Modules",
              color: 0xADCDFF,
              fields: internalModules.map(formatModule),
            }] : []),
            ...(externalModules.length ? [{
              title: "External Modules",
              color: 0xFFB7AD,
              fields: externalModules.map(formatModule),
            }] : []),
            ...(otherModules.length ? [{
              title: "Other Modules",
              color: 0xF5FFAD,
              fields: otherModules.map(formatModule),
            }] : [])
          ]
        })
      });
    } catch (e) {
      console.error(e);
    } finally {
      sendShipData.prop('disabled', false);
    }
  })
}