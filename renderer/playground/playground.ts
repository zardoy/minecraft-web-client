import { BasePlaygroundScene } from './baseScene'
import { playgroundGlobalUiState } from './playgroundUi'
import * as scenes from './scenes'

const qsScene = new URLSearchParams(window.location.search).get('scene')
const Scene: typeof BasePlaygroundScene = qsScene ? scenes[qsScene] : scenes.main
playgroundGlobalUiState.scenes = ['main', 'railsCobweb', 'floorRandom', 'lightingStarfield', 'transparencyIssue', 'entities', 'frequentUpdates', 'slabsOptimization', 'allEntities', 'geometryExport']
playgroundGlobalUiState.selected = qsScene ?? 'main'

const scene = new Scene()
globalThis.scene = scene
