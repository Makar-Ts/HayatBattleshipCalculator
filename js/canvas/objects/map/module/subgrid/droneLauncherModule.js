import { clamp, clampCharacteristics } from "../../../../../../libs/clamp.js";
import { ObjectConnection } from "../../../../../../libs/connection.js";
import copy from "../../../../../../libs/copy.js";
import { mergeDeep } from "../../../../../../libs/deepMerge.js";
import { baseBattleshipCharacteristics, battleshipCharacteristicsClampRules } from "../../../../../../libs/hayat/battleships.js";
import { uuidv4 } from "../../../../../../libs/uuid.js";
import { point } from "../../../../../../libs/vector/point.js";
import { EVENTS } from "../../../../../events.js";
import { load } from "../../../../../save&load/load.js";
import { registerClass } from "../../../../../save&load/objectCollector.js";
import { objects } from "../../../../map.js";
import BasicDataHud from "../../hud/basicDataHud.js";
import MAP_OBJECTS_IDS from "../../mapObjectsIds.constant.js";
import { ContactController } from "../../ship/hud/contactController.js";
import ShipStatsHUD from "../../ship/hud/shipStatsHud.js";
import SignatureShower from "../../ship/hud/signatureShower.js";
import DroneObject from "../../ship/subgrid/drone/droneObject.js";
import SpriteShower from "../../spriteShow.js";
import { registerSteps } from "../../step/stepInfoCollector.js";
import BaseModule from "../baseModule.js";


function capitalizeFirstLetter(val) {
  return String(val).charAt(0).toUpperCase() + String(val).slice(1);
}


export class DroneLauncherModule extends BaseModule {
  launched = new ObjectConnection(() => objects);
  storedDrone = null;


  constructor(data) {
    super(data)

    data && (this.storedDrone = data.external.battleship_template.dynamicCharacteristics);
  }


  next() {
    super.next();

    if (!this.launched.Connection && ["online", "active", "overload"].includes(this.state) && this.parent) {
      const id = `${uuidv4()}`;
      const template = mergeDeep(copy(this.characteristics.external.battleship_template), {
        dynamicCharacteristics: this.storedDrone
      });

      const object = load(id, template, "module");
      object.id = id;
      object.active = true;
      object.controlledBy.storeConnection(this.path);

      this.applyCorrection(0, object);

      if (!object.children[MAP_OBJECTS_IDS.CONTACT_CONTROLLER])
        object.setChildren(MAP_OBJECTS_IDS.CONTACT_CONTROLLER, new ContactController())

      if (!object.children[MAP_OBJECTS_IDS.SIGNATURE_HUD])
        object.setChildren(MAP_OBJECTS_IDS.SIGNATURE_HUD,      new SignatureShower())

      if (!object.children[MAP_OBJECTS_IDS.SHIP_STATS_HUD])
        object.setChildren(MAP_OBJECTS_IDS.SHIP_STATS_HUD,     new ShipStatsHUD())

      if (!object.children[MAP_OBJECTS_IDS.DATA_HUD])
        object.setChildren(MAP_OBJECTS_IDS.DATA_HUD,           new BasicDataHud([
          { func: (hud) => `pos: ${Math.round(hud.parent._x)}m, ${Math.round(hud.parent._y)}m` },
          { func: (hud) => `speed: ${Math.round(hud.parent.velocity.length)}m/s` },
        ]))
      
      if (!object.children[MAP_OBJECTS_IDS.SPRITE])
        object.setChildren(MAP_OBJECTS_IDS.SPRITE, 
          new SpriteShower(
            './img/Apparatus.svg', 
            '#ff0000',
            (object.size ?? 30) * 10,
          )
        )

      object.afterLoad();
      
      const targetController = object.children[MAP_OBJECTS_IDS.CONTACT_CONTROLLER];
      const parentTargetController = this.parent.children[MAP_OBJECTS_IDS.CONTACT_CONTROLLER];
      targetController.clearTargets();
      if (parentTargetController.target) {
        targetController.addTarget(parentTargetController.target.id);
        targetController.addTarget(this.parent.id);
      }
        

      document.dispatchEvent(
        new CustomEvent(EVENTS.MAP.NEW, {
          detail: {
            object: object,
            id: id,
            redraw: false,
          },
        })
      );

      this.launched.Connection = object;
    }
  }


