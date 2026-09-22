import { mapProps } from "../canvas/grid.js";
import { EVENTS } from "../events.js";
import { saveSettings, settings } from "../settings/settings.js";

/**
 * Утилита для рассылки события об изменении карты
 */
const dispatchMapChanged = () => {
  document.dispatchEvent(new CustomEvent(
    EVENTS.MAP_SET_CHANGED,
    {
      detail: {
        size: mapProps.size,
        grid: mapProps.grid,
      },
    }
  ));
};

/**
 * Описание всех настроек модального окна.
 *
 * Поля:
 *  - id            {string}   ID DOM-элемента (без #)
 *  - key           {string}   Ключ в объекте `settings`
 *  - type          {string}   'checkbox' | 'number' | 'text'
 *  - defaultValue  {*}        Значение по умолчанию (для number — fallback при NaN)
 *  - onChange      {Function} Побочный эффект после обновления settings
 */
const SETTINGS_BINDINGS = [
  {
    id: 'modal-settings-auto_focus',
    key: 'autoFocusOnSimulation',
    type: 'checkbox',
  },
  {
    id: 'modal-settings-auto_resize_grid',
    key: 'autoResizeGrid',
    type: 'checkbox',
    onChange: dispatchMapChanged,
  },
  {
    id: 'modal-settings-show_spatial_grid',
    key: 'showSpatialGrid',
    type: 'checkbox',
    onChange: dispatchMapChanged,
  },
  {
    id: 'modal-settings-alternate_layout',
    key: 'alternateLayout',
    type: 'checkbox',
    onChange: (value) => {
      if (value) {
        document.body.setAttribute('alternate-layout', '');
      } else {
        document.body.removeAttribute('alternate-layout');
      }
    },
  },
  {
    id: 'modal-settings-disable_jamming_visuals',
    key: 'disableJammingVisuals',
    type: 'checkbox',
    onChange: dispatchMapChanged,
  },
  {
    id: 'modal-settings-webhook_video_res',
    key: 'webhookVideoResolution',
    type: 'number',
    defaultValue: 1600,
  },
  {
    id: 'modal-settings-sim_speedup',
    key: 'physicsSimulationSpeedupMultiplier',
    type: 'number',
    defaultValue: 4,
  },
  {
    id: 'modal-settings-render_per_frame',
    key: 'renderPerFrame',
    type: 'number',
    defaultValue: 1,
  },
  {
    id: 'modal-settings-instant_sim',
    key: 'instantSimulation',
    type: 'checkbox',
  },
  {
    id: 'modal-settings-savestate',
    key: 'saveLastState',
    type: 'checkbox',
  },
  {
    id: 'modal-settings-savelogs',
    key: 'saveLogs',
    type: 'checkbox',
  },
  {
    id: 'modal-settings-hudsize',
    key: 'hudSize',
    type: 'text',
    onChange: dispatchMapChanged,
  },
];

/**
 * Универсальная привязка одной настройки к DOM-элементу.
 */
function bindSetting({ id, key, type, defaultValue, onChange }) {
  const $el = $(`#${id}`);
  if (!$el.length) return;

  const initial = settings[key] ?? defaultValue;

  if (type === 'checkbox') {
    $el.prop('checked', Boolean(initial));

    $el.on('change', () => {
      const value = $el.is(':checked');
      settings[key] = value;
      onChange?.(value);
      saveSettings();
    });

    return;
  }

  // number / text
  $el.val(initial == null ? '' : String(initial));

  $el.on('change', () => {
    const raw = $el.val();
    let value;

    if (type === 'number') {
      const parsed = Number(raw);
      value = Number.isNaN(parsed)
        ? (defaultValue ?? settings[key])
        : parsed;
    } else {
      value = raw;
    }

    settings[key] = value;
    onChange?.(value);
    saveSettings();
  });
}

/**
 * Логика табов внутри модалки.
 */
function setupTabs() {
  $('#modal-settings > *[data-tab-id]').hide();

  $('#tab-settings').on('click', () => {
    const $modal = $('#modal-settings');
    const setTo = $modal.attr('data-active') === 'true' ? 'false' : 'true';

    $modal.attr('data-active', setTo);
    $('#tab-settings').attr('data-active', setTo);
  });

  $('#modal-settings-nav > button').each((i, element) => {
    const $btn = $(element);
    const tabId = $btn.attr('data-tab');

    $btn.on('click', () => {
      $('#modal-settings > *[data-tab-id]').hide();
      $(`#modal-settings > *[data-tab-id="${tabId}"]`).show();
    });

    if (i === 0) {
      $(`#modal-settings > *[data-tab-id="${tabId}"]`).show();
    }
  });
}

/**
 * Поля разрешений + кнопка их применения.
 */
function setupResolutionInputs() {
  $('#modal-settings-mapres').val(settings.mapResolution);
  $('#modal-settings-gridres').val(settings.gridResolution);
  $('#modal-settings-overlayres').val(settings.overlayResolution);

  $('#modal-settings-updateres').on('click', () => {
    settings.mapResolution =
      $('#modal-settings-mapres').val() || settings.mapResolution;
    settings.gridResolution =
      $('#modal-settings-gridres').val() || settings.gridResolution;
    settings.overlayResolution =
      $('#modal-settings-overlayres').val() || settings.overlayResolution;

    dispatchMapChanged();
    saveSettings();
  });
}

export default function () {
  setupTabs();
  setupResolutionInputs();
  SETTINGS_BINDINGS.forEach(bindSetting);
}