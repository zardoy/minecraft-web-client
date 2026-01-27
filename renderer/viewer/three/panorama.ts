import { join } from 'path'
import * as THREE from 'three'
import { getSyncWorld } from 'renderer/playground/shared'
import { Vec3 } from 'vec3'
import * as tweenJs from '@tweenjs/tween.js'
import type { GraphicsInitOptions } from '../../../src/appViewer'
import { WorldDataEmitter } from '../lib/worldDataEmitter'
import { defaultWorldRendererConfig, WorldRendererCommon } from '../lib/worldrendererCommon'
import { getDefaultRendererState } from '../baseGraphicsBackend'
import { ResourcesManager } from '../../../src/resourcesManager'
import { getInitialPlayerStateRenderer } from '../lib/basePlayerState'
import { loadThreeJsTextureFromUrl, loadThreeJsTextureFromUrlSync } from './threeJsUtils'
import { WorldRendererThree } from './worldrendererThree'
import { EntityMesh } from './entity/EntityMesh'
import { DocumentRenderer } from './documentRenderer'
import { PANORAMA_VERSION } from './panoramaShared'

const date = new Date()
const isChristmas = date.getMonth() === 11 && date.getDate() >= 24 && date.getDate() <= 26

const panoramaFiles = [
  'panorama_3.webp', // right (+x)
  'panorama_1.webp', // left (-x)
  'panorama_4.webp', // top (+y)
  'panorama_5.webp', // bottom (-y)
  'panorama_0.webp', // front (+z)
  'panorama_2.webp', // back (-z)
]

export class PanoramaRenderer {
  private readonly camera: THREE.PerspectiveCamera
  private scene: THREE.Scene
  private readonly ambientLight: THREE.AmbientLight
  private readonly directionalLight: THREE.DirectionalLight
  private panoramaGroup: THREE.Object3D | null = null
  private time = 0
  private readonly abortController = new AbortController()
  private worldRenderer: WorldRendererCommon | WorldRendererThree | undefined
  public WorldRendererClass = WorldRendererThree
  public startTimes = new Map<THREE.MeshBasicMaterial, number>()

  constructor (private readonly documentRenderer: DocumentRenderer, private readonly options: GraphicsInitOptions, private readonly doWorldBlocksPanorama = false) {
    this.scene = new THREE.Scene()
    // #324568
    this.scene.background = new THREE.Color(0x32_45_68)

    // Add ambient light
    this.ambientLight = new THREE.AmbientLight(0xcc_cc_cc)
    this.scene.add(this.ambientLight)

    // Add directional light
    this.directionalLight = new THREE.DirectionalLight(0xff_ff_ff, 0.5)
    this.directionalLight.position.set(1, 1, 0.5).normalize()
    this.directionalLight.castShadow = true
    this.scene.add(this.directionalLight)

    this.camera = new THREE.PerspectiveCamera(85, this.documentRenderer.canvas.width / this.documentRenderer.canvas.height, 0.05, 1000)
    this.camera.position.set(0, 0, 0)
    this.camera.rotation.set(0, 0, 0)
  }

  async start () {
    if (this.doWorldBlocksPanorama) {
      await this.worldBlocksPanorama()
    } else {
      this.addClassicPanorama()
    }


    this.documentRenderer.render = (sizeChanged = false) => {
      if (sizeChanged) {
        this.camera.aspect = this.documentRenderer.canvas.width / this.documentRenderer.canvas.height
        this.camera.updateProjectionMatrix()
      }
      this.documentRenderer.renderer.render(this.scene, this.camera)
    }
  }

