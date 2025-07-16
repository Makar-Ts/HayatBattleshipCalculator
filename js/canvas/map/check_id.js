import { objects } from "../map.js";

export let check_id = (id) => Boolean;

export default function () {  
  check_id = (id) => {
    return Object.keys(objects).includes(id);
  }

  return check_id;
}