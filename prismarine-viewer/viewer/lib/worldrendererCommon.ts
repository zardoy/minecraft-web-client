/* eslint-disable guard-for-in */
import { EventEmitter } from 'events'
import { Vec3 } from 'vec3'
import * as THREE from 'three'
import mcDataRaw from 'minecraft-data/data.js' // note: using alias
import blocksAtlases from 'mc-assets/dist/blocksAtlases.json'
import blocksAtlasLatest from 'mc-assets/dist/blocksAtlasLatest.png'
import blocksAtlasLegacy from 'mc-assets/dist/blocksAtlasLegacy.png'
import itemsAtlases from 'mc-assets/dist/itemsAtlases.json'
import itemsAtlasLatest from 'mc-assets/dist/itemsAtlasLatest.png'
import itemsAtlasLegacy from 'mc-assets/dist/itemsAtlasLegacy.png'
import { AtlasParser } from 'mc-assets'
import TypedEmitter from 'typed-emitter'
import { dynamicMcDataFiles } from '../../buildMesherConfig.mjs'
import { toMajorVersion } from '../../../src/utils'
import { buildCleanupDecorator } from './cleanupDecorator'
import { MesherGeometryOutput, defaultMesherConfig } from './mesher/shared'
import { chunkPos } from './simpleUtils'
import { HandItemBlock } from './holdingBlock'
import { updateStatText } from './ui/newStats'

function mod (x, n) {
  return ((x % n) + n) % n
}

export const worldCleanup = buildCleanupDecorator('resetWorld')

export const defaultWorldRendererConfig = {
  showChunkBorders: false,
  numWorkers: 4
}

export type WorldRendererConfig = typeof defaultWorldRendererConfig

type CustomTexturesData = {
  tileSize: number | undefined
  textures: Record<string, HTMLImageElement>
}

