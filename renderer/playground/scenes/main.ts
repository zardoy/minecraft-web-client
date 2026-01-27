// eslint-disable-next-line import/no-named-as-default
import GUI, { Controller } from 'lil-gui'
import * as THREE from 'three'
import JSZip from 'jszip'
import { BasePlaygroundScene } from '../baseScene'
import { TWEEN_DURATION } from '../../viewer/three/entities'
import { EntityMesh } from '../../viewer/three/entity/EntityMesh'
import supportedVersions from '../../../src/supportedVersions.mjs'

const includedVersions = globalThis.includedVersions ?? supportedVersions

class MainScene extends BasePlaygroundScene {
  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor (...args) {
    super(...args)
  }

  override initGui (): void {
    // initial values
    this.params = {
      version: includedVersions.at(-1),
      skipQs: '',
      block: '',
      metadata: 0,
      supportBlock: false,
      entity: '',
      removeEntity () {
        this.entity = ''
      },
      entityRotate: false,
      camera: '',
      playSound () { },
      blockIsomorphicRenderBundle () { },
      modelVariant: 0
    }
    this.metadataGui = this.gui.add(this.params, 'metadata')
    this.paramOptions = {
      version: {
        options: includedVersions,
        hide: false
      },
      block: {
        options: mcData.blocksArray.map(b => b.name).sort((a, b) => a.localeCompare(b))
      },
      entity: {
        options: mcData.entitiesArray.map(b => b.name).sort((a, b) => a.localeCompare(b))
      },
      camera: {
        hide: true,
      }
    }
    super.initGui()
  }

  blockProps = {}
  metadataFolder: GUI | undefined
  metadataGui: Controller

  override onParamUpdate = {
    version () {
      // if (initialUpdate) return
      // viewer.world.texturesVersion = params.version
      // viewer.world.updateTexturesData()
      // todo warning
    },
    block: () => {
      this.blockProps = {}
      this.metadataFolder?.destroy()
      const block = mcData.blocksByName[this.params.block]
      if (!block) return
      console.log('block', block.name)
      const props = new this.Block(block.id, 0, 0).getProperties()
      const { states } = mcData.blocksByStateId[this.getBlock()?.minStateId] ?? {}
      this.metadataFolder = this.gui.addFolder('metadata')
      if (states) {
        for (const state of states) {
          let defaultValue: string | number | boolean
          if (state.values) { // int, enum
            defaultValue = state.values[0]
          } else {
            switch (state.type) {
              case 'bool':
                defaultValue = false
                break
              case 'int':
                defaultValue = 0
                break
              case 'direction':
                defaultValue = 'north'
                break

              default:
                continue
            }
          }
          this.blockProps[state.name] = defaultValue
          if (state.values) {
            this.metadataFolder.add(this.blockProps, state.name, state.values)
          } else {
            this.metadataFolder.add(this.blockProps, state.name)
          }
        }
      } else {
        for (const [name, value] of Object.entries(props)) {
          this.blockProps[name] = value
          this.metadataFolder.add(this.blockProps, name)
        }
      }
      console.log('props', this.blockProps)
      this.metadataFolder.open()
    },
    entity: () => {
      this.continuousRender = this.params.entity === 'player'
      this.entityUpdateShared()
      if (!this.params.entity) return
      if (this.params.entity === 'player') {
        this.worldRenderer.entities.updatePlayerSkin('id', this.worldRenderer.entities.entities.id.username, undefined, true, true)
        this.worldRenderer.entities.playAnimation('id', 'running')
      }
      // let prev = false
      // setInterval(() => {
      //   viewer.entities.playAnimation('id', prev ? 'running' : 'idle')
      //   prev = !prev
      // }, 1000)

      EntityMesh.getStaticData(this.params.entity)
      // entityRotationFolder.destroy()
      // entityRotationFolder = gui.addFolder('entity metadata')
      // entityRotationFolder.add(params, 'entityRotate')
      // entityRotationFolder.open()
    },
    supportBlock: () => {
      this.worldView!.setBlockStateId(this.targetPos.offset(0, -1, 0), this.params.supportBlock ? 1 : 0)
    },
    modelVariant: () => {
      this.worldRenderer.worldRendererConfig.debugModelVariant = this.params.modelVariant === 0 ? undefined : [this.params.modelVariant]
    }
  }

  entityUpdateShared () {
    this.worldRenderer.entities.clear()
    if (!this.params.entity) return
    this.worldView!.emit('entity', {
      id: 'id', name: this.params.entity, pos: this.targetPos.offset(0.5, 1, 0.5), width: 1, height: 1, username: localStorage.testUsername, yaw: Math.PI, pitch: 0
    })
    const enableSkeletonDebug = (obj) => {
      const { children, isSkeletonHelper } = obj
      if (!Array.isArray(children)) return
      if (isSkeletonHelper) {
        obj.visible = true
        return
      }
      for (const child of children) {
        if (typeof child === 'object') enableSkeletonDebug(child)
      }
    }
    enableSkeletonDebug(this.worldRenderer.entities.entities['id'])
    setTimeout(() => {
      this.render()
    }, TWEEN_DURATION)
  }

