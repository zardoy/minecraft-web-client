import { Vec3 } from 'vec3'
import * as THREE from 'three'
import '../../src/getCollisionShapes'
import { IndexedData } from 'minecraft-data'
import BlockLoader from 'prismarine-block'
import blockstatesModels from 'mc-assets/dist/blockStatesModels.json'
import ChunkLoader from 'prismarine-chunk'
import WorldLoader from 'prismarine-world'

//@ts-expect-error
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
// eslint-disable-next-line import/no-named-as-default
import GUI from 'lil-gui'
import _ from 'lodash'
import { toMajorVersion } from '../../src/utils'
import { WorldDataEmitter } from '../viewer'
import { Viewer } from '../viewer/lib/viewer'
import { BlockNames } from '../../src/mcDataTypes'
import { initWithRenderer, statsEnd, statsStart } from '../../src/topRightStats'
import { initWebgpuRenderer } from './webgpuRendererMain'
import { getSyncWorld } from './shared'

window.THREE = THREE

export class BasePlaygroundScene {
  continuousRender = false
  guiParams = {}
  viewDistance = 0
  targetPos = new Vec3(2, 90, 2)
  params = {} as Record<string, any>
  paramOptions = {} as Partial<Record<keyof typeof this.params, {
    hide?: boolean
    options?: string[]
    min?: number
    max?: number
    reloadOnChange?: boolean
  }>>
  version = new URLSearchParams(window.location.search).get('version') || globalThis.includedVersions.at(-1)
  Chunk: typeof import('prismarine-chunk/types/index').PCChunk
  Block: typeof import('prismarine-block').Block
  ignoreResize = false
  enableCameraControls = true // not finished
  enableCameraOrbitControl = true
  gui = new GUI()
  onParamUpdate = {} as Record<string, () => void>
  alwaysIgnoreQs = [] as string[]
  skipUpdateQs = false
  controls: any
  windowHidden = false
  world: ReturnType<typeof getSyncWorld>

  constructor () {
    void this.initData().then(() => {
      this.addKeyboardShortcuts()
    })
  }

  onParamsUpdate (paramName: string, object: any) {}
  updateQs () {
    if (this.skipUpdateQs) return
    const oldQs = new URLSearchParams(window.location.search)
    const newQs = new URLSearchParams()
    if (oldQs.get('scene')) {
      newQs.set('scene', oldQs.get('scene')!)
    }
    for (const [key, value] of Object.entries(this.params)) {
      if (!value || typeof value === 'function' || this.params.skipQs?.includes(key) || this.alwaysIgnoreQs.includes(key)) continue
      newQs.set(key, value)
    }
    window.history.replaceState({}, '', `${window.location.pathname}?${newQs.toString()}`)
  }