  step(index, objectsData) {
    if (index == 1 && !this.launched.Connection && this.characteristics.launcher.recovery) {
      const r = this.characteristics.launcher.recovery;
      console.log(this.storedDrone)

      this.storedDrone.fuel += r.fuel ?? 0;
      this.storedDrone.temperature += r.temperature ?? 0

      if (r.hp) {
        this.storedDrone.hp.hull += r.hp.hull ?? 0;
        this.storedDrone.hp.armor += r.hp.armor ?? 0;
        this.storedDrone.hp.barrier += r.hp.barrier ?? 0;
      }

      
      this.storedDrone = clampCharacteristics({
        dynamic: this.storedDrone,
        constant: this.characteristics.external.battleship_template.baseCharacteristics.constant,
      }, battleshipCharacteristicsClampRules).dynamic
    }
    
    return super.step(index, objectsData);
  }


  get backupDistance() {
    return this.characteristics.launcher.backupDistance;
  }

  applyCorrection(correctionId, object) {
    if (!this.parent || !object) return;
    
    const launcher = this.characteristics.launcher;

    let heading = launcher.heading;

    const offset = (object.size ?? 30) + (this.parent.size ?? 30) + 10 + (launcher.distanceOffset ?? 0);

    const dirRad = ((this.parent._direction + heading) / 180) * Math.PI;
    const globalOffset = point(
      offset * Math.sin(dirRad),
      offset * Math.cos(dirRad)
    );

    object._x = this.parent._x + globalOffset.x;
    object._y = this.parent._y + globalOffset.y;

    object.direction = this.parent.direction - (heading + (launcher.subgridRotation ?? 0));

    object.velocity = point(this.parent.velocity.x, this.parent.velocity.y);
    object.applyForce(point(launcher.vector?.[0] ?? 0, launcher.vector?.[1] ?? 0));
  }


  droneDestroyed() {
    this.launched.Connection = null;
    this.storedDrone = structuredClone(baseBattleshipCharacteristics.dynamic);
    this.setState("offline");
  }

  backup() {
    this.setState("offline");

    if (!this.launched.Connection) {
      return this.droneDestroyed();
    }

    /** @type {DroneObject} */
    const drone = this.launched.Connection;

    this.storedDrone = drone.currentCharacteristics.dynamic;
    this.launched.Connection = null;
  }


  getAdditionalInfo() {
    if (this.state !== "offline") return null;

    const generateProgressbar = (cur, min, max) => {
      const val01 = clamp((cur - min) / (max - min), 0, 1);

      const maxSquares = 25;
      const amount = Math.floor(val01 * maxSquares);

      return `|${'█'.repeat(amount)}${'&nbsp;'.repeat(maxSquares - amount)}|`
    }

    const maxFuel = this.characteristics.external.battleship_template.baseCharacteristics.constant.body.subgrid.fuel;
    const maxTemp = this.characteristics.external.battleship_template.baseCharacteristics.constant.temperature;
    const maxHP = this.characteristics.external.battleship_template.baseCharacteristics.constant.hp;

    return `
<div class="drone-launcher-additional-info">
    <span class="drone-launcher-additional-info-label">Fuel:</span>
    <span class="drone-launcher-additional-info-fuel"><span>${generateProgressbar(this.storedDrone.fuel, 0, maxFuel)}</span> ${this.storedDrone.fuel}/${maxFuel}</span>
    <span class="drone-launcher-additional-info-label">Temp.:</span>
    <span class="drone-launcher-additional-info-temperature"><span>${generateProgressbar(this.storedDrone.temperature, 0, maxTemp)}</span> ${this.storedDrone.temperature * 100}/${maxTemp * 100}</span>
    ${Object.keys(this.storedDrone.hp)
      .map(v => `<span class="drone-launcher-additional-info-label">${capitalizeFirstLetter(v)}:</span>
<span class="drone-launcher-additional-info-hp-${v}"><span>${generateProgressbar(this.storedDrone.hp[v], 0, maxHP[v])}</span> ${this.storedDrone.hp[v]}/${maxHP[v]}</span>`)
      .join('')
    }
</div>
    `
  }

