import { allLayers } from "../canvas/layers/layersInfoCollector.js";
import { EVENTS } from "../events.js";

let activeLayers = new Set();


function isFirstLetterUppercase(str) {
  if (!str || typeof str !== 'string') {
    return false;
  }
  const firstChar = str.charAt(0);
  return firstChar === firstChar.toUpperCase();
}


export default function init() {
  const button = $('#tab-render');
  const modal = $('#modal-render');

  const layersContainer = $('#modal-render-layers')[0];
  const classesContainer = $('#modal-render-classes')[0];

  activeLayers = structuredClone(allLayers);

  allLayers.forEach(v => {
    let container;
    if (isFirstLetterUppercase(v)) {
      container = classesContainer;
    } else {
      container = layersContainer;
    }

    let input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = activeLayers.has(v);
    input.dataset.layer = v;
    input.id = 'modal-render-layer-'+v
    input.onchange = () => {
      if (input.checked) {
        activeLayers.add(v);
      } else {
        activeLayers.delete(v);
      }

      document.dispatchEvent(new Event(EVENTS.MAP.REDRAW));
    }

    let label = document.createElement('label');
    label.innerText = v;
    label.setAttribute('for', 'modal-render-layer-'+v);

    container.appendChild(input);
    container.appendChild(label);
  })


  button.on('click', () => {
    const setTo = modal.attr("data-active") == "true" ? "false" : "true";
    modal.attr("data-active", setTo);
    button.attr("data-active", setTo);
  })
}


export { activeLayers };