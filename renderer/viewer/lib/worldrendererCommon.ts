/* eslint-disable guard-for-in */
import { EventEmitter } from 'events'
import { Vec3 } from 'vec3'
import mcDataRaw from 'minecraft-data/data.js' // note: using alias
import TypedEmitter from 'typed-emitter'
import { WorldBlockProvider } from 'mc-assets/dist/worldBlockProvider'
import { generateSpiralMatrix } from 'flying-squid/dist/utils'
import { subscribeKey } from 'valtio/utils'
import { proxy } from 'valtio'
import { dynamicMcDataFiles } from '../../buildMesherConfig.mjs'
import type { ResourcesManagerTransferred } from '../../../src/resourcesManager'
import { DisplayWorldOptions, GraphicsInitOptions, RendererReactiveState } from '../../../src/appViewer'
import { SoundSystem } from '../three/threeJsSound'
import { buildCleanupDecorator } from './cleanupDecorator'
import { HighestBlockInfo, CustomBlockModels, BlockStateModelInfo, getBlockAssetsCacheKey, MesherConfig, MesherMainEvent } from './mesher/shared'
import { chunkPos } from './simpleUtils'
import { addNewStat, removeAllStats, updatePanesVisibility, updateStatText } from './ui/newStats'
import { WorldDataEmitterWorker } from './worldDataEmitter'
import { getPlayerStateUtils, PlayerStateReactive, PlayerStateRenderer, PlayerStateUtils } from './basePlayerState'
import { MesherLogReader } from './mesherlogReader'
import { setSkinsConfig } from './utils/skins'
import { calculateSkyLightSimple } from './skyLight'

function mod (x, n) {
  return ((x % n) + n) % n
}

const toMajorVersion = version => {
  const [a, b] = (String(version)).split('.')
  return `${a}.${b}`
}

export const worldCleanup = buildCleanupDecorator('resetWorld')

export const defaultWorldRendererConfig = {
  // Debug settings
  showChunkBorders: false,
  enableDebugOverlay: false,
  debugModelVariant: undefined as undefined | number[],

  // Performance settings
  mesherWorkers: 4,
  addChunksBatchWaitTime: 200,
  _experimentalSmoothChunkLoading: true,
  _renderByChunks: false,

  // Rendering engine settings
  dayCycle: true,
  smoothLighting: true,
  enableLighting: true,
  starfield: true,
  defaultSkybox: true,
  renderEntities: true,
  extraBlockRenderers: true,
  foreground: true,
  fov: 75,
  volume: 1,

  // Camera visual related settings
  showHand: false,
  viewBobbing: false,
  renderEars: true,
  highlightBlockColor: 'blue',

  // Player models
  fetchPlayerSkins: true,
  skinTexturesProxy: undefined as string | undefined,

  // VR settings
  vrSupport: true,
  vrPageGameRendering: true,

  // World settings
  clipWorldBelowY: undefined as number | undefined,
  isPlayground: false,
  instantCameraUpdate: false
}

export type WorldRendererConfig = typeof defaultWorldRendererConfig

export abstract class WorldRendererCommon<WorkerSend = any, WorkerReceive = any> {
  worldReadyResolvers = Promise.withResolvers<void>()
  worldReadyPromise = this.worldReadyResolvers.promise
  timeOfTheDay = 0
  worldSizeParams = { minY: 0, worldHeight: 256 }
  reactiveDebugParams = proxy({
    stopRendering: false,
    chunksRenderAboveOverride: undefined as number | undefined,
    chunksRenderAboveEnabled: false,
    chunksRenderBelowOverride: undefined as number | undefined,
    chunksRenderBelowEnabled: false,
    chunksRenderDistanceOverride: undefined as number | undefined,
    chunksRenderDistanceEnabled: false,
    disableEntities: false,
    // disableParticles: false
  })

  active = false

  // #region CHUNK & SECTIONS TRACKING
  @worldCleanup()
  loadedChunks = {} as Record<string, boolean> // data is added for these chunks and they might be still processing

  @worldCleanup()
  finishedChunks = {} as Record<string, boolean> // these chunks are fully loaded into the world (scene)

  @worldCleanup()
  finishedSections = {} as Record<string, boolean> // these sections are fully loaded into the world (scene)

  @worldCleanup()
  // loading sections (chunks)
  sectionsWaiting = new Map<string, number>()

  @worldCleanup()
  queuedChunks = new Set<string>()
  queuedFunctions = [] as Array<() => void>
  // #endregion

  renderUpdateEmitter = new EventEmitter() as unknown as TypedEmitter<{
    dirty (pos: Vec3, value: boolean): void
    update (/* pos: Vec3, value: boolean */): void
    chunkFinished (key: string): void
    heightmap (key: string, heightmap: Uint8Array): void
  }>
  customTexturesDataUrl = undefined as string | undefined
  workers: any[] = []
  viewerChunkPosition?: Vec3
  lastCamUpdate = 0
  droppedFpsPercentage = 0
  initialChunkLoadWasStartedIn: number | undefined
  initialChunksLoad = true
  enableChunksLoadDelay = false
  texturesVersion?: string
  viewDistance = -1
  chunksLength = 0
  allChunksFinished = false
  messageQueue: any[] = []
  isProcessingQueue = false
  ONMESSAGE_TIME_LIMIT = 30 // ms