  getOverridableValues() {
  return [
    ...super.getOverridableValues(),
      {
        name: "backupDistance",
        type: "number",
        current: () => this.characteristics.launcher.backupDistance,
        func: (val) => {
          this.characteristics.launcher.backupDistance = +val;
        },
      },
      {
        name: "recovery-fuel",
        type: "number",
        current: () => this.characteristics.launcher.recovery?.fuel ?? 0,
        func: (val) => {
          if (!this.characteristics.launcher.recovery) {
            this.characteristics.launcher.recovery = {};
          }
          this.characteristics.launcher.recovery.fuel = +val;
        },
      },
      {
        name: "recovery-temperature",
        type: "number",
        current: () => this.characteristics.launcher.recovery?.temperature ?? 0,
        func: (val) => {
          if (!this.characteristics.launcher.recovery) {
            this.characteristics.launcher.recovery = {};
          }
          this.characteristics.launcher.recovery.temperature = +val;
        },
      },
      {
        name: "recovery-hp-hull",
        type: "number",
        current: () => this.characteristics.launcher.recovery?.hp?.hull ?? 0,
        func: (val) => {
          if (!this.characteristics.launcher.recovery) {
            this.characteristics.launcher.recovery = {};
          }
          if (!this.characteristics.launcher.recovery.hp) {
            this.characteristics.launcher.recovery.hp = { hull: 0, armor: 0, barrier: 0 };
          }
          this.characteristics.launcher.recovery.hp.hull = +val;
        },
      },
      {
        name: "recovery-hp-armor",
        type: "number",
        current: () => this.characteristics.launcher.recovery?.hp?.armor ?? 0,
        func: (val) => {
          if (!this.characteristics.launcher.recovery) {
            this.characteristics.launcher.recovery = {};
          }
          if (!this.characteristics.launcher.recovery.hp) {
            this.characteristics.launcher.recovery.hp = { hull: 0, armor: 0, barrier: 0 };
          }
          this.characteristics.launcher.recovery.hp.armor = +val;
        },
      },
      {
        name: "recovery-hp-barrier",
        type: "number",
        current: () => this.characteristics.launcher.recovery?.hp?.barrier ?? 0,
        func: (val) => {
          if (!this.characteristics.launcher.recovery) {
            this.characteristics.launcher.recovery = {};
          }
          if (!this.characteristics.launcher.recovery.hp) {
            this.characteristics.launcher.recovery.hp = { hull: 0, armor: 0, barrier: 0 };
          }
          this.characteristics.launcher.recovery.hp.barrier = +val;
        },
      },
    ];
  }


  save(realParent = null) {
    return {
      ...super.save(realParent),
      launched: this.launched.Connection?.path ?? null,
      storedDrone: this.storedDrone,
    };
  }

  load(data) {
    super.load(data);
    
    this.launched.storeConnection(data.launched ?? null);
    this.storedDrone = data.storedDrone || structuredClone(baseBattleshipCharacteristics.dynamic);
  }

  afterLoad() {
    this.launched.forceLoadConnection(); // загружаем как объект

    super.afterLoad();
  }
}

registerClass(DroneLauncherModule);
registerSteps(DroneLauncherModule, 1, []);