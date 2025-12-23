import { allLayers, classToLayers } from './layersInfoCollector.js'

export default function () {
  console.log(' ------ render layers ------ ')
  console.log(allLayers);
  console.log(classToLayers);
}