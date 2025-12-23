import { updateLoading } from "../js/loading.js";

let isReady = false;
let battleships = {};
let onReady = () => {};
let setReadyFunction = (func) => {
  onReady = func;
};

export default function init() {
  const loadBattleships = async (list) => {
    const len = Object.keys(list).length;
    let amount = 0;
    updateLoading('battleships', len, 0, 0);
    for (let [name, path] of Object.entries(list)) {
      const data = await (await fetch("./battleships/" + path)).json();

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