export abstract class WorldRendererCommon<WorkerSend = any, WorkerReceive = any> {
  isPlayground = false
  displayStats = true
  worldConfig = { minY: 0, worldHeight: 256 }
  // todo need to cleanup
  material = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, alphaTest: 0.1 })

  @worldCleanup()
  active = false

  version = undefined as string | undefined
  @worldCleanup()
  loadedChunks = {} as Record<string, boolean> // data is added for these chunks and they might be still processing

  @worldCleanup()
  finishedChunks = {} as Record<string, boolean> // these chunks are fully loaded into the world (scene)

  @worldCleanup()
  // loading sections (chunks)
  sectionsWaiting = new Map<string, number>()

  @worldCleanup()
  queuedChunks = new Set<string>()

  @worldCleanup()
  renderUpdateEmitter = new EventEmitter() as unknown as TypedEmitter<{
    dirty (pos: Vec3, value: boolean): void
    update (/* pos: Vec3, value: boolean */): void
    textureDownloaded (): void
  }>
  customTexturesDataUrl = undefined as string | undefined
  @worldCleanup()
  currentTextureImage = undefined as any
  workers: any[] = []
  viewerPosition?: Vec3
  lastCamUpdate = 0
  droppedFpsPercentage = 0
  initialChunksLoad = true
  enableChunksLoadDelay = false
  texturesVersion?: string
  viewDistance = -1
  chunksLength = 0
  @worldCleanup()
  allChunksFinished = false

  handleResize = () => { }
  mesherConfig = defaultMesherConfig
  camera: THREE.PerspectiveCamera
  highestBlocks: Record<string, { y: number, name: string }> = {}
  blockstatesModels: any
  customBlockStates: Record<string, any> | undefined
  customModels: Record<string, any> | undefined
  itemsAtlasParser: AtlasParser | undefined
  blocksAtlasParser: AtlasParser | undefined

  blocksAtlases = blocksAtlases
  itemsAtlases = itemsAtlases
  customTextures: {
    items?: CustomTexturesData
    blocks?: CustomTexturesData
  } = {}
  workersProcessAverageTime = 0
  workersProcessAverageTimeCount = 0
  maxWorkersProcessTime = 0
  edgeChunks = {} as Record<string, boolean>
  lastAddChunk = null as null | {
    timeout: any
    x: number
    z: number
  }
  neighborChunkUpdates = true
  lastChunkDistance = 0

  abstract outputFormat: 'threeJs' | 'webgpu'

  abstract changeBackgroundColor (color: [number, number, number]): void

  constructor (public config: WorldRendererConfig) {
    // this.initWorkers(1) // preload script on page load
    this.snapshotInitialValues()

    this.renderUpdateEmitter.on('update', () => {
      const loadedChunks = Object.keys(this.finishedChunks).length
      updateStatText('loaded-chunks', `${loadedChunks}/${this.chunksLength} chunks (${this.lastChunkDistance})`)
    })
  }

  snapshotInitialValues () { }

  initWorkers (numWorkers = this.config.numWorkers) {
    // init workers
    for (let i = 0; i < numWorkers; i++) {
      // Node environment needs an absolute path, but browser needs the url of the file
      const workerName = 'mesher.js'
      // eslint-disable-next-line node/no-path-concat
      const src = typeof window === 'undefined' ? `${__dirname}/${workerName}` : workerName

      const worker: any = new Worker(src)
      const handleMessage = (data) => {
        if (!this.active) return
        this.handleWorkerMessage(data)
        if (data.type === 'geometry') {
          const geometry = data.geometry as MesherGeometryOutput
          for (const key in geometry.highestBlocks) {
            const highest = geometry.highestBlocks[key]
            if (!this.highestBlocks[key] || this.highestBlocks[key].y < highest.y) {
              this.highestBlocks[key] = highest
            }
          }
          const chunkCoords = data.key.split(',').map(Number)
          this.lastChunkDistance = Math.max(...this.getDistance(new Vec3(chunkCoords[0], 0, chunkCoords[2])))
        }
        if (data.type === 'sectionFinished') { // on after load & unload section
          if (!this.sectionsWaiting.get(data.key)) throw new Error(`sectionFinished event for non-outstanding section ${data.key}`)
          this.sectionsWaiting.set(data.key, this.sectionsWaiting.get(data.key)! - 1)
          if (this.sectionsWaiting.get(data.key) === 0) this.sectionsWaiting.delete(data.key)

          const chunkCoords = data.key.split(',').map(Number)
          if (this.loadedChunks[`${chunkCoords[0]},${chunkCoords[2]}`]) { // ensure chunk data was added, not a neighbor chunk update
            const loadingKeys = [...this.sectionsWaiting.keys()]
            if (!loadingKeys.some(key => {
              const [x, y, z] = key.split(',').map(Number)
              return x === chunkCoords[0] && z === chunkCoords[2]
            })) {
              this.finishedChunks[`${chunkCoords[0]},${chunkCoords[2]}`] = true
            }
          }
          this.checkAllFinished()

          this.renderUpdateEmitter.emit('update')
          if (data.processTime) {
            this.workersProcessAverageTimeCount++
            this.workersProcessAverageTime = ((this.workersProcessAverageTime * (this.workersProcessAverageTimeCount - 1)) + data.processTime) / this.workersProcessAverageTimeCount
            this.maxWorkersProcessTime = Math.max(this.maxWorkersProcessTime, data.processTime)
          }
        }
      }
      worker.onmessage = ({ data }) => {
        if (Array.isArray(data)) {
          // eslint-disable-next-line unicorn/no-array-for-each
          data.forEach(handleMessage)
          return
        }
        handleMessage(data)
      }
      if (worker.on) worker.on('message', (data) => { worker.onmessage({ data }) })
      this.workers.push(worker)
    }
  }

  checkAllFinished () {
    if (this.sectionsWaiting.size === 0) {
      const allFinished = Object.keys(this.finishedChunks).length === this.chunksLength
      if (allFinished) {
        this.allChunksLoaded?.()
        this.allChunksFinished = true
      }
    }
  }

  onHandItemSwitch (item: HandItemBlock | undefined): void { }
  changeHandSwingingState (isAnimationPlaying: boolean): void { }

  abstract handleWorkerMessage (data: WorkerReceive): void

  abstract updateCamera (pos: Vec3 | null, yaw: number, pitch: number): void

  abstract render (): void

  /**
   * Optionally update data that are depedendent on the viewer position
   */
  updatePosDataChunk? (key: string): void

  allChunksLoaded? (): void

  timeUpdated? (newTime: number): void

  updateViewerPosition (pos: Vec3) {
    this.viewerPosition = pos
    for (const [key, value] of Object.entries(this.loadedChunks)) {
      if (!value) continue
      this.updatePosDataChunk?.(key)
    }
  }

  sendWorkers (message: WorkerSend) {
    for (const worker of this.workers) {
      worker.postMessage(message)
    }
  }

  getDistance (posAbsolute: Vec3) {
    const [botX, botZ] = chunkPos(this.viewerPosition!)
    const dx = Math.abs(botX - Math.floor(posAbsolute.x / 16))
    const dz = Math.abs(botZ - Math.floor(posAbsolute.z / 16))
    return [dx, dz] as [number, number]
  }

  abstract updateShowChunksBorder (value: boolean): void

  resetWorld () {
    // destroy workers
    for (const worker of this.workers) {
      worker.terminate()
    }
    this.workers = []
    this.currentTextureImage = undefined
    this.blocksAtlasParser = undefined
    this.itemsAtlasParser = undefined
  }

  // new game load happens here
  async setVersion (version, texturesVersion = version) {
    if (!this.blockstatesModels) throw new Error('Blockstates models is not loaded yet')
    this.version = version
    this.texturesVersion = texturesVersion
    this.resetWorld()
    this.initWorkers()
    this.active = true
    this.mesherConfig.outputFormat = this.outputFormat
    this.mesherConfig.version = this.version!

    this.sendMesherMcData()
    await this.updateTexturesData()
  }

  sendMesherMcData () {
    const allMcData = mcDataRaw.pc[this.version] ?? mcDataRaw.pc[toMajorVersion(this.version)]
    const mcData = {
      version: JSON.parse(JSON.stringify(allMcData.version))
    }
    for (const key of dynamicMcDataFiles) {
      mcData[key] = allMcData[key]
    }

    for (const worker of this.workers) {
      worker.postMessage({ type: 'mcData', mcData, config: this.mesherConfig })
    }
  }

  async updateTexturesData () {
    const blocksAssetsParser = new AtlasParser(this.blocksAtlases, blocksAtlasLatest, blocksAtlasLegacy)
    const itemsAssetsParser = new AtlasParser(this.itemsAtlases, itemsAtlasLatest, itemsAtlasLegacy)
    const { atlas: blocksAtlas, canvas: blocksCanvas } = await blocksAssetsParser.makeNewAtlas(this.texturesVersion ?? this.version ?? 'latest', (textureName) => {
      const texture = this.customTextures?.blocks?.textures[textureName]
      if (!texture) return
      return texture
    }, this.customTextures?.blocks?.tileSize)
    const { atlas: itemsAtlas, canvas: itemsCanvas } = await itemsAssetsParser.makeNewAtlas(this.texturesVersion ?? this.version ?? 'latest', (textureName) => {
      const texture = this.customTextures?.items?.textures[textureName]
      if (!texture) return
      return texture
    }, this.customTextures?.items?.tileSize)
    this.blocksAtlasParser = new AtlasParser({ latest: blocksAtlas }, blocksCanvas.toDataURL())
    this.itemsAtlasParser = new AtlasParser({ latest: itemsAtlas }, itemsCanvas.toDataURL())

    const texture = await new THREE.TextureLoader().loadAsync(this.blocksAtlasParser.latestImage)
    texture.magFilter = THREE.NearestFilter
    texture.minFilter = THREE.NearestFilter
    texture.flipY = false
    this.material.map = texture
    this.currentTextureImage = this.material.map.image
    this.mesherConfig.textureSize = this.material.map.image.width

    for (const [i, worker] of this.workers.entries()) {
      const { blockstatesModels } = this
      if (this.customBlockStates) {
        // TODO! remove from other versions as well
        blockstatesModels.blockstates.latest = {
          ...blockstatesModels.blockstates.latest,
          ...this.customBlockStates
        }
      }
      if (this.customModels) {
        blockstatesModels.models.latest = {
          ...blockstatesModels.models.latest,
          ...this.customModels
        }
      }
      worker.postMessage({
        type: 'mesherData',
        workerIndex: i,
        blocksAtlas: {
          latest: blocksAtlas
        },
        blockstatesModels,
        config: this.mesherConfig,
      })
    }
    this.renderUpdateEmitter.emit('textureDownloaded')
    console.log('texture loaded')
  }

  addColumn (x: number, z: number, chunk: any, isLightUpdate: boolean) {
    if (!this.active) return
    if (this.workers.length === 0) throw new Error('workers not initialized yet')
    this.initialChunksLoad = false
    this.loadedChunks[`${x},${z}`] = true
    for (const worker of this.workers) {
      // todo optimize
      worker.postMessage({ type: 'chunk', x, z, chunk })
    }
    for (let y = this.worldConfig.minY; y < this.worldConfig.worldHeight; y += 16) {
      const loc = new Vec3(x, y, z)
      this.setSectionDirty(loc)
      if (this.neighborChunkUpdates && (!isLightUpdate || this.mesherConfig.smoothLighting)) {
        this.setSectionDirty(loc.offset(-16, 0, 0))
        this.setSectionDirty(loc.offset(16, 0, 0))
        this.setSectionDirty(loc.offset(0, 0, -16))
        this.setSectionDirty(loc.offset(0, 0, 16))
      }
    }
  }

  removeColumn (x, z) {
    delete this.loadedChunks[`${x},${z}`]
    for (const worker of this.workers) {
      worker.postMessage({ type: 'unloadChunk', x, z })
    }
    this.allChunksFinished = Object.keys(this.finishedChunks).length === this.chunksLength
    delete this.finishedChunks[`${x},${z}`]
    for (let y = this.worldConfig.minY; y < this.worldConfig.worldHeight; y += 16) {
      this.setSectionDirty(new Vec3(x, y, z), false)
    }
    // remove from highestBlocks
    const startX = Math.floor(x / 16) * 16
    const startZ = Math.floor(z / 16) * 16
    const endX = Math.ceil((x + 1) / 16) * 16
    const endZ = Math.ceil((z + 1) / 16) * 16
    for (let x = startX; x < endX; x += 16) {
      for (let z = startZ; z < endZ; z += 16) {
        delete this.highestBlocks[`${x},${z}`]
      }
    }
  }

  setBlockStateId (pos: Vec3, stateId: number) {
    for (const worker of this.workers) {
      worker.postMessage({ type: 'blockUpdate', pos, stateId })
    }
    this.setSectionDirty(pos)
    if (this.neighborChunkUpdates) {
      if ((pos.x & 15) === 0) this.setSectionDirty(pos.offset(-16, 0, 0))
      if ((pos.x & 15) === 15) this.setSectionDirty(pos.offset(16, 0, 0))
      if ((pos.y & 15) === 0) this.setSectionDirty(pos.offset(0, -16, 0))
      if ((pos.y & 15) === 15) this.setSectionDirty(pos.offset(0, 16, 0))
      if ((pos.z & 15) === 0) this.setSectionDirty(pos.offset(0, 0, -16))
      if ((pos.z & 15) === 15) this.setSectionDirty(pos.offset(0, 0, 16))
    }
  }

  queueAwaited = false
  messagesQueue = {} as { [workerIndex: string]: any[] }

  setSectionDirty (pos: Vec3, value = true) { // value false is used for unloading chunks
    if (this.viewDistance === -1) throw new Error('viewDistance not set')
    this.allChunksFinished = false
    const distance = this.getDistance(pos)
    if (!this.workers.length || distance[0] > this.viewDistance || distance[1] > this.viewDistance) return
    const key = `${Math.floor(pos.x / 16) * 16},${Math.floor(pos.y / 16) * 16},${Math.floor(pos.z / 16) * 16}`
    // if (this.sectionsOutstanding.has(key)) return
    this.renderUpdateEmitter.emit('dirty', pos, value)
    // Dispatch sections to workers based on position
    // This guarantees uniformity accross workers and that a given section
    // is always dispatched to the same worker
    const hash = mod(Math.floor(pos.x / 16) + Math.floor(pos.y / 16) + Math.floor(pos.z / 16), this.workers.length)
    this.sectionsWaiting.set(key, (this.sectionsWaiting.get(key) ?? 0) + 1)
    this.messagesQueue[hash] ??= []
    this.messagesQueue[hash].push({
      // this.workers[hash].postMessage({
      type: 'dirty',
      x: pos.x,
      y: pos.y,
      z: pos.z,
      value,
      config: this.mesherConfig,
    })
    this.dispatchMessages()
  }

  dispatchMessages () {
    if (this.queueAwaited) return
    this.queueAwaited = true
    setTimeout(() => {
      // group messages and send as one
      for (const workerIndex in this.messagesQueue) {
        const worker = this.workers[Number(workerIndex)]
        worker.postMessage(this.messagesQueue[workerIndex])
      }
      this.messagesQueue = {}
      this.queueAwaited = false
    })
  }

  // Listen for chunk rendering updates emitted if a worker finished a render and resolve if the number
  // of sections not rendered are 0
  async waitForChunksToRender () {
    return new Promise<void>((resolve, reject) => {
      if ([...this.sectionsWaiting].length === 0) {
        resolve()
        return
      }

      const updateHandler = () => {
        if (this.sectionsWaiting.size === 0) {
          this.renderUpdateEmitter.removeListener('update', updateHandler)
          resolve()
        }
      }
      this.renderUpdateEmitter.on('update', updateHandler)
    })
  }

  async waitForChunkToLoad (pos: Vec3) {
    return new Promise<void>((resolve, reject) => {
      const key = `${Math.floor(pos.x / 16) * 16},${Math.floor(pos.z / 16) * 16}`
      if (this.loadedChunks[key]) {
        resolve()
        return
      }
      const updateHandler = () => {
        if (this.loadedChunks[key]) {
          this.renderUpdateEmitter.removeListener('update', updateHandler)
          resolve()
        }
      }
      this.renderUpdateEmitter.on('update', updateHandler)
    })
  }
}
