/// <reference types="@webgpu/types" />
import * as THREE from 'three'
import * as tweenJs from '@tweenjs/tween.js'
import { BlockFaceType, BlockType, makeError } from './shared'
import { createWorkerProxy } from './workerProxy'
import { WebgpuRenderer } from './webgpuRenderer'
import { RendererParams } from './webgpuRendererShared'
import { ChunksStorage } from './chunksStorage'

export const chunksStorage = new ChunksStorage()

globalThis.allSides = chunksStorage.allSides

let animationTick = 0

const camera = new THREE.PerspectiveCamera(75, 1 / 1, 0.1, 10_000)
globalThis.camera = camera

let webgpuRenderer: WebgpuRenderer | undefined

const postMessage = (data, ...args) => {
  if (globalThis.webgpuRendererChannel) {
    globalThis.webgpuRendererChannel.port2.postMessage(data, ...args)
  } else {
    globalThis.postMessage(data, ...args)
  }
}

setInterval(() => {
  if (!webgpuRenderer) return
  // console.log('FPS:', renderedFrames)
  postMessage({ type: 'fps', fps: webgpuRenderer.renderedFrames })
  webgpuRenderer.renderedFrames = 0
}, 1000)

export const updateSize = (width, height) => {
  camera.aspect = width / height
  camera.updateProjectionMatrix()
}


let fullReset

const updateCubesWhenAvailable = (pos) => {
  onceRendererAvailable((renderer) => {
    renderer.updateSides(pos)
  })
}

let requests = [] as Array<{ resolve: () => void }>
let requestsNamed = {} as Record<string, () => void>
const onceRendererAvailable = (request: (renderer: WebgpuRenderer) => any, name?: string) => {
  if (webgpuRenderer?.ready) {
    request(webgpuRenderer)
  } else {
    requests.push({ resolve: () => request(webgpuRenderer!) })
    if (name) {
      requestsNamed[name] = () => request(webgpuRenderer!)
    }
  }
}

const availableUpCheck = setInterval(() => {
  const { ready } = webgpuRenderer ?? {}
  if (ready) {
    clearInterval(availableUpCheck)
    for (const request of requests) {
      request.resolve()
    }
    requests = []
    for (const request of Object.values(requestsNamed)) {
      request()
    }
    requestsNamed = {}
  }
}, 100)

let started = false
let autoTickUpdate = undefined as number | undefined

