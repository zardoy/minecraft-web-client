import { WorldDataEmitter, WorldDataEmitterWorker } from 'renderer/viewer/lib/worldDataEmitter'
import { getInitialPlayerState, PlayerStateRenderer, PlayerStateReactive } from 'renderer/viewer/lib/basePlayerState'
import { subscribeKey } from 'valtio/utils'
import { defaultWorldRendererConfig, WorldRendererConfig } from 'renderer/viewer/lib/worldrendererCommon'
import { Vec3 } from 'vec3'
import { SoundSystem } from 'renderer/viewer/three/threeJsSound'
import { proxy, subscribe } from 'valtio'
import { getDefaultRendererState } from 'renderer/viewer/baseGraphicsBackend'
import { getSyncWorld } from 'renderer/playground/shared'
import { MaybePromise } from 'contro-max/build/types/store'
import { PANORAMA_VERSION } from 'renderer/viewer/three/panoramaShared'
import { playerState } from './mineflayer/playerState'
import { createNotificationProgressReporter, ProgressReporter } from './core/progressReporter'
import { setLoadingScreenStatus } from './appStatus'
import { activeModalStack, miscUiState } from './globalState'
import { options } from './optionsStorage'
import { ResourcesManager, ResourcesManagerTransferred } from './resourcesManager'
import { watchOptionsAfterWorldViewInit } from './watchOptions'
import { loadMinecraftData } from './connect'
import { reloadChunks } from './utils'
import { displayClientChat } from './botUtils'
import { isPlayground } from './playgroundIntegration'

export interface RendererReactiveState {
  world: {
    chunksLoaded: Set<string>
    // chunksTotalNumber: number
    heightmaps: Map<string, Uint8Array>
    allChunksLoaded: boolean
    mesherWork: boolean
    intersectMedia: { id: string, x: number, y: number } | null
  }
  renderer: string
  preventEscapeMenu: boolean
}
export interface NonReactiveState {
  world: {
    chunksLoaded: Set<string>
    chunksTotalNumber: number
  }
}

export interface GraphicsBackendConfig {
  fpsLimit?: number
  powerPreference?: 'high-performance' | 'low-power'
  statsVisible?: number
  sceneBackground: string
  timeoutRendering?: boolean
}

const defaultGraphicsBackendConfig: GraphicsBackendConfig = {
  fpsLimit: undefined,
  powerPreference: undefined,
  sceneBackground: 'lightblue',
  timeoutRendering: false
}

export interface GraphicsInitOptions<S = any> {
  resourcesManager: ResourcesManagerTransferred
  config: GraphicsBackendConfig
  rendererSpecificSettings: S

  callbacks: {
    displayCriticalError: (error: Error) => void
    setRendererSpecificSettings: (key: string, value: any) => void

    fireCustomEvent: (eventName: string, ...args: any[]) => void
  }
}

export interface DisplayWorldOptions {
  version: string
  worldView: WorldDataEmitterWorker
  inWorldRenderingConfig: WorldRendererConfig
  playerStateReactive: PlayerStateReactive
  rendererState: RendererReactiveState
  nonReactiveState: NonReactiveState
}

export type GraphicsBackendLoader = ((options: GraphicsInitOptions) => MaybePromise<GraphicsBackend>) & {
  id: string
}

// no sync methods
export interface GraphicsBackend {
  id: string
  displayName?: string
  startPanorama: () => void
  // prepareResources: (version: string, progressReporter: ProgressReporter) => Promise<void>
  startWorld: (options: DisplayWorldOptions) => Promise<void> | void
  disconnect: () => void
  setRendering: (rendering: boolean) => void
  getDebugOverlay?: () => Record<string, any>
  updateCamera: (pos: Vec3 | null, yaw: number, pitch: number) => void
  setRoll?: (roll: number) => void
  soundSystem: SoundSystem | undefined

  backendMethods: Record<string, unknown> | undefined
}

export class AppViewer {
  waitBackendLoadPromises = [] as Array<Promise<void>>

  resourcesManager = new ResourcesManager()
  worldView: WorldDataEmitter | undefined
  readonly config: GraphicsBackendConfig = {
    ...defaultGraphicsBackendConfig,
    powerPreference: options.gpuPreference === 'default' ? undefined : options.gpuPreference
  }
  backend?: GraphicsBackend
  backendLoader?: GraphicsBackendLoader
  private currentState?: {
    method: string
    args: any[]
  }
  currentDisplay = null as 'menu' | 'world' | null
  inWorldRenderingConfig: WorldRendererConfig = proxy(defaultWorldRendererConfig)
  lastCamUpdate = 0
  playerState = playerState
  rendererState = getDefaultRendererState().reactive
  nonReactiveState: NonReactiveState = getDefaultRendererState().nonReactive
  worldReady: Promise<void>
  private resolveWorldReady: () => void

