import { battleships } from "../../battleships/battleships.js";
import { fromMapToOverlay, getMousePos, toRealDirection } from "../../libs/canvas.js";
import format from "../../libs/format.js";
import { tonnage } from "../../libs/hayat/battleships.js";
import uuidv4 from "../../libs/uuid.js";
import { modules } from "../../modules/modules.js";
import BasicDataHud from "../canvas/objects/map/hud/basicDataHud.js";
import BasicMovingObject from "../canvas/objects/map/basicMovingObject.js";
import BasicStaticObject from "../canvas/objects/map/basicStaticObject.js";
import BaseModule from "../canvas/objects/map/module/baseModule.js";
import ShipStatsHUD from "../canvas/objects/map/ship/hud/shipStatsHud.js";
import ShipObject from "../canvas/objects/map/ship/shipObject.js";
import SpriteShower from "../canvas/objects/map/spriteShow.js";
import CrosshairObject from "../canvas/objects/overlay/crosshair.js";
import { EVENTS } from "../events.js";
import { groupHTMLTemplate, optionHTMLTemplate, registerSelect } from "../ui/multilayered-select/multilayered-select.js";
import VectorHud from "../canvas/objects/map/hud/vectorHud.js";
import SignatureShower from "../canvas/objects/map/ship/hud/signatureShower.js";
import { settings } from "../settings/settings.js";
import { mapProps } from "../canvas/grid.js";
import { ContactController } from "../canvas/objects/map/ship/hud/contactController.js";
import MAP_OBJECTS_IDS from "../canvas/objects/map/mapObjectsIds.constant.js";

const SPRITES = [
  "ADS.png",
  "Asteroid_Station_Icon.png",
  "Battlecruiser.png",
  "Battleship.png",
  "Covert_border.png",
  "Cruiser.png",
  "Dreadnought.png",
  "Fortifying.png",
  "Orbis.png",
  "Outpost.png",
  "Titan.png",
  "assassin.png",
  "barge.png",
  "cfvoVs3.png",
  "corvete.png",
  "destroer.png",
  "frigate.png",
  "ind-ADS.png",
  "ind-flagman.png",
  "ind-frigate.png",
  "mining.png",
  "pirate-timed.png",
  "planetary-data-unknown-mission.png",
  "rescue-mission.png",
  "shuttle.png",
  "unknown-mission.png"
];

