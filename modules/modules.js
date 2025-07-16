import { updateLoading } from "../js/loading.js";

let isReady = false;
let modules = {};
let onReady = () => {};
let setReadyFunction = (func) => {
  onReady = func;
};

export default function init() {
  const loadModules = async (list) => {
    const len = Object.keys(list).length;
    let amount = 0;
    updateLoading('modules', len, 0, 0);
    for (let [name, path] of Object.entries(list)) {
      const data = await (await fetch("./modules/" + path)).json();

      modules[name] = data;

      amount++;
      updateLoading('modules', len, 0, amount);
    }
  };

  fetch("./modules/modules.json")
    .then((response) => response.json())
    .then((v) => {
      loadModules(v)
        .then(() => {
          isReady = true;

          console.log(modules);

          onReady();
        })
        .catch((e) => {
          console.log(e);

          alert("Cannot load modules data!");
        });
    })
    .catch((e) => {
      console.log(e);

      alert("Cannot load modules paths!");
    });
}

export { isReady, modules, setReadyFunction };