import { Vec3 } from 'vec3'
import * as THREE from 'three'
import '../../src/getCollisionShapes'
import { IndexedData } from 'minecraft-data'
import BlockLoader from 'prismarine-block'
import ChunkLoader from 'prismarine-chunk'
import WorldLoader from 'prismarine-world'
import { proxy } from 'valtio'

//@ts-expect-error
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
// eslint-disable-next-line import/no-named-as-default
import GUI from 'lil-gui'
import _ from 'lodash'
import supportedVersions from '../../src/supportedVersions.mjs'
import { toMajorVersion } from '../../src/utils'
import { BlockNames } from '../../src/mcDataTypes'
import { defaultWorldRendererConfig, WorldRendererConfig } from '../viewer/lib/worldrendererCommon'
import { WorldDataEmitter } from '../viewer/lib/worldDataEmitter'
import { getInitialPlayerState } from '../viewer/lib/basePlayerState'
import { appGraphicBackends } from '../../src/appViewerLoad'
import { getSyncWorld } from './shared'

window.THREE = THREE

// Scene configuration interface
export interface PlaygroundSceneConfig {
  version?: string
  viewDistance?: number
  targetPos?: Vec3
  enableCameraControls?: boolean
  enableCameraOrbitControl?: boolean
  worldConfig?: WorldRendererConfig
  continuousRender?: boolean
}

const includedVersions = globalThis.includedVersions ?? supportedVersions

export class BasePlaygroundScene {
  // Rendering state
  continuousRender = false
  stopRender = false
  windowHidden = false

  // Scene configuration
  viewDistance = 0
  targetPos = new Vec3(2, 90, 2)
  version: string = new URLSearchParams(window.location.search).get('version') || includedVersions.at(-1)!

  // World data
  Chunk: typeof import('prismarine-chunk/types/index').PCChunk
  Block: typeof import('prismarine-block').Block
  world: ReturnType<typeof getSyncWorld>

  // GUI
  gui = new GUI()
  params = {} as Record<string, any>
  paramOptions = {} as Partial<Record<keyof typeof this.params, {
    hide?: boolean
    options?: string[]
    min?: number
    max?: number
    reloadOnChange?: boolean
  }>>
  onParamUpdate = {} as Record<string, () => void>
  alwaysIgnoreQs = [] as string[]
  skipUpdateQs = false

  // Camera controls - own camera synced to backend
  enableCameraControls = true
  enableCameraOrbitControl = true
  controls: OrbitControls | undefined
  camera: THREE.PerspectiveCamera

  // World data emitter (from appViewer)
  worldView: WorldDataEmitter | undefined

  // Debug FPS tracking
  private debugFpsElement: HTMLElement | undefined
  private frameCount = 0
  private lastSecondTime = performance.now()
  private frameTimes: number[] = []
  private currentFps = 0
  private maxFrameDelay = 0

  // Getter for worldRenderer - accesses via window.world for advanced scene features
  // This allows derived scenes to access worldRenderer when needed without storing it
  get worldRenderer () {
    return window.world
  }

  // World config - syncs with appViewer.inWorldRenderingConfig
  get worldConfig () {
    return appViewer.inWorldRenderingConfig
  }
  set worldConfig (value) {
    // Merge the new values into appViewer's config to maintain reactivity
    Object.assign(appViewer.inWorldRenderingConfig, value)
  }

