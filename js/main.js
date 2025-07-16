import loading, { closeLoading } from './loading.js'
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

settings();
loading();

new ReadyFunctionsCombiner(() => {
  ui();
  tab();
  controls();
  saveload();
  grid();
  overlay();
  map();

  closeLoading();
}, battleshipsReady, modulesReady)

loadBattleships();
loadModules();