export const workerProxyType = createWorkerProxy({
  canvas (canvas, imageBlob, isPlayground, localStorage, NUMBER_OF_CUBES) {
    if (globalThis.webgpuRendererChannel) {
      // HACK! IOS safari bug: no support for transferControlToOffscreen in the same context! so we create a new canvas here!
      const newCanvas = document.createElement('canvas')
      newCanvas.width = canvas.width
      newCanvas.height = canvas.height
      canvas = newCanvas
      // remove existing canvas
      document.querySelector('#viewer-canvas')!.remove()
      canvas.id = 'viewer-canvas'
      document.body.appendChild(canvas)
    }
    started = true
    webgpuRenderer = new WebgpuRenderer(canvas, imageBlob, isPlayground, camera, localStorage, NUMBER_OF_CUBES)
    globalThis.webgpuRenderer = webgpuRenderer
  },
  startRender () {
    if (!webgpuRenderer) return
    webgpuRenderer.rendering = true
  },
  stopRender () {
    if (!webgpuRenderer) return
    webgpuRenderer.rendering = false
  },
  resize (newWidth, newHeight) {
    updateSize(newWidth, newHeight)
  },
  updateConfig (params: RendererParams) {
    // when available
    onceRendererAvailable(() => {
      webgpuRenderer?.updateConfig(params)
    })
  },
  generateRandom (count: number, offsetX = 0, offsetZ = 0) {
    const square = Math.sqrt(count)
    if (square % 1 !== 0) throw new Error('square must be a whole number')
    const blocks = {}
    const getFace = (face: number) => {
      // if (offsetZ / 16) debugger
      return {
        side: face,
        textureIndex: Math.floor(Math.random() * 512)
        // textureIndex: offsetZ / 16 === 31 ? 2 : 1
      }
    }
    for (let x = offsetX; x < square + offsetX; x++) {
      for (let z = offsetZ; z < square + offsetZ; z++) {
        blocks[`${x},${0},${z}`] = {
          faces: [
            getFace(0),
            getFace(1),
            getFace(2),
            getFace(3),
            getFace(4),
            getFace(5)
          ],
        }
      }
    }
    console.log('generated random data:', count)
    this.addBlocksSection(blocks, `${offsetX},0,${offsetZ}`)
  },
  addBlocksSection (tiles: Record<string, BlockType>, key: string, updateData = true) {
    chunksStorage.addData(tiles, key)
    if (updateData) {
      updateCubesWhenAvailable(chunksStorage.allSides.length)
      chunksStorage.lastNotUpdatedIndex = undefined
      chunksStorage.lastNotUpdatedArrSize = undefined
    }
  },
  addBlocksSectionDone () {
    updateCubesWhenAvailable(chunksStorage.allSides.length)
    chunksStorage.lastNotUpdatedIndex = undefined
    chunksStorage.lastNotUpdatedArrSize = undefined
  },
  removeBlocksSection (key) {
    // return
    // fill data with 0
    // const [startIndex, endIndex] = chunksArrIndexes[key]
    // for (let i = startIndex; i < endIndex; i++) {
    //   allSides[i] = undefined
    // }
    // lastNotUpdatedArrSize = endIndex - startIndex
    // updateCubesWhenAvailable(startIndex)

    // freeArrayIndexes.push([startIndex, endIndex])

    // // merge freeArrayIndexes TODO
    // if (freeArrayIndexes.at(-1)[0] === freeArrayIndexes.at(-2)?.[1]) {
    //     const [startIndex, endIndex] = freeArrayIndexes.pop()!
    //     const [startIndex2, endIndex2] = freeArrayIndexes.pop()!
    //     freeArrayIndexes.push([startIndex2, endIndex])
    // }
  },
  camera (newCam: { rotation: { x: number, y: number, z: number }, position: { x: number, y: number, z: number }, fov: number }) {
    // if (webgpuRenderer?.isPlayground) {
    //     camera.rotation.order = 'ZYX'
    //     new tweenJs.Tween(camera.rotation).to({ x: newCam.rotation.x, y: newCam.rotation.y, z: newCam.rotation.z }, 50).start()
    // } else {
    camera.rotation.set(newCam.rotation.x, newCam.rotation.y, newCam.rotation.z, 'ZYX')
    // }
    if (newCam.position.x === 0 && newCam.position.y === 0 && newCam.position.z === 0) {
      // initial camera position
      camera.position.set(newCam.position.x, newCam.position.y, newCam.position.z)
    } else {
      new tweenJs.Tween(camera.position).to({ x: newCam.position.x, y: newCam.position.y, z: newCam.position.z }, 50).start()
    }

    if (newCam.fov !== camera.fov) {
      camera.fov = newCam.fov
      camera.updateProjectionMatrix()
    }
  },
  animationTick (frames, tick) {
    if (frames <= 0) {
      autoTickUpdate = undefined
      animationTick = 0
      return
    }
    if (tick === -1) {
      autoTickUpdate = frames
    } else {
      autoTickUpdate = undefined
      animationTick = tick % 20 // todo update automatically in worker
    }
  },
  fullReset () {
    fullReset()
  },
  exportData () {
    const exported = exportData()
    postMessage({ type: 'exportData', data: exported }, undefined as any, [exported.sides.buffer])
  },
  loadFixture (json) {
    // allSides = json.map(([x, y, z, face, textureIndex]) => {
    //     return [x, y, z, { face, textureIndex }] as [number, number, number, BlockFaceType]
    // })
    const dataSize = json.length / 5
    for (let i = 0; i < json.length; i += 5) {
      chunksStorage.allSides.push([json[i], json[i + 1], json[i + 2], { side: json[i + 3], textureIndex: json[i + 4] }])
    }
    updateCubesWhenAvailable(0)
  },
  updateBackground (color) {
    onceRendererAvailable((renderer) => {
      renderer.changeBackgroundColor(color)
    }, 'updateBackground')
  },
}, globalThis.webgpuRendererChannel?.port2)

globalThis.testDuplicates = () => {
  const duplicates = chunksStorage.allSides.filter((value, index, self) => self.indexOf(value) !== index)
  console.log('duplicates', duplicates)
}

const exportData = () => {
  // Calculate the total length of the final array
  const totalLength = chunksStorage.allSides.length * 5

  // Create a new Int16Array with the total length
  const flatData = new Int16Array(totalLength)

  // Fill the flatData array
  for (const [i, sideData] of chunksStorage.allSides.entries()) {
    if (!sideData) continue
    const [x, y, z, side] = sideData
    flatData.set([x, y, z, side.side, side.textureIndex], i * 5)
  }

  return { sides: flatData }
}

setInterval(() => {
  if (autoTickUpdate) {
    animationTick = (animationTick + 1) % autoTickUpdate
  }
}, 1000 / 20)
