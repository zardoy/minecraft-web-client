import { Vec3 } from 'vec3'
import { BasePlaygroundScene } from '../baseScene'
import { webgpuChannel } from '../webgpuRendererMain'
import { defaultWebgpuRendererParams } from '../webgpuRendererShared'

export default class RailsCobwebScene extends BasePlaygroundScene {
  viewDistance = 16
  continuousRender = true
  targetPos = new Vec3(0, 0, 0)

  override initGui (): void {
    this.params = {
      chunkDistance: 4,
      orbit: false,
      worker: false,
      ...defaultWebgpuRendererParams
    }

    for (const key of Object.keys(defaultWebgpuRendererParams)) {
      this.onParamUpdate[key] = () => {
        webgpuChannel.updateConfig(this.params as any)
      }
    }

    this.paramOptions = {
      orbit: {
        reloadOnChange: true,
      },
      worker: {
        reloadOnChange: true,
      }
    }

    super.initGui() // restore user params

    this.enableCameraOrbitControl = this.params.orbit
  }

  setupWorld () {
    viewer.world.allowUpdates = false

    const chunkDistance = this.params.chunkDistance
    // const fullBlocks = loadedData.blocksArray.map(x => x.name)
    const fullBlocks = loadedData.blocksArray.filter(block => {
      const b = this.Block.fromStateId(block.defaultState, 0)
      if (b.shapes?.length !== 1) return false
      const shape = b.shapes[0]
      return shape[0] === 0 && shape[1] === 0 && shape[2] === 0 && shape[3] === 1 && shape[4] === 1 && shape[5] === 1
    })

    const squareSize = chunkDistance * 16
    // for (let y = 0; y < squareSize; y += 2) {
    //   for (let x = 0; x < squareSize; x++) {
    //     for (let z = 0; z < squareSize; z++) {
    //       const isEven = x === z
    //       if (y > 400) continue
    //       worldView!.world.setBlockStateId(this.targetPos.offset(x, y, z), isEven ? 1 : 2)
    //     }
    //   }
    // }

    for (let x = 0; x < chunkDistance; x++) {
      for (let z = 0; z < chunkDistance; z++) {
        for (let y = 0; y < 200; y++) {
          webgpuChannel.generateRandom(16 ** 2, x * 16, z * 16, y)
        }
      }
    }
  }
}
