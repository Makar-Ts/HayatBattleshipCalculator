import { getJSONedData } from "../save&load/save.js";

let settings = {
  gridResolution: 2000,
  mapResolution: 8000,
  overlayResolution: 2000,

  hudSize: 1,

  saveLastState: true,
  lastState: "{}",
}

export default function () {
  for (let n in settings) {
    const val = localStorage.getItem(n);

    if (val) settings[n] = val;
  }

  window.addEventListener("beforeunload", function(e) {
    if (settings.saveLastState) settings.lastState = JSON.stringify(getJSONedData());

    for (let [n, v] of Object.entries(settings)) {
      localStorage.setItem(n, v);
    }
  });
}

export { settings }