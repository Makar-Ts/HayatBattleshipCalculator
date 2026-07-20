import loading, { closeLoading, stepLoading, updateLoading } from './loading.js'
import grid from './canvas/grid.js'
import tab from './tab/tab.js'
import map from './canvas/map.js'
import overlay from './canvas/overlay.js'
import controls from './controls/controls.js'
import saveload from './save&load/main.js'
import loadBattleships, { setReadyFunction as battleshipsReady } from '../battleships/battleships.js'
import loadModules, { setReadyFunction as modulesReady } from '../modules/modules.js'
import ReadyFunctionsCombiner from '../libs/combineReadyFunctions.js'
import ui from './ui/ui.js'
import settings from './settings/settings.js'
import ENV from './enviroments/env.js';

console.log(` version ${ENV.CURRENT_VERSION}, supported saves ${ENV.SUPPORTED_SAVE_VERSION}+ `)
console.log(" ------ loading ------ ")

settings();
loading();

new ReadyFunctionsCombiner(() => {
  updateLoading('default', 7, 0, 0);

  console.log(" ------ init ------ ");

  ui();         stepLoading('default', 1);
  tab();        stepLoading('default', 1);
  controls();   stepLoading('default', 1);
  saveload();   stepLoading('default', 1);
  grid();       stepLoading('default', 1);
  overlay();    stepLoading('default', 1);
  map();        stepLoading('default', 1);

  closeLoading();
}, battleshipsReady, modulesReady)

loadBattleships();
loadModules();