export default function init() {
  $('#modal-new_object-img').html(SPRITES.map(v => `<option value='${v}'>${v.split('.').slice(undefined, -1).join('.')}</option>`))
  $('#modal-new_object-ships > .options').html(
    Object.keys(battleships)
      .reduce((acc, v) => {
        const t = battleships[v].constant.body.tonnage;
        const f = acc.find(v => v.tonnage == t)
        if (f) {
          f.battleships.push(v);
        } else {
          acc.push({
            tonnage: t,
            battleships: [v],
          })
        }

        return acc;
      }, [])
      .sort((a, b) => a.tonnage - b.tonnage)
      .map(r => 
        format(
          groupHTMLTemplate, 
          tonnage[r.tonnage], 
          r.battleships.map(v => 
            format(optionHTMLTemplate, v, v)
          ).join('\n')
        )
      ).join('\n')
  )
  registerSelect('#modal-new_object-ships');

  $("#tab-new_object").click(() => {
    let modal = $("#modal-new_object");

    if (modal.attr("data-active") == "true") {
      modal.attr("data-active", "false");

      is_aiming = false;
      $('#modal-new_object-aim').attr('data-active', "false")
      document.dispatchEvent(
        new CustomEvent(EVENTS.OVERLAY.DELETE, {
          detail: {
            id: "modal-new_object-crosshair",
            redraw: true,
          },
        })
      );
    } else {
      modal.attr("data-active", "true");

      document.dispatchEvent(
        new CustomEvent(EVENTS.OVERLAY.NEW, {
          detail: {
            object: new CrosshairObject(500, 500),
            id: "modal-new_object-crosshair",
            redraw: false,
          },
        })
      );

      onPosChange()
    }
  });

  const onPosChange = () => {
    let x = +$("#modal-new_object-x").val() || 500;
    let y = +$("#modal-new_object-y").val() || 500;

    document.dispatchEvent(
      new CustomEvent(EVENTS.OVERLAY.FUNCTION, {
        detail: {
          id: "modal-new_object-crosshair",
          func: "moveTo",
          attr: [ x, y ],
          redraw: true,
        },
      })
    );
  };

  $("#modal-new_object-x").on('input', onPosChange);
  $("#modal-new_object-y").on('input', onPosChange);

  let is_aiming = false;
  $('#modal-new_object-aim').click(() => {
    is_aiming = !is_aiming;

    $('#modal-new_object-aim').attr('data-active', is_aiming ? "true" : "false")
  })

  $('#overlay').click(() => {
    is_aiming = false;

    $('#modal-new_object-aim').attr('data-active', "false")
  })

  $('#overlay').mousemove((e) => {
    if (!is_aiming) return;

    const { x, y } = getMousePos($('#overlay')[0], e);

    $("#modal-new_object-x").val(x * mapProps.size);
    $("#modal-new_object-y").val(y * mapProps.size);
    onPosChange();
  })

  $('#modal-new_object-is_dynamic').on('change', () => {
    const chk = $('#modal-new_object-is_dynamic').is(':checked');

    $("#modal-new_object-vel").prop('disabled', !chk);
    $("#modal-new_object-dir").prop('disabled', !chk);
    $('#modal-new_object-ships').prop('disabled', !chk);
  })


  $('#modal-new_object-complete').click(() => {
    let x = +$("#modal-new_object-x").val() || 500;
    let y = +$("#modal-new_object-y").val() || 500;
    let vel = +$("#modal-new_object-vel").val() || 0;
    let dir = +$("#modal-new_object-dir").val() || 0;
    let id = $('#modal-new_object-id').val() || uuidv4();
    let isDynamic = $('#modal-new_object-is_dynamic').is(':checked');

    let obj;
    if (!isDynamic) {
      obj = new BasicStaticObject(x, y);
      obj.setChildren(MAP_OBJECTS_IDS.DATA_HUD, new BasicDataHud([
        { func: (hud) => `${hud.parent.id}` },
        { func: (hud) => `pos: ${Math.round(hud.parent._x)}m, ${Math.round(hud.parent._y)}m` },
      ]))
    } else {
      obj = new ShipObject(x, y, dir, vel, battleships[$('#modal-new_object-ships').attr('value')] || {});
      obj.addModule(new BaseModule(modules['test']))
      obj.setChildren(MAP_OBJECTS_IDS.CONTACT_CONTROLLER, new ContactController())
      obj.setChildren(MAP_OBJECTS_IDS.SHIP_STATS_HUD,     new ShipStatsHUD())
      obj.setChildren(MAP_OBJECTS_IDS.VECTOR_HUD,         new VectorHud())
      obj.setChildren(MAP_OBJECTS_IDS.SIGNATURE_HUD,      new SignatureShower())
      obj.setChildren(MAP_OBJECTS_IDS.DATA_HUD,           new BasicDataHud([
        { func: (hud) => `${hud.parent.id}` },
        { func: (hud) => `pos: ${Math.round(hud.parent._x)}m, ${Math.round(hud.parent._y)}m` },
        { func: (hud) => `vel: ${Math.round(hud.parent.velocity.x)}m/s, ${Math.round(hud.parent.velocity.y)}m/s` },
        { func: (hud) => `speed: ${Math.round(hud.parent.velocity.length)}m/s` },
        { func: (hud) => `dir: ${Math.round(hud.parent.direction)}deg` },
        { func: (hud) => `vdir: ${toRealDirection(Math.round(Math.atan2(hud.parent.velocity.x, hud.parent.velocity.y) / Math.PI * 180) || 0)}deg` }
      ]))
    }

    obj.setChildren(
      MAP_OBJECTS_IDS.SPRITE, 
      new SpriteShower(
        './img/'+$('#modal-new_object-img').val(), 
        '#'+($('#modal-new_object-img-color').val() || 'ffffff'),
        $('#modal-new_object-img-size').val() || 200,
      )
    )

    document.dispatchEvent(
      new CustomEvent(EVENTS.MAP.NEW, {
        detail: {
          object: obj,
          id: id,
          redraw: true,
        },
      })
    );

    $("#modal-new_object").attr("data-active", "false");
    is_aiming = false;
    $('#modal-new_object-aim').attr('data-active', "false")
    document.dispatchEvent(
      new CustomEvent(EVENTS.OVERLAY.DELETE, {
        detail: {
          id: "modal-new_object-crosshair",
          redraw: true,
        },
      })
    );
  })
}
