import { point, calc } from "../../../libs/vector/vector.js";
import { mapProps } from "../grid.js";
import { objects, spatialGrid, toCanvas } from "../map.js";

export let getInArea = (x, y) => [];

export default function () {  
  const CLICK_AREA = 200;

  getInArea = (x, y) => {
    const clicked = [];
    const candidateIds = spatialGrid.queryCells(x, y, CLICK_AREA);

    for (let i of candidateIds) {
      if (objects[i].visible) {
        const length = toCanvas({ direction: calc(() => point(objects[i]._x, objects[i]._y) - point(x, y)) }).length;

        if (length <= CLICK_AREA) {
          clicked.push([objects[i], length]);
        }
      }
    }

    return clicked.toSorted((a, b) => a[1] - b[1]).map(v => v[0]);
  }

  return getInArea;
}