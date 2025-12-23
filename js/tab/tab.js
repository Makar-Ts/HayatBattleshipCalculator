import map_set from './map_set.js'
import new_object from './new_object.js'
import render from './render.js'
import modify from './modify/modify.js'
import save from './save.js'
import settings from './settings.js'

export default function init() {
  settings();
  map_set();
  render();
  new_object();
  modify();
  save();
}