  constructor (config: PlaygroundSceneConfig = {}) {
    // Apply config
    if (config.version) this.version = config.version

    // Ensure version is always set (fallback to latest supported version)
    if (!this.version) {
      throw new Error('Minecraft version is not set')
    }

    if (config.viewDistance !== undefined) this.viewDistance = config.viewDistance
    if (config.targetPos) this.targetPos = config.targetPos
    if (config.enableCameraControls !== undefined) this.enableCameraControls = config.enableCameraControls
    if (config.enableCameraOrbitControl !== undefined) this.enableCameraOrbitControl = config.enableCameraOrbitControl
    if (config.worldConfig) {
      // Merge config into appViewer's config to maintain reactivity
      Object.assign(appViewer.inWorldRenderingConfig, config.worldConfig)
    }
    appViewer.inWorldRenderingConfig.showHand = false
    appViewer.inWorldRenderingConfig.isPlayground = true
    appViewer.inWorldRenderingConfig.instantCameraUpdate = this.enableCameraOrbitControl
    appViewer.config.statsVisible = 2
    if (config.continuousRender !== undefined) this.continuousRender = config.continuousRender

    void this.initData().then(() => {
      this.addKeyboardShortcuts()
    })
  }

  onParamsUpdate (paramName: string, object: any) {}

  updateQs (paramName: string, valueSet: any) {
    if (this.skipUpdateQs) return
    const newQs = new URLSearchParams(window.location.search)
    for (const [key, value] of Object.entries({ [paramName]: valueSet })) {
      if (typeof value === 'function' || this.params.skipQs?.includes(key) || this.alwaysIgnoreQs.includes(key)) continue
      if (value) {
        newQs.set(key, value)
      } else {
        newQs.delete(key)
      }
    }
    window.history.replaceState({}, '', `${window.location.pathname}?${newQs.toString()}`)
  }

  renderFinish () {
    this.requestRender()
  }

  initGui () {
    const qs = new URLSearchParams(window.location.search)
    for (const key of Object.keys(this.params)) {
      const value = qs.get(key)
      if (!value) continue
      const parsed = /^-?\d+$/.test(value) ? Number(value) : value === 'true' ? true : value === 'false' ? false : value
      this.params[key] = parsed
    }

    for (const param of Object.keys(this.params)) {
      const option = this.paramOptions[param]
      if (option?.hide) continue
      this.gui.add(this.params, param, option?.options ?? option?.min, option?.max)
    }
    if (window.innerHeight < 700) {
      this.gui.open(false)
    } else {
      setTimeout(() => {
        this.gui.domElement.classList.remove('transition')
      }, 500)
    }

    this.gui.onChange(({ property, object }) => {
      if (object === this.params) {
        this.onParamUpdate[property]?.()
        this.onParamsUpdate(property, object)
        const value = this.params[property]
        if (this.paramOptions[property]?.reloadOnChange && (typeof value === 'boolean' || this.paramOptions[property].options)) {
          setTimeout(() => {
            window.location.reload()
          })
        }
        this.updateQs(property, value)
      } else {
        this.onParamsUpdate(property, object)
      }
    })
  }

  // Overridable methods
  setupWorld () { }
  sceneReset () {}

  // eslint-disable-next-line max-params
  addWorldBlock (xOffset: number, yOffset: number, zOffset: number, blockName: BlockNames, properties?: Record<string, any>) {
    if (xOffset > 16 || yOffset > 16 || zOffset > 16) throw new Error('Offset too big')
    const block =
      properties ?
        this.Block.fromProperties(loadedData.blocksByName[blockName].id, properties ?? {}, 0) :
        this.Block.fromStateId(loadedData.blocksByName[blockName].defaultState, 0)
    this.world.setBlock(this.targetPos.offset(xOffset, yOffset, zOffset), block)
  }

  // Sync our camera state to the graphics backend
  // Extract rotation from OrbitControls spherical coordinates to avoid flip issues
  protected syncCameraToBackend (onlyRotation = false) {
    if (!appViewer.backend || !this.camera) return

    // Extract rotation from camera's quaternion to avoid gimbal lock issues
    // Get forward direction vector to extract yaw/pitch properly
    const forward = new THREE.Vector3(0, 0, -1)
    forward.applyQuaternion(this.camera.quaternion)

    // Calculate yaw and pitch from forward vector
    // Yaw: rotation around Y axis (horizontal)
    const yaw = Math.atan2(-forward.x, -forward.z)
    // Pitch: angle from horizontal plane (vertical)
    const pitch = Math.asin(forward.y)

    if (onlyRotation) {
      appViewer.backend.updateCamera(null, yaw, pitch)
      return
    }

    const pos = new Vec3(this.camera.position.x, this.camera.position.y, this.camera.position.z)
    appViewer.backend.updateCamera(pos, yaw, pitch)
  }

