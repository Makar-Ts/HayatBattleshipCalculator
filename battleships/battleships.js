import { updateLoading } from "../js/loading.js";

let isReady = false;
let battleships = {};
let onReady = () => {};
let setReadyFunction = (func) => {
  onReady = func;
};

export default function init() {
  const loadBattleships = async (list) => {
    const externalSources = JSON.parse(localStorage.getItem('dataSources') ?? '[]');
    let externalParce = {};
    for (let source of externalSources) {
      if (!source.set.battleships) continue;

      const l = await (await fetch(source.url + '/battleships/battleships.json')).json();
      for (let [name, path] of Object.entries(l)) {
        externalParce[name] = source.url + "/battleships/" + path;
      }

      console.log(`External Data Source ${source.url} with ${Object.keys(l).length} battleships`)
    }

    const len = Object.keys(list).length + Object.keys(externalParce).length;
    let amount = 0;
    updateLoading('battleships', len, 0, 0);
    for (let [name, path] of Object.entries(list)) {
      const data = await (await fetch("./battleships/" + path)).json();

      battleships[name] = data;

      amount++;
      updateLoading('battleships', len, 0, amount);
    }

    for (let [name, path] of Object.entries(externalParce)) {
      const data = await (await fetch(path)).json();

      battleships[name] = data;

      amount++;
      updateLoading('battleships', len, 0, amount);
    }
  };

  fetch("./battleships/battleships.json")
    .then((response) => response.json())
    .then((v) => {
      loadBattleships(v)
        .then(() => {
          isReady = true;

          console.log(' ------ loaded battleships ------');
          console.log(battleships);

          onReady();
        })
        .catch((e) => {
          console.log(e);

          alert("Cannot load battleships data!");
        });
    })
    .catch((e) => {
      console.log(e);

      alert("Cannot load battleships paths!");
    });
}

export { isReady, battleships, setReadyFunction };