  getBlock () {
    return mcData.blocksByName[this.params.block || 'air']
  }

  // applyChanges (metadataUpdate = false, skipQs = false) {
  override onParamsUpdate (paramName: string, object: any) {
    const metadataUpdate = paramName === 'metadata'

    const blockId = this.getBlock()?.id
    let block: import('prismarine-block').Block
    if (metadataUpdate) {
      block = new this.Block(blockId, 0, this.params.metadata)
      Object.assign(this.blockProps, block.getProperties())
      for (const _child of this.metadataFolder!.children) {
        const child = _child as import('lil-gui').Controller
        child.updateDisplay()
      }
    } else {
      try {
        block = this.Block.fromProperties(blockId ?? -1, this.blockProps, 0)
      } catch (err) {
        console.error(err)
        block = this.Block.fromStateId(0, 0)
      }
    }

    this.worldView!.setBlockStateId(this.targetPos, block.stateId ?? 0)
    console.log('up stateId', block.stateId)
    this.params.metadata = block.metadata
    this.metadataGui.updateDisplay()
  }

  override renderFinish () {
    for (const update of Object.values(this.onParamUpdate)) {
      // update(true)
      update()
    }
    this.onParamsUpdate('', {})
    this.gui.openAnimated()
  }

  blockIsomorphicRenderBundle () {
    const { renderer } = this.worldRenderer

    const canvas = renderer.domElement
    const onlyCurrent = !confirm('Ok - render all blocks, Cancel - render only current one')
    const sizeRaw = prompt('Size', '512')
    if (!sizeRaw) return
    const size = parseInt(sizeRaw, 10)
    // const size = 512

    canvas.width = size
    canvas.height = size
    renderer.setSize(size, size)

    // Temporarily replace PerspectiveCamera with OrthographicCamera for block rendering
    this.worldRenderer.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 10) as any
    this.worldRenderer.scene.background = null

    const rad = THREE.MathUtils.degToRad(-120)
    this.worldRenderer.directionalLight.position.set(
      Math.cos(rad),
      Math.sin(rad),
      0.2
    ).normalize()
    this.worldRenderer.directionalLight.intensity = 1

    const cameraPos = this.targetPos.offset(2, 2, 2)
    const pitch = THREE.MathUtils.degToRad(-30)
    const yaw = THREE.MathUtils.degToRad(45)
    this.worldRenderer.camera.rotation.set(pitch, yaw, 0, 'ZYX')
    // this.worldRenderer!.camera.lookAt(center.x + 0.5, center.y + 0.5, center.z + 0.5)
    this.worldRenderer.camera.position.set(cameraPos.x + 1, cameraPos.y + 0.5, cameraPos.z + 1)

    const allBlocks = mcData.blocksArray.map(b => b.name)
    // const allBlocks = ['stone', 'warped_slab']

    let blockCount = 1
    let blockName = allBlocks[0]

    const updateBlock = () => {
      // viewer.setBlockStateId(targetPos, mcData.blocksByName[blockName].minStateId)
      this.params.block = blockName
      // todo cleanup (introduce getDefaultState)
      // TODO
      // onUpdate.block()
      // applyChanges(false, true)
    }
    void this.worldRenderer.waitForChunksToRender().then(async () => {
      // wait for next macro task
      await new Promise(resolve => {
        setTimeout(resolve, 0)
      })
      if (onlyCurrent) {
        this.render()
        onWorldUpdate()
      } else {
        // will be called on every render update
        this.worldRenderer.renderUpdateEmitter.addListener('update', onWorldUpdate)
        updateBlock()
      }
    })

    const zip = new JSZip()
    zip.file('description.txt', 'Generated with mcraft.fun/playground')

    const end = async () => {
      // download zip file

      const a = document.createElement('a')
      const blob = await zip.generateAsync({ type: 'blob' })
      const dataUrlZip = URL.createObjectURL(blob)
      a.href = dataUrlZip
      a.download = 'blocks_render.zip'
      a.click()
      URL.revokeObjectURL(dataUrlZip)
      console.log('end')

      this.worldRenderer.renderUpdateEmitter.removeListener('update', onWorldUpdate)
    }

    async function onWorldUpdate () {
      // await new Promise(resolve => {
      //   setTimeout(resolve, 50)
      // })
      const dataUrl = canvas.toDataURL('image/png')

      zip.file(`${blockName}.png`, dataUrl.split(',')[1], { base64: true })

      if (onlyCurrent) {
        end()
      } else {
        nextBlock()
      }
    }
    const nextBlock = async () => {
      blockName = allBlocks[blockCount++]
      console.log(allBlocks.length, '/', blockCount, blockName)
      if (blockCount % 5 === 0) {
        await new Promise(resolve => {
          setTimeout(resolve, 100)
        })
      }
      if (blockName) {
        updateBlock()
      } else {
        end()
      }
    }
  }
}

export default MainScene