  resetCamera () {
    if (!this.camera) return
    const { targetPos } = this
    this.controls?.target.set(targetPos.x + 0.5, targetPos.y + 0.5, targetPos.z + 0.5)

    const cameraPos = targetPos.offset(2, 2, 2)
    this.camera.position.set(cameraPos.x + 0.5, cameraPos.y + 0.5, cameraPos.z + 0.5)
    this.camera.lookAt(targetPos.x + 0.5, targetPos.y + 0.5, targetPos.z + 0.5)
    this.controls?.update()
    // Sync after reset - this uses quaternion extraction which avoids flip issues
    this.syncCameraToBackend()
  }

  async initData () {
    await window._LOAD_MC_DATA()
    const mcData: IndexedData = require('minecraft-data')(this.version)
    window.loadedData = window.mcData = mcData

    this.Chunk = (ChunkLoader as any)(this.version)
    this.Block = (BlockLoader as any)(this.version)

    const world = getSyncWorld(this.version)
    world.setBlockStateId(this.targetPos, 0)
    this.world = world

    this.initGui()

    // Use appViewer for resource management and world rendering
    // worldConfig is already synced with appViewer.inWorldRenderingConfig via getter/setter

    // Initialize resources manager via appViewer
    appViewer.resourcesManager.currentConfig = { version: this.version, noInventoryGui: true }
    await appViewer.resourcesManager.loadSourceData(this.version)
    await appViewer.resourcesManager.updateAssetsData({})

    // Load backend if not already loaded
    if (!appViewer.backend) {
      await appViewer.loadBackend(appGraphicBackends[0])
    }

    // Start world using appViewer
    // This creates WorldDataEmitter, GraphicsBackend, and WorldRendererThree internally
    await appViewer.startWorld(world, this.viewDistance, proxy(getInitialPlayerState()), this.targetPos)

    // Get world view from appViewer
    this.worldView = appViewer.worldView

    // Create our own camera for OrbitControls - this is separate from the internal worldRenderer camera
    // We sync our camera state to the backend via updateCamera()
    this.camera = new THREE.PerspectiveCamera(
      appViewer.inWorldRenderingConfig.fov || 75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )

    // Setup world (adds blocks, etc.)
    this.setupWorld()

    // Initialize world view with target position (loads chunks after setup)
    if (this.worldView) {
      this.worldView.addWaitTime = 0
      await this.worldView.init(this.targetPos)
    }

    // Setup camera controls with our own camera
    if (this.enableCameraControls) {
      const canvas = document.querySelector('#viewer-canvas')
      if (canvas) {
        const controls = this.enableCameraOrbitControl
          ? new OrbitControls(this.camera, canvas as HTMLElement)
          : undefined
        this.controls = controls

        this.resetCamera()

        // Camera position from query string or localStorage
        const cameraSet = this.params.camera || localStorage.camera
        if (cameraSet) {
          const [x, y, z, rx, ry] = cameraSet.split(',').map(Number)
          this.camera.position.set(x, y, z)
          this.camera.rotation.set(rx, ry, 0, 'ZYX')
          this.controls?.update()
          // this.syncCameraToBackend()
        }

        const throttledCamQsUpdate = _.throttle(() => {
          if (!this.camera) return
          localStorage.camera = [
            this.camera.position.x.toFixed(2),
            this.camera.position.y.toFixed(2),
            this.camera.position.z.toFixed(2),
            this.camera.rotation.x.toFixed(2),
            this.camera.rotation.y.toFixed(2),
          ].join(',')
        }, 200)

        if (this.controls) {
          const throttledCameraSync = _.throttle(() => {
            // this.syncCameraToBackend(true) // Only sync rotation when OrbitControls changes
          }, 16) // ~60fps sync rate

          this.controls.addEventListener('change', () => {
            throttledCameraSync()
            throttledCamQsUpdate()
            this.requestRender()
          })
        } else {
          setInterval(() => {
            throttledCamQsUpdate()
          }, 200)
        }
      }
    }

    // Manual camera controls (if orbit controls disabled)
    if (!this.enableCameraOrbitControl && this.camera) {
      let mouseMoveCounter = 0
      const mouseMove = (e: PointerEvent) => {
        if ((e.target as HTMLElement).closest('.lil-gui')) return
        if (e.buttons === 1 || e.pointerType === 'touch') {
          mouseMoveCounter++
          this.camera.rotation.x -= e.movementY / 100
          this.camera.rotation.y -= e.movementX / 100
          if (this.camera.rotation.x < -Math.PI / 2) this.camera.rotation.x = -Math.PI / 2
          if (this.camera.rotation.x > Math.PI / 2) this.camera.rotation.x = Math.PI / 2
          this.syncCameraToBackend(true)
        }
        if (e.buttons === 2) {
          this.camera.position.set(0, 0, 0)
          this.syncCameraToBackend()
        }
      }
      setInterval(() => {
        mouseMoveCounter = 0
      }, 1000)
      window.addEventListener('pointermove', mouseMove)
    }

    // Setup resize handler
    this.onResize()
    window.addEventListener('resize', () => this.onResize())

    // Setup debug FPS GUI
    this.setupDebugFpsGui()

    // Wait for chunks and finish setup
    // Access worldRenderer via window.world for this one-time operation
    // const worldRenderer = window.world
    // if (worldRenderer) {
    //   void worldRenderer.waitForChunksToRender().then(async () => {
    //     this.renderFinish()
    //   })

    //   // Listen for world updates to trigger on-demand renders
    //   worldRenderer.renderUpdateEmitter.addListener('update', () => {
    //     this.requestRender()
    //   })
    // }

    // // Start render loop if continuous, otherwise use on-demand rendering
    // if (this.continuousRender) {
    //   this.loop()
    // }
    this.renderFinish()
    this.mainDebugLoop()
  }

