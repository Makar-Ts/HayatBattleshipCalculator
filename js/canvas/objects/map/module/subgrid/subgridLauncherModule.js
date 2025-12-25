import { battleships } from "../../../../../../battleships/battleships.js";
import uuid, { uuidv4 } from "../../../../../../libs/uuid.js";
import { point } from "../../../../../../libs/vector/point.js";
import { EVENTS } from "../../../../../events.js";
import { createObject } from "../../../../../save&load/load.js";
import { registerClass } from "../../../../../save&load/objectCollector.js";
import BasicDataHud from "../../hud/basicDataHud.js";
import VectorHud from "../../hud/vectorHud.js";
import { ContactController } from "../../ship/hud/contactController.js";
import ShipStatsHUD from "../../ship/hud/shipStatsHud.js";
import SignatureShower from "../../ship/hud/signatureShower.js";
import SpriteShower from "../../spriteShow.js";
import { registerSteps } from "../../step/stepInfoCollector.js";
import BaseModule from "../baseModule.js";

export default class SubgridLauncherModule extends BaseModule {
  next() {
    super.next();

    if (this.state == "active" && this.parent) {
      const sequenceId = uuid();

      for (let [k, launcher] of Object.entries(this.characteristics.launcher.instances)) {
        const fireSegments = launcher.fire.type == "single" ? [launcher.fire.delay] : launcher.fire.delay;

        for (let delay of fireSegments) {
          const id = `SG[${sequenceId}] ${uuidv4()}`;
          const subgridData = battleships[launcher.subgrid.dataRef];


          const object = createObject(
            launcher.subgrid.class,
            this.parent._x, this.parent._y, 
            0, 0, 
            this, subgridData, { delay, correctionId: k }
          )

          this.applyCorrection(k, object);

          object.setChildren(MAP_OBJECTS_IDS.SHIP_STATS_HUD,     new ShipStatsHUD())
          object.setChildren(MAP_OBJECTS_IDS.DATA_HUD,           new BasicDataHud([
            { func: (hud) => `pos: ${Math.round(hud.parent._x)}m, ${Math.round(hud.parent._y)}m` },
            { func: (hud) => `speed: ${Math.round(hud.parent.velocity.length)}m/s` },
          ]))
          object.setChildren(MAP_OBJECTS_IDS.SPRITE, 
            new SpriteShower(
              './img/Projectail.svg', 
              '#ff0000',
              (object.size ?? 30) * 20,
            )
          )

          document.dispatchEvent(
            new CustomEvent(EVENTS.MAP.NEW, {
              detail: {
                object: object,
                id: id,
                redraw: false,
              },
            })
          );
        }
      }
    }
  }


  applyCorrection(correctionId, object) {
    if (!this.parent || !object) return;

    let heading = this.characteristics.launcher.heading;

    const launcher = this.characteristics.launcher.instances[correctionId];
    const headingOffset = launcher.headingOffset ?? 0;

    const offset = (object.size ?? 30) + (this.parent.size ?? 30) + 10 + (launcher.distanceOffset ?? 0);

    const dirRad = ((this.parent._direction + heading + headingOffset) / 180) * Math.PI;
    const globalOffset = point(
      offset * Math.sin(dirRad),
      offset * Math.cos(dirRad)
    );

    object._x = this.parent._x + globalOffset.x;
    object._y = this.parent._y + globalOffset.y;

    object.direction = this.parent.direction - (headingOffset + heading + (launcher.subgridRotation ?? 0));

    object.velocity = point(this.parent.velocity.x, this.parent.velocity.y);
    object.applyForce(point(launcher.vector?.[0] ?? 0, launcher.vector?.[1] ?? 0));
  }


  getOverridableValues() {
    return [
      ...super.getOverridableValues(),
      ...Object.entries(this.characteristics.launcher.instances).flatMap(([key, instance], index) => [
        {
          name: `instance-${index}-launchX`,
          type: "number",
          current: () => instance.vector?.[0] ?? 0,
          func: (val) => {
            if (!this.characteristics.launcher.instances[key].vector) {
              this.characteristics.launcher.instances[key].vector = [0, 0];
            }
            this.characteristics.launcher.instances[key].vector[0] = +val;
          },
        },
        {
          name: `instance-${index}-launchY`,
          type: "number",
          current: () => instance.vector?.[1] ?? 0,
          func: (val) => {
            if (!this.characteristics.launcher.instances[key].vector) {
              this.characteristics.launcher.instances[key].vector = [0, 0];
            }
            this.characteristics.launcher.instances[key].vector[1] = +val;
          },
        },
        {
          name: `instance-${index}-headingOffset`,
          type: "number",
          current: () => instance.headingOffset ?? 0,
          func: (val) => {
            this.characteristics.launcher.instances[key].headingOffset = +val;
          },
        },
        {
          name: `instance-${index}-distanceOffset`,
          type: "number",
          current: () => instance.distanceOffset ?? 0,
          func: (val) => {
            this.characteristics.launcher.instances[key].distanceOffset = +val;
          },
        },
      ]),
    ];
  }
}

registerClass(SubgridLauncherModule);
registerSteps(SubgridLauncherModule, 0, []);