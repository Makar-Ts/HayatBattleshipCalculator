import ENV from "../../enviroments/env.js";

export default function () {
  const version = document.createElement("span");
  version.textContent = `${ENV.CURRENT_VERSION} (sv ${ENV.SUPPORTED_SAVE_VERSION})`;
  version.classList.add("version");

  document.body.appendChild(version);
}