  mainDebugLoop () {
    requestAnimationFrame(() => this.mainDebugLoop())
    this.trackFrame()
  }

  loop () {
    if (this.continuousRender && !this.windowHidden) {
      this.requestRender()
      requestAnimationFrame(() => this.loop())
    }
  }

  // Request a render from the backend (on-demand rendering)
  // The DocumentRenderer loop handles actual rendering continuously
  // Camera sync happens via syncCameraToBackend() which updates the internal camera
  requestRender () {
    // No-op: rendering is handled by DocumentRenderer's continuous loop
    // This method exists for API compatibility
  }

  private setupDebugFpsGui () {
    // Create simple DOM element for debug FPS display in bottom left corner
    this.debugFpsElement = document.createElement('div')
    this.debugFpsElement.style.position = 'fixed'
    this.debugFpsElement.style.bottom = '0'
    this.debugFpsElement.style.left = '0'
    this.debugFpsElement.style.zIndex = '1000'
    this.debugFpsElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'
    this.debugFpsElement.style.color = '#fff'
    this.debugFpsElement.style.padding = '4px 6px'
    this.debugFpsElement.style.fontFamily = 'monospace'
    this.debugFpsElement.style.fontSize = '11px'
    this.debugFpsElement.style.lineHeight = '1.2'
    this.debugFpsElement.style.pointerEvents = 'none'
    this.debugFpsElement.style.userSelect = 'none'
    this.debugFpsElement.textContent = 'FPS: 0 | Max: 0 ms'

    document.body.appendChild(this.debugFpsElement)

    // Update debug info every second
    setInterval(() => {
      this.updateDebugInfo()
    }, 1000)
  }