  constructor () {
    this.disconnectBackend()
  }

  async loadBackend (loader: GraphicsBackendLoader) {
    if (this.backend) {
      this.disconnectBackend()
    }

    await Promise.all(this.waitBackendLoadPromises)
    this.waitBackendLoadPromises = []

    this.backendLoader = loader
    const rendererSpecificSettings = {} as Record<string, any>
    const rendererSettingsKey = `renderer.${this.backendLoader?.id}`
    for (const key in options) {
      if (key.startsWith(rendererSettingsKey)) {
        rendererSpecificSettings[key.slice(rendererSettingsKey.length + 1)] = options[key]
      }
    }
    const loaderOptions: GraphicsInitOptions = { // todo!
      resourcesManager: this.resourcesManager as ResourcesManagerTransferred,
      config: this.config,
      callbacks: {
        displayCriticalError (error) {
          console.error(error)
          setLoadingScreenStatus(error.message, true)
        },
        setRendererSpecificSettings (key: string, value: any) {
          options[`${rendererSettingsKey}.${key}`] = value
        },
        fireCustomEvent (eventName, ...args) {
          // this.callbacks.fireCustomEvent(eventName, ...args)
        }
      },
      rendererSpecificSettings,
    }
    this.backend = await loader(loaderOptions)

    // if (this.resourcesManager.currentResources) {
    //   void this.prepareResources(this.resourcesManager.currentResources.version, createNotificationProgressReporter())
    // }

    // Execute queued action if exists
    if (this.currentState) {
      if (this.currentState.method === 'startPanorama') {
        this.startPanorama()
      } else {
        const { method, args } = this.currentState
        this.backend[method](...args)
        if (method === 'startWorld') {
          // Only auto-init if bot exists (main app mode)
          // Playground mode will call init explicitly with its position
          if (bot?.entity?.position) {
            void this.worldView!.init(bot.entity.position)
          }
          // void this.worldView!.init(args[0].playerState.getPosition())
        }
      }
    }

    // todo
    modalStackUpdateChecks()
  }

  async startWithBot () {
    const renderDistance = miscUiState.singleplayer ? options.renderDistance : options.multiplayerRenderDistance
    await this.startWorld(bot.world, renderDistance)
    this.worldView!.listenToBot(bot)
  }

  appConfigUdpate () {
    if (miscUiState.appConfig) {
      this.inWorldRenderingConfig.skinTexturesProxy = miscUiState.appConfig.skinTexturesProxy
    }
  }

  async startWorld (world, renderDistance: number, playerStateSend: PlayerStateRenderer = this.playerState.reactive, startPosition?: Vec3) {
    if (this.currentDisplay === 'world') throw new Error('World already started')
    this.currentDisplay = 'world'
    const finalStartPosition = startPosition ?? bot?.entity?.position ?? new Vec3(0, 64, 0)
    this.worldView = new WorldDataEmitter(world, renderDistance, finalStartPosition)
    this.worldView.panicChunksReload = () => {
      if (!options.experimentalClientSelfReload) return
      if (process.env.NODE_ENV === 'development') {
        displayClientChat(`[client] client panicked due to too long loading time. Soft reloading chunks...`)
      }
      void reloadChunks()
    }
    window.worldView = this.worldView
    if (!isPlayground) {
      watchOptionsAfterWorldViewInit(this.worldView)
    }
    this.appConfigUdpate()

    const displayWorldOptions: DisplayWorldOptions = {
      version: this.resourcesManager.currentConfig!.version,
      worldView: this.worldView,
      inWorldRenderingConfig: this.inWorldRenderingConfig,
      playerStateReactive: playerStateSend,
      rendererState: this.rendererState,
      nonReactiveState: this.nonReactiveState
    }
    let promise: undefined | Promise<void>
    if (this.backend) {
      promise = this.backend.startWorld(displayWorldOptions) ?? undefined
      // void this.worldView.init(startPosition)
    }
    this.currentState = { method: 'startWorld', args: [displayWorldOptions] }

    await promise
    // Resolve the promise after world is started
    this.resolveWorldReady()
    return !!promise
  }