  // async initialSetup () {}
  renderFinish () {
    this.render()
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
    this.gui.open(false)

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
      } else {
        this.onParamsUpdate(property, object)
      }
      this.updateQs()
    })
  }

  // mainChunk: import('prismarine-chunk/types/index').PCChunk

  setupWorld () { }

  // eslint-disable-next-line max-params
  addWorldBlock (xOffset: number, yOffset: number, zOffset: number, blockName: BlockNames, properties?: Record<string, any>) {
    if (xOffset > 16 || yOffset > 16 || zOffset > 16) throw new Error('Offset too big')
    const block =
      properties ?
        this.Block.fromProperties(loadedData.blocksByName[blockName].id, properties ?? {}, 0) :
        this.Block.fromStateId(loadedData.blocksByName[blockName].defaultState!, 0)
    this.world.setBlock(this.targetPos.offset(xOffset, yOffset, zOffset), block)
  }

  resetCamera () {
    const { targetPos } = this
    this.controls?.target.set(targetPos.x + 0.5, targetPos.y + 0.5, targetPos.z + 0.5)

    const cameraPos = targetPos.offset(2, 2, 2)
    const pitch = THREE.MathUtils.degToRad(-45)
    const yaw = THREE.MathUtils.degToRad(45)
    viewer.camera.rotation.set(pitch, yaw, 0, 'ZYX')
    viewer.camera.lookAt(targetPos.x + 0.5, targetPos.y + 0.5, targetPos.z + 0.5)
    viewer.camera.position.set(cameraPos.x + 0.5, cameraPos.y + 0.5, cameraPos.z + 0.5)
    this.controls?.update()
  }

  async initData () {
    await window._LOAD_MC_DATA()
    const mcData: IndexedData = require('minecraft-data')(this.version)
    window.loadedData = window.mcData = mcData

    this.Chunk = (ChunkLoader as any)(this.version)
    this.Block = (BlockLoader as any)(this.version)

    const world = getSyncWorld(this.version)
    this.world = world

    this.initGui()

    const worldView = new WorldDataEmitter(world, this.viewDistance, this.targetPos)
    window.worldView = worldView

    // Create three.js context, add to page
    const renderer = new THREE.WebGLRenderer({ alpha: true, ...localStorage['renderer'] })
    renderer.setPixelRatio(window.devicePixelRatio || 1)
    renderer.setSize(window.innerWidth, window.innerHeight)

    // Create viewer
    const viewer = new Viewer(renderer, { numWorkers: 1, showChunkBorders: false, })
    window.viewer = viewer
    const isWebgpu = true
    const promises = [] as Array<Promise<void>>
    if (isWebgpu) {
      promises.push(initWebgpuRenderer(() => { }, true, true)) // todo
    } else {
      initWithRenderer(renderer.domElement)
      document.body.appendChild(renderer.domElement)
    }
    viewer.addChunksBatchWaitTime = 0
    viewer.world.blockstatesModels = blockstatesModels
    viewer.entities.setDebugMode('basic')
    viewer.setVersion(this.version)
    viewer.entities.onSkinUpdate = () => {
      viewer.render()
    }
    viewer.world.mesherConfig.enableLighting = false
    await Promise.all(promises)
    this.setupWorld()

    viewer.connect(worldView)

    await worldView.init(this.targetPos)

    if (this.enableCameraControls) {
      const { targetPos } = this
      const canvas = document.querySelector('#viewer-canvas')
      const controls = this.enableCameraOrbitControl ? new OrbitControls(viewer.camera, canvas) : undefined
      this.controls = controls

      this.resetCamera()

      // #region camera rotation param
      const cameraSet = this.params.camera || localStorage.camera
      if (cameraSet) {
        const [x, y, z, rx, ry] = cameraSet.split(',').map(Number)
        viewer.camera.position.set(x, y, z)
        viewer.camera.rotation.set(rx, ry, 0, 'ZYX')
        this.controls?.update()
      }
      const throttledCamQsUpdate = _.throttle(() => {
        const { camera } = viewer
        // params.camera = `${camera.rotation.x.toFixed(2)},${camera.rotation.y.toFixed(2)}`
        // this.updateQs()
        localStorage.camera = [
          camera.position.x.toFixed(2),
          camera.position.y.toFixed(2),
          camera.position.z.toFixed(2),
          camera.rotation.x.toFixed(2),
          camera.rotation.y.toFixed(2),
        ].join(',')
      }, 200)
      if (this.controls) {
        this.controls.addEventListener('change', () => {
          throttledCamQsUpdate()
          this.render()
        })
      } else {
        setInterval(() => {
          throttledCamQsUpdate()
        }, 200)
      }
      // #endregion
    }

    if (!this.enableCameraOrbitControl) {
      // mouse
      let mouseMoveCounter = 0
      const mouseMove = (e: PointerEvent) => {
        if ((e.target as HTMLElement).closest('.lil-gui')) return
        if (e.buttons === 1 || e.pointerType === 'touch') {
          mouseMoveCounter++
          viewer.camera.rotation.x -= e.movementY / 100
          //viewer.camera.
          viewer.camera.rotation.y -= e.movementX / 100
          if (viewer.camera.rotation.x < -Math.PI / 2) viewer.camera.rotation.x = -Math.PI / 2
          if (viewer.camera.rotation.x > Math.PI / 2) viewer.camera.rotation.x = Math.PI / 2

          // yaw += e.movementY / 20;
          // pitch += e.movementX / 20;
        }
        if (e.buttons === 2) {
          viewer.camera.position.set(0, 0, 0)
        }
      }
      setInterval(() => {
        // updateTextEvent(`Mouse Events: ${mouseMoveCounter}`)
        mouseMoveCounter = 0
      }, 1000)
      window.addEventListener('pointermove', mouseMove)
    }

    // await this.initialSetup()
    this.onResize()
    window.addEventListener('resize', () => this.onResize())
    void viewer.waitForChunksToRender().then(async () => {
      this.renderFinish()
    })

    viewer.world.renderUpdateEmitter.addListener('update', () => {
      this.render()
    })

    this.loop()
  }

  loop () {
    if (this.continuousRender && !this.windowHidden) {
      this.render()
      requestAnimationFrame(() => this.loop())
    }
  }

  render () {
    statsStart()
    viewer.render()
    statsEnd()
  }

  addKeyboardShortcuts () {
    document.addEventListener('keydown', (e) => {
      if (e.code === 'KeyR' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
        this.controls?.reset()
        this.resetCamera()
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

    const updateKeys = () => {
      // if (typeof viewer === 'undefined') return
      // Create a vector that points in the direction the camera is looking
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
        viewer.camera.position.y -= 0.5
      }
      if (pressedKeys.has('Space')) {
        viewer.camera.position.y += 0.5
      }
      direction.applyQuaternion(viewer.camera.quaternion)
      direction.y = 0

      if (pressedKeys.has('ShiftLeft')) {
        direction.y *= 2
        direction.x *= 2
        direction.z *= 2
      }
      // Add the vector to the camera's position to move the camera
      viewer.camera.position.add(direction)
      this.controls?.update()
      this.render()
    }
    setInterval(updateKeys, 1000 / 30)

    const pressedKeys = new Set<string>()
    const keys = (e) => {
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
    window.addEventListener('blur', (e) => {
      for (const key of pressedKeys) {
        keys(new KeyboardEvent('keyup', { code: key }))
      }
    })
  }

  onResize () {
    if (this.ignoreResize) return

    const { camera, renderer } = viewer
    viewer.camera.aspect = window.innerWidth / window.innerHeight
    viewer.camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)

    this.render()
  }
}
