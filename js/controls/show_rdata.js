import { getInArea } from "../canvas/map/get_in_area.js";
import { EVENTS } from "../events.js";
import { objects } from "../canvas/map.js";
import env from "../enviroments/env.js";
import format from "../../libs/format.js";
import { accordeonHTMLTemplate, registerInnerAccordeons } from "../ui/accordeon/accordeon.js";
import { enableModifyModal } from "../tab/modify/modify.js";
import { mapProps } from "../canvas/grid.js";

export default function init() {
  $("#relative > div > button").click(() => {
    let modal = $("#relative");

    modal.attr("data-active", modal.attr("data-active") == "true" ? "false" : "true");
  });

  let lastClicked = [];

  document.addEventListener(EVENTS.ON_MAP_CLICK, (e) => {
    const { x, y } = e.detail;

    if (Object.keys(objects).length <= 1) return;

    const clicked = getInArea(x * mapProps.size, y * mapProps.size);

    if (clicked.length == 0) return;

    showRelativeData(calculateRelativeData(clicked))

    lastClicked = clicked;
  });


  const calculateRelativeData = (clicked) => {
    const data = {};
    for (let obj1 of clicked) {
      const a = {};

      for (let obj2 of Object.values(objects)) {
        if (obj1.id == obj2.id) continue;

        const dx = obj2._x - obj1._x;
        const dy = obj2._y - obj1._y;

        const vel1 = obj1.velocity || {x: 0, y: 0};
        const vel2 = obj2.velocity || {x: 0, y: 0};

        const relVel = {
          x: vel2.x - vel1.x,
          y: vel2.y - vel1.y,
        };
        const relSpeed = Math.sqrt(relVel.x ** 2 + relVel.y ** 2);

        const r_mag = Math.sqrt(dx * dx + dy * dy);
        const cross = dx * relVel.y - dy * relVel.x;
        const angularVelocity = (cross / (r_mag * r_mag)) / Math.PI * 180;

        const distance = r_mag;
        const adir = -(
          Math.round((Math.atan2(obj1._x - obj2._x, obj1._y - obj2._y) / Math.PI) * 180) ||
            0
        );
        const rdir = adir - (obj1.direction || 0);

        a[obj2.id] = { relSpeed, angularVelocity, distance, adir, rdir };
      }

      data[obj1.id] = a;
    }

    return data
  } 


  document.addEventListener(EVENTS.CALCULATION_ENDED, (e) => {
    showRelativeData(calculateRelativeData(lastClicked));
  })

  const showRelativeData = (data) => {
    $("#relative").attr("data-active", "true")

    let text = "";
    for (let [id, objects] of Object.entries(data)) {
      let inner = "";
      for (let [rid, { relSpeed, angularVelocity, distance, adir, rdir }] of Object.entries(objects)) {
        const values = [
          ["rspeed",        `${Math.round(relSpeed * 100) / 100}m/s`],
          ["rspeed (step)", `${Math.round(relSpeed * env.STEP * 100) / 100}m/step`],
          ["angvel",        `${Math.round(angularVelocity * 10000) / 10000}deg/s`],
          ["angvel (step)", `${Math.round(angularVelocity  * env.STEP * 10000) / 10000}deg/step`],
          ["adir",          `${adir}deg`],
          ["rdir",          `${rdir}deg`],
          ["dist",          `${Math.round(distance * 10) / 10}m`],
        ]

        inner += format(
          accordeonHTMLTemplate, 
          `<a class="id-select-hyperlink">${rid}</a><label style="padding-left: 5px;">(${Math.round(distance * 10) / 10}m)</label>`, 
          `<div class="values">${values.map(([n, v]) => `<label>${n}</label><span>${v}</span>`).join('\n')}</div>`
        )
      }
      text += format(accordeonHTMLTemplate, id, inner)
    }

    $("#relative-contains").html(text)
    registerInnerAccordeons("#relative-contains")

    $('.id-select-hyperlink')
      .off('click')
      .on('click', (e) => {
        e.stopPropagation();

        enableModifyModal(e.target.innerText);
      })
  }
}