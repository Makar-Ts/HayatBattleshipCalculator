import { addPlus } from "../../libs/format.js";
import { generateProgressbar } from "../../libs/generateProgressbar.js";
import { overheatDamage, passiveBarrierRegeneration, tonnage } from "../../libs/hayat/battleships.js";
import { point } from "../../libs/vector/point.js";
import { drawGrid, mapProps } from "../canvas/grid.js";
import { canvas, drawObjects, objects, style, currentlySimulatedFrame } from "../canvas/map.js";
import { check_id } from "../canvas/map/check_id.js";
import { getInArea } from "../canvas/map/get_in_area.js";
import MAP_OBJECTS_IDS from "../canvas/objects/map/mapObjectsIds.constant.js";
import ShipObject from "../canvas/objects/map/ship/shipObject.js";
import SubgridObject from "../canvas/objects/map/ship/subgrid/subgridObject.js";
import SpriteShower from "../canvas/objects/map/spriteShow.js";
import { computeCenteredSquare } from "../controls/map.js";
import { calculateRelativeData } from "../controls/show_rdata.js";
import ENV from "../enviroments/env.js";
import { EVENTS } from "../events.js";
import { activeLayers } from "./render.js";
import { settings } from "../settings/settings.js";


const states = {
  'offline': '⭕', 
  'online': '🔘', 
  'active': '🟢', 
  'overload': '💢'
}