  private trackFrame () {
    const now = performance.now()
    this.frameTimes.push(now)
    this.frameCount++

    // Calculate frame delay (time since last frame)
    if (this.frameTimes.length > 1) {
      const delay = now - this.frameTimes.at(-2)!
      if (delay > this.maxFrameDelay) {
        this.maxFrameDelay = delay
      }
    }

    // Keep only last second of frame times
    const oneSecondAgo = now - 1000
    this.frameTimes = this.frameTimes.filter(time => time > oneSecondAgo)
  }

  private updateDebugInfo () {
    if (!this.debugFpsElement) return

    // Calculate FPS from number of frames in the last second
    // frameTimes array contains timestamps from the last second after filtering
    const fps = this.frameTimes.length

    this.currentFps = fps

    const isSeriousDelay = this.maxFrameDelay > 150
    const delayText = isSeriousDelay
      ? `<span style="color: #ff4444;">${this.maxFrameDelay.toFixed(0)}ms</span>`
      : `${this.maxFrameDelay.toFixed(0)}ms`

    // Update the DOM element directly - single line format
    this.debugFpsElement.innerHTML = `FPS: ${fps} | Max Delay: ${delayText}`

    // Reset for next second
    this.lastSecondTime = performance.now()
    this.maxFrameDelay = 0
    this.frameCount = 0
  }

  // Legacy render method for compatibility
  render (fromLoop = false) {
    this.requestRender()
  }

  addKeyboardShortcuts () {
    document.addEventListener('keydown', (e) => {
      if (!e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (e.code === 'KeyR') {
          this.controls?.reset()
          this.resetCamera()
        }
        if (e.code === 'KeyE') { // refresh block (main)
          this.worldView!.setBlockStateId(this.targetPos, this.world.getBlockStateId(this.targetPos))
        }
        if (e.code === 'KeyF') { // reload all chunks
          this.sceneReset()
          this.worldView!.unloadAllChunks()
          void this.worldView!.init(this.targetPos)
        }
      }
    })
    document.addEventListener('visibilitychange', () => {
      this.windowHidden = document.visibilityState === 'hidden'
    })
    document.addEventListener('blur', () => {
      this.windowHidden = true
    })
    document.addEventListener('focus', () => {
      this.windowHidden = false
    })

    const pressedKeys = new Set<string>()
    const updateKeys = () => {
      if (pressedKeys.has('ControlLeft') || pressedKeys.has('MetaLeft')) {
        return
      }
      if (!this.camera) return

      const direction = new THREE.Vector3(0, 0, 0)
      if (pressedKeys.has('KeyW')) {
        direction.z = -0.5
      }
      if (pressedKeys.has('KeyS')) {
        direction.z += 0.5
      }
      if (pressedKeys.has('KeyA')) {
        direction.x -= 0.5
      }
      if (pressedKeys.has('KeyD')) {
        direction.x += 0.5
      }

      if (pressedKeys.has('ShiftLeft')) {
        this.camera.position.y -= 0.5
      }
      if (pressedKeys.has('Space')) {
        this.camera.position.y += 0.5
      }
      direction.applyQuaternion(this.camera.quaternion)
      direction.y = 0

      if (pressedKeys.has('ShiftLeft')) {
        direction.y *= 2
        direction.x *= 2
        direction.z *= 2
      }
      this.camera.position.add(direction.normalize())
      this.controls?.update()
      this.syncCameraToBackend()
      this.requestRender()
    }
    setInterval(updateKeys, 1000 / 20)

    const keys = (e: KeyboardEvent) => {
      const { code } = e
      const pressed = e.type === 'keydown'
      if (pressed) {
        pressedKeys.add(code)
      } else {
        pressedKeys.delete(code)
      }
    }

    window.addEventListener('keydown', keys)
    window.addEventListener('keyup', keys)
    window.addEventListener('blur', () => {
      for (const key of pressedKeys) {
        keys(new KeyboardEvent('keyup', { code: key }))
      }
    })
  }

  onResize () {
    this.requestRender()
  }
}