  async debugImageInFrontOfCamera () {
    const image = await loadThreeJsTextureFromUrl(join('background', 'panorama_0.webp'))
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), new THREE.MeshBasicMaterial({ map: image }))
    mesh.position.set(0, 0, -500)
    mesh.rotation.set(0, 0, 0)
    this.scene.add(mesh)
  }

  addClassicPanorama () {
    const panorGeo = new THREE.BoxGeometry(1000, 1000, 1000)
    const panorMaterials = [] as THREE.MeshBasicMaterial[]
    const fadeInDuration = 200

    // void this.debugImageInFrontOfCamera()

    for (const file of panoramaFiles) {
      const load = async () => {
        const { texture } = loadThreeJsTextureFromUrlSync(join('background', isChristmas ? 'christmas' : '', file))

        // Instead of using repeat/offset to flip, we'll use the texture matrix
        texture.matrixAutoUpdate = false
        texture.matrix.set(
          -1, 0, 1, 0, 1, 0, 0, 0, 1
        )

        texture.wrapS = THREE.ClampToEdgeWrapping
        texture.wrapT = THREE.ClampToEdgeWrapping
        texture.minFilter = THREE.LinearFilter
        texture.magFilter = THREE.LinearFilter

        const material = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          side: THREE.DoubleSide,
          depthWrite: false,
          opacity: 0 // Start with 0 opacity
        })

        // Start fade-in when texture is loaded
        this.startTimes.set(material, Date.now())
        panorMaterials.push(material)
      }

      void load()
    }

    const panoramaBox = new THREE.Mesh(panorGeo, panorMaterials)
    panoramaBox.onBeforeRender = () => {
      this.time += 0.01
      panoramaBox.rotation.y = Math.PI + this.time * 0.01
      panoramaBox.rotation.z = Math.sin(-this.time * 0.001) * 0.001

      // Time-based fade in animation for each material
      for (const material of panorMaterials) {
        const startTime = this.startTimes.get(material)
        if (startTime) {
          const elapsed = Date.now() - startTime
          const progress = Math.min(1, elapsed / fadeInDuration)
          material.opacity = progress
        }
      }
    }

    const group = new THREE.Object3D()
    group.add(panoramaBox)

    if (!isChristmas) {
      // Add entities
      for (let i = 0; i < 20; i++) {
        const m = new EntityMesh('1.16.4', 'squid').mesh
        m.position.set(Math.random() * 30 - 15, Math.random() * 20 - 10, Math.random() * 10 - 17)
        m.rotation.set(0, Math.PI + Math.random(), -Math.PI / 4, 'ZYX')
        const v = Math.random() * 0.01
        m.children[0].onBeforeRender = () => {
          m.rotation.y += v
          m.rotation.z = Math.cos(panoramaBox.rotation.y * 3) * Math.PI / 4 - Math.PI / 2
        }
        group.add(m)
      }
    }

    this.scene.add(group)
    this.panoramaGroup = group
  }

  async worldBlocksPanorama () {
    const version = PANORAMA_VERSION
    const fullResourceManager = this.options.resourcesManager as ResourcesManager
    fullResourceManager.currentConfig = { version, noInventoryGui: true, }
    await fullResourceManager.updateAssetsData({ })
    if (this.abortController.signal.aborted) return
    console.time('load panorama scene')
    const world = getSyncWorld(version)
    const PrismarineBlock = require('prismarine-block')
    const Block = PrismarineBlock(version)
    const fullBlocks = loadedData.blocksArray.filter(block => {
    // if (block.name.includes('leaves')) return false
      if (/* !block.name.includes('wool') &&  */!block.name.includes('stained_glass')/*  && !block.name.includes('terracotta') */) return false
      const b = Block.fromStateId(block.defaultState, 0)
      if (b.shapes?.length !== 1) return false
      const shape = b.shapes[0]
      return shape[0] === 0 && shape[1] === 0 && shape[2] === 0 && shape[3] === 1 && shape[4] === 1 && shape[5] === 1
    })
    const Z = -15
    const sizeX = 100
    const sizeY = 100
    for (let x = -sizeX; x < sizeX; x++) {
      for (let y = -sizeY; y < sizeY; y++) {
        const block = fullBlocks[Math.floor(Math.random() * fullBlocks.length)]
        world.setBlockStateId(new Vec3(x, y, Z), block.defaultState)
      }
    }
    this.camera.updateProjectionMatrix()
    this.camera.position.set(0.5, sizeY / 2 + 0.5, 0.5)
    this.camera.rotation.set(0, 0, 0)
    const initPos = new Vec3(...this.camera.position.toArray())
    const worldView = new WorldDataEmitter(world, 2, initPos)
    // worldView.addWaitTime = 0
    if (this.abortController.signal.aborted) return

    this.worldRenderer = new this.WorldRendererClass(
      this.documentRenderer.renderer,
      this.options,
      {
        version,
        worldView,
        inWorldRenderingConfig: defaultWorldRendererConfig,
        playerStateReactive: getInitialPlayerStateRenderer().reactive,
        rendererState: getDefaultRendererState().reactive,
        nonReactiveState: getDefaultRendererState().nonReactive
      }
    )
    if (this.worldRenderer instanceof WorldRendererThree) {
      this.scene = this.worldRenderer.scene
    }
    void worldView.init(initPos)

    await this.worldRenderer.waitForChunksToRender()
    if (this.abortController.signal.aborted) return
    // add small camera rotation to side on mouse move depending on absolute position of the cursor
    const { camera } = this
    const initX = camera.position.x
    const initY = camera.position.y
    let prevTwin: tweenJs.Tween<THREE.Vector3> | undefined
    document.body.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return
      const pos = new THREE.Vector2(e.clientX, e.clientY)
      const SCALE = 0.2
      /* -0.5 - 0.5 */
      const xRel = pos.x / window.innerWidth - 0.5
      const yRel = -(pos.y / window.innerHeight - 0.5)
      prevTwin?.stop()
      const to = {
        x: initX + (xRel * SCALE),
        y: initY + (yRel * SCALE)
      }
      prevTwin = new tweenJs.Tween(camera.position).to(to, 0) // todo use the number depending on diff // todo use the number depending on diff
      // prevTwin.easing(tweenJs.Easing.Exponential.InOut)
      prevTwin.start()
      camera.updateProjectionMatrix()
    }, {
      signal: this.abortController.signal
    })

    console.timeEnd('load panorama scene')
  }

  dispose () {
    this.scene.clear()
    this.worldRenderer?.destroy()
    this.abortController.abort()
  }
}

// export class ClassicPanoramaRenderer {
//   panoramaGroup: THREE.Object3D

//   constructor (private readonly backgroundFiles: string[], onRender: Array<(sizeChanged: boolean) => void>, addSquids = true) {
//     const panorGeo = new THREE.BoxGeometry(1000, 1000, 1000)
//     const loader = new THREE.TextureLoader()
//     const panorMaterials = [] as THREE.MeshBasicMaterial[]

//     for (const file of this.backgroundFiles) {
//       const texture = loader.load(file)

//       // Instead of using repeat/offset to flip, we'll use the texture matrix
//       texture.matrixAutoUpdate = false
//       texture.matrix.set(
//         -1, 0, 1, 0, 1, 0, 0, 0, 1
//       )

//       texture.wrapS = THREE.ClampToEdgeWrapping // Changed from RepeatWrapping
//       texture.wrapT = THREE.ClampToEdgeWrapping // Changed from RepeatWrapping
//       texture.minFilter = THREE.LinearFilter
//       texture.magFilter = THREE.LinearFilter

//       panorMaterials.push(new THREE.MeshBasicMaterial({
//         map: texture,
//         transparent: true,
//         side: THREE.DoubleSide,
//         depthWrite: false,
//       }))
//     }

//     const panoramaBox = new THREE.Mesh(panorGeo, panorMaterials)
//     panoramaBox.onBeforeRender = () => {
//     }

//     const group = new THREE.Object3D()
//     group.add(panoramaBox)

//     if (addSquids) {
//       // Add squids
//       for (let i = 0; i < 20; i++) {
//         const m = new EntityMesh('1.16.4', 'squid').mesh
//         m.position.set(Math.random() * 30 - 15, Math.random() * 20 - 10, Math.random() * 10 - 17)
//         m.rotation.set(0, Math.PI + Math.random(), -Math.PI / 4, 'ZYX')
//         const v = Math.random() * 0.01
//         onRender.push(() => {
//           m.rotation.y += v
//           m.rotation.z = Math.cos(panoramaBox.rotation.y * 3) * Math.PI / 4 - Math.PI / 2
//         })
//         group.add(m)
//       }
//     }

//     this.panoramaGroup = group
//   }
// }
