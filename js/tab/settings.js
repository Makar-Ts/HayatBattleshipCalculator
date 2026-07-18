import { mapProps } from "../canvas/grid.js";
import { EVENTS } from "../events.js";
import { saveSettings, settings } from "../settings/settings.js";

export default function () {
  $('#modal-settings > *[data-tab-id]').hide();

  $('#tab-settings').on('click', () => {
    let modal = $("#modal-settings");

    const setTo = modal.attr("data-active") == "true" ? "false" : "true";
    modal.attr("data-active", setTo);
    $('#tab-settings').attr("data-active", setTo);
  })

  $('#modal-settings-nav > button').each((i ,element) => {
    const j = $(element);

    j.on('click', () => {
      $('#modal-settings > *[data-tab-id]').hide();
      $(`#modal-settings > *[data-tab-id="${j.attr('data-tab')}"]`).show();
    })

    if (i === 0) {
      $(`#modal-settings > *[data-tab-id="${j.attr('data-tab')}"]`).show();
    }
  });


  $('#modal-settings-mapres').val(settings.mapResolution);
  $('#modal-settings-gridres').val(settings.gridResolution);
  $('#modal-settings-overlayres').val(settings.overlayResolution);
  $('#modal-settings-auto_focus').prop('checked', settings.autoFocusOnSimulation);
  $('#modal-settings-auto_focus').on('change', (e) => {
    settings.autoFocusOnSimulation = $('#modal-settings-auto_focus').is(':checked');
    saveSettings();
  })
  $('#modal-settings-auto_resize_grid').prop('checked', settings.autoResizeGrid);
  $('#modal-settings-auto_resize_grid').on('change', (e) => {
    settings.autoResizeGrid = $('#modal-settings-auto_resize_grid').is(':checked');
    saveSettings();
  })

  $('#modal-settings-alternate_layout').prop('checked', settings.alternateLayout);
  $('#modal-settings-alternate_layout').on('change', (e) => {
    settings.alternateLayout = $('#modal-settings-alternate_layout').is(':checked');
    if (settings.alternateLayout) {
      document.body.setAttribute('alternate-layout', '');
    } else {
      document.body.removeAttribute('alternate-layout', '');
    }
      
    saveSettings();
  })


  $('#modal-settings-webhook_video_res').val(String(settings.webhookVideoResolution ?? 1600));
  $('#modal-settings-webhook_video_res').on('change', (e) => {
    settings.webhookVideoResolution = Number($('#modal-settings-webhook_video_res').val());
    saveSettings();
  })


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

    saveSettings();
  })


  $('#modal-settings-sim_speedup').val(settings.physicsSimulationSpeedupMultiplier);
  $('#modal-settings-sim_speedup').on('change', (e) => {
    const val = Number($('#modal-settings-sim_speedup').val());

    settings.physicsSimulationSpeedupMultiplier = Number.isNaN(val) ? 4 : val;
    saveSettings();
  })

  $('#modal-settings-render_per_frame').val(settings.renderPerFrame);
  $('#modal-settings-render_per_frame').on('change', (e) => {
    const val = Number($('#modal-settings-render_per_frame').val());

    settings.renderPerFrame = Number.isNaN(val) ? 1 : val;
    saveSettings();
  })

  $('#modal-settings-instant_sim').prop('checked', settings.instantSimulation);
  $('#modal-settings-instant_sim').on('change', (e) => {
    settings.instantSimulation = $('#modal-settings-instant_sim').is(':checked');
    saveSettings();
  })


  $('#modal-settings-savestate').prop('checked', settings.saveLastState);
  $('#modal-settings-savestate').on('change', (e) => {
    settings.saveLastState = $('#modal-settings-savestate').is(':checked');
    saveSettings();
  })

  $('#modal-settings-savelogs').prop('checked', settings.saveLogs);
  $('#modal-settings-savelogs').on('change', (e) => {
    settings.saveLogs = $('#modal-settings-savelogs').is(':checked');
    saveSettings();
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

    saveSettings();
  })
}