import { mapProps } from "../canvas/grid.js";
import { EVENTS } from "../events.js";
import { settings } from "../settings/settings.js";

export default function () {
  $('#tab-settings').on('click', () => {
    let modal = $("#modal-settings");

    modal.attr("data-active", modal.attr("data-active") == "true" ? "false" : "true");
  })

  $('#modal-settings-mapres').val(settings.mapResolution);
  $('#modal-settings-gridres').val(settings.gridResolution);
  $('#modal-settings-overlayres').val(settings.overlayResolution);

  $('#modal-settings-updateres').on('click', () => {
    settings.mapResolution = $('#modal-settings-mapres').val() || settings.mapResolution;
    settings.gridResolution = $('#modal-settings-gridres').val() || settings.gridResolution;
    settings.overlayResolution = $('#modal-settings-overlayres').val() || settings.overlayResolution;

    document.dispatchEvent(new CustomEvent(
      EVENTS.MAP_SET_CHANGED,
      {
        detail: {
          size: mapProps.size,
          grid: mapProps.grid,
        },
      }
    ))
  })

  $('#modal-settings-savestate').prop('checked', settings.saveLastState);
  $('#modal-settings-savestate').on('change', (e) => {
    settings.saveLastState = $('#modal-settings-savestate').is(':checked');
  })

  $('#modal-settings-hudsize').val(settings.hudSize);
  $('#modal-settings-hudsize').on('change', (e) => {
    settings.hudSize = e.target.value;

    document.dispatchEvent(new CustomEvent(
      EVENTS.MAP_SET_CHANGED,
      {
        detail: {
          size: mapProps.size,
          grid: mapProps.grid,
        },
      }
    ))
  })
}