export default function () {
  const button = $('#tab-webhook');
  const modal = $('#modal-webhook');
  const webhook = () => $('#modal-webhook-webhook').val();

  const sendCanvasButton = $('#modal-webhook-send_canvas');
  const recordStepVideoButton = $('#modal-webhook-record_step_video');
  const recordStepCountInput = $('#modal-webhook-record_step_count');

  let shouldRecordNextStepVideo = false;
  let mediaRecorder = null;
  let recordedChunks = [];
  let recordingCanvas = null;
  let recordingCtx = null;
  let originalPhysicsSpeed = null;
  let originalInstantSimulation = null;
  let stepsToRecord = 1;
  let remainingRecordingSteps = 0;
  let recordingStepNumber = 0;

  const resetVideoButton = () => {
    recordStepVideoButton.prop('disabled', false);
    recordStepVideoButton.text('Record Next Step Video');
  }

  const updateRecordButtonLabel = () => {
    if (mediaRecorder?.state === 'recording') {
      recordStepVideoButton.text(`Recording ${remainingRecordingSteps} step${remainingRecordingSteps === 1 ? '' : 's'}...`);
    } else if (mediaRecorder?.state === 'paused') {
      recordStepVideoButton.text(`Paused, ${remainingRecordingSteps} step${remainingRecordingSteps === 1 ? '' : 's'} left`);
    } else if (shouldRecordNextStepVideo) {
      recordStepVideoButton.text(`Waiting for next step...`);
    } else {
      recordStepVideoButton.text('Record Next Step Video');
    }
  }

  const createRecordingCanvas = () => {
    if (!recordingCanvas) {
      recordingCanvas = document.createElement('canvas');
      recordingCanvas.width = settings.webhookVideoResolution;
      recordingCanvas.height = settings.webhookVideoResolution;
      recordingCtx = recordingCanvas.getContext('2d');
    }
  }

  const updateRecordingCanvas = () => {
    if (!recordingCtx) return;

    const gridCanvas = document.getElementById('grid');
    const mapCanvas = document.getElementById('map');
    const overlayCanvas = document.getElementById('overlay');

    recordingCanvas.width = settings.webhookVideoResolution;
    recordingCanvas.height = settings.webhookVideoResolution;

    if (!gridCanvas || !mapCanvas || !overlayCanvas) return;

    recordingCtx.clearRect(0, 0, recordingCanvas.width, recordingCanvas.height);
    recordingCtx.fillStyle = '#000';
    recordingCtx.fillRect(0, 0, recordingCanvas.width, recordingCanvas.height);
    recordingCtx.drawImage(gridCanvas, 0, 0, recordingCanvas.width, recordingCanvas.height);
    recordingCtx.drawImage(mapCanvas, 0, 0, recordingCanvas.width, recordingCanvas.height);
    
    if (recordingStepNumber > 0) {
      const scale = recordingCanvas.width / 1600;

      const fontSize = 32 * scale;
      const x = 20 * scale;
      const margin = 10 * scale;
      const lineHeight = 30 * scale;

      recordingCtx.font = `bold ${fontSize}px Consolas, monospace`;
      recordingCtx.textAlign = 'left';
      recordingCtx.textBaseline = 'top';

      const dt = ENV.STEP / ENV.PHYSICS_ENGINE_STEPS;
      const line1 = `Step ${recordingStepNumber} | ${(currentlySimulatedFrame * dt).toFixed(4)}s [${String(currentlySimulatedFrame).padStart(String(ENV.PHYSICS_ENGINE_STEPS).length, "0")}]`;
      const line2 = `────────────────────`;
      const line3 = `${ENV.CURRENT_VERSION} (sv ${ENV.SUPPORTED_SAVE_VERSION})`;

      const metrics = [
        recordingCtx.measureText(line1).width,
        recordingCtx.measureText(line2).width,
        recordingCtx.measureText(line3).width,
      ];

      const width = Math.max(...metrics) + margin * 2;
      const height = fontSize * 3 + lineHeight * 2 + margin * 2;

      const y = recordingCanvas.height - height - 20 * scale;

      recordingCtx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      recordingCtx.fillRect(x - margin, y - margin, width, height);

      recordingCtx.fillStyle = '#fff';
      recordingCtx.fillText(line1, x, y);
      recordingCtx.fillText(line2, x, y + lineHeight);
      recordingCtx.fillText(line3, x, y + lineHeight * 2);
    }

    recordingCanvas.requestFrame?.();
  }

  const enableRecordingSimulationSpeed = () => {
    originalPhysicsSpeed = settings.physicsSimulationSpeedupMultiplier;
    originalInstantSimulation = settings.instantSimulation;
    settings.physicsSimulationSpeedupMultiplier = 1;
    settings.instantSimulation = false;
  }

  const restoreSimulationSpeed = () => {
    if (originalPhysicsSpeed !== null) {
      settings.physicsSimulationSpeedupMultiplier = originalPhysicsSpeed;
      originalPhysicsSpeed = null;
    }
    if (originalInstantSimulation !== null) {
      settings.instantSimulation = originalInstantSimulation;
      originalInstantSimulation = null;
    }
  }


  const downloadVideo = (blob, filename = "battle-step.webm") => {
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";

    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const uploadStepVideo = async (blob) => {
    if (!webhook()) {
      downloadVideo(blob);
      return;
    }

    const formData = new FormData();
    formData.append("file", blob, "battle-step.webm");

    try {
      const response = await fetch(webhook(), {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        console.log("Step video successfully sent!");
      } else {
        console.error("Video upload failed:", response.status);
        downloadVideo(blob);
      }
    } catch (err) {
      console.error("Network error:", err);
      downloadVideo(blob);
    }
  };

  const startStepVideoRecording = () => {
    createRecordingCanvas();
    updateRecordingCanvas();
    enableRecordingSimulationSpeed();

    if (!recordingCanvas?.captureStream) {
      console.warn('Canvas captureStream is not supported in this browser.');
      resetVideoButton();
      restoreSimulationSpeed();
      return;
    }

    const stream = recordingCanvas.captureStream(25);
    recordedChunks = [];

    try {
      mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
    } catch {
      try {
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      } catch (innerError) {
        console.error('MediaRecorder initialization failed:', innerError);
        restoreSimulationSpeed();
        resetVideoButton();
        return;
      }
    }

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      await uploadStepVideo(blob);
      restoreSimulationSpeed();
      resetVideoButton();
    };

    mediaRecorder.start();
    recordingStepNumber = 1;
    recordStepVideoButton.prop('disabled', true);
    recordingCanvas.requestFrame?.();
    updateRecordButtonLabel();
  };

  const resumeStepVideoRecording = () => {
    if (!mediaRecorder || mediaRecorder.state !== 'paused') return;
    recordingStepNumber += 1;
    try {
      mediaRecorder.resume();
    } catch (error) {
      console.error('Failed to resume MediaRecorder:', error);
    }
    updateRecordButtonLabel();
  };

  const pauseStepVideoRecording = () => {
    if (!mediaRecorder || mediaRecorder.state !== 'recording') return;
    try {
      mediaRecorder.pause();
    } catch (error) {
      console.error('Failed to pause MediaRecorder:', error);
    }
    updateRecordButtonLabel();
  };

  const stopStepVideoRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    } else {
      restoreSimulationSpeed();
      resetVideoButton();
    }
    recordingStepNumber = 0;
  };

  recordStepVideoButton.on('click', () => {
    if (!webhook()) return;
    if (mediaRecorder?.state === 'recording') return;

    stepsToRecord = parseInt(recordStepCountInput.val(), 10) || 1;
    stepsToRecord = Math.max(1, stepsToRecord);
    shouldRecordNextStepVideo = true;
    remainingRecordingSteps = 0;

    updateRecordButtonLabel();
  });

  button.on('click', () => {
    const setTo = modal.attr("data-active") == "true" ? "false" : "true";
    modal.attr("data-active", setTo);
    button.attr("data-active", setTo);
  })


  sendCanvasButton.on('click', () => {
    if (!webhook()) return;

    const computed = computeCenteredSquare();

    if (!computed) {
      alert('No object on the map')
      return;
    }

    const size = { 
      size: computed.size, 
      grid: mapProps.grid ?? 500, 
      offset: { 
        x: -computed.x,
        y: -computed.y
      },
      byControl: true,
    }

    const canvas = document.createElement('canvas');
    canvas.width = 3000;
    canvas.height = 3000;
    const ctx = canvas.getContext("2d");


    let raito = canvas.width / size.size;
    const toCanvas = (pos) => {
      if (typeof pos === "number") {
        return pos * raito;
      } else if (typeof pos === "object") {
        let x = null, y = null;
        let direction = false;

        if ('point' in pos) {
          x = pos.point.x;
          y = pos.point.y;
        } else if ('direction' in pos) {
          x = pos.direction.x;
          y = pos.direction.y;
          direction = true;
        } else {
          x = pos.x ?? null;
          y = pos.y ?? null;
        }
        
        if (direction) {
          return point((x ?? 0) * raito, (y ?? 0) * raito);
        } else if (x !== null && y !== null) {
          return point((size.offset.x + x) * raito, (size.offset.y + y) * raito);
        } else if (x !== null) {
          return (size.offset.x + x) * raito;
        } else if (y !== null) {
          return (size.offset.y + y) * raito;
        }
      }
    };


    console.log(size)
    drawGrid(canvas, ctx, toCanvas, size.size, size.grid, size.offset);
    drawObjects(canvas, ctx, toCanvas, style, activeLayers);


    sendCanvasButton.prop("disabled", true);
    canvas.toBlob(async (blob) => {
      const formData = new FormData();
      formData.append('file', blob, 'battlemap.png');

      try {
        const response = await fetch(webhook(), {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          console.log('Успешно отправлено!');
        } else {
          console.error('Ошибка:', response.status);
        }
      } catch (err) {
        console.error('Ошибка сети:', err);
      } finally {
        sendCanvasButton.prop("disabled", false);
      }
    }, 'image/png');
  })



  const id = $('#modal-webhook-id');
  const aim = $('#modal-webhook-aim');
  let isAiming = false;
  
  aim.on('click', () => {
    isAiming = !isAiming;

    aim.attr("data-active", isAiming ? "true" : "false");
  })

  document.addEventListener(EVENTS.ON_MAP_CLICK, (e) => {
    if (!isAiming) return;

    const clicked = getInArea(e.detail.x, e.detail.y);

    if (clicked.length == 0) return;

    id.val(clicked[0].id);
  });


  const sendShipData = $('#modal-webhook-send_ship_data');

  document.addEventListener(EVENTS.MAP.STEP, () => {
    if (mediaRecorder?.state === 'paused' && remainingRecordingSteps > 0) {
      resumeStepVideoRecording();
      return;
    }

    if (!shouldRecordNextStepVideo) return;

    shouldRecordNextStepVideo = false;
    remainingRecordingSteps = stepsToRecord;
    startStepVideoRecording();
    updateRecordButtonLabel();
  });

  document.addEventListener(EVENTS.MAP.REDRAW_COMPLETED, () => {
    if (mediaRecorder?.state === 'recording') {
      updateRecordingCanvas();
    }
  });

  document.addEventListener(EVENTS.CALCULATION_ENDED, () => {
    if (mediaRecorder?.state === 'recording') {
      remainingRecordingSteps = Math.max(0, remainingRecordingSteps - 1);
      if (remainingRecordingSteps <= 0) {
        updateRecordingCanvas();
        requestAnimationFrame(() => stopStepVideoRecording());
      } else {
        pauseStepVideoRecording();
      }
    } else {
      restoreSimulationSpeed();
    }
  });

  sendShipData.on('click', async () => {
    if (!webhook()) return;
    if (!check_id(id.val())) return;

    /**
     * @type { ShipObject | SubgridObject }
     */
    const object = objects[id.val()];

    const cutPoint = (n) => Math.round(n * 1000) / 1000;

    const barrier = {
      current: object.currentCharacteristics.dynamic.hp.barrier,
      max: object.baseCharacteristics.dynamic.hp.barrier
    }
    const armor = {
      current: object.currentCharacteristics.dynamic.hp.armor,
      max: object.baseCharacteristics.dynamic.hp.armor
    }
    const hull = {
      current: object.currentCharacteristics.dynamic.hp.hull,
      max: object.baseCharacteristics.dynamic.hp.hull
    }

    const capacitor = {
      current: object.currentCharacteristics.constant.capacitor.charge,
      max: object.baseCharacteristics.constant.capacitor.charge
    }
    const temperature = {
      current: object.currentCharacteristics.dynamic.temperature,
      max: object.baseCharacteristics.constant.temperature
    }

    /** @type { SpriteShower } */
    const image = object.children.image;


    const { internalModules, externalModules, otherModules } = object;
    const formatModule = r => {
      const changeTask = object.tasks.find(v => v.id == "changeModuleState-"+r.uuid && v.data.uuid == r.uuid)

      return { 
        name: `${
          states[r.state] + (changeTask ? '>' + states[changeTask.data.state] : "")
        } ${r.characteristics.main.name}`, 
        value: r.characteristics.modificators[r.state]
          .map(v => `__${
            v.characteristic.startsWith('constant.') ? 'const' : 'dnmc'
          }__ | **${
            v.target}${v.affectedLayers ? '['+v.affectedLayers.join(', ')+']' : ''
          }** | ${v.characteristic.replaceAll('constant.', '')} | **${
          v.modificationType == "percent" 
            ? addPlus(Math.round((v.modificator - 1)*100))+"%" 
            : addPlus(v.modificator)
          }** | ${v.isAffectedByInterference ? '♒︎' : '══'}`)
          .join('\n'), 
        inline: false 
      }
    }

    const percent = (cur, max) => max ? Math.round((cur / max) * 1000) / 10 : 0;
    const limitLines = (lines, maxLen = 900) => {
      let len = 0;
      const out = [];

      for (let line of lines) {
        const nextLen = len + line.length + (out.length ? 1 : 0);
        if (nextLen > maxLen) {
          out.push("...");
          break;
        }

        out.push(line);
        len = nextLen;
      }

      return out.join('\n');
    }
    const formatSection = (lines, fallback = "- Нет данных") => {
      if (!lines.length) return fallback;
      return limitLines(lines);
    }

    const lineToField = (line, inline=false) => {
      const trimmed = line.replace(/^\s*-\s*/, '').trim();
      const idx = trimmed.indexOf(':');

      if (idx === -1) {
        return { name: trimmed || "Нет данных", value: "\u200B", inline: inline };
      }

      const name = trimmed.slice(0, idx).trim();
      const value = trimmed.slice(idx + 1).trim();

      return {
        name: name || "Нет данных",
        value: value || "\u200B",
        inline: inline,
      };
    };

    const linesToFields = (lines, fallbackName = "Нет данных", inline = false) => {
      if (!lines.length) {
        return [{ name: fallbackName, value: "\u200B", inline: inline }];
      }

      return lines.map(a => lineToField(a, inline));
    };

    const shipBodyBase = object.baseCharacteristics.constant.body;
    const shipBody = object.currentCharacteristics.constant.body;
    const shipClass = tonnage[shipBodyBase.tonnage] ?? shipBodyBase.tonnage;

    const speed = object.velocity?.length ?? 0;
    const direction = object.direction ?? 0;
    const stepSize = object._step || 1;
    const turn = stepSize ? Math.round((object._livetime ?? 0) / stepSize) : 0;

    const contactController = object.children?.[MAP_OBJECTS_IDS.CONTACT_CONTROLLER];
    const target = contactController?.target || null;

    const barrierRegen = barrier.max > 0
      ? passiveBarrierRegeneration(
        object.currentCharacteristics.constant.barrier,
        barrier.current,
        barrier.max
      )
      : 0;
    const heating = object.currentCharacteristics.constant.heating;
    const generation = object.currentCharacteristics.constant.capacitor.generation;
    const overheat = temperature.max > 0 && temperature.current > temperature.max
      ? overheatDamage(
        object.currentCharacteristics.constant.hp.hull,
        temperature.current,
        temperature.max
      )
      : 0;

    const stateLines = [
      `- ⚡ Скорость: **${cutPoint(speed)} м/с** | Курс: **${cutPoint(direction)}°**`,
      `- 🚀 Ускорение: **${cutPoint(object.currentCharacteristics.constant.acceleration)} м/с²** | Манёвренность: ${cutPoint(object.currentCharacteristics.constant.maneuverability)} (${addPlus(object.dices.maneuvering)})`,
      `- 📡 Сигнатура: **${cutPoint(shipBody.signature)} м** | Масса: ${cutPoint(shipBody.mass)}`,
      `- 👁️ Сенсоры: ${cutPoint(object.currentCharacteristics.constant.sensors_power)} | Захват: **${cutPoint(object.currentCharacteristics.constant.capture_range)} м**`,
    ];

    if (shipBody.subgrid?.fuel !== undefined && shipBody.subgrid.fuel !== -1) {
      stateLines.push(
        `- ⛽ Топливо: **${cutPoint(object.currentCharacteristics.dynamic.fuel)}/${cutPoint(shipBody.subgrid.fuel)} сек.**`
      );
    }

    
    const moduleSummary = {};
    const allModules = [...internalModules, ...externalModules, ...otherModules];
    for (let m of allModules) {
      const mods = m.characteristics.modificators[m.state] || [];
      const isExternal = mods.some(v => v.target && v.target != "this");
      const key = `${m.state}|${m.characteristics.main.name}|${isExternal ? 'ext' : 'self'}`;

      if (!moduleSummary[key]) {
        moduleSummary[key] = {
          state: m.state,
          name: m.characteristics.main.name,
          count: 0,
          external: isExternal,
        };
      }

      moduleSummary[key].count += 1;
    }

    const stateOrder = ["active", "overload", "online", "offline"];
    const influenceLines = [
      `- 🧬 **Слоты:** внутр ${internalModules.length}/${object.currentCharacteristics.constant.slots.internal}, внеш ${externalModules.length}/${object.currentCharacteristics.constant.slots.external}`,
      ...Object.values(moduleSummary)
        .sort((a, b) => {
          const s = stateOrder.indexOf(a.state) - stateOrder.indexOf(b.state);
          if (s != 0) return s;
          return a.name.localeCompare(b.name);
        })
        .map((m) => {
          const count = m.count > 1 ? ` x${m.count}` : "";
          const prefix = m.external ? "🔗 " : "";
          return `- ${prefix}${states[m.state] ?? '⬛'} **${m.name}**${count}`;
        })
    ];

    const damageLabels = {
      kinetic: "Кинет",
      high_explosive: "Фугас",
      electro_magnetic: "ЭМ",
      thermal: "Терм",
    };

    const targetLines = [];
    let targetProgressFields = [];

    if (target) {
      const relData = calculateRelativeData(object, target);

      targetLines.push(
        `- 🎯 Установлена: ${cutPoint(relData.distance)} м | ${relData.adir}° (${relData.rdir}° от текущего)`,
        `- 🔄 Угловая скорость: ${cutPoint(relData.angularVelocity)} °/с (${cutPoint(relData.angularVelocity * ENV.STEP)} °/шаг)`,
        `- 📏 Относительная скорость: ${cutPoint(relData.relSpeed)} м/с`,
        `- 📊 Качество контакта: ${cutPoint(object.dices.contactQuality ?? 0)} G`,
      );

      if (target.currentCharacteristics?.dynamic?.hp && target.baseCharacteristics?.dynamic?.hp) {
        const tBarrier = target.currentCharacteristics.dynamic.hp.barrier;
        const tArmor = target.currentCharacteristics.dynamic.hp.armor;
        const tHull = target.currentCharacteristics.dynamic.hp.hull;
        const tBarrierMax = target.baseCharacteristics.dynamic.hp.barrier;
        const tArmorMax = target.baseCharacteristics.dynamic.hp.armor;
        const tHullMax = target.baseCharacteristics.dynamic.hp.hull;

        targetProgressFields = [
          {
            name: `🛡️ B[${cutPoint(tBarrier)}/${cutPoint(tBarrierMax)}]`,
            value: generateProgressbar(tBarrier, 0, tBarrierMax, 7, { block: '🟦', empty: '⬛' }),
            inline: true
          },
          {
            name: `🧱 A[${cutPoint(tArmor)}/${cutPoint(tArmorMax)}]`,
            value: generateProgressbar(tArmor, 0, tArmorMax, 7, { block: '🟧', empty: '⬛' }),
            inline: true
          },
          {
            name: `⚙️ H[${cutPoint(tHull)}/${cutPoint(tHullMax)}]`,
            value: generateProgressbar(tHull, 0, tHullMax, 7, { block: '⬜', empty: '⬛' }),
            inline: true
          }
        ];
      }

      targetLines.push(`- ❓ Оснастка: скрыта (данных нет)`);
    } else {
      targetLines.push(`- 🚫 Цель не установлена`);
    }


    

    const stateFields = linesToFields(stateLines, "Нет данных", true);

    const shipHeaderParts = [
      `${object.name}`,
      shipClass ? `${shipClass}` : null,
      shipBodyBase.core ? `Ядро ${shipBodyBase.core}` : null,
    ].filter(Boolean);


    sendShipData.prop('disabled', true);
    try {
      await fetch(webhook(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username: shipHeaderParts.join(' | '),
          ...( image 
            ? {avatar_url: image.image.src.replace('http://127.0.0.1:5501/', 'https://makar-ts.github.io/HayatBattleshipCalculator/')} 
            : {}
          ),
          embeds: [
            {
              title: "Systems",
              color: 0x00FF00,
              fields: [ // 🟦 ⬛ 🟧 🟩 ⬜ 🟥
                { 
                  name: `🛡️ B[${cutPoint(barrier.current)}/${cutPoint(barrier.max)}]`, 
                  value: `${generateProgressbar(barrier.current, 0, barrier.max, 7, { block: '🟦', empty: '⬛' })}`, 
                  inline: true 
                },
                { 
                  name: `🧱 A[${cutPoint(armor.current)}/${cutPoint(armor.max)}]`, 
                  value: `${generateProgressbar(armor.current, 0, armor.max, 7, { block: '🟧', empty: '⬛' })}`, 
                  inline: true 
                },
                { 
                  name: `⚙️ H[${cutPoint(hull.current)}/${cutPoint(hull.max)}]`, 
                  value: `${generateProgressbar(hull.current, 0, hull.max, 7, { block: '⬜', empty: '⬛' })}`, 
                  inline: true 
                },
                
                { 
                  name: `🔋 C[${cutPoint(capacitor.current)}/${cutPoint(capacitor.max)}] (${addPlus(cutPoint(object.currentCharacteristics.constant.capacitor.generation))}/step)`, 
                  value: `${generateProgressbar(capacitor.current, 0, capacitor.max, 12, { block: '🟩', empty: '⬛' })}`, 
                  inline: false 
                },
                { 
                  name: `🔥 T[${cutPoint(temperature.current)}/${cutPoint(temperature.max)}] (${addPlus(cutPoint(object.currentCharacteristics.constant.heating))}/step)`, 
                  value: `${generateProgressbar(temperature.current, 0, temperature.max, 12, { block: '🟥', empty: '⬛' })}`, 
                  inline: true 
                },
              ],
            },
            {
              title: "State",
              color: 0x74B9FF,
              fields: stateFields,
            },
            ...(internalModules.length ? [{
              title: "Internal Modules",
              color: 0xADCDFF,
              fields: internalModules.map(formatModule),
            }] : []),
            ...(externalModules.length ? [{
              title: "External Modules",
              color: 0xFFB7AD,
              fields: externalModules.map(formatModule),
            }] : []),
            ...(otherModules.length ? [{
              title: "Other Modules",
              color: 0xF5FFAD,
              fields: otherModules.map(formatModule),
            }] : []),
            {
              title: "Target",
              color: 0xE67E22,
              fields: [
                ...targetProgressFields,
                ...linesToFields(targetLines, "Нет данных", true)
              ],
            },
          ]
        })
      });
    } catch (e) {
      console.error(e);
    } finally {
      sendShipData.prop('disabled', false);
    }
  })
}
