import * as THREE from 'three'
import * as tweenJs from '@tweenjs/tween.js'
import worldBlockProvider from 'mc-assets/dist/worldBlockProvider'
import GUI from 'lil-gui'
import { getThreeBlockModelGroup, renderBlockThree, setBlockPosition } from './mesher/standaloneRenderer'
import { getMyHand } from './hand'

export type HandItemBlock = {
  name
  properties
}

export default class HoldingBlock {
  holdingBlock: THREE.Object3D | undefined = undefined
  swingAnimation: tweenJs.Group | undefined = undefined
  blockSwapAnimation: {
    tween: tweenJs.Group
    hidden: boolean
  } | undefined = undefined
  cameraGroup = new THREE.Mesh()
  objectOuterGroup = new THREE.Group()
  objectInnerGroup = new THREE.Group()
  camera: THREE.Group | THREE.PerspectiveCamera
  stopUpdate = false
  lastHeldItem: HandItemBlock | undefined
  toBeRenderedItem: HandItemBlock | undefined
  isSwinging = false
  nextIterStopCallbacks: Array<() => void> | undefined

  constructor (public scene: THREE.Scene) {
    this.initCameraGroup()
  }

  initCameraGroup () {
    this.cameraGroup = new THREE.Mesh()
    this.scene.add(this.cameraGroup)
  }

  startSwing () {
    this.nextIterStopCallbacks = undefined // forget about cancelling
    if (this.isSwinging) return
    this.swingAnimation = new tweenJs.Group()
    this.isSwinging = true
    const cube = this.cameraGroup.children[0]
    if (cube) {
      // const DURATION = 1000 * 0.35 / 2
      const DURATION = 1000 * 0.35 / 3
      // const DURATION = 1000
      const initialPos = {
        x: this.objectInnerGroup.position.x,
        y: this.objectInnerGroup.position.y,
        z: this.objectInnerGroup.position.z
      }
      const initialRot = {
        x: this.objectInnerGroup.rotation.x,
        y: this.objectInnerGroup.rotation.y,
        z: this.objectInnerGroup.rotation.z
      }
      const mainAnim = new tweenJs.Tween(this.objectInnerGroup.position, this.swingAnimation).to({ y: this.objectInnerGroup.position.y - this.objectInnerGroup.scale.y / 2 }, DURATION).yoyo(true).repeat(Infinity).start()
      let i = 0
      mainAnim.onRepeat(() => {
        i++
        if (this.nextIterStopCallbacks && i % 2 === 0) {
          for (const callback of this.nextIterStopCallbacks) {
            callback()
          }
          this.nextIterStopCallbacks = undefined
          this.isSwinging = false
          this.swingAnimation!.removeAll()
          this.swingAnimation = undefined
          // todo refactor to be more generic for animations
          this.objectInnerGroup.position.set(initialPos.x, initialPos.y, initialPos.z)
          // this.objectInnerGroup.rotation.set(initialRot.x, initialRot.y, initialRot.z)
          Object.assign(this.objectInnerGroup.rotation, initialRot)
        }
      })

      new tweenJs.Tween(this.objectInnerGroup.rotation, this.swingAnimation).to({ z: THREE.MathUtils.degToRad(90) }, DURATION).yoyo(true).repeat(Infinity).start()
      new tweenJs.Tween(this.objectInnerGroup.rotation, this.swingAnimation).to({ x: -THREE.MathUtils.degToRad(90) }, DURATION).yoyo(true).repeat(Infinity).start()
    }
  }

  async stopSwing () {
    if (!this.isSwinging) return
    // might never resolve!
    /* return */void new Promise<void>((resolve) => {
      this.nextIterStopCallbacks ??= []
      this.nextIterStopCallbacks.push(() => {
        resolve()
      })
    })
  }

  update (camera: typeof this.camera) {
    this.camera = camera
    this.swingAnimation?.update()
    this.blockSwapAnimation?.tween.update()
    this.updateCameraGroup()
  }

  // worldTest () {
  //   const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshPhongMaterial({ color: 0x00_00_ff, transparent: true, opacity: 0.5 }))
  //   mesh.position.set(0.5, 0.5, 0.5)
  //   const group = new THREE.Group()
  //   group.add(mesh)
  //   group.position.set(-0.5, -0.5, -0.5)
  //   const outerGroup = new THREE.Group()
  //   outerGroup.add(group)
  //   outerGroup.position.set(this.camera.position.x, this.camera.position.y, this.camera.position.z)
  //   this.scene.add(outerGroup)

  //   new tweenJs.Tween(group.rotation).to({ z: THREE.MathUtils.degToRad(90) }, 1000).yoyo(true).repeat(Infinity).start()
  // }

  async playBlockSwapAnimation () {
    // if (this.blockSwapAnimation) return
    this.blockSwapAnimation ??= {
      tween: new tweenJs.Group(),
      hidden: false
    }
    const DURATION = 1000 * 0.35 / 2
    const tween = new tweenJs.Tween(this.objectInnerGroup.position, this.blockSwapAnimation.tween).to({
      y: this.objectInnerGroup.position.y + (this.objectInnerGroup.scale.y * 1.5 * (this.blockSwapAnimation.hidden ? 1 : -1))
    }, DURATION).start()
    return new Promise<void>((resolve) => {
      tween.onComplete(() => {
        if (this.blockSwapAnimation!.hidden) {
          this.blockSwapAnimation = undefined
        } else {
          this.blockSwapAnimation!.hidden = !this.blockSwapAnimation!.hidden
        }
        resolve()
      })
    })
  }

  isDifferentItem (block: HandItemBlock | undefined) {
    return this.lastHeldItem && (this.lastHeldItem.name !== block?.name || JSON.stringify(this.lastHeldItem.properties) !== JSON.stringify(block?.properties ?? '{}'))
  }

  updateCameraGroup () {
    if (this.stopUpdate) return
    const { camera } = this
    this.cameraGroup.position.copy(camera.position)
    this.cameraGroup.rotation.copy(camera.rotation)

    const viewerSize = viewer.renderer.getSize(new THREE.Vector2())
    // const x = window.x ?? 0.25 * viewerSize.width / viewerSize.height
    // const x = 0 * viewerSize.width / viewerSize.height
    const x = 0.2 * viewerSize.width / viewerSize.height
    this.objectOuterGroup.position.set(x, -0.3, -0.45)
  }

  async initHandObject (material: THREE.Material, blockstatesModels: any, blocksAtlases: any, block?: HandItemBlock) {
    let animatingCurrent = false
    if (!this.swingAnimation && !this.blockSwapAnimation && this.isDifferentItem(block)) {
      animatingCurrent = true
      await this.playBlockSwapAnimation()
      this.holdingBlock?.removeFromParent()
      this.holdingBlock = undefined
    }
    this.lastHeldItem = block
    if (!block) {
      this.holdingBlock?.removeFromParent()
      this.holdingBlock = undefined
      this.swingAnimation = undefined
      this.blockSwapAnimation = undefined
      return
    }
    const blockProvider = worldBlockProvider(blockstatesModels, blocksAtlases, 'latest')
    const models = blockProvider.getAllResolvedModels0_1(block, true)
    // const blockInner = getThreeBlockModelGroup(material, models, undefined, 'plains', loadedData)
    // const { mesh: itemMesh } = viewer.entities.getItemMesh({
    //   itemId: 541,
    // })!
    // itemMesh.position.set(0.5, 0.5, 0.5)
    // const blockInner = itemMesh
    const blockInner = await getMyHand()
    blockInner.name = 'holdingBlock'
    const blockOuterGroup = new THREE.Group()
    blockOuterGroup.add(blockInner)
    this.holdingBlock = blockInner
    this.objectInnerGroup = new THREE.Group()
    this.objectInnerGroup.add(blockOuterGroup)
    this.objectInnerGroup.position.set(-0.5, -0.5, -0.5)
    // todo cleanup
    if (animatingCurrent) {
      this.objectInnerGroup.position.y -= this.objectInnerGroup.scale.y * 1.5
    }
    Object.assign(blockOuterGroup.position, { x: 0.5, y: 0.5, z: 0.5 })

    this.objectOuterGroup = new THREE.Group()
    this.objectOuterGroup.add(this.objectInnerGroup)

    this.cameraGroup.add(this.objectOuterGroup)
    // const rotation = -45 + -90
    const yRot = 45 // should be for item
    const xRot = -90
    // this.holdingBlock.rotation.set(THREE.MathUtils.degToRad(xRot), THREE.MathUtils.degToRad(yRot), THREE.MathUtils.degToRad(xRot), 'ZYX')
    const handRotation = {
      x: 166.7,
      // y: -180,
      y: -165.2,
      // z: -156.3,
      z: -134.2,
      yOuter: -81.1
    }
    const rotationDeg = handRotation
    const setRotation = () => {
      this.holdingBlock!.rotation.x = THREE.MathUtils.degToRad(rotationDeg.x)
      this.holdingBlock!.rotation.y = THREE.MathUtils.degToRad(rotationDeg.y)
      this.holdingBlock!.rotation.z = THREE.MathUtils.degToRad(rotationDeg.z)
      this.objectOuterGroup.rotation.y = THREE.MathUtils.degToRad(rotationDeg.yOuter)
    }
    // const gui = new GUI()
    // gui.add(rotationDeg, 'x', -180, 180, 0.1)
    // gui.add(rotationDeg, 'y', -180, 180, 0.1)
    // gui.add(rotationDeg, 'z', -180, 180, 0.1)
    // gui.add(rotationDeg, 'yOuter', -180, 180, 0.1)
    // gui.onChange(setRotation)
    setRotation()

    // const scale = window.scale ?? 0.2
    const scale = 0.2
    this.objectOuterGroup.scale.set(scale, scale, scale)
    // this.objectOuterGroup.position.set(x, window.y ?? -0.41, window.z ?? -0.45)
    // this.objectOuterGroup.position.set(x, 0, -0.45)

    if (animatingCurrent) {
      await this.playBlockSwapAnimation()
    }
  }
}