  handleResize = () => { }
  highestBlocksByChunks = new Map<string, { [chunkKey: string]: HighestBlockInfo }>()
  blockEntities = {}

  workersProcessAverageTime = 0
  workersProcessAverageTimeCount = 0
  maxWorkersProcessTime = 0
  geometryReceiveCount = {} as Record<number, number>
  allLoadedIn: undefined | number
  onWorldSwitched = [] as Array<() => void>
  renderTimeMax = 0
  renderTimeAvg = 0
  renderTimeAvgCount = 0
  edgeChunks = {} as Record<string, boolean>
  lastAddChunk = null as null | {
    timeout: any
    x: number
    z: number
  }
  neighborChunkUpdates = true
  lastChunkDistance = 0
  debugStopGeometryUpdate = false

  protocolCustomBlocks = new Map<string, CustomBlockModels>()

  @worldCleanup()
  blockStateModelInfo = new Map<string, BlockStateModelInfo>()

  abstract outputFormat: 'threeJs' | 'webgpu'
  worldBlockProvider: WorldBlockProvider
  soundSystem: SoundSystem | undefined

  abstract changeBackgroundColor (color: [number, number, number]): void

  worldRendererConfig: WorldRendererConfig
  playerStateReactive: PlayerStateReactive
  playerStateUtils: PlayerStateUtils
  reactiveState: RendererReactiveState
  mesherLogReader: MesherLogReader | undefined
  forceCallFromMesherReplayer = false
  stopMesherMessagesProcessing = false

  abortController = new AbortController()
  lastRendered = 0
  renderingActive = true
  geometryReceiveCountPerSec = 0
  mesherLogger = {
    contents: [] as string[],
    active: new URL(location.href).searchParams.get('mesherlog') === 'true'
  }
  currentRenderedFrames = 0
  fpsAverage = 0
  lastFps = 0
  fpsWorst = undefined as number | undefined
  fpsSamples = 0
  mainThreadRendering = true
  backendInfoReport = '-'
  chunksFullInfo = '-'
  workerCustomHandleTime = 0

  get version () {
    return this.displayOptions.version
  }

  get displayAdvancedStats () {
    return (this.initOptions.config.statsVisible ?? 0) > 1
  }

  constructor (public readonly resourcesManager: ResourcesManagerTransferred, public displayOptions: DisplayWorldOptions, public initOptions: GraphicsInitOptions) {
    this.snapshotInitialValues()
    this.worldRendererConfig = displayOptions.inWorldRenderingConfig
    this.playerStateReactive = displayOptions.playerStateReactive
    this.playerStateUtils = getPlayerStateUtils(this.playerStateReactive)
    this.reactiveState = displayOptions.rendererState
    // this.mesherLogReader = new MesherLogReader(this)
    this.renderUpdateEmitter.on('update', () => {
      const loadedChunks = Object.keys(this.finishedChunks).length
      updateStatText('loaded-chunks', `${loadedChunks}/${this.chunksLength} chunks (${this.lastChunkDistance}/${this.viewDistance})`)
    })

    addNewStat('downloaded-chunks', 100, 140, 20)

    this.connect(this.displayOptions.worldView)

    const interval = setInterval(() => {
      this.geometryReceiveCountPerSec = Object.values(this.geometryReceiveCount).reduce((acc, curr) => acc + curr, 0)
      this.geometryReceiveCount = {}
      updatePanesVisibility(this.displayAdvancedStats)
      this.updateChunksStats()
      if (this.mainThreadRendering) {
        this.fpsUpdate()
      }
    }, 500)
    this.abortController.signal.addEventListener('abort', () => {
      clearInterval(interval)
    })
  }

  fpsUpdate () {
    this.fpsSamples++
    this.fpsAverage = (this.fpsAverage * (this.fpsSamples - 1) + this.currentRenderedFrames) / this.fpsSamples
    if (this.fpsWorst === undefined) {
      this.fpsWorst = this.currentRenderedFrames
    } else {
      this.fpsWorst = Math.min(this.fpsWorst, this.currentRenderedFrames)
    }
    this.lastFps = this.currentRenderedFrames
    this.currentRenderedFrames = 0
  }

  logWorkerWork (message: string | (() => string)) {
    if (!this.mesherLogger.active) return
    this.mesherLogger.contents.push(typeof message === 'function' ? message() : message)
  }

  async init () {
    if (this.active) throw new Error('WorldRendererCommon is already initialized')

    await Promise.all([
      this.resetWorkers(),
      (async () => {
        if (this.resourcesManager.currentResources?.allReady) {
          await this.updateAssetsData()
        }
      })()
    ])

    this.resourcesManager.on('assetsTexturesUpdated', async () => {
      if (!this.active) return
      await this.updateAssetsData()
    })

    this.watchReactivePlayerState()
    this.watchReactiveConfig()
    this.worldReadyResolvers.resolve()
  }

  snapshotInitialValues () { }

  wasChunkSentToWorker (chunkKey: string) {
    return this.loadedChunks[chunkKey]
  }

  async getHighestBlocks (chunkKey: string) {
    return this.highestBlocksByChunks.get(chunkKey)
  }

  updateCustomBlock (chunkKey: string, blockPos: string, model: string) {
    this.protocolCustomBlocks.set(chunkKey, {
      ...this.protocolCustomBlocks.get(chunkKey),
      [blockPos]: model
    })
    this.logWorkerWork(() => `-> updateCustomBlock ${chunkKey} ${blockPos} ${model} ${this.wasChunkSentToWorker(chunkKey)}`)
    if (this.wasChunkSentToWorker(chunkKey)) {
      const [x, y, z] = blockPos.split(',').map(Number)
      this.setBlockStateId(new Vec3(x, y, z), undefined)
    }
  }

  async getBlockInfo (blockPos: { x: number, y: number, z: number }, stateId: number) {
    const chunkKey = `${Math.floor(blockPos.x / 16) * 16},${Math.floor(blockPos.z / 16) * 16}`
    const customBlockName = this.protocolCustomBlocks.get(chunkKey)?.[`${blockPos.x},${blockPos.y},${blockPos.z}`]
    const cacheKey = getBlockAssetsCacheKey(stateId, customBlockName)
    const modelInfo = this.blockStateModelInfo.get(cacheKey)
    return {
      customBlockName,
      modelInfo
    }
  }

  initWorkers (numWorkers = this.worldRendererConfig.mesherWorkers) {
    // init workers
    for (let i = 0; i < numWorkers + 1; i++) {
      const worker = initMesherWorker((data) => {
        if (Array.isArray(data)) {
          this.messageQueue.push(...data)
        } else {
          this.messageQueue.push(data)
        }
        void this.processMessageQueue('worker')
      })
      this.workers.push(worker)
    }
  }

  onReactivePlayerStateUpdated<T extends keyof PlayerStateReactive>(key: T, callback: (value: PlayerStateReactive[T]) => void, initial = true) {
    if (initial) {
      callback(this.playerStateReactive[key])
    }
    subscribeKey(this.playerStateReactive, key, callback)
  }

  onReactiveConfigUpdated<T extends keyof typeof this.worldRendererConfig>(key: T, callback: (value: typeof this.worldRendererConfig[T]) => void) {
    callback(this.worldRendererConfig[key])
    subscribeKey(this.worldRendererConfig, key, callback)
  }

  onReactiveDebugUpdated<T extends keyof typeof this.reactiveDebugParams>(key: T, callback: (value: typeof this.reactiveDebugParams[T]) => void) {
    callback(this.reactiveDebugParams[key])
    subscribeKey(this.reactiveDebugParams, key, callback)
  }

  watchReactivePlayerState () {
    this.onReactivePlayerStateUpdated('backgroundColor', (value) => {
      this.changeBackgroundColor(value)
    })
  }

  watchReactiveConfig () {
    this.onReactiveConfigUpdated('fetchPlayerSkins', (value) => {
      setSkinsConfig({ apiEnabled: value })
    })
  }

  async processMessageQueue (source: string) {
    if (this.isProcessingQueue || this.messageQueue.length === 0) return
    this.logWorkerWork(`# ${source} processing queue`)
    if (this.lastRendered && performance.now() - this.lastRendered > this.ONMESSAGE_TIME_LIMIT && this.worldRendererConfig._experimentalSmoothChunkLoading && this.renderingActive) {
      const start = performance.now()
      await new Promise(resolve => {
        requestAnimationFrame(resolve)
      })
      this.logWorkerWork(`# processing got delayed by ${performance.now() - start}ms`)
    }
    this.isProcessingQueue = true

    const startTime = performance.now()
    let processedCount = 0

    while (this.messageQueue.length > 0) {
      const processingStopped = this.stopMesherMessagesProcessing
      if (!processingStopped) {
        const data = this.messageQueue.shift()!
        this.handleMessage(data)
        processedCount++
      }

      // Check if we've exceeded the time limit
      if (processingStopped || (performance.now() - startTime > this.ONMESSAGE_TIME_LIMIT && this.renderingActive && this.worldRendererConfig._experimentalSmoothChunkLoading)) {
        // If we have more messages and exceeded time limit, schedule next batch
        if (this.messageQueue.length > 0) {
          requestAnimationFrame(async () => {
            this.isProcessingQueue = false
            void this.processMessageQueue('queue-delay')
          })
          return
        }
        break
      }
    }

    this.isProcessingQueue = false
  }

  handleMessage (rawData: any) {
    const data = rawData as MesherMainEvent
    if (!this.active) return
    this.mesherLogReader?.workerMessageReceived(data.type, data)
    if (data.type !== 'geometry' || !this.debugStopGeometryUpdate) {
      const start = performance.now()
      this.handleWorkerMessage(data as WorkerReceive)
      this.workerCustomHandleTime += performance.now() - start
    }
    if (data.type === 'geometry') {
      this.logWorkerWork(() => `-> ${data.workerIndex} geometry ${data.key} ${JSON.stringify({ dataSize: JSON.stringify(data).length })}`)
      this.geometryReceiveCount[data.workerIndex] ??= 0
      this.geometryReceiveCount[data.workerIndex]++
      const chunkCoords = data.key.split(',').map(Number)
      this.lastChunkDistance = Math.max(...this.getDistance(new Vec3(chunkCoords[0], 0, chunkCoords[2])))
    }
    if (data.type === 'sectionFinished') { // on after load & unload section
      this.logWorkerWork(`<- ${data.workerIndex} sectionFinished ${data.key} ${JSON.stringify({ processTime: data.processTime })}`)
      if (!this.sectionsWaiting.has(data.key)) throw new Error(`sectionFinished event for non-outstanding section ${data.key}`)
      this.sectionsWaiting.set(data.key, this.sectionsWaiting.get(data.key)! - 1)
      if (this.sectionsWaiting.get(data.key) === 0) {
        this.sectionsWaiting.delete(data.key)
        this.finishedSections[data.key] = true
      }

      const chunkCoords = data.key.split(',').map(Number)
      const chunkKey = `${chunkCoords[0]},${chunkCoords[2]}`
      if (this.loadedChunks[chunkKey]) { // ensure chunk data was added, not a neighbor chunk update
        let loaded = true
        for (let y = this.worldMinYRender; y < this.worldSizeParams.worldHeight; y += 16) {
          if (!this.finishedSections[`${chunkCoords[0]},${y},${chunkCoords[2]}`]) {
            loaded = false
            break
          }
        }
        if (loaded) {
          // CHUNK FINISHED
          this.finishedChunks[chunkKey] = true
          this.reactiveState.world.chunksLoaded.add(`${Math.floor(chunkCoords[0] / 16)},${Math.floor(chunkCoords[2] / 16)}`)
          this.renderUpdateEmitter.emit(`chunkFinished`, `${chunkCoords[0]},${chunkCoords[2]}`)
          this.checkAllFinished()
          // merge highest blocks by sections into highest blocks by chunks
          // for (let y = this.worldMinYRender; y < this.worldSizeParams.worldHeight; y += 16) {
          //   const sectionKey = `${chunkCoords[0]},${y},${chunkCoords[2]}`
          //   for (let x = 0; x < 16; x++) {
          //     for (let z = 0; z < 16; z++) {
          //       const posInsideKey = `${chunkCoords[0] + x},${chunkCoords[2] + z}`
          //       let block = null as HighestBlockInfo | null
          //       const highestBlock = this.highestBlocksBySections[sectionKey]?.[posInsideKey]
          //       if (!highestBlock) continue
          //       if (!block || highestBlock.y > block.y) {
          //         block = highestBlock
          //       }
          //       if (block) {
          //         this.highestBlocksByChunks[chunkKey] ??= {}
          //         this.highestBlocksByChunks[chunkKey][posInsideKey] = block
          //       }
          //     }
          //   }
          //   delete this.highestBlocksBySections[sectionKey]
          // }
        }
      }

      this.renderUpdateEmitter.emit('update')
      if (data.processTime) {
        this.workersProcessAverageTimeCount++
        this.workersProcessAverageTime = ((this.workersProcessAverageTime * (this.workersProcessAverageTimeCount - 1)) + data.processTime) / this.workersProcessAverageTimeCount
        this.maxWorkersProcessTime = Math.max(this.maxWorkersProcessTime, data.processTime)
      }
    }

    if (data.type === 'blockStateModelInfo') {
      for (const [cacheKey, info] of Object.entries(data.info)) {
        this.blockStateModelInfo.set(cacheKey, info)
      }
    }

    if (data.type === 'heightmap') {
      this.reactiveState.world.heightmaps.set(data.key, new Uint8Array(data.heightmap))
    }
  }

  downloadMesherLog () {
    const a = document.createElement('a')
    a.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(this.mesherLogger.contents.join('\n'))
    a.download = 'mesher.log'
    a.click()
  }

  checkAllFinished () {
    if (this.sectionsWaiting.size === 0) {
      this.reactiveState.world.mesherWork = false
    }
    // todo check exact surrounding chunks
    const allFinished = Object.keys(this.finishedChunks).length >= this.chunksLength
    if (allFinished) {
      this.allChunksLoaded?.()
      this.allChunksFinished = true
      this.allLoadedIn ??= Date.now() - this.initialChunkLoadWasStartedIn!
    }
    this.updateChunksStats()
  }

  changeHandSwingingState (isAnimationPlaying: boolean, isLeftHand: boolean): void { }

  abstract handleWorkerMessage (data: WorkerReceive): void

  abstract updateCamera (pos: Vec3 | null, yaw: number, pitch: number): void

  abstract render (): void

  /**
   * Optionally update data that are depedendent on the viewer position
   */
  updatePosDataChunk? (key: string): void

  allChunksLoaded? (): void

  timeUpdated? (newTime: number): void

  biomeUpdated? (biome: any): void

  biomeReset? (): void

  updateViewerPosition (pos: Vec3) {
    this.viewerChunkPosition = pos
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
    const [botX, botZ] = chunkPos(this.viewerChunkPosition!)
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
  }

  async resetWorkers () {
    this.resetWorld()

    // for workers in single file build
    if (typeof document !== 'undefined' && document?.readyState === 'loading') {
      await new Promise(resolve => {
        document.addEventListener('DOMContentLoaded', resolve)
      })
    }

    this.initWorkers()
    this.active = true

    this.sendMesherMcData()
  }

  getMesherConfig (): MesherConfig {
    const timeOfDay = this.timeOfTheDay
    const skyLight = (timeOfDay < 0 || timeOfDay > 24_000) ? 15 : calculateSkyLightSimple(timeOfDay)
    return {
      version: this.version,
      enableLighting: this.worldRendererConfig.enableLighting,
      skyLight,
      smoothLighting: this.worldRendererConfig.smoothLighting,
      outputFormat: this.outputFormat,
      // textureSize: this.resourcesManager.currentResources!.blocksAtlasParser.atlas.latest.width,
      debugModelVariant: this.worldRendererConfig.debugModelVariant,
      clipWorldBelowY: this.worldRendererConfig.clipWorldBelowY,
      disableBlockEntityTextures: !this.worldRendererConfig.extraBlockRenderers,
      worldMinY: this.worldMinYRender,
      worldMaxY: this.worldMinYRender + this.worldSizeParams.worldHeight,
    }
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
      worker.postMessage({ type: 'mcData', mcData, config: this.getMesherConfig() })
    }
    this.logWorkerWork('# mcData sent')
  }

  async updateAssetsData () {
    const resources = this.resourcesManager.currentResources

    if (this.workers.length === 0) throw new Error('workers not initialized yet')
    for (const [i, worker] of this.workers.entries()) {
      const { blockstatesModels } = resources

      worker.postMessage({
        type: 'mesherData',
        workerIndex: i,
        blocksAtlas: {
          latest: resources.blocksAtlasJson
        },
        blockstatesModels,
        config: this.getMesherConfig(),
      })
    }

    this.logWorkerWork('# mesherData sent')
    console.log('textures loaded')
  }

  get worldMinYRender () {
    return Math.floor(Math.max(this.worldSizeParams.minY, this.worldRendererConfig.clipWorldBelowY ?? -Infinity) / 16) * 16
  }

  updateChunksStats () {
    const loadedChunks = Object.keys(this.finishedChunks)
    this.displayOptions.nonReactiveState.world.chunksLoaded = new Set(loadedChunks)
    this.displayOptions.nonReactiveState.world.chunksTotalNumber = this.chunksLength
    this.reactiveState.world.allChunksLoaded = this.allChunksFinished

    const text = `Q: ${this.messageQueue.length} ${Object.keys(this.loadedChunks).length}/${Object.keys(this.finishedChunks).length}/${this.chunksLength} chunks (${this.workers.length}:${this.workersProcessAverageTime.toFixed(0)}ms/${this.geometryReceiveCountPerSec}ss/${this.allLoadedIn?.toFixed(1) ?? '-'}s)`
    this.chunksFullInfo = text
    updateStatText('downloaded-chunks', text)
  }

  addColumn (x: number, z: number, chunk: any, isLightUpdate: boolean) {
    if (!this.active) return
    if (this.workers.length === 0) throw new Error('workers not initialized yet')
    this.initialChunksLoad = false
    this.initialChunkLoadWasStartedIn ??= Date.now()
    this.loadedChunks[`${x},${z}`] = true
    this.updateChunksStats()

    const chunkKey = `${x},${z}`
    const customBlockModels = this.protocolCustomBlocks.get(chunkKey)

    for (const worker of this.workers) {
      worker.postMessage({
        type: 'chunk',
        x,
        z,
        chunk,
        customBlockModels: customBlockModels || undefined
      })
    }
    this.workers[0].postMessage({
      type: 'getHeightmap',
      x,
      z,
    })
    this.logWorkerWork(() => `-> chunk ${JSON.stringify({ x, z, chunkLength: chunk.length, customBlockModelsLength: customBlockModels ? Object.keys(customBlockModels).length : 0 })}`)
    this.mesherLogReader?.chunkReceived(x, z, chunk.length)
    for (let y = this.worldMinYRender; y < this.worldSizeParams.worldHeight; y += 16) {
      const loc = new Vec3(x, y, z)
      this.setSectionDirty(loc)
      if (this.neighborChunkUpdates && (!isLightUpdate || this.worldRendererConfig.smoothLighting)) {
        this.setSectionDirty(loc.offset(-16, 0, 0))
        this.setSectionDirty(loc.offset(16, 0, 0))
        this.setSectionDirty(loc.offset(0, 0, -16))
        this.setSectionDirty(loc.offset(0, 0, 16))
      }
    }
  }

  markAsLoaded (x, z) {
    this.loadedChunks[`${x},${z}`] = true
    this.finishedChunks[`${x},${z}`] = true
    this.logWorkerWork(`-> markAsLoaded ${JSON.stringify({ x, z })}`)
    this.checkAllFinished()
  }

  removeColumn (x, z) {
    delete this.loadedChunks[`${x},${z}`]
    for (const worker of this.workers) {
      worker.postMessage({ type: 'unloadChunk', x, z })
    }
    this.logWorkerWork(`-> unloadChunk ${JSON.stringify({ x, z })}`)
    delete this.finishedChunks[`${x},${z}`]
    this.allChunksFinished = Object.keys(this.finishedChunks).length === this.chunksLength
    if (Object.keys(this.finishedChunks).length === 0) {
      this.allLoadedIn = undefined
      this.initialChunkLoadWasStartedIn = undefined
    }
    for (let y = this.worldSizeParams.minY; y < this.worldSizeParams.worldHeight; y += 16) {
      this.setSectionDirty(new Vec3(x, y, z), false)
      delete this.finishedSections[`${x},${y},${z}`]
    }
    this.highestBlocksByChunks.delete(`${x},${z}`)

    this.updateChunksStats()

    if (Object.keys(this.loadedChunks).length === 0) {
      this.mesherLogger.contents = []
      this.logWorkerWork('# all chunks unloaded. New log started')
      void this.mesherLogReader?.maybeStartReplay()
    }
  }

  setBlockStateId (pos: Vec3, stateId: number | undefined, needAoRecalculation = true) {
    const set = async () => {
      const sectionX = Math.floor(pos.x / 16) * 16
      const sectionZ = Math.floor(pos.z / 16) * 16
      if (this.queuedChunks.has(`${sectionX},${sectionZ}`)) {
        await new Promise<void>(resolve => {
          this.queuedFunctions.push(() => {
            resolve()
          })
        })
      }
      if (!this.loadedChunks[`${sectionX},${sectionZ}`]) {
        // console.debug('[should be unreachable] setBlockStateId called for unloaded chunk', pos)
      }
      this.setBlockStateIdInner(pos, stateId, needAoRecalculation)
    }
    void set()
  }

  updateEntity (e: any, isUpdate = false) { }

  abstract updatePlayerEntity? (e: any): void

  lightUpdate (chunkX: number, chunkZ: number) { }

  connect (worldView: WorldDataEmitterWorker) {
    const worldEmitter = worldView

    worldEmitter.on('entity', (e) => {
      this.updateEntity(e, false)
    })
    worldEmitter.on('entityMoved', (e) => {
      this.updateEntity(e, true)
    })
    worldEmitter.on('playerEntity', (e) => {
      this.updatePlayerEntity?.(e)
    })

    let currentLoadChunkBatch = null as {
      timeout
      data
    } | null
    worldEmitter.on('loadChunk', ({ x, z, chunk, worldConfig, isLightUpdate }) => {
      this.worldSizeParams = worldConfig
      this.queuedChunks.add(`${x},${z}`)
      const args = [x, z, chunk, isLightUpdate]
      if (!currentLoadChunkBatch) {
        // add a setting to use debounce instead
        currentLoadChunkBatch = {
          data: [],
          timeout: setTimeout(() => {
            for (const args of currentLoadChunkBatch!.data) {
              this.queuedChunks.delete(`${args[0]},${args[1]}`)
              this.addColumn(...args as Parameters<typeof this.addColumn>)
            }
            for (const fn of this.queuedFunctions) {
              fn()
            }
            this.queuedFunctions = []
            currentLoadChunkBatch = null
          }, this.worldRendererConfig.addChunksBatchWaitTime)
        }
      }
      currentLoadChunkBatch.data.push(args)
    })
    // todo remove and use other architecture instead so data flow is clear
    worldEmitter.on('blockEntities', (blockEntities) => {
      this.blockEntities = blockEntities
    })

    worldEmitter.on('unloadChunk', ({ x, z }) => {
      this.removeColumn(x, z)
    })

    worldEmitter.on('blockUpdate', ({ pos, stateId }) => {
      this.setBlockStateId(new Vec3(pos.x, pos.y, pos.z), stateId)
    })

    worldEmitter.on('chunkPosUpdate', ({ pos }) => {
      this.updateViewerPosition(pos)
    })

    worldEmitter.on('end', () => {
      this.worldStop?.()
    })


    worldEmitter.on('renderDistance', (d) => {
      this.viewDistance = d
      this.chunksLength = d === 0 ? 1 : generateSpiralMatrix(d).length
    })

    worldEmitter.on('renderDistance', (d) => {
      this.viewDistance = d
      this.chunksLength = d === 0 ? 1 : generateSpiralMatrix(d).length
      this.allChunksFinished = Object.keys(this.finishedChunks).length === this.chunksLength
    })

    worldEmitter.on('markAsLoaded', ({ x, z }) => {
      this.markAsLoaded(x, z)
    })

    worldEmitter.on('updateLight', ({ pos }) => {
      this.lightUpdate(pos.x, pos.z)
    })

    worldEmitter.on('onWorldSwitch', () => {
      for (const fn of this.onWorldSwitched) {
        try {
          fn()
        } catch (e) {
          setTimeout(() => {
            console.log('[Renderer Backend] Error in onWorldSwitched:')
            throw e
          }, 0)
        }
      }
    })

    worldEmitter.on('time', (timeOfDay) => {
      if (!this.worldRendererConfig.dayCycle) return
      this.timeUpdated?.(timeOfDay)

      this.timeOfTheDay = timeOfDay

      // if (this.worldRendererConfig.skyLight === skyLight) return
      // this.worldRendererConfig.skyLight = skyLight
      // if (this instanceof WorldRendererThree) {
      //   (this).rerenderAllChunks?.()
      // }
    })

    worldEmitter.on('biomeUpdate', ({ biome }) => {
      this.biomeUpdated?.(biome)
    })

    worldEmitter.on('biomeReset', () => {
      this.biomeReset?.()
    })
  }

  setBlockStateIdInner (pos: Vec3, stateId: number | undefined, needAoRecalculation = true) {
    const chunkKey = `${Math.floor(pos.x / 16) * 16},${Math.floor(pos.z / 16) * 16}`
    const blockPosKey = `${pos.x},${pos.y},${pos.z}`
    const customBlockModels = this.protocolCustomBlocks.get(chunkKey) || {}

    for (const worker of this.workers) {
      worker.postMessage({
        type: 'blockUpdate',
        pos,
        stateId,
        customBlockModels
      })
    }
    this.logWorkerWork(`-> blockUpdate ${JSON.stringify({ pos, stateId, customBlockModels })}`)
    this.setSectionDirty(pos, true, true)
    if (this.neighborChunkUpdates) {
      if ((pos.x & 15) === 0) this.setSectionDirty(pos.offset(-16, 0, 0), true, true)
      if ((pos.x & 15) === 15) this.setSectionDirty(pos.offset(16, 0, 0), true, true)
      if ((pos.y & 15) === 0) this.setSectionDirty(pos.offset(0, -16, 0), true, true)
      if ((pos.y & 15) === 15) this.setSectionDirty(pos.offset(0, 16, 0), true, true)
      if ((pos.z & 15) === 0) this.setSectionDirty(pos.offset(0, 0, -16), true, true)
      if ((pos.z & 15) === 15) this.setSectionDirty(pos.offset(0, 0, 16), true, true)

      if (needAoRecalculation) {
        // top view neighbors
        if ((pos.x & 15) === 0 && (pos.z & 15) === 0) this.setSectionDirty(pos.offset(-16, 0, -16), true, true)
        if ((pos.x & 15) === 15 && (pos.z & 15) === 0) this.setSectionDirty(pos.offset(16, 0, -16), true, true)
        if ((pos.x & 15) === 0 && (pos.z & 15) === 15) this.setSectionDirty(pos.offset(-16, 0, 16), true, true)
        if ((pos.x & 15) === 15 && (pos.z & 15) === 15) this.setSectionDirty(pos.offset(16, 0, 16), true, true)

        // side view neighbors (but ignore updates above)
        // z view neighbors
        if ((pos.x & 15) === 0 && (pos.y & 15) === 0) this.setSectionDirty(pos.offset(-16, -16, 0), true, true)
        if ((pos.x & 15) === 15 && (pos.y & 15) === 0) this.setSectionDirty(pos.offset(16, -16, 0), true, true)

        // x view neighbors
        if ((pos.z & 15) === 0 && (pos.y & 15) === 0) this.setSectionDirty(pos.offset(0, -16, -16), true, true)
        if ((pos.z & 15) === 15 && (pos.y & 15) === 0) this.setSectionDirty(pos.offset(0, -16, 16), true, true)

        // x & z neighbors
        if ((pos.y & 15) === 0 && (pos.x & 15) === 0 && (pos.z & 15) === 0) this.setSectionDirty(pos.offset(-16, -16, -16), true, true)
        if ((pos.y & 15) === 0 && (pos.x & 15) === 15 && (pos.z & 15) === 0) this.setSectionDirty(pos.offset(16, -16, -16), true, true)
        if ((pos.y & 15) === 0 && (pos.x & 15) === 0 && (pos.z & 15) === 15) this.setSectionDirty(pos.offset(-16, -16, 16), true, true)
        if ((pos.y & 15) === 0 && (pos.x & 15) === 15 && (pos.z & 15) === 15) this.setSectionDirty(pos.offset(16, -16, 16), true, true)
      }
    }
  }

  abstract worldStop? ()

  queueAwaited = false
  toWorkerMessagesQueue = {} as { [workerIndex: string]: any[] }

  getWorkerNumber (pos: Vec3, updateAction = false) {
    if (updateAction) {
      const key = `${Math.floor(pos.x / 16) * 16},${Math.floor(pos.y / 16) * 16},${Math.floor(pos.z / 16) * 16}`
      const cantUseChangeWorker = this.sectionsWaiting.get(key) && !this.finishedSections[key]
      if (!cantUseChangeWorker) return 0
    }

    const hash = mod(Math.floor(pos.x / 16) + Math.floor(pos.y / 16) + Math.floor(pos.z / 16), this.workers.length - 1)
    return hash + 1
  }

  async debugGetWorkerCustomBlockModel (pos: Vec3) {
    const data = [] as Array<Promise<string>>
    for (const worker of this.workers) {
      data.push(new Promise((resolve) => {
        worker.addEventListener('message', (e) => {
          if (e.data.type === 'customBlockModel') {
            resolve(e.data.customBlockModel)
          }
        })
      }))
      worker.postMessage({
        type: 'getCustomBlockModel',
        pos
      })
    }
    return Promise.all(data)
  }

  setSectionDirty (pos: Vec3, value = true, useChangeWorker = false) { // value false is used for unloading chunks
    if (!this.forceCallFromMesherReplayer && this.mesherLogReader) return

    if (this.viewDistance === -1) throw new Error('viewDistance not set')
    this.reactiveState.world.mesherWork = true
    const distance = this.getDistance(pos)
    // todo shouldnt we check loadedChunks instead?
    if (!this.workers.length || distance[0] > this.viewDistance || distance[1] > this.viewDistance) return
    const key = `${Math.floor(pos.x / 16) * 16},${Math.floor(pos.y / 16) * 16},${Math.floor(pos.z / 16) * 16}`
    // if (this.sectionsOutstanding.has(key)) return
    this.renderUpdateEmitter.emit('dirty', pos, value)
    // Dispatch sections to workers based on position
    // This guarantees uniformity accross workers and that a given section
    // is always dispatched to the same worker
    const hash = this.getWorkerNumber(pos, useChangeWorker && this.mesherLogger.active)
    this.sectionsWaiting.set(key, (this.sectionsWaiting.get(key) ?? 0) + 1)
    if (this.forceCallFromMesherReplayer) {
      this.workers[hash].postMessage({
        type: 'dirty',
        x: pos.x,
        y: pos.y,
        z: pos.z,
        value,
        config: this.getMesherConfig(),
      })
    } else {
      this.toWorkerMessagesQueue[hash] ??= []
      this.toWorkerMessagesQueue[hash].push({
        // this.workers[hash].postMessage({
        type: 'dirty',
        x: pos.x,
        y: pos.y,
        z: pos.z,
        value,
        config: this.getMesherConfig(),
      })
      this.dispatchMessages()
    }
  }

  dispatchMessages () {
    if (this.queueAwaited) return
    this.queueAwaited = true
    setTimeout(() => {
      // group messages and send as one
      for (const workerIndex in this.toWorkerMessagesQueue) {
        const worker = this.workers[Number(workerIndex)]
        worker.postMessage(this.toWorkerMessagesQueue[workerIndex])
        for (const message of this.toWorkerMessagesQueue[workerIndex]) {
          this.logWorkerWork(`-> ${workerIndex} dispatchMessages ${message.type} ${JSON.stringify({ x: message.x, y: message.y, z: message.z, value: message.value })}`)
        }
      }
      this.toWorkerMessagesQueue = {}
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

  destroy () {
    // Stop all workers
    for (const worker of this.workers) {
      worker.terminate()
    }
    this.workers = []

    // Stop and destroy sound system
    if (this.soundSystem) {
      this.soundSystem.destroy()
      this.soundSystem = undefined
    }

    this.active = false

    this.renderUpdateEmitter.removeAllListeners()
    this.abortController.abort()
    removeAllStats()
  }
}

export const initMesherWorker = (onGotMessage: (data: any) => void) => {
  // Node environment needs an absolute path, but browser needs the url of the file
  const workerName = 'mesher.js'

  let worker: any
  if (process.env.SINGLE_FILE_BUILD) {
    const workerCode = document.getElementById('mesher-worker-code')!.textContent!
    const blob = new Blob([workerCode], { type: 'text/javascript' })
    worker = new Worker(window.URL.createObjectURL(blob))
  } else {
    worker = new Worker(workerName)
  }

  worker.onmessage = ({ data }) => {
    onGotMessage(data)
  }
  if (worker.on) worker.on('message', (data) => { worker.onmessage({ data }) })
  return worker
}

export const meshersSendMcData = (workers: Worker[], version: string, addData = {} as Record<string, any>) => {
  const allMcData = mcDataRaw.pc[version] ?? mcDataRaw.pc[toMajorVersion(version)]
  const mcData = {
    version: JSON.parse(JSON.stringify(allMcData.version))
  }
  for (const key of dynamicMcDataFiles) {
    mcData[key] = allMcData[key]
  }

  for (const worker of workers) {
    worker.postMessage({ type: 'mcData', mcData, ...addData })
  }
}