  resetBackend (cleanState = false) {
    this.disconnectBackend(cleanState)
    if (this.backendLoader) {
      void this.loadBackend(this.backendLoader)
    }
  }

  startPanorama () {
    if (this.currentDisplay === 'menu') return
    if (options.disableAssets) return
    if (this.backend && !hasAppStatus()) {
      this.currentDisplay = 'menu'
      if (process.env.SINGLE_FILE_BUILD_MODE) {
        void loadMinecraftData(PANORAMA_VERSION).then(() => {
          this.backend?.startPanorama()
        })
      } else {
        this.backend.startPanorama()
      }
    }
    this.currentState = { method: 'startPanorama', args: [] }
  }

  // async prepareResources (version: string, progressReporter: ProgressReporter) {
  //   if (this.backend) {
  //     await this.backend.prepareResources(version, progressReporter)
  //   }
  // }

  destroyAll () {
    this.disconnectBackend()
    this.resourcesManager.destroy()
  }

  disconnectBackend (cleanState = false) {
    if (cleanState) {
      this.currentState = undefined
      this.currentDisplay = null
      this.worldView = undefined
    }
    if (this.backend) {
      this.backend.disconnect()
      this.backend = undefined
    }
    this.currentDisplay = null
    const { promise, resolve } = Promise.withResolvers<void>()
    this.worldReady = promise
    this.resolveWorldReady = resolve
    this.rendererState = proxy(getDefaultRendererState().reactive)
    this.nonReactiveState = getDefaultRendererState().nonReactive
    // this.queuedDisplay = undefined
  }

  get utils () {
    return {
      async waitingForChunks () {
        if (this.backend?.worldState.allChunksLoaded) return
        return new Promise((resolve) => {
          const interval = setInterval(() => {
            if (this.backend?.worldState.allChunksLoaded) {
              clearInterval(interval)
              resolve(true)
            }
          }, 100)
        })
      }
    }
  }
}

// do not import this. Use global appViewer instead (without window prefix).
export const appViewer = new AppViewer()
window.appViewer = appViewer

const initialMenuStart = async () => {
  if (appViewer.currentDisplay === 'world') {
    appViewer.resetBackend(true)
  }
  const demo = new URLSearchParams(window.location.search).get('demo')
  if (!demo) {
    appViewer.startPanorama()
    return
  }

  // const version = '1.18.2'
  const version = '1.21.4'
  const { loadMinecraftData } = await import('./connect')
  const { getSyncWorld } = await import('../renderer/playground/shared')
  await loadMinecraftData(version)
  const world = getSyncWorld(version)
  world.setBlockStateId(new Vec3(0, 64, 0), loadedData.blocksByName.water.defaultState)
  world.setBlockStateId(new Vec3(1, 64, 0), loadedData.blocksByName.water.defaultState)
  world.setBlockStateId(new Vec3(1, 64, 1), loadedData.blocksByName.water.defaultState)
  world.setBlockStateId(new Vec3(0, 64, 1), loadedData.blocksByName.water.defaultState)
  world.setBlockStateId(new Vec3(-1, 64, -1), loadedData.blocksByName.water.defaultState)
  world.setBlockStateId(new Vec3(-1, 64, 0), loadedData.blocksByName.water.defaultState)
  world.setBlockStateId(new Vec3(0, 64, -1), loadedData.blocksByName.water.defaultState)
  appViewer.resourcesManager.currentConfig = { version }
  appViewer.playerState.reactive = getInitialPlayerState()
  await appViewer.resourcesManager.updateAssetsData({})
  await appViewer.startWorld(world, 3)
  appViewer.backend!.updateCamera(new Vec3(0, 65.7, 0), 0, -Math.PI / 2) // Y+1 and pitch = PI/2 to look down
  void appViewer.worldView!.init(new Vec3(0, 64, 0))
}
window.initialMenuStart = initialMenuStart

const hasAppStatus = () => activeModalStack.some(m => m.reactType === 'app-status')

const modalStackUpdateChecks = () => {
  // maybe start panorama
  if (!miscUiState.gameLoaded && !hasAppStatus()) {
    void initialMenuStart()
  }

  if (appViewer.backend) {
    appViewer.backend.setRendering(!hasAppStatus())
  }

  appViewer.inWorldRenderingConfig.foreground = activeModalStack.length === 0
}
subscribe(activeModalStack, modalStackUpdateChecks)
