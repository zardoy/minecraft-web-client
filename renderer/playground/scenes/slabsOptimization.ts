import { BasePlaygroundScene } from '../baseScene'

export default class extends BasePlaygroundScene {
  expectedNumberOfFaces = 30
  enableCameraOrbitControl = false

  setupWorld () {
    this.addWorldBlock(0, 1, 0, 'stone_slab')
    this.addWorldBlock(0, 0, 0, 'stone')
    this.addWorldBlock(0, -1, 0, 'stone_slab', { type: 'top', waterlogged: false })
    this.addWorldBlock(0, -1, -1, 'stone_slab', { type: 'top', waterlogged: false })
    this.addWorldBlock(0, -1, 1, 'stone_slab', { type: 'top', waterlogged: false })
    this.addWorldBlock(-1, -1, 0, 'stone_slab', { type: 'top', waterlogged: false })
    this.addWorldBlock(1, -1, 0, 'stone_slab', { type: 'top', waterlogged: false })
  }
}
