import { settings } from "../settings/settings.js";
import accordeon from "./accordeon/accordeon.js";
import multilayeredSelect from "./multilayered-select/multilayered-select.js";
import version from "./version/version.js";

export default function () {
  multilayeredSelect();
  accordeon();
  version();



  if (settings.alternateLayout) {
    document.body.setAttribute('alternate-layout', '');
  } else {
    document.body.removeAttribute('alternate-layout', '');
  }
}