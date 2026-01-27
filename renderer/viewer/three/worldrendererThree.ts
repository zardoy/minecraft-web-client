import * as THREE from 'three'
import { Vec3 } from 'vec3'
import nbt from 'prismarine-nbt'
import PrismarineChatLoader from 'prismarine-chat'
import * as tweenJs from '@tweenjs/tween.js'
import { Biome } from 'minecraft-data'
import { renderSign } from '../sign-renderer'
import { DisplayWorldOptions, GraphicsInitOptions } from '../../../src/appViewer'
import { chunkPos, sectionPos } from '../lib/simpleUtils'
import { WorldRendererCommon } from '../lib/worldrendererCommon'
import { addNewStat } from '../lib/ui/newStats'
import { MesherGeometryOutput } from '../lib/mesher/shared'
import { ItemSpecificContextProperties } from '../lib/basePlayerState'
import { setBlockPosition } from '../lib/mesher/standaloneRenderer'
import { getBannerTexture, createBannerMesh, releaseBannerTexture } from './bannerRenderer'
import { getMyHand } from './hand'
import HoldingBlock from './holdingBlock'
import { getMesh } from './entity/EntityMesh'
import { armorModel } from './entity/armorModels'
import { disposeObject, loadThreeJsTextureFromBitmap } from './threeJsUtils'
import { CursorBlock } from './world/cursorBlock'
import { getItemUv } from './appShared'
import { Entities } from './entities'
import { ThreeJsSound } from './threeJsSound'
import { CameraShake } from './cameraShake'
import { ThreeJsMedia } from './threeJsMedia'
import { Fountain } from './threeJsParticles'
import { WaypointsRenderer } from './waypoints'
import { DEFAULT_TEMPERATURE, SkyboxRenderer } from './skyboxRenderer'
import { FireworksManager } from './fireworks'
import { downloadWorldGeometry } from './worldGeometryExport'

type SectionKey = string

export class WorldRendererThree extends WorldRendererCommon {
  outputFormat = 'threeJs' as const
  sectionObjects: Record<string, THREE.Object3D & { foutain?: boolean }> = {}
  chunkTextures = new Map<string, { [pos: string]: THREE.Texture }>()
  signsCache = new Map<string, any>()
  starField: StarField
  cameraSectionPos: Vec3 = new Vec3(0, 0, 0)
  holdingBlock: HoldingBlock
  holdingBlockLeft: HoldingBlock
  scene = new THREE.Scene()
  ambientLight = new THREE.AmbientLight(0xcc_cc_cc)
  directionalLight = new THREE.DirectionalLight(0xff_ff_ff, 0.5)
  entities = new Entities(this)
  cameraGroupVr?: THREE.Object3D
  material = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, alphaTest: 0.1 })
  itemsTexture: THREE.Texture
  cursorBlock: CursorBlock
  onRender: Array<() => void> = []
  cameraShake: CameraShake
  cameraContainer: THREE.Object3D
  media: ThreeJsMedia
  waitingChunksToDisplay = {} as { [chunkKey: string]: SectionKey[] }
  waypoints: WaypointsRenderer
  camera: THREE.PerspectiveCamera
  renderTimeAvg = 0
  sectionsOffsetsAnimations = {} as {
    [chunkKey: string]: {
      time: number,
      // also specifies direction
      speedX: number,
      speedY: number,
      speedZ: number,

      currentOffsetX: number,
      currentOffsetY: number,
      currentOffsetZ: number,

      limitX?: number,
      limitY?: number,
      limitZ?: number,
    }
  }
  fountains: Fountain[] = []
  DEBUG_RAYCAST = false
  skyboxRenderer: SkyboxRenderer
  fireworks: FireworksManager

  private currentPosTween?: tweenJs.Tween<THREE.Vector3>
  private currentRotTween?: tweenJs.Tween<{ pitch: number, yaw: number }>

  get tilesRendered () {
    return Object.values(this.sectionObjects).reduce((acc, obj) => acc + (obj as any).tilesCount, 0)
  }

  get blocksRendered () {
    return Object.values(this.sectionObjects).reduce((acc, obj) => acc + (obj as any).blocksCount, 0)
  }

  constructor (public renderer: THREE.WebGLRenderer, public initOptions: GraphicsInitOptions, public displayOptions: DisplayWorldOptions) {
    if (!initOptions.resourcesManager) throw new Error('resourcesManager is required')
    super(initOptions.resourcesManager, displayOptions, initOptions)

    this.renderer = renderer
    displayOptions.rendererState.renderer = WorldRendererThree.getRendererInfo(renderer) ?? '...'
    this.starField = new StarField(this)
    this.cursorBlock = new CursorBlock(this)
    this.holdingBlock = new HoldingBlock(this)
    this.holdingBlockLeft = new HoldingBlock(this, true)

    // Initialize skybox renderer
    this.skyboxRenderer = new SkyboxRenderer(this.scene, this.worldRendererConfig.defaultSkybox, null)
    void this.skyboxRenderer.init()

    this.addDebugOverlay()
    this.resetScene()
    void this.init()

    this.soundSystem = new ThreeJsSound(this)
    this.cameraShake = new CameraShake(this, this.onRender)
    this.media = new ThreeJsMedia(this)
    this.waypoints = new WaypointsRenderer(this)
    this.fireworks = new FireworksManager(this.scene)

    // this.fountain = new Fountain(this.scene, this.scene, {
    //   position: new THREE.Vector3(0, 10, 0),
    // })

    this.renderUpdateEmitter.on('chunkFinished', (chunkKey: string) => {
      this.finishChunk(chunkKey)
    })
    this.worldSwitchActions()
  }

  get cameraObject () {
    return this.cameraGroupVr ?? this.cameraContainer
  }

  worldSwitchActions () {
    this.onWorldSwitched.push(() => {
      // clear custom blocks
      this.protocolCustomBlocks.clear()
      // Reset section animations
      this.sectionsOffsetsAnimations = {}
      // Clear waypoints
      this.waypoints.clear()
      // Clear fireworks
      this.fireworks.clear()
    })
  }

  downloadWorldGeometry () {
    downloadWorldGeometry(this, this.cameraObject.position, this.cameraShake.getBaseRotation(), 'world-geometry.json')
  }

  updateEntity (e, isPosUpdate = false) {
    const overrides = {
      rotation: {
        head: {
          x: e.headPitch ?? e.pitch,
          y: e.headYaw,
          z: 0
        }
      }
    }
    if (isPosUpdate) {
      this.entities.updateEntityPosition(e, false, overrides)
    } else {
      this.entities.update(e, overrides)
    }
  }

  updatePlayerEntity (e: any) {
    this.entities.handlePlayerEntity(e)
  }

  resetScene () {
    this.scene.matrixAutoUpdate = false // for perf
    this.scene.background = new THREE.Color(this.initOptions.config.sceneBackground)
    this.scene.add(this.ambientLight)
    this.directionalLight.position.set(1, 1, 0.5).normalize()
    this.directionalLight.castShadow = true
    this.scene.add(this.directionalLight)

    const size = this.renderer.getSize(new THREE.Vector2())
    this.camera = new THREE.PerspectiveCamera(75, size.x / size.y, 0.1, 1000)
    this.cameraContainer = new THREE.Object3D()
    this.cameraContainer.add(this.camera)
    this.scene.add(this.cameraContainer)
  }

  override watchReactivePlayerState () {
    super.watchReactivePlayerState()
    this.onReactivePlayerStateUpdated('inWater', (value) => {
      this.skyboxRenderer.updateWaterState(value, this.playerStateReactive.waterBreathing)
    })
    this.onReactivePlayerStateUpdated('waterBreathing', (value) => {
      this.skyboxRenderer.updateWaterState(this.playerStateReactive.inWater, value)
    })
    this.onReactivePlayerStateUpdated('ambientLight', (value) => {
      if (!value) return
      this.ambientLight.intensity = value
    })
    this.onReactivePlayerStateUpdated('directionalLight', (value) => {
      if (!value) return
      this.directionalLight.intensity = value
    })
    this.onReactivePlayerStateUpdated('lookingAtBlock', (value) => {
      this.cursorBlock.setHighlightCursorBlock(value ? new Vec3(value.x, value.y, value.z) : null, value?.shapes)
    })
    this.onReactivePlayerStateUpdated('diggingBlock', (value) => {
      this.cursorBlock.updateBreakAnimation(value ? { x: value.x, y: value.y, z: value.z } : undefined, value?.stage ?? null, value?.mergedShape)
    })
    this.onReactivePlayerStateUpdated('perspective', (value) => {
      // Update camera perspective when it changes
      const vecPos = new Vec3(this.cameraObject.position.x, this.cameraObject.position.y, this.cameraObject.position.z)
      this.updateCamera(vecPos, this.cameraShake.getBaseRotation().yaw, this.cameraShake.getBaseRotation().pitch)
      // todo also update camera when block within camera was changed
    })
  }

  override watchReactiveConfig () {
    super.watchReactiveConfig()
    this.onReactiveConfigUpdated('showChunkBorders', (value) => {
      this.updateShowChunksBorder(value)
    })
    this.onReactiveConfigUpdated('defaultSkybox', (value) => {
      this.skyboxRenderer.updateDefaultSkybox(value)
    })
  }

  changeHandSwingingState (isAnimationPlaying: boolean, isLeft = false) {
    const holdingBlock = isLeft ? this.holdingBlockLeft : this.holdingBlock
    if (isAnimationPlaying) {
      holdingBlock.startSwing()
    } else {
      holdingBlock.stopSwing()
    }
  }

  async updateAssetsData (): Promise<void> {
    const resources = this.resourcesManager.currentResources

    const oldTexture = this.material.map
    const oldItemsTexture = this.itemsTexture

    const texture = loadThreeJsTextureFromBitmap(resources.blocksAtlasImage)
    texture.needsUpdate = true
    texture.flipY = false
    this.material.map = texture

    const itemsTexture = loadThreeJsTextureFromBitmap(resources.itemsAtlasImage)
    itemsTexture.needsUpdate = true
    itemsTexture.flipY = false
    this.itemsTexture = itemsTexture

    if (oldTexture) {
      oldTexture.dispose()
    }
    if (oldItemsTexture) {
      oldItemsTexture.dispose()
    }

    await super.updateAssetsData()
    this.onAllTexturesLoaded()
    if (Object.keys(this.loadedChunks).length > 0) {
      console.log('rerendering chunks because of texture update')
      this.rerenderAllChunks()
    }
  }

  onAllTexturesLoaded () {
    this.holdingBlock.ready = true
    this.holdingBlock.updateItem()
    this.holdingBlockLeft.ready = true
    this.holdingBlockLeft.updateItem()
  }

  changeBackgroundColor (color: [number, number, number]): void {
    this.scene.background = new THREE.Color(color[0], color[1], color[2])
  }

  timeUpdated (newTime: number): void {
    const nightTime = 13_500
    const morningStart = 23_000
    const displayStars = newTime > nightTime && newTime < morningStart
    if (displayStars) {
      this.starField.addToScene()
    } else {
      this.starField.remove()
    }

    this.skyboxRenderer.updateTime(newTime)
  }

  biomeUpdated (biome: Biome): void {
    if (biome?.temperature !== undefined) {
      this.skyboxRenderer.updateTemperature(biome.temperature)
    }
  }

  biomeReset (): void {
    // Reset to default temperature when biome is unknown
    this.skyboxRenderer.updateTemperature(DEFAULT_TEMPERATURE)
  }

  getItemRenderData (item: Record<string, any>, specificProps: ItemSpecificContextProperties) {
    return getItemUv(item, specificProps, this.resourcesManager, this.playerStateReactive)
  }

  async demoModel () {
    //@ts-expect-error
    const pos = cursorBlockRel(0, 1, 0).position

    const mesh = (await getMyHand())!
    // mesh.rotation.y = THREE.MathUtils.degToRad(90)
    setBlockPosition(mesh, pos)
    const helper = new THREE.BoxHelper(mesh, 0xff_ff_00)
    mesh.add(helper)
    this.scene.add(mesh)
  }

  demoItem () {
    //@ts-expect-error
    const pos = cursorBlockRel(0, 1, 0).position
    const { mesh } = this.entities.getItemMesh({
      itemId: 541,
    }, {})!
    mesh.position.set(pos.x + 0.5, pos.y + 0.5, pos.z + 0.5)
    // mesh.scale.set(0.5, 0.5, 0.5)
    const helper = new THREE.BoxHelper(mesh, 0xff_ff_00)
    mesh.add(helper)
    this.scene.add(mesh)
  }

  debugOverlayAdded = false
  addDebugOverlay () {
    if (this.debugOverlayAdded) return
    this.debugOverlayAdded = true
    const pane = addNewStat('debug-overlay')
    setInterval(() => {
      pane.setVisibility(this.displayAdvancedStats)
      if (this.displayAdvancedStats) {
        const formatBigNumber = (num: number) => {
          return new Intl.NumberFormat('en-US', {}).format(num)
        }
        let text = ''
        text += `C: ${formatBigNumber(this.renderer.info.render.calls)} `
        text += `TR: ${formatBigNumber(this.renderer.info.render.triangles)} `
        text += `TE: ${formatBigNumber(this.renderer.info.memory.textures)} `
        text += `F: ${formatBigNumber(this.tilesRendered)} `
        text += `B: ${formatBigNumber(this.blocksRendered)}`
        pane.updateText(text)
        this.backendInfoReport = text
      }
    }, 200)
  }

  /**
   * Optionally update data that are depedendent on the viewer position
   */
  updatePosDataChunk (key: string) {
    const [x, y, z] = key.split(',').map(x => Math.floor(+x / 16))
    // sum of distances: x + y + z
    const chunkDistance = Math.abs(x - this.cameraSectionPos.x) + Math.abs(y - this.cameraSectionPos.y) + Math.abs(z - this.cameraSectionPos.z)
    const section = this.sectionObjects[key].children.find(child => child.name === 'mesh')!
    section.renderOrder = 500 - chunkDistance
  }

  override updateViewerPosition (pos: Vec3): void {
    this.viewerChunkPosition = pos
  }

  cameraSectionPositionUpdate () {
    // eslint-disable-next-line guard-for-in
    for (const key in this.sectionObjects) {
      const value = this.sectionObjects[key]
      if (!value) continue
      this.updatePosDataChunk(key)
    }
  }

  getDir (current: number, origin: number) {
    if (current === origin) return 0
    return current < origin ? 1 : -1
  }

  finishChunk (chunkKey: string) {
    for (const sectionKey of this.waitingChunksToDisplay[chunkKey] ?? []) {
      this.sectionObjects[sectionKey].visible = true
    }
    delete this.waitingChunksToDisplay[chunkKey]
  }

  // debugRecomputedDeletedObjects = 0
  handleWorkerMessage (data: { geometry: MesherGeometryOutput, key, type }): void {
    if (data.type !== 'geometry') return
    let object: THREE.Object3D = this.sectionObjects[data.key]
    if (object) {
      // Cleanup banner textures before disposing
      object.traverse((child) => {
        if ((child as any).bannerTexture) {
          releaseBannerTexture((child as any).bannerTexture)
        }
      })
      this.scene.remove(object)
      disposeObject(object)
      delete this.sectionObjects[data.key]
    }

    const chunkCoords = data.key.split(',')
    if (!this.loadedChunks[chunkCoords[0] + ',' + chunkCoords[2]] || !data.geometry.positions.length || !this.active) return

    // if (object) {
    //   this.debugRecomputedDeletedObjects++
    // }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(data.geometry.positions, 3))
    geometry.setAttribute('normal', new THREE.BufferAttribute(data.geometry.normals, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(data.geometry.colors, 3))
    geometry.setAttribute('uv', new THREE.BufferAttribute(data.geometry.uvs, 2))
    geometry.index = new THREE.BufferAttribute(data.geometry.indices as Uint32Array | Uint16Array, 1)

    const mesh = new THREE.Mesh(geometry, this.material)
    mesh.position.set(data.geometry.sx, data.geometry.sy, data.geometry.sz)
    mesh.name = 'mesh'
    object = new THREE.Group()
    object.add(mesh)
    // mesh with static dimensions: 16x16x16
    const staticChunkMesh = new THREE.Mesh(new THREE.BoxGeometry(16, 16, 16), new THREE.MeshBasicMaterial({ color: 0x00_00_00, transparent: true, opacity: 0 }))
    staticChunkMesh.position.set(data.geometry.sx, data.geometry.sy, data.geometry.sz)
    const boxHelper = new THREE.BoxHelper(staticChunkMesh, 0xff_ff_00)
    boxHelper.name = 'helper'
    object.add(boxHelper)
    object.name = 'chunk';
    (object as any).tilesCount = data.geometry.positions.length / 3 / 4;
    (object as any).blocksCount = data.geometry.blocksCount
    if (!this.displayOptions.inWorldRenderingConfig.showChunkBorders) {
      boxHelper.visible = false
    }
    // should not compute it once
    if (Object.keys(data.geometry.signs).length) {
      for (const [posKey, { isWall, isHanging, rotation }] of Object.entries(data.geometry.signs)) {
        const signBlockEntity = this.blockEntities[posKey]
        if (!signBlockEntity) continue
        const [x, y, z] = posKey.split(',')
        const sign = this.renderSign(new Vec3(+x, +y, +z), rotation, isWall, isHanging, nbt.simplify(signBlockEntity))
        if (!sign) continue
        object.add(sign)
      }
    }
    if (Object.keys(data.geometry.heads).length) {
      for (const [posKey, { isWall, rotation }] of Object.entries(data.geometry.heads)) {
        const headBlockEntity = this.blockEntities[posKey]
        if (!headBlockEntity) continue
        const [x, y, z] = posKey.split(',')
        const head = this.renderHead(new Vec3(+x, +y, +z), rotation, isWall, nbt.simplify(headBlockEntity))
        if (!head) continue
        object.add(head)
      }
    }
    if (Object.keys(data.geometry.banners).length) {
      for (const [posKey, { isWall, rotation, blockName }] of Object.entries(data.geometry.banners)) {
        const bannerBlockEntity = this.blockEntities[posKey]
        if (!bannerBlockEntity) continue
        const [x, y, z] = posKey.split(',')
        const bannerTexture = getBannerTexture(this, blockName, nbt.simplify(bannerBlockEntity))
        if (!bannerTexture) continue
        const banner = createBannerMesh(new Vec3(+x, +y, +z), rotation, isWall, bannerTexture)
        object.add(banner)
      }
    }
    this.sectionObjects[data.key] = object
    // Store section key on object for easier lookup
    ;(object as any).sectionKey = data.key
    if (this.displayOptions.inWorldRenderingConfig._renderByChunks) {
      object.visible = false
      const chunkKey = `${chunkCoords[0]},${chunkCoords[2]}`
      this.waitingChunksToDisplay[chunkKey] ??= []
      this.waitingChunksToDisplay[chunkKey].push(data.key)
      if (this.finishedChunks[chunkKey]) {
        // todo it might happen even when it was not an update
        this.finishChunk(chunkKey)
      }
    }

    this.updatePosDataChunk(data.key)
    object.matrixAutoUpdate = false
    mesh.onAfterRender = (renderer, scene, camera, geometry, material, group) => {
      // mesh.matrixAutoUpdate = false
    }

    this.scene.add(object)
  }

  getSignTexture (position: Vec3, blockEntity, isHanging, backSide = false) {
    const chunk = chunkPos(position)
    let textures = this.chunkTextures.get(`${chunk[0]},${chunk[1]}`)
    if (!textures) {
      textures = {}
      this.chunkTextures.set(`${chunk[0]},${chunk[1]}`, textures)
    }
    const texturekey = `${position.x},${position.y},${position.z}`
    // todo investigate bug and remove this so don't need to clean in section dirty
    if (textures[texturekey]) return textures[texturekey]

    const PrismarineChat = PrismarineChatLoader(this.version)
    const canvas = renderSign(blockEntity, isHanging, PrismarineChat)
    if (!canvas) return
    const tex = new THREE.Texture(canvas)
    tex.magFilter = THREE.NearestFilter
    tex.minFilter = THREE.NearestFilter
    tex.needsUpdate = true
    textures[texturekey] = tex
    return tex
  }

  getCameraPosition () {
    const worldPos = new THREE.Vector3()
    this.camera.getWorldPosition(worldPos)
    return worldPos
  }

  getSectionCameraPosition () {
    const pos = this.getCameraPosition()
    return new Vec3(
      Math.floor(pos.x / 16),
      Math.floor(pos.y / 16),
      Math.floor(pos.z / 16)
    )
  }

  updateCameraSectionPos () {
    const newSectionPos = this.getSectionCameraPosition()
    if (!this.cameraSectionPos.equals(newSectionPos)) {
      this.cameraSectionPos = newSectionPos
      this.cameraSectionPositionUpdate()
    }
  }

  setFirstPersonCamera (pos: Vec3 | null, yaw: number, pitch: number) {
    const yOffset = this.playerStateReactive.eyeHeight

    this.updateCamera(pos?.offset(0, yOffset, 0) ?? null, yaw, pitch)
    this.media.tryIntersectMedia()
    this.updateCameraSectionPos()
  }

  getThirdPersonCamera (pos: THREE.Vector3 | null, yaw: number, pitch: number) {
    pos ??= this.cameraObject.position

    // Calculate camera offset based on perspective
    const isBack = this.playerStateReactive.perspective === 'third_person_back'
    const distance = 4 // Default third person distance

    // Calculate direction vector using proper world orientation
    // We need to get the camera's current look direction and use that for positioning

    // Create a direction vector that represents where the camera is looking
    // This matches the Three.js camera coordinate system
    const direction = new THREE.Vector3(0, 0, -1) // Forward direction in camera space

    // Apply the same rotation that's applied to the camera container
    const pitchQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitch)
    const yawQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw)
    const finalQuat = new THREE.Quaternion().multiplyQuaternions(yawQuat, pitchQuat)

    // Transform the direction vector by the camera's rotation
    direction.applyQuaternion(finalQuat)

    // For back view, we want the camera behind the player (opposite to view direction)
    // For front view, we want the camera in front of the player (same as view direction)
    if (isBack) {
      direction.multiplyScalar(-1)
    }

    // Create debug visualization if advanced stats are enabled
    if (this.DEBUG_RAYCAST) {
      this.debugRaycast(pos, direction, distance)
    }

    // Perform raycast to avoid camera going through blocks
    const raycaster = new THREE.Raycaster()
    raycaster.set(pos, direction)
    raycaster.far = distance // Limit raycast distance

    // Filter to only nearby chunks for performance
    const nearbyChunks = Object.values(this.sectionObjects)
      .filter(obj => obj.name === 'chunk' && obj.visible)
      .filter(obj => {
        // Get the mesh child which has the actual geometry
        const mesh = obj.children.find(child => child.name === 'mesh')
        if (!mesh) return false

        // Check distance from player position to chunk
        const chunkWorldPos = new THREE.Vector3()
        mesh.getWorldPosition(chunkWorldPos)
        const distance = pos.distanceTo(chunkWorldPos)
        return distance < 80 // Only check chunks within 80 blocks
      })

    // Get all mesh children for raycasting
    const meshes: THREE.Object3D[] = []
    for (const chunk of nearbyChunks) {
      const mesh = chunk.children.find(child => child.name === 'mesh')
      if (mesh) meshes.push(mesh)
    }

    const intersects = raycaster.intersectObjects(meshes, false)

    let finalDistance = distance
    if (intersects.length > 0) {
      // Use intersection distance minus a small offset to prevent clipping
      finalDistance = Math.max(0.5, intersects[0].distance - 0.2)
    }

    const finalPos = new Vec3(
      pos.x + direction.x * finalDistance,
      pos.y + direction.y * finalDistance,
      pos.z + direction.z * finalDistance
    )

    return finalPos
  }

  private debugRaycastHelper?: THREE.ArrowHelper
  private debugHitPoint?: THREE.Mesh

  private debugRaycast (pos: THREE.Vector3, direction: THREE.Vector3, distance: number) {
    // Remove existing debug objects
    if (this.debugRaycastHelper) {
      this.scene.remove(this.debugRaycastHelper)
      this.debugRaycastHelper = undefined
    }
    if (this.debugHitPoint) {
      this.scene.remove(this.debugHitPoint)
      this.debugHitPoint = undefined
    }

    // Create raycast arrow
    this.debugRaycastHelper = new THREE.ArrowHelper(
      direction.clone().normalize(),
      pos,
      distance,
      0xff_00_00, // Red color
      distance * 0.1,
      distance * 0.05
    )
    this.scene.add(this.debugRaycastHelper)

    // Create hit point indicator
    const hitGeometry = new THREE.SphereGeometry(0.2, 8, 8)
    const hitMaterial = new THREE.MeshBasicMaterial({ color: 0x00_ff_00 })
    this.debugHitPoint = new THREE.Mesh(hitGeometry, hitMaterial)
    this.debugHitPoint.position.copy(pos).add(direction.clone().multiplyScalar(distance))
    this.scene.add(this.debugHitPoint)
  }

  prevFramePerspective = null as string | null

  updateCamera (pos: Vec3 | null, yaw: number, pitch: number): void {
    // if (this.freeFlyMode) {
    //   pos = this.freeFlyState.position
    //   pitch = this.freeFlyState.pitch
    //   yaw = this.freeFlyState.yaw
    // }

    if (pos) {
      if (this.renderer.xr.isPresenting) {
        pos.y -= this.camera.position.y // Fix Y position of camera in world
      }

      this.currentPosTween?.stop()
      // Use instant camera updates (0 delay) in playground mode when camera controls are enabled
      const tweenDelay = this.displayOptions.inWorldRenderingConfig.instantCameraUpdate
        ? 0
        : (this.playerStateUtils.isSpectatingEntity() ? 150 : 50)
      this.currentPosTween = new tweenJs.Tween(this.cameraObject.position).to({ x: pos.x, y: pos.y, z: pos.z }, tweenDelay).start()
      // this.freeFlyState.position = pos
    }

    if (this.playerStateUtils.isSpectatingEntity()) {
      const rotation = this.cameraShake.getBaseRotation()
      // wrap in the correct direction
      let yawOffset = 0
      const halfPi = Math.PI / 2
      if (rotation.yaw < halfPi && yaw > Math.PI + halfPi) {
        yawOffset = -Math.PI * 2
      } else if (yaw < halfPi && rotation.yaw > Math.PI + halfPi) {
        yawOffset = Math.PI * 2
      }
      this.currentRotTween?.stop()
      this.currentRotTween = new tweenJs.Tween(rotation).to({ pitch, yaw: yaw + yawOffset }, 100)
        .onUpdate(params => this.cameraShake.setBaseRotation(params.pitch, params.yaw - yawOffset)).start()
    } else {
      this.currentRotTween?.stop()
      this.cameraShake.setBaseRotation(pitch, yaw)

      const { perspective } = this.playerStateReactive
      if (perspective === 'third_person_back' || perspective === 'third_person_front') {
        // Use getThirdPersonCamera for proper raycasting with max distance of 4
        const currentCameraPos = this.cameraObject.position
        const thirdPersonPos = this.getThirdPersonCamera(
          new THREE.Vector3(currentCameraPos.x, currentCameraPos.y, currentCameraPos.z),
          yaw,
          pitch
        )

        const distance = currentCameraPos.distanceTo(new THREE.Vector3(thirdPersonPos.x, thirdPersonPos.y, thirdPersonPos.z))
        // Apply Z offset based on perspective and calculated distance
        const zOffset = perspective === 'third_person_back' ? distance : -distance
        this.camera.position.set(0, 0, zOffset)

        if (perspective === 'third_person_front') {
          // Flip camera view 180 degrees around Y axis for front view
          this.camera.rotation.set(0, Math.PI, 0)
        } else {
          this.camera.rotation.set(0, 0, 0)
        }
      } else {
        this.camera.position.set(0, 0, 0)
        this.camera.rotation.set(0, 0, 0)

        // remove any debug raycasting
        if (this.debugRaycastHelper) {
          this.scene.remove(this.debugRaycastHelper)
          this.debugRaycastHelper = undefined
        }
        if (this.debugHitPoint) {
          this.scene.remove(this.debugHitPoint)
          this.debugHitPoint = undefined
        }
      }
    }

    this.updateCameraSectionPos()
  }

  debugChunksVisibilityOverride () {
    const { chunksRenderAboveOverride, chunksRenderBelowOverride, chunksRenderDistanceOverride, chunksRenderAboveEnabled, chunksRenderBelowEnabled, chunksRenderDistanceEnabled } = this.reactiveDebugParams

    const baseY = this.cameraSectionPos.y * 16

    if (
      this.displayOptions.inWorldRenderingConfig.enableDebugOverlay &&
      chunksRenderAboveOverride !== undefined ||
      chunksRenderBelowOverride !== undefined ||
      chunksRenderDistanceOverride !== undefined
    ) {
      for (const [key, object] of Object.entries(this.sectionObjects)) {
        const [x, y, z] = key.split(',').map(Number)
        const isVisible =
          // eslint-disable-next-line no-constant-binary-expression, sonarjs/no-redundant-boolean
          (chunksRenderAboveEnabled && chunksRenderAboveOverride !== undefined) ? y <= (baseY + chunksRenderAboveOverride) : true &&
          // eslint-disable-next-line @stylistic/indent-binary-ops, no-constant-binary-expression, sonarjs/no-redundant-boolean
          (chunksRenderBelowEnabled && chunksRenderBelowOverride !== undefined) ? y >= (baseY - chunksRenderBelowOverride) : true &&
          // eslint-disable-next-line @stylistic/indent-binary-ops
          (chunksRenderDistanceEnabled && chunksRenderDistanceOverride !== undefined) ? Math.abs(y - baseY) <= chunksRenderDistanceOverride : true

        object.visible = isVisible
      }
    } else {
      for (const object of Object.values(this.sectionObjects)) {
        object.visible = true
      }
    }
  }

  render (sizeChanged = false) {
    if (this.reactiveDebugParams.stopRendering) return
    this.debugChunksVisibilityOverride()
    const start = performance.now()
    this.lastRendered = performance.now()
    this.cursorBlock.render()
    this.updateSectionOffsets()

    // Update skybox position to follow camera
    const cameraPos = this.getCameraPosition()
    this.skyboxRenderer.update(cameraPos, this.viewDistance)

    const sizeOrFovChanged = sizeChanged || this.displayOptions.inWorldRenderingConfig.fov !== this.camera.fov
    if (sizeOrFovChanged) {
      const size = this.renderer.getSize(new THREE.Vector2())
      this.camera.aspect = size.width / size.height
      this.camera.fov = this.displayOptions.inWorldRenderingConfig.fov
      this.camera.updateProjectionMatrix()
    }

    if (!this.reactiveDebugParams.disableEntities) {
      this.entities.render()
    }

    // eslint-disable-next-line @typescript-eslint/non-nullable-type-assertion-style
    const cam = this.cameraGroupVr instanceof THREE.Group ? this.cameraGroupVr.children.find(child => child instanceof THREE.PerspectiveCamera) as THREE.PerspectiveCamera : this.camera
    this.renderer.render(this.scene, cam)

    if (
      this.displayOptions.inWorldRenderingConfig.showHand &&
      this.playerStateReactive.gameMode !== 'spectator' &&
      this.playerStateReactive.perspective === 'first_person' &&
      // !this.freeFlyMode &&
      !this.renderer.xr.isPresenting
    ) {
      this.holdingBlock.render(this.camera, this.renderer, this.ambientLight, this.directionalLight)
      this.holdingBlockLeft.render(this.camera, this.renderer, this.ambientLight, this.directionalLight)
    }

    for (const fountain of this.fountains) {
      if (this.sectionObjects[fountain.sectionId] && !this.sectionObjects[fountain.sectionId].foutain) {
        fountain.createParticles(this.sectionObjects[fountain.sectionId])
        this.sectionObjects[fountain.sectionId].foutain = true
      }
      fountain.render()
    }

    this.waypoints.render()
    this.fireworks.update()

    for (const onRender of this.onRender) {
      onRender()
    }
    const end = performance.now()
    const totalTime = end - start
    this.renderTimeAvgCount++
    this.renderTimeAvg = ((this.renderTimeAvg * (this.renderTimeAvgCount - 1)) + totalTime) / this.renderTimeAvgCount
    this.renderTimeMax = Math.max(this.renderTimeMax, totalTime)
    this.currentRenderedFrames++
  }

  renderHead (position: Vec3, rotation: number, isWall: boolean, blockEntity) {
    let textureData: string
    if (blockEntity.SkullOwner) {
      textureData = blockEntity.SkullOwner.Properties?.textures?.[0]?.Value
    } else {
      textureData = blockEntity.profile?.properties?.find(p => p.name === 'textures')?.value
    }
    if (!textureData) return

    try {
      const decodedData = JSON.parse(Buffer.from(textureData, 'base64').toString())
      let skinUrl = decodedData.textures?.SKIN?.url
      const { skinTexturesProxy } = this.worldRendererConfig
      if (skinTexturesProxy) {
        skinUrl = skinUrl?.replace('http://textures.minecraft.net/', skinTexturesProxy)
          .replace('https://textures.minecraft.net/', skinTexturesProxy)
      }

      const mesh = getMesh(this, skinUrl, armorModel.head)
      const group = new THREE.Group()
      if (isWall) {
        mesh.position.set(0, 0.3125, 0.3125)
      }
      // move head model down as armor have a different offset than blocks
      mesh.position.y -= 23 / 16
      group.add(mesh)
      group.position.set(position.x + 0.5, position.y + 0.045, position.z + 0.5)
      group.rotation.set(
        0,
        -THREE.MathUtils.degToRad(rotation * (isWall ? 90 : 45 / 2)),
        0
      )
      group.scale.set(0.8, 0.8, 0.8)
      return group
    } catch (err) {
      console.error('Error decoding player texture:', err)
    }
  }

  renderSign (position: Vec3, rotation: number, isWall: boolean, isHanging: boolean, blockEntity) {
    const tex = this.getSignTexture(position, blockEntity, isHanging)

    if (!tex) return

    // todo implement
    // const key = JSON.stringify({ position, rotation, isWall })
    // if (this.signsCache.has(key)) {
    //   console.log('cached', key)
    // } else {
    //   this.signsCache.set(key, tex)
    // }

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, transparent: true }))
    mesh.renderOrder = 999

    const lineHeight = 7 / 16
    const scaleFactor = isHanging ? 1.3 : 1
    mesh.scale.set(1 * scaleFactor, lineHeight * scaleFactor, 1 * scaleFactor)

    const thickness = (isHanging ? 2 : 1.5) / 16
    const wallSpacing = 0.25 / 16
    if (isWall && !isHanging) {
      mesh.position.set(0, 0, -0.5 + thickness + wallSpacing + 0.0001)
    } else {
      mesh.position.set(0, 0, thickness / 2 + 0.0001)
    }

    const group = new THREE.Group()
    group.rotation.set(
      0,
      -THREE.MathUtils.degToRad(rotation * (isWall ? 90 : 45 / 2)),
      0
    )
    group.add(mesh)
    const height = (isHanging ? 10 : 8) / 16
    const heightOffset = (isHanging ? 0 : isWall ? 4.333 : 9.333) / 16
    const textPosition = height / 2 + heightOffset
    group.position.set(position.x + 0.5, position.y + textPosition, position.z + 0.5)
    return group
  }

  lightUpdate (chunkX: number, chunkZ: number) {
    // set all sections in the chunk dirty
    for (let y = this.worldSizeParams.minY; y < this.worldSizeParams.worldHeight; y += 16) {
      this.setSectionDirty(new Vec3(chunkX, y, chunkZ))
    }
  }

  rerenderAllChunks () { // todo not clear what to do with loading chunks
    for (const key of Object.keys(this.sectionObjects)) {
      const [x, y, z] = key.split(',').map(Number)
      this.setSectionDirty(new Vec3(x, y, z))
    }
  }

  updateShowChunksBorder (value: boolean) {
    for (const object of Object.values(this.sectionObjects)) {
      for (const child of object.children) {
        if (child.name === 'helper') {
          child.visible = value
        }
      }
    }
  }

  resetWorld () {
    super.resetWorld()

    for (const mesh of Object.values(this.sectionObjects)) {
      this.scene.remove(mesh)
    }

    // Clean up debug objects
    if (this.debugRaycastHelper) {
      this.scene.remove(this.debugRaycastHelper)
      this.debugRaycastHelper = undefined
    }
    if (this.debugHitPoint) {
      this.scene.remove(this.debugHitPoint)
      this.debugHitPoint = undefined
    }
  }

  getLoadedChunksRelative (pos: Vec3, includeY = false) {
    const [currentX, currentY, currentZ] = sectionPos(pos)
    return Object.fromEntries(Object.entries(this.sectionObjects).map(([key, o]) => {
      const [xRaw, yRaw, zRaw] = key.split(',').map(Number)
      const [x, y, z] = sectionPos({ x: xRaw, y: yRaw, z: zRaw })
      const setKey = includeY ? `${x - currentX},${y - currentY},${z - currentZ}` : `${x - currentX},${z - currentZ}`
      return [setKey, o]
    }))
  }

  cleanChunkTextures (x, z) {
    const textures = this.chunkTextures.get(`${Math.floor(x / 16)},${Math.floor(z / 16)}`) ?? {}
    for (const key of Object.keys(textures)) {
      textures[key].dispose()
      delete textures[key]
    }
  }

  readdChunks () {
    for (const key of Object.keys(this.sectionObjects)) {
      this.scene.remove(this.sectionObjects[key])
    }
    setTimeout(() => {
      for (const key of Object.keys(this.sectionObjects)) {
        this.scene.add(this.sectionObjects[key])
      }
    }, 500)
  }

  disableUpdates (children = this.scene.children) {
    for (const child of children) {
      child.matrixWorldNeedsUpdate = false
      this.disableUpdates(child.children ?? [])
    }
  }

  removeColumn (x, z) {
    super.removeColumn(x, z)

    this.cleanChunkTextures(x, z)
    for (let y = this.worldSizeParams.minY; y < this.worldSizeParams.worldHeight; y += 16) {
      this.setSectionDirty(new Vec3(x, y, z), false)
      const key = `${x},${y},${z}`
      const mesh = this.sectionObjects[key]
      if (mesh) {
        // Cleanup banner textures before disposing
        mesh.traverse((child) => {
          if ((child as any).bannerTexture) {
            releaseBannerTexture((child as any).bannerTexture)
          }
        })
        this.scene.remove(mesh)
        disposeObject(mesh)
      }
      delete this.sectionObjects[key]
    }
  }

  setSectionDirty (...args: Parameters<WorldRendererCommon['setSectionDirty']>) {
    const [pos] = args
    this.cleanChunkTextures(pos.x, pos.z) // todo don't do this!
    super.setSectionDirty(...args)
  }

  static getRendererInfo (renderer: THREE.WebGLRenderer) {
    try {
      const gl = renderer.getContext()
      return `${gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info')!.UNMASKED_RENDERER_WEBGL)}`
    } catch (err) {
      console.warn('Failed to get renderer info', err)
    }
  }

  worldStop () {
    this.media.onWorldStop()
  }

  destroy (): void {
    super.destroy()
    this.skyboxRenderer.dispose()
    this.fireworks.dispose()
  }

  shouldObjectVisible (object: THREE.Object3D) {
    // Get chunk coordinates
    const chunkX = Math.floor(object.position.x / 16) * 16
    const chunkZ = Math.floor(object.position.z / 16) * 16
    const sectionY = Math.floor(object.position.y / 16) * 16

    const chunkKey = `${chunkX},${chunkZ}`
    const sectionKey = `${chunkX},${sectionY},${chunkZ}`

    return !!this.finishedChunks[chunkKey] || !!this.sectionObjects[sectionKey]
  }

  updateSectionOffsets () {
    const currentTime = performance.now()
    for (const [key, anim] of Object.entries(this.sectionsOffsetsAnimations)) {
      const timeDelta = (currentTime - anim.time) / 1000 // Convert to seconds
      anim.time = currentTime

      // Update offsets based on speed and time delta
      anim.currentOffsetX += anim.speedX * timeDelta
      anim.currentOffsetY += anim.speedY * timeDelta
      anim.currentOffsetZ += anim.speedZ * timeDelta

      // Apply limits if they exist
      if (anim.limitX !== undefined) {
        if (anim.speedX > 0) {
          anim.currentOffsetX = Math.min(anim.currentOffsetX, anim.limitX)
        } else {
          anim.currentOffsetX = Math.max(anim.currentOffsetX, anim.limitX)
        }
      }
      if (anim.limitY !== undefined) {
        if (anim.speedY > 0) {
          anim.currentOffsetY = Math.min(anim.currentOffsetY, anim.limitY)
        } else {
          anim.currentOffsetY = Math.max(anim.currentOffsetY, anim.limitY)
        }
      }
      if (anim.limitZ !== undefined) {
        if (anim.speedZ > 0) {
          anim.currentOffsetZ = Math.min(anim.currentOffsetZ, anim.limitZ)
        } else {
          anim.currentOffsetZ = Math.max(anim.currentOffsetZ, anim.limitZ)
        }
      }

      // Apply the offset to the section object
      const section = this.sectionObjects[key]
      if (section) {
        section.position.set(
          anim.currentOffsetX,
          anim.currentOffsetY,
          anim.currentOffsetZ
        )
        section.updateMatrix()
      }
    }
  }

  reloadWorld () {
    this.entities.reloadEntities()
  }
}

class StarField {
  points?: THREE.Points
  private _enabled = true
  get enabled () {
    return this._enabled
  }

  set enabled (value) {
    this._enabled = value
    if (this.points) {
      this.points.visible = value
    }
  }

  constructor (
    private readonly worldRenderer: WorldRendererThree
  ) {
    const clock = new THREE.Clock()
    const speed = 0.2
    this.worldRenderer.onRender.push(() => {
      if (!this.points) return
      this.points.position.copy(this.worldRenderer.getCameraPosition());
      (this.points.material as StarfieldMaterial).uniforms.time.value = clock.getElapsedTime() * speed
    })
  }

  addToScene () {
    if (this.points || !this.enabled) return

    const radius = 80
    const depth = 50
    const count = 7000
    const factor = 7
    const saturation = 10

    const geometry = new THREE.BufferGeometry()

    const genStar = r => new THREE.Vector3().setFromSpherical(new THREE.Spherical(r, Math.acos(1 - Math.random() * 2), Math.random() * 2 * Math.PI))

    const positions = [] as number[]
    const colors = [] as number[]
    const sizes = Array.from({ length: count }, () => (0.5 + 0.5 * Math.random()) * factor)
    const color = new THREE.Color()
    let r = radius + depth
    const increment = depth / count
    for (let i = 0; i < count; i++) {
      r -= increment * Math.random()
      positions.push(...genStar(r).toArray())
      color.setHSL(i / count, saturation, 0.9)
      colors.push(color.r, color.g, color.b)
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1))

    // Create a material
    const material = new StarfieldMaterial()
    material.blending = THREE.AdditiveBlending
    material.depthTest = false
    material.transparent = true

    // Create points and add them to the scene
    this.points = new THREE.Points(geometry, material)
    this.worldRenderer.scene.add(this.points)

    this.points.renderOrder = -1
  }

  remove () {
    if (this.points) {
      this.points.geometry.dispose();
      (this.points.material as THREE.Material).dispose()
      this.worldRenderer.scene.remove(this.points)

      this.points = undefined
    }
  }
}

const version = parseInt(THREE.REVISION.replaceAll(/\D+/g, ''), 10)
class StarfieldMaterial extends THREE.ShaderMaterial {
  constructor () {
    super({
      uniforms: { time: { value: 0 }, fade: { value: 1 } },
      vertexShader: /* glsl */ `
                uniform float time;
                attribute float size;
                varying vec3 vColor;
                attribute vec3 color;
                void main() {
                vColor = color;
                vec4 mvPosition = modelViewMatrix * vec4(position, 0.5);
                gl_PointSize = 0.7 * size * (30.0 / -mvPosition.z) * (3.0 + sin(time + 100.0));
                gl_Position = projectionMatrix * mvPosition;
            }`,
      fragmentShader: /* glsl */ `
                uniform sampler2D pointTexture;
                uniform float fade;
                varying vec3 vColor;
                void main() {
                float opacity = 1.0;
                gl_FragColor = vec4(vColor, 1.0);

                #include <tonemapping_fragment>
                #include <${version >= 154 ? 'colorspace_fragment' : 'encodings_fragment'}>
            }`,
    })
  }
}
