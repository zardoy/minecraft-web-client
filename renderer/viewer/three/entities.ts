//@ts-check
import { UnionToIntersection } from 'type-fest'
import nbt from 'prismarine-nbt'
import * as TWEEN from '@tweenjs/tween.js'
import * as THREE from 'three'
import { PlayerAnimation, PlayerObject } from 'skinview3d'
import { inferModelType, loadCapeToCanvas, loadEarsToCanvasFromSkin } from 'skinview-utils'
// todo replace with url
import { degreesToRadians } from '@nxg-org/mineflayer-tracker/lib/mathUtils'
import { NameTagObject } from 'skinview3d/libs/nametag'
import { flat, fromFormattedString } from '@xmcl/text-component'
import mojangson from 'mojangson'
import { snakeCase } from 'change-case'
import { Item } from 'prismarine-item'
import { isEntityAttackable } from 'mineflayer-mouse/dist/attackableEntity'
import { Team } from 'mineflayer'
import PrismarineChatLoader from 'prismarine-chat'
import { EntityMetadataVersions } from '../../../src/mcDataTypes'
import { ItemSpecificContextProperties } from '../lib/basePlayerState'
import { loadSkinFromUsername, loadSkinImage, stevePngUrl } from '../lib/utils/skins'
import { renderComponent } from '../sign-renderer'
import { createCanvas } from '../lib/utils'
import { PlayerObjectType } from '../lib/createPlayerObject'
import { getBlockMeshFromModel } from './holdingBlock'
import { createItemMesh } from './itemMesh'
import * as Entity from './entity/EntityMesh'
import { getMesh } from './entity/EntityMesh'
import { WalkingGeneralSwing } from './entity/animations'
import { disposeObject, loadTexture, loadThreeJsTextureFromUrl } from './threeJsUtils'
import { armorModel, armorTextures, elytraTexture } from './entity/armorModels'
import { WorldRendererThree } from './worldrendererThree'

export const steveTexture = loadThreeJsTextureFromUrl(stevePngUrl)

export const TWEEN_DURATION = 120

function convert2sComplementToHex (complement: number) {
  if (complement < 0) {
    complement = (0xFF_FF_FF_FF + complement + 1) >>> 0
  }
  return complement.toString(16)
}

function toRgba (color: string | undefined) {
  if (color === undefined) {
    return undefined
  }
  if (parseInt(color, 10) === 0) {
    return 'rgba(0, 0, 0, 0)'
  }
  const hex = convert2sComplementToHex(parseInt(color, 10))
  if (hex.length === 8) {
    return `#${hex.slice(2, 8)}${hex.slice(0, 2)}`
  } else {
    return `#${hex}`
  }
}

function toQuaternion (quaternion: any, defaultValue?: THREE.Quaternion) {
  if (quaternion === undefined) {
    return defaultValue
  }
  if (quaternion instanceof THREE.Quaternion) {
    return quaternion
  }
  if (Array.isArray(quaternion)) {
    return new THREE.Quaternion(quaternion[0], quaternion[1], quaternion[2], quaternion[3])
  }
  return new THREE.Quaternion(quaternion.x, quaternion.y, quaternion.z, quaternion.w)
}

function poseToEuler (pose: any, defaultValue?: THREE.Euler) {
  if (pose === undefined) {
    return defaultValue ?? new THREE.Euler()
  }
  if (pose instanceof THREE.Euler) {
    return pose
  }
  if (pose['yaw'] !== undefined && pose['pitch'] !== undefined && pose['roll'] !== undefined) {
    // Convert Minecraft pitch, yaw, roll definitions to our angle system
    return new THREE.Euler(-degreesToRadians(pose.pitch), -degreesToRadians(pose.yaw), degreesToRadians(pose.roll), 'ZYX')
  }
  if (pose['x'] !== undefined && pose['y'] !== undefined && pose['z'] !== undefined) {
    return new THREE.Euler(pose.z, pose.y, pose.x, 'ZYX')
  }
  if (Array.isArray(pose)) {
    return new THREE.Euler(pose[0], pose[1], pose[2])
  }
  return defaultValue ?? new THREE.Euler()
}

function getUsernameTexture ({
  username,
  nameTagBackgroundColor = 'rgba(0, 0, 0, 0.3)',
  nameTagTextOpacity = 255
}: any, { fontFamily = 'mojangles' }: any, version: string) {
  const canvas = createCanvas(64, 64)

  const PrismarineChat = PrismarineChatLoader(version)

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not get 2d context')

  const fontSize = 48
  const padding = 5
  ctx.font = `${fontSize}px ${fontFamily}`

  const plainLines = String(typeof username === 'string' ? username : new PrismarineChat(username).toString()).split('\n')
  let textWidth = 0
  for (const line of plainLines) {
    const width = ctx.measureText(line).width + padding * 2
    if (width > textWidth) textWidth = width
  }

  canvas.width = textWidth
  canvas.height = (fontSize + padding) * plainLines.length

  ctx.fillStyle = nameTagBackgroundColor
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.globalAlpha = nameTagTextOpacity / 255

  renderComponent(username, PrismarineChat, canvas, fontSize, 'white', -padding + fontSize)

  ctx.globalAlpha = 1

  return canvas
}

const addNametag = (entity, options: { fontFamily: string }, mesh, version: string) => {
  for (const c of mesh.children) {
    if (c.name === 'nametag') {
      c.removeFromParent()
    }
  }
  if (entity.username !== undefined) {
    const canvas = getUsernameTexture(entity, options, version)
    const tex = new THREE.Texture(canvas)
    tex.needsUpdate = true
    let nameTag: THREE.Object3D
    if (entity.nameTagFixed) {
      const geometry = new THREE.PlaneGeometry()
      const material = new THREE.MeshBasicMaterial({ map: tex })
      material.transparent = true
      nameTag = new THREE.Mesh(geometry, material)
      nameTag.rotation.set(entity.pitch, THREE.MathUtils.degToRad(entity.yaw + 180), 0)
      nameTag.position.y += entity.height + 0.3
    } else {
      const spriteMat = new THREE.SpriteMaterial({ map: tex })
      nameTag = new THREE.Sprite(spriteMat)
      nameTag.position.y += entity.height + 0.6
    }
    nameTag.renderOrder = 1000
    nameTag.scale.set(canvas.width * 0.005, canvas.height * 0.005, 1)
    if (entity.nameTagRotationRight) {
      nameTag.applyQuaternion(entity.nameTagRotationRight)
    }
    if (entity.nameTagScale) {
      nameTag.scale.multiply(entity.nameTagScale)
    }
    if (entity.nameTagRotationLeft) {
      nameTag.applyQuaternion(entity.nameTagRotationLeft)
    }
    if (entity.nameTagTranslation) {
      nameTag.position.add(entity.nameTagTranslation)
    }
    nameTag.name = 'nametag'

    mesh.add(nameTag)
    return nameTag
  }
}

// todo cleanup
const nametags = {}

const isFirstUpperCase = (str) => str.charAt(0) === str.charAt(0).toUpperCase()

function getEntityMesh (entity: import('prismarine-entity').Entity & { delete?: any; pos?: any; name?: any }, world: WorldRendererThree, options: { fontFamily: string }, overrides) {
  if (entity.name) {
    try {
      // https://github.com/PrismarineJS/prismarine-viewer/pull/410
      const entityName = (isFirstUpperCase(entity.name) ? snakeCase(entity.name) : entity.name).toLowerCase()
      const e = new Entity.EntityMesh('1.16.4', entityName, world, overrides)

      if (e.mesh) {
        addNametag(entity, options, e.mesh, world.version)
        return e.mesh
      }
    } catch (err) {
      reportError?.(err)
    }
  }

  if (!isEntityAttackable(loadedData, entity)) return
  const geometry = new THREE.BoxGeometry(entity.width, entity.height, entity.width)
  geometry.translate(0, entity.height / 2, 0)
  const material = new THREE.MeshBasicMaterial({ color: 0xff_00_ff })
  const cube = new THREE.Mesh(geometry, material)
  const nametagCount = (nametags[entity.name] = (nametags[entity.name] || 0) + 1)
  if (nametagCount < 6) {
    addNametag({
      username: entity.name,
      height: entity.height,
    }, options, cube, world.version)
  }
  return cube
}

export type SceneEntity = THREE.Object3D & {
  playerObject?: PlayerObjectType
  username?: string
  uuid?: string
  additionalCleanup?: () => void
  originalEntity: import('prismarine-entity').Entity & { delete?; pos?, name, team?: Team }
}

export class Entities {
  entities = {} as Record<string, SceneEntity>
  playerEntity: SceneEntity | null = null // Special entity for the player in third person
  entitiesOptions = {
    fontFamily: 'mojangles'
  }
  debugMode: string
  onSkinUpdate: () => void
  clock = new THREE.Clock()
  currentlyRendering = true
  cachedMapsImages = {} as Record<number, string>
  itemFrameMaps = {} as Record<number, Array<THREE.Mesh<THREE.PlaneGeometry, THREE.MeshLambertMaterial>>>

  get entitiesByName (): Record<string, SceneEntity[]> {
    const byName: Record<string, SceneEntity[]> = {}
    for (const entity of Object.values(this.entities)) {
      if (!entity['realName']) continue
      byName[entity['realName']] = byName[entity['realName']] || []
      byName[entity['realName']].push(entity)
    }
    return byName
  }

  get entitiesRenderingCount (): number {
    return Object.values(this.entities).filter(entity => entity.visible).length
  }

  getDebugString (): string {
    const totalEntities = Object.keys(this.entities).length
    const visibleEntities = this.entitiesRenderingCount

    const playerEntities = Object.values(this.entities).filter(entity => entity.playerObject)
    const visiblePlayerEntities = playerEntities.filter(entity => entity.visible)

    return `${visibleEntities}/${totalEntities} ${visiblePlayerEntities.length}/${playerEntities.length}`
  }

  constructor (public worldRenderer: WorldRendererThree) {
    this.debugMode = 'none'
    this.onSkinUpdate = () => { }
    this.watchResourcesUpdates()
  }

  handlePlayerEntity (playerData: SceneEntity['originalEntity']) {
    // Create player entity if it doesn't exist
    if (!this.playerEntity) {
      // Create the player entity similar to how normal entities are created
      const group = new THREE.Group() as unknown as SceneEntity
      group.originalEntity = { ...playerData, name: 'player' } as SceneEntity['originalEntity']

      const wrapper = new THREE.Group()
      const playerObject = this.setupPlayerObject(playerData, wrapper, {})
      group.playerObject = playerObject
      group.add(wrapper)

      group.name = 'player_entity'
      this.playerEntity = group
      this.worldRenderer.scene.add(group)

      void this.updatePlayerSkin(playerData.id, playerData.username, playerData.uuid ?? undefined, stevePngUrl)
    }
    this.playerEntity.originalEntity = { ...playerData, name: 'player' } as SceneEntity['originalEntity']

    // Update position and rotation
    if (playerData.position) {
      this.playerEntity.position.set(playerData.position.x, playerData.position.y, playerData.position.z)
    }
    if (playerData.yaw !== undefined) {
      this.playerEntity.rotation.y = playerData.yaw
    }

    this.updateEntityEquipment(this.playerEntity, playerData)
  }

  clear () {
    for (const mesh of Object.values(this.entities)) {
      this.worldRenderer.scene.remove(mesh)
      disposeObject(mesh)
    }
    this.entities = {}
    this.currentSkinUrls = {}

    // Clean up player entity
    if (this.playerEntity) {
      this.worldRenderer.scene.remove(this.playerEntity)
      disposeObject(this.playerEntity)
      this.playerEntity = null
    }
  }

  reloadEntities () {
    for (const entity of Object.values(this.entities)) {
      // update all entities textures like held items, armour, etc
      // todo update entity textures itself
      this.update({ ...entity.originalEntity, delete: true, } as SceneEntity['originalEntity'], {})
      this.update(entity.originalEntity, {})
    }
  }

  watchResourcesUpdates () {
    this.worldRenderer.resourcesManager.on('assetsTexturesUpdated', () => this.reloadEntities())
    this.worldRenderer.resourcesManager.on('assetsInventoryReady', () => this.reloadEntities())
  }

  setDebugMode (mode: string, entity: THREE.Object3D | null = null) {
    this.debugMode = mode
    for (const mesh of entity ? [entity] : Object.values(this.entities)) {
      const boxHelper = mesh.children.find(c => c.name === 'debug')!
      boxHelper.visible = false
      if (this.debugMode === 'basic') {
        boxHelper.visible = true
      }
      // todo advanced
    }
  }

  setRendering (rendering: boolean, entity: THREE.Object3D | null = null) {
    this.currentlyRendering = rendering
    for (const ent of entity ? [entity] : Object.values(this.entities)) {
      if (rendering) {
        if (!this.worldRenderer.scene.children.includes(ent)) this.worldRenderer.scene.add(ent)
      } else {
        this.worldRenderer.scene.remove(ent)
      }
    }
  }

  render () {
    const renderEntitiesConfig = this.worldRenderer.worldRendererConfig.renderEntities
    if (renderEntitiesConfig !== this.currentlyRendering) {
      this.setRendering(renderEntitiesConfig)
    }

    const dt = this.clock.getDelta()
    const botPos = this.worldRenderer.viewerChunkPosition
    const VISIBLE_DISTANCE = 10 * 10

    // Update regular entities
    for (const [entityId, entity] of [...Object.entries(this.entities), ['player_entity', this.playerEntity] as [string, SceneEntity | null]]) {
      if (!entity) continue
      const { playerObject } = entity

      // Update animations
      if (playerObject?.animation) {
        playerObject.animation.update(playerObject, dt)
      }

      // Update visibility based on distance and chunk load status
      if (botPos && entity.position) {
        const dx = entity.position.x - botPos.x
        const dy = entity.position.y - botPos.y
        const dz = entity.position.z - botPos.z
        const distanceSquared = dx * dx + dy * dy + dz * dz

        // Entity is visible if within 20 blocks OR in a finished chunk
        entity.visible = !!(distanceSquared < VISIBLE_DISTANCE || this.worldRenderer.shouldObjectVisible(entity))

        this.maybeRenderPlayerSkin(entityId)
      }

      if (entity.visible) {
        // Update armor positions
        this.syncArmorPositions(entity)
      }

      if (entityId === 'player_entity') {
        entity.visible = this.worldRenderer.playerStateUtils.isThirdPerson()

        if (entity.visible) {
          // sync
          const yOffset = this.worldRenderer.playerStateReactive.eyeHeight
          const pos = this.worldRenderer.cameraObject.position.clone().add(new THREE.Vector3(0, -yOffset, 0))
          entity.position.set(pos.x, pos.y, pos.z)

          const rotation = this.worldRenderer.cameraShake.getBaseRotation()
          entity.rotation.set(0, rotation.yaw, 0)

          // Sync head rotation
          entity.traverse((c) => {
            if (c.name === 'head') {
              c.rotation.set(-rotation.pitch, 0, 0)
            }
          })
        }
      }
    }
  }

  private syncArmorPositions (entity: SceneEntity) {
    if (!entity.playerObject) return

    // todo-low use property access for less loop iterations (small performance gain)
    entity.traverse((armor) => {
      if (!armor.name.startsWith('geometry_armor_')) return

      const { skin } = entity.playerObject!

      switch (armor.name) {
        case 'geometry_armor_head':
          // Head armor sync
          if (armor.children[0]?.children[0]) {
            armor.children[0].children[0].rotation.set(
              -skin.head.rotation.x,
              skin.head.rotation.y,
              skin.head.rotation.z,
              skin.head.rotation.order
            )
          }
          break

        case 'geometry_armor_legs':
          // Legs armor sync
          if (armor.children[0]) {
            // Left leg
            if (armor.children[0].children[2]) {
              armor.children[0].children[2].rotation.set(
                -skin.leftLeg.rotation.x,
                skin.leftLeg.rotation.y,
                skin.leftLeg.rotation.z,
                skin.leftLeg.rotation.order
              )
            }
            // Right leg
            if (armor.children[0].children[1]) {
              armor.children[0].children[1].rotation.set(
                -skin.rightLeg.rotation.x,
                skin.rightLeg.rotation.y,
                skin.rightLeg.rotation.z,
                skin.rightLeg.rotation.order
              )
            }
          }
          break

        case 'geometry_armor_feet':
          // Boots armor sync
          if (armor.children[0]) {
            // Right boot
            if (armor.children[0].children[0]) {
              armor.children[0].children[0].rotation.set(
                -skin.rightLeg.rotation.x,
                skin.rightLeg.rotation.y,
                skin.rightLeg.rotation.z,
                skin.rightLeg.rotation.order
              )
            }
            // Left boot (reversed Z rotation)
            if (armor.children[0].children[1]) {
              armor.children[0].children[1].rotation.set(
                -skin.leftLeg.rotation.x,
                skin.leftLeg.rotation.y,
                -skin.leftLeg.rotation.z,
                skin.leftLeg.rotation.order
              )
            }
          }
          break
      }
    })
  }

  getPlayerObject (entityId: string | number) {
    if (this.playerEntity?.originalEntity.id === entityId) return this.playerEntity?.playerObject
    const playerObject = this.entities[entityId]?.playerObject
    return playerObject
  }

  uuidPerSkinUrlsCache = {} as Record<string, { skinUrl?: string, capeUrl?: string }>
  currentSkinUrls = {} as Record<string, string>

  private isCanvasBlank (canvas: HTMLCanvasElement): boolean {
    return !canvas.getContext('2d')
      ?.getImageData(0, 0, canvas.width, canvas.height).data
      .some(channel => channel !== 0)
  }

  // todo true/undefined doesnt reset the skin to the default one
  // eslint-disable-next-line max-params
  async updatePlayerSkin (entityId: string | number, username: string | undefined, uuidCache: string | undefined, skinUrl: string | true, capeUrl: string | true | undefined = undefined) {
    const isCustomSkin = skinUrl !== stevePngUrl
    if (isCustomSkin) {
      this.loadedSkinEntityIds.add(String(entityId))
    }
    if (uuidCache) {
      if (typeof skinUrl === 'string' || typeof capeUrl === 'string') this.uuidPerSkinUrlsCache[uuidCache] = {}
      if (typeof skinUrl === 'string') this.uuidPerSkinUrlsCache[uuidCache].skinUrl = skinUrl
      if (typeof capeUrl === 'string') this.uuidPerSkinUrlsCache[uuidCache].capeUrl = capeUrl
      if (skinUrl === true) {
        skinUrl = this.uuidPerSkinUrlsCache[uuidCache]?.skinUrl ?? skinUrl
      }
      capeUrl ??= this.uuidPerSkinUrlsCache[uuidCache]?.capeUrl
    }

    const playerObject = this.getPlayerObject(entityId)
    if (!playerObject) return

    if (skinUrl === true) {
      if (!username) return
      const newSkinUrl = await loadSkinFromUsername(username, 'skin')
      if (!this.getPlayerObject(entityId)) return
      if (!newSkinUrl) return
      skinUrl = newSkinUrl
    }

    if (typeof skinUrl !== 'string') throw new Error('Invalid skin url')

    // Skip if same skin URL is already loaded for this entity
    if (this.currentSkinUrls[String(entityId)] === skinUrl) {
      // Still handle cape if needed
      if (capeUrl) {
        if (capeUrl === true && username) {
          const newCapeUrl = await loadSkinFromUsername(username, 'cape')
          if (!this.getPlayerObject(entityId)) return
          if (!newCapeUrl) return
          capeUrl = newCapeUrl
        }
        if (typeof capeUrl === 'string') {
          void this.loadAndApplyCape(entityId, capeUrl)
        }
      }
      return
    }

    if (skinUrl !== stevePngUrl) {
      this.currentSkinUrls[String(entityId)] = skinUrl
    }
    const renderEars = this.worldRenderer.worldRendererConfig.renderEars || username === 'deadmau5'
    void this.loadAndApplySkin(entityId, skinUrl, renderEars).then(async () => {
      if (capeUrl) {
        if (capeUrl === true && username) {
          const newCapeUrl = await loadSkinFromUsername(username, 'cape')
          if (!this.getPlayerObject(entityId)) return
          if (!newCapeUrl) return
          capeUrl = newCapeUrl
        }
        if (typeof capeUrl === 'string') {
          void this.loadAndApplyCape(entityId, capeUrl)
        }
      }
    })


    playerObject.cape.visible = false
    if (!capeUrl) {
      playerObject.backEquipment = null
      playerObject.elytra.map = null
      if (playerObject.cape.map) {
        playerObject.cape.map.dispose()
      }
      playerObject.cape.map = null
    }
  }

  private async loadAndApplySkin (entityId: string | number, skinUrl: string, renderEars: boolean) {
    let playerObject = this.getPlayerObject(entityId)
    if (!playerObject) return

    try {
      let playerCustomSkinImage: ImageBitmap | undefined

      playerObject = this.getPlayerObject(entityId)
      if (!playerObject) return

      let skinTexture: THREE.Texture
      let skinCanvas: OffscreenCanvas
      if (skinUrl === stevePngUrl) {
        skinTexture = await steveTexture
        const canvas = createCanvas(64, 64)
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Failed to get context')
        ctx.drawImage(skinTexture.image, 0, 0)
        skinCanvas = canvas
      } else {
        const { canvas, image } = await loadSkinImage(skinUrl)
        playerCustomSkinImage = image
        skinTexture = new THREE.CanvasTexture(canvas)
        skinCanvas = canvas
      }

      skinTexture.magFilter = THREE.NearestFilter
      skinTexture.minFilter = THREE.NearestFilter
      skinTexture.needsUpdate = true
      playerObject.skin.map = skinTexture as any
      playerObject.skin.modelType = inferModelType(skinCanvas)
      playerObject.skin['isCustom'] = skinUrl !== stevePngUrl

      let earsCanvas: HTMLCanvasElement | undefined
      if (!playerCustomSkinImage) {
        renderEars = false
      } else if (renderEars) {
        earsCanvas = document.createElement('canvas')
        loadEarsToCanvasFromSkin(earsCanvas, playerCustomSkinImage)
        renderEars = !this.isCanvasBlank(earsCanvas)
      }
      if (renderEars) {
        const earsTexture = new THREE.CanvasTexture(earsCanvas!)
        earsTexture.magFilter = THREE.NearestFilter
        earsTexture.minFilter = THREE.NearestFilter
        earsTexture.needsUpdate = true
        //@ts-expect-error
        playerObject.ears.map = earsTexture
        playerObject.ears.visible = true
      } else {
        playerObject.ears.map = null
        playerObject.ears.visible = false
      }
      this.onSkinUpdate?.()
    } catch (error) {
      console.error('Error loading skin:', error)
    }
  }

  private async loadAndApplyCape (entityId: string | number, capeUrl: string) {
    let playerObject = this.getPlayerObject(entityId)
    if (!playerObject) return

    try {
      const { canvas: capeCanvas, image: capeImage } = await loadSkinImage(capeUrl)

      playerObject = this.getPlayerObject(entityId)
      if (!playerObject) return

      loadCapeToCanvas(capeCanvas, capeImage)
      const capeTexture = new THREE.CanvasTexture(capeCanvas)
      capeTexture.magFilter = THREE.NearestFilter
      capeTexture.minFilter = THREE.NearestFilter
      capeTexture.needsUpdate = true
      //@ts-expect-error
      playerObject.cape.map = capeTexture
      playerObject.cape.visible = true
      //@ts-expect-error
      playerObject.elytra.map = capeTexture
      this.onSkinUpdate?.()

      if (!playerObject.backEquipment) {
        playerObject.backEquipment = 'cape'
      }
    } catch (error) {
      console.error('Error loading cape:', error)
    }
  }

  debugSwingArm () {
    const playerObject = Object.values(this.entities).find(entity => entity.playerObject?.animation instanceof WalkingGeneralSwing)
    if (!playerObject) return
    (playerObject.playerObject!.animation as WalkingGeneralSwing).swingArm()
  }

  playAnimation (entityPlayerId, animation: 'walking' | 'running' | 'oneSwing' | 'idle' | 'crouch' | 'crouchWalking') {
    // TODO CLEANUP!
    // Handle special player entity ID for bot entity in third person
    if (entityPlayerId === 'player_entity' && this.playerEntity?.playerObject) {
      const { playerObject } = this.playerEntity
      if (animation === 'oneSwing') {
        if (!(playerObject.animation instanceof WalkingGeneralSwing)) throw new Error('Expected WalkingGeneralSwing')
        playerObject.animation.swingArm()
        return
      }

      if (playerObject.animation instanceof WalkingGeneralSwing) {
        playerObject.animation.switchAnimationCallback = () => {
          if (!(playerObject.animation instanceof WalkingGeneralSwing)) throw new Error('Expected WalkingGeneralSwing')
          playerObject.animation.isMoving = animation === 'walking' || animation === 'running' || animation === 'crouchWalking'
          playerObject.animation.isRunning = animation === 'running'
          playerObject.animation.isCrouched = animation === 'crouch' || animation === 'crouchWalking'
        }
      }
      return
    }

    // Handle regular entities
    const playerObject = this.getPlayerObject(entityPlayerId)
    if (playerObject) {
      if (animation === 'oneSwing') {
        if (!(playerObject.animation instanceof WalkingGeneralSwing)) throw new Error('Expected WalkingGeneralSwing')
        playerObject.animation.swingArm()
        return
      }

      if (playerObject.animation instanceof WalkingGeneralSwing) {
        playerObject.animation.switchAnimationCallback = () => {
          if (!(playerObject.animation instanceof WalkingGeneralSwing)) throw new Error('Expected WalkingGeneralSwing')
          playerObject.animation.isMoving = animation === 'walking' || animation === 'running' || animation === 'crouchWalking'
          playerObject.animation.isRunning = animation === 'running'
          playerObject.animation.isCrouched = animation === 'crouch' || animation === 'crouchWalking'
        }
      }
      return
    }

    // Handle player entity (for third person view) - fallback for backwards compatibility
    if (this.playerEntity?.playerObject) {
      const { playerObject: playerEntityObject } = this.playerEntity
      if (animation === 'oneSwing') {
        if (!(playerEntityObject.animation instanceof WalkingGeneralSwing)) throw new Error('Expected WalkingGeneralSwing')
        playerEntityObject.animation.swingArm()
        return
      }

      if (playerEntityObject.animation instanceof WalkingGeneralSwing) {
        playerEntityObject.animation.switchAnimationCallback = () => {
          if (!(playerEntityObject.animation instanceof WalkingGeneralSwing)) throw new Error('Expected WalkingGeneralSwing')
          playerEntityObject.animation.isMoving = animation === 'walking' || animation === 'running' || animation === 'crouchWalking'
          playerEntityObject.animation.isRunning = animation === 'running'
          playerEntityObject.animation.isCrouched = animation === 'crouch' || animation === 'crouchWalking'
        }
      }
    }
  }

  parseEntityLabel (jsonLike) {
    if (!jsonLike) return
    try {
      if (jsonLike.type === 'string') {
        return jsonLike.value
      }
      const parsed = typeof jsonLike === 'string' ? mojangson.simplify(mojangson.parse(jsonLike)) : nbt.simplify(jsonLike)
      const text = flat(parsed).map(this.textFromComponent)
      return text.join('')
    } catch (err) {
      return jsonLike
    }
  }

  private textFromComponent (component) {
    return typeof component === 'string' ? component : component.text ?? ''
  }

  getItemMesh (item, specificProps: ItemSpecificContextProperties, faceCamera = false, previousModel?: string) {
    if (!item.nbt && item.nbtData) item.nbt = item.nbtData
    const textureUv = this.worldRenderer.getItemRenderData(item, specificProps)
    if (previousModel && previousModel === textureUv?.modelName) return undefined

    if (textureUv && 'resolvedModel' in textureUv) {
      const mesh = getBlockMeshFromModel(this.worldRenderer.material, textureUv.resolvedModel, textureUv.modelName, this.worldRenderer.resourcesManager.currentResources.worldBlockProvider!)
      let SCALE = 1
      if (specificProps['minecraft:display_context'] === 'ground') {
        SCALE = 0.5
      } else if (specificProps['minecraft:display_context'] === 'thirdperson') {
        SCALE = 6
      }
      mesh.scale.set(SCALE, SCALE, SCALE)
      const outerGroup = new THREE.Group()
      outerGroup.add(mesh)
      return {
        mesh: outerGroup,
        isBlock: true,
        modelName: textureUv.modelName,
      }
    }

    // Render proper 3D model for items
    if (textureUv) {
      const textureThree = textureUv.renderInfo?.texture === 'blocks' ? this.worldRenderer.material.map! : this.worldRenderer.itemsTexture
      const { u, v, su, sv } = textureUv
      const sizeX = su ?? 1 // su is actually width
      const sizeY = sv ?? 1 // sv is actually height

      // Use the new unified item mesh function
      const result = createItemMesh(textureThree, {
        u,
        v,
        sizeX,
        sizeY
      }, {
        faceCamera,
        use3D: !faceCamera, // Only use 3D for non-camera-facing items
      })

      let SCALE = 1
      if (specificProps['minecraft:display_context'] === 'ground') {
        SCALE = 0.5
      } else if (specificProps['minecraft:display_context'] === 'thirdperson') {
        SCALE = 6
      }
      result.mesh.scale.set(SCALE, SCALE, SCALE)

      return {
        mesh: result.mesh,
        isBlock: false,
        modelName: textureUv.modelName,
        cleanup: result.cleanup
      }
    }
  }

  setVisible (mesh: THREE.Object3D, visible: boolean) {
    //mesh.visible = visible
    //TODO: Fix workaround for visibility setting
    if (visible) {
      mesh.scale.set(1, 1, 1)
    } else {
      mesh.scale.set(0, 0, 0)
    }
  }

  update (entity: SceneEntity['originalEntity'], overrides) {
    const isPlayerModel = entity.name === 'player'
    if (entity.name === 'zombie_villager' || entity.name === 'husk') {
      overrides.texture = `textures/1.16.4/entity/${entity.name === 'zombie_villager' ? 'zombie_villager/zombie_villager.png' : `zombie/${entity.name}.png`}`
    }
    if (entity.name === 'glow_item_frame') {
      if (!overrides.textures) overrides.textures = []
      overrides.textures['background'] = 'block:glow_item_frame'
    }
    // this can be undefined in case where packet entity_destroy was sent twice (so it was already deleted)
    let e = this.entities[entity.id]
    const justAdded = !e

    if (entity.delete) {
      if (!e) return
      if (e.additionalCleanup) e.additionalCleanup()
      e.traverse(c => {
        if (c['additionalCleanup']) c['additionalCleanup']()
      })
      this.onRemoveEntity(entity)
      this.worldRenderer.scene.remove(e)
      disposeObject(e)
      // todo dispose textures as well ?
      delete this.entities[entity.id]
      return
    }

    let mesh: THREE.Object3D | undefined
    if (e === undefined) {
      const group = new THREE.Group() as unknown as SceneEntity
      group.originalEntity = entity
      if (entity.name === 'item' || entity.name === 'tnt' || entity.name === 'falling_block' || entity.name === 'snowball'
        || entity.name === 'egg' || entity.name === 'ender_pearl' || entity.name === 'experience_bottle'
        || entity.name === 'splash_potion' || entity.name === 'lingering_potion') {
        const item = entity.name === 'tnt' || entity.type === 'projectile'
          ? { name: entity.name }
          : entity.name === 'falling_block'
            ? { blockState: entity['objectData'] }
            : entity.metadata?.find((m: any) => typeof m === 'object' && m?.itemCount)
        if (item) {
          const object = this.getItemMesh(item, {
            'minecraft:display_context': 'ground',
          }, entity.type === 'projectile')
          if (object) {
            mesh = object.mesh
            if (entity.name === 'item' || entity.type === 'projectile') {
              mesh.scale.set(0.5, 0.5, 0.5)
              mesh.position.set(0, entity.name === 'item' ? 0.2 : 0.1, 0)
            } else {
              mesh.scale.set(2, 2, 2)
              mesh.position.set(0, 0.5, 0)
            }
            // set faces
            // mesh.position.set(targetPos.x + 0.5 + 2, targetPos.y + 0.5, targetPos.z + 0.5)
            // viewer.scene.add(mesh)
            if (entity.name === 'item') {
              const clock = new THREE.Clock()
              mesh.onBeforeRender = () => {
                const delta = clock.getDelta()
                mesh!.rotation.y += delta
              }
            }

            // TNT blinking
            // if (entity.name === 'tnt') {
            //   let lastBlink = 0
            //   const blinkInterval = 500 // ms between blinks
            //   mesh.onBeforeRender = () => {
            //     const now = Date.now()
            //     if (now - lastBlink > blinkInterval) {
            //       lastBlink = now
            //       mesh.traverse((child) => {
            //         if (child instanceof THREE.Mesh) {
            //           const material = child.material as THREE.MeshLambertMaterial
            //           material.color.set(material.color?.equals(new THREE.Color(0xff_ff_ff))
            //             ? new THREE.Color(0xff_00_00)
            //             : new THREE.Color(0xff_ff_ff))
            //         }
            //       })
            //     }
            //   }
            // }

            group.additionalCleanup = () => {
              // important: avoid texture memory leak and gpu slowdown
              if (object.cleanup) {
                object.cleanup()
              }
            }
          }
        }
      } else if (isPlayerModel) {
        const wrapper = new THREE.Group()
        const playerObject = this.setupPlayerObject(entity, wrapper, overrides)
        group.playerObject = playerObject
        mesh = wrapper

        if (entity.username) {
          const nametag = addNametag(entity, { fontFamily: 'mojangles' }, wrapper, this.worldRenderer.version)
          if (nametag) {
            nametag.position.y = playerObject.position.y + playerObject.scale.y * 16 + 3
            nametag.scale.multiplyScalar(12)
          }
        }
      } else {
        mesh = getEntityMesh(entity, this.worldRenderer, this.entitiesOptions, { ...overrides, customModel: entity['customModel'] })
      }
      if (!mesh) return
      mesh.name = 'mesh'
      // set initial position so there are no weird jumps update after
      const pos = entity.pos ?? entity.position
      group.position.set(pos.x, pos.y, pos.z)

      // todo use width and height instead
      const boxHelper = new THREE.BoxHelper(
        mesh,
        entity.type === 'hostile' ? 0xff_00_00 :
          entity.type === 'mob' ? 0x00_ff_00 :
            entity.type === 'player' ? 0x00_00_ff :
              0xff_a5_00,
      )
      boxHelper.name = 'debug'
      group.add(mesh)
      group.add(boxHelper)
      boxHelper.visible = false
      this.worldRenderer.scene.add(group)

      e = group
      e.name = 'entity'
      e['realName'] = entity.name
      this.entities[entity.id] = e

      this.onAddEntity(entity)

      if (isPlayerModel) {
        void this.updatePlayerSkin(entity.id, entity.username, overrides?.texture ? entity.uuid : undefined, overrides?.texture || stevePngUrl)
      }
      this.setDebugMode(this.debugMode, group)
      this.setRendering(this.currentlyRendering, group)
    } else {
      mesh = e.children.find(c => c.name === 'mesh')
    }

    // Update equipment
    this.updateEntityEquipment(e, entity)

    const meta = getGeneralEntitiesMetadata(entity)

    const isInvisible = ((entity.metadata?.[0] ?? 0) as unknown as number) & 0x20 || (this.worldRenderer.playerStateReactive.cameraSpectatingEntity === entity.id && this.worldRenderer.playerStateUtils.isSpectator())
    for (const child of mesh!.children ?? []) {
      if (child.name !== 'nametag') {
        child.visible = !isInvisible
      }
    }
    // ---
    // set baby size
    if (meta.baby) {
      e.scale.set(0.5, 0.5, 0.5)
    } else {
      e.scale.set(1, 1, 1)
    }
    // entity specific meta
    const textDisplayMeta = getSpecificEntityMetadata('text_display', entity)
    const displayTextRaw = textDisplayMeta?.text || meta.custom_name_visible && meta.custom_name
    if (entity.name !== 'player' && displayTextRaw) {
      const nameTagFixed = textDisplayMeta && (textDisplayMeta.billboard_render_constraints === 'fixed' || !textDisplayMeta.billboard_render_constraints)
      const nameTagBackgroundColor = (textDisplayMeta && (parseInt(textDisplayMeta.style_flags, 10) & 0x04) === 0) ? toRgba(textDisplayMeta.background_color) : undefined
      let nameTagTextOpacity: any
      if (textDisplayMeta?.text_opacity) {
        const rawOpacity = parseInt(textDisplayMeta?.text_opacity, 10)
        nameTagTextOpacity = rawOpacity > 0 ? rawOpacity : 256 - rawOpacity
      }
      addNametag(
        { ...entity, username: typeof displayTextRaw === 'string' ? mojangson.simplify(mojangson.parse(displayTextRaw)) : nbt.simplify(displayTextRaw),
          nameTagBackgroundColor, nameTagTextOpacity, nameTagFixed,
          nameTagScale: textDisplayMeta?.scale, nameTagTranslation: textDisplayMeta && (textDisplayMeta.translation || new THREE.Vector3(0, 0, 0)),
          nameTagRotationLeft: toQuaternion(textDisplayMeta?.left_rotation), nameTagRotationRight: toQuaternion(textDisplayMeta?.right_rotation) },
        this.entitiesOptions,
        mesh,
        this.worldRenderer.version
      )
    }

    const armorStandMeta = getSpecificEntityMetadata('armor_stand', entity)
    if (armorStandMeta) {
      const isSmall = (parseInt(armorStandMeta.client_flags, 10) & 0x01) !== 0
      const hasArms = (parseInt(armorStandMeta.client_flags, 10) & 0x04) !== 0
      const hasBasePlate = (parseInt(armorStandMeta.client_flags, 10) & 0x08) === 0
      const isMarker = (parseInt(armorStandMeta.client_flags, 10) & 0x10) !== 0
      mesh!.castShadow = !isMarker
      mesh!.receiveShadow = !isMarker
      if (isSmall) {
        e.scale.set(0.5, 0.5, 0.5)
      } else {
        e.scale.set(1, 1, 1)
      }
      e.traverse(c => {
        switch (c.name) {
          case 'bone_baseplate':
            this.setVisible(c, hasBasePlate)
            c.rotation.y = -e.rotation.y
            break
          case 'bone_head':
            if (armorStandMeta.head_pose) {
              c.setRotationFromEuler(poseToEuler(armorStandMeta.head_pose))
            }
            break
          case 'bone_body':
            if (armorStandMeta.body_pose) {
              c.setRotationFromEuler(poseToEuler(armorStandMeta.body_pose))
            }
            break
          case 'bone_rightarm':
            if (c.parent?.name !== 'bone_armor') {
              this.setVisible(c, hasArms)
            }
            if (armorStandMeta.left_arm_pose) {
              c.setRotationFromEuler(poseToEuler(armorStandMeta.left_arm_pose))
            } else {
              c.setRotationFromEuler(poseToEuler({ 'yaw': -10, 'pitch': -10, 'roll': 0 }))
            }
            break
          case 'bone_leftarm':
            if (c.parent?.name !== 'bone_armor') {
              this.setVisible(c, hasArms)
            }
            if (armorStandMeta.right_arm_pose) {
              c.setRotationFromEuler(poseToEuler(armorStandMeta.right_arm_pose))
            } else {
              c.setRotationFromEuler(poseToEuler({ 'yaw': 10, 'pitch': -10, 'roll': 0 }))
            }
            break
          case 'bone_rightleg':
            if (armorStandMeta.left_leg_pose) {
              c.setRotationFromEuler(poseToEuler(armorStandMeta.left_leg_pose))
            } else {
              c.setRotationFromEuler(poseToEuler({ 'yaw': -1, 'pitch': -1, 'roll': 0 }))
            }
            break
          case 'bone_leftleg':
            if (armorStandMeta.right_leg_pose) {
              c.setRotationFromEuler(poseToEuler(armorStandMeta.right_leg_pose))
            } else {
              c.setRotationFromEuler(poseToEuler({ 'yaw': 1, 'pitch': 1, 'roll': 0 }))
            }
            break
        }
      })
    }

    // todo handle map, map_chunks events
    let itemFrameMeta = getSpecificEntityMetadata('item_frame', entity)
    if (!itemFrameMeta) {
      itemFrameMeta = getSpecificEntityMetadata('glow_item_frame', entity)
    }
    if (itemFrameMeta) {
      // TODO: fix type
      // todo! fix errors in mc-data (no entities data prior 1.18.2)
      const item = (itemFrameMeta?.item ?? entity.metadata?.[8]) as any as { itemId, blockId, components, nbtData: { value: { map: { value: number } } } }
      mesh!.scale.set(1, 1, 1)
      mesh!.position.set(0, 0, -0.5)

      e.rotation.x = -entity.pitch
      e.children.find(c => {
        if (c.name.startsWith('map_')) {
          disposeObject(c)
          const existingMapNumber = parseInt(c.name.split('_')[1], 10)
          this.itemFrameMaps[existingMapNumber] = this.itemFrameMaps[existingMapNumber]?.filter(mesh => mesh !== c)
          if (c instanceof THREE.Mesh) {
            c.material?.map?.dispose()
          }
          return true
        } else if (c.name === 'item') {
          disposeObject(c)
          return true
        }
        return false
      })?.removeFromParent()

      if (item && (item.itemId ?? item.blockId ?? 0) !== 0) {
        // Get rotation from metadata, default to 0 if not present
        // Rotation is stored in 45° increments (0-7) for items, 90° increments (0-3) for maps
        const rotation = (itemFrameMeta.rotation as any as number) ?? 0
        const mapNumber = item.nbtData?.value?.map?.value ?? item.components?.find(x => x.type === 'map_id')?.data
        if (mapNumber) {
          // TODO: Use proper larger item frame model when a map exists
          mesh!.scale.set(16 / 12, 16 / 12, 1)
          // Handle map rotation (4 possibilities, 90° increments)
          this.addMapModel(e, mapNumber, rotation)
        } else {
          // Handle regular item rotation (8 possibilities, 45° increments)
          const itemMesh = this.getItemMesh(item, {
            'minecraft:display_context': 'fixed',
          })
          if (itemMesh) {
            itemMesh.mesh.position.set(0, 0, -0.05)
            // itemMesh.mesh.position.set(0, 0, 0.43)
            if (itemMesh.isBlock) {
              itemMesh.mesh.scale.set(0.25, 0.25, 0.25)
            } else {
              itemMesh.mesh.scale.set(0.5, 0.5, 0.5)
            }
            // Rotate 180° around Y axis first
            itemMesh.mesh.rotateY(Math.PI)
            // Then apply the 45° increment rotation
            itemMesh.mesh.rotateZ(-rotation * Math.PI / 4)
            itemMesh.mesh.name = 'item'
            e.add(itemMesh.mesh)
          }
        }
      }
    }

    if (entity.username !== undefined) {
      e.username = entity.username
    }

    this.updateNameTagVisibility(e)

    this.updateEntityPosition(entity, justAdded, overrides)
  }

  updateEntityPosition (entity: import('prismarine-entity').Entity, justAdded: boolean, overrides: { rotation?: { head?: { y: number, x: number } } }) {
    const e = this.entities[entity.id]
    if (!e) return
    const ANIMATION_DURATION = justAdded ? 0 : TWEEN_DURATION
    if (entity.position) {
      new TWEEN.Tween(e.position).to({ x: entity.position.x, y: entity.position.y, z: entity.position.z }, ANIMATION_DURATION).start()
    }
    if (entity.yaw) {
      const da = (entity.yaw - e.rotation.y) % (Math.PI * 2)
      const dy = 2 * da % (Math.PI * 2) - da
      new TWEEN.Tween(e.rotation).to({ y: e.rotation.y + dy }, ANIMATION_DURATION).start()
    }

    if (e?.playerObject && overrides?.rotation?.head) {
      const { playerObject } = e
      const headRotationDiff = overrides.rotation.head.y ? overrides.rotation.head.y - entity.yaw : 0
      playerObject.skin.head.rotation.y = -headRotationDiff
      playerObject.skin.head.rotation.x = overrides.rotation.head.x ? - overrides.rotation.head.x : 0
    }
  }

  onAddEntity (entity: import('prismarine-entity').Entity) {
  }

  loadedSkinEntityIds = new Set<string>()
  maybeRenderPlayerSkin (entityId: string) {
    let mesh = this.entities[entityId]
    if (entityId === 'player_entity') {
      mesh = this.playerEntity!
      entityId = this.playerEntity?.originalEntity.id as any
    }
    if (!mesh) return
    if (!mesh.playerObject) return
    if (!mesh.visible) return

    const MAX_DISTANCE_SKIN_LOAD = 128
    const cameraPos = this.worldRenderer.cameraObject.position
    const distance = mesh.position.distanceTo(cameraPos)
    if (distance < MAX_DISTANCE_SKIN_LOAD && distance < (this.worldRenderer.viewDistance * 16)) {
      if (this.loadedSkinEntityIds.has(String(entityId))) return
      void this.updatePlayerSkin(entityId, mesh.playerObject.realUsername, mesh.playerObject.realPlayerUuid, true, true)
    }
  }

  playerPerAnimation = {} as Record<number, string>
  onRemoveEntity (entity: import('prismarine-entity').Entity) {
    this.loadedSkinEntityIds.delete(entity.id.toString())
    delete this.currentSkinUrls[entity.id.toString()]
  }

  updateMap (mapNumber: string | number, data: string) {
    this.cachedMapsImages[mapNumber] = data
    let itemFrameMeshes = this.itemFrameMaps[mapNumber]
    if (!itemFrameMeshes) return
    itemFrameMeshes = itemFrameMeshes.filter(mesh => mesh.parent)
    this.itemFrameMaps[mapNumber] = itemFrameMeshes
    if (itemFrameMeshes) {
      for (const mesh of itemFrameMeshes) {
        mesh.material.map = this.loadMap(data)
        mesh.material.needsUpdate = true
        mesh.visible = true
      }
    }
  }

  updateNameTagVisibility (entity: SceneEntity) {
    const playerTeam = this.worldRenderer.playerStateReactive.team
    const entityTeam = entity.originalEntity.team
    const nameTagVisibility = entityTeam?.nameTagVisibility || 'always'
    const showNameTag = nameTagVisibility === 'always' ||
      (nameTagVisibility === 'hideForOwnTeam' && entityTeam?.team !== playerTeam?.team) ||
      (nameTagVisibility === 'hideForOtherTeams' && (entityTeam?.team === playerTeam?.team || playerTeam === undefined))
    entity.traverse(c => {
      if (c.name === 'nametag') {
        c.visible = showNameTag
      }
    })
  }

  addMapModel (entityMesh: THREE.Object3D, mapNumber: number, rotation: number) {
    const imageData = this.cachedMapsImages?.[mapNumber]
    let texture: THREE.Texture | null = null
    if (imageData) {
      texture = this.loadMap(imageData)
    }
    const parameters = {
      transparent: true,
      alphaTest: 0.1,
    }
    if (texture) {
      parameters['map'] = texture
    }
    const material = new THREE.MeshLambertMaterial(parameters)

    const mapMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material)

    mapMesh.rotation.set(0, Math.PI, 0)
    entityMesh.add(mapMesh)
    let isInvisible = true
    entityMesh.traverseVisible(c => {
      if (c.name === 'geometry_frame') {
        isInvisible = false
      }
    })
    if (isInvisible) {
      mapMesh.position.set(0, 0, 0.499)
    } else {
      mapMesh.position.set(0, 0, 0.437)
    }
    // Apply 90° increment rotation for maps (0-3)
    mapMesh.rotateZ(Math.PI * 2 - rotation * Math.PI / 2)
    mapMesh.name = `map_${mapNumber}`

    if (!texture) {
      mapMesh.visible = false
    }

    if (!this.itemFrameMaps[mapNumber]) {
      this.itemFrameMaps[mapNumber] = []
    }
    this.itemFrameMaps[mapNumber].push(mapMesh)
  }

  loadMap (data: any) {
    const texture = new THREE.TextureLoader().load(data)
    if (texture) {
      texture.magFilter = THREE.NearestFilter
      texture.minFilter = THREE.NearestFilter
      texture.needsUpdate = true
    }
    return texture
  }

  addItemModel (entityMesh: SceneEntity, hand: 'left' | 'right', item: Item, isPlayer = false) {
    const bedrockParentName = `bone_${hand}item`
    const itemName = `custom_item_${hand}`

    // remove existing item
    entityMesh.traverse(c => {
      if (c.name === itemName) {
        c.removeFromParent()
        if (c['additionalCleanup']) c['additionalCleanup']()
      }
    })
    if (!item) return

    const itemObject = this.getItemMesh(item, {
      'minecraft:display_context': 'thirdperson',
    })
    if (itemObject?.mesh) {
      entityMesh.traverse(c => {
        if (c.name.toLowerCase() === bedrockParentName || c.name === `${hand}Arm`) {
          const group = new THREE.Object3D()
          group['additionalCleanup'] = () => {
            // important: avoid texture memory leak and gpu slowdown
            if (itemObject.cleanup) {
              itemObject.cleanup()
            }
          }
          const itemMesh = itemObject.mesh
          group.rotation.z = -Math.PI / 16
          if (itemObject.isBlock) {
            group.rotation.y = Math.PI / 4
          } else {
            itemMesh.rotation.z = -Math.PI / 4
            group.rotation.y = Math.PI / 2
            group.scale.multiplyScalar(2)
          }

          // if player, move item below and forward a bit
          if (isPlayer) {
            group.position.y = -8
            group.position.z = 5
            group.position.x = hand === 'left' ? 1 : -1
            group.rotation.x = Math.PI
          }

          group.add(itemMesh)

          group.name = itemName
          c.add(group)
        }
      })
    }
  }

  handleDamageEvent (entityId, damageAmount) {
    const entityMesh = this.entities[entityId]?.children.find(c => c.name === 'mesh')
    if (entityMesh) {
      entityMesh.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material.clone) {
          const clonedMaterial = child.material.clone()
          clonedMaterial.dispose()
          child.material = child.material.clone()
          const originalColor = child.material.color.clone()
          child.material.color.set(0xff_00_00)
          new TWEEN.Tween(child.material.color)
            .to(originalColor, 500)
            .start()
        }
      })
    }
  }

  raycastSceneDebug () {
    // return any object from scene. raycast from camera
    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(new THREE.Vector2(0, 0), this.worldRenderer.camera)
    const intersects = raycaster.intersectObjects(this.worldRenderer.scene.children)
    return intersects[0]?.object
  }

  private setupPlayerObject (entity: SceneEntity['originalEntity'], wrapper: THREE.Group, overrides: { texture?: string }): PlayerObjectType {
    const playerObject = new PlayerObject() as PlayerObjectType
    playerObject.realPlayerUuid = entity.uuid ?? ''
    playerObject.realUsername = entity.username ?? ''
    playerObject.position.set(0, 16, 0)

    // fix issues with starfield
    playerObject.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
        obj.material.transparent = true
      }
    })

    wrapper.add(playerObject as any)
    const scale = 1 / 16
    wrapper.scale.set(scale, scale, scale)
    wrapper.rotation.set(0, Math.PI, 0)

    // Set up animation
    playerObject.animation = new WalkingGeneralSwing()
    //@ts-expect-error
    playerObject.animation.isMoving = false

    return playerObject
  }

  private updateEntityEquipment (entityMesh: SceneEntity, entity: SceneEntity['originalEntity']) {
    if (!entityMesh || !entity.equipment) return

    const isPlayer = entity.type === 'player'
    this.addItemModel(entityMesh, isPlayer ? 'right' : 'left', entity.equipment[0], isPlayer)
    this.addItemModel(entityMesh, isPlayer ? 'left' : 'right', entity.equipment[1], isPlayer)
    addArmorModel(this.worldRenderer, entityMesh, 'feet', entity.equipment[2])
    addArmorModel(this.worldRenderer, entityMesh, 'legs', entity.equipment[3], 2)
    addArmorModel(this.worldRenderer, entityMesh, 'chest', entity.equipment[4])
    addArmorModel(this.worldRenderer, entityMesh, 'head', entity.equipment[5])

    // Update player-specific equipment
    if (isPlayer && entityMesh.playerObject) {
      const { playerObject } = entityMesh
      playerObject.backEquipment = entity.equipment.some((item) => item?.name === 'elytra') ? 'elytra' : 'cape'
      if (playerObject.backEquipment === 'elytra') {
        void this.loadAndApplyCape(entity.id, elytraTexture)
      }
      if (playerObject.cape.map === null) {
        playerObject.cape.visible = false
      }
    }
  }
}

function getGeneralEntitiesMetadata (entity: { name; metadata }): Partial<UnionToIntersection<EntityMetadataVersions[keyof EntityMetadataVersions]>> {
  const entityData = loadedData.entitiesByName[entity.name]
  return new Proxy({}, {
    get (target, p, receiver) {
      if (typeof p !== 'string' || !entityData) return
      const index = entityData.metadataKeys?.indexOf(p)
      return entity.metadata?.[index ?? -1]
    },
  })
}

function getSpecificEntityMetadata<T extends keyof EntityMetadataVersions> (name: T, entity): EntityMetadataVersions[T] | undefined {
  if (entity.name !== name) return
  return getGeneralEntitiesMetadata(entity) as any
}

function addArmorModel (worldRenderer: WorldRendererThree, entityMesh: THREE.Object3D, slotType: string, item: Item, layer = 1, overlay = false) {
  if (!item) {
    removeArmorModel(entityMesh, slotType)
    return
  }
  const itemParts = item.name.split('_')
  let texturePath
  const isPlayerHead = slotType === 'head' && item.name === 'player_head'
  if (isPlayerHead) {
    removeArmorModel(entityMesh, slotType)
    if (item.nbt) {
      const itemNbt = nbt.simplify(item.nbt)
      try {
        let textureData
        if (itemNbt.SkullOwner) {
          textureData = itemNbt.SkullOwner.Properties.textures[0]?.Value
        } else {
          textureData = itemNbt['minecraft:profile']?.Properties?.find(p => p.name === 'textures')?.value
        }
        if (textureData) {
          const decodedData = JSON.parse(Buffer.from(textureData, 'base64').toString())
          texturePath = decodedData.textures?.SKIN?.url
          const { skinTexturesProxy } = this.worldRenderer.worldRendererConfig
          if (skinTexturesProxy) {
            texturePath = texturePath?.replace('http://textures.minecraft.net/', skinTexturesProxy)
              .replace('https://textures.minecraft.net/', skinTexturesProxy)
          }
        }
      } catch (err) {
        console.error('Error decoding player head texture:', err)
      }
    } else {
      texturePath = stevePngUrl
    }
  }
  const armorMaterial = itemParts[0]
  if (!texturePath) {
    // TODO: Support mirroring on certain parts of the model
    const armorTextureName = `${armorMaterial}_layer_${layer}${overlay ? '_overlay' : ''}`
    texturePath = worldRenderer.resourcesManager.currentResources.customTextures.armor?.textures[armorTextureName]?.src ?? armorTextures[armorTextureName]
  }
  if (!texturePath || !armorModel[slotType]) {
    removeArmorModel(entityMesh, slotType)
    return
  }

  const meshName = `geometry_armor_${slotType}${overlay ? '_overlay' : ''}`
  let mesh = entityMesh.children.findLast(c => c.name === meshName) as THREE.Mesh
  let material
  if (mesh) {
    material = mesh.material
    void loadTexture(texturePath, texture => {
      texture.magFilter = THREE.NearestFilter
      texture.minFilter = THREE.NearestFilter
      texture.flipY = false
      texture.wrapS = THREE.MirroredRepeatWrapping
      texture.wrapT = THREE.MirroredRepeatWrapping
      material.map = texture
    })
  } else {
    mesh = getMesh(worldRenderer, texturePath, armorModel[slotType])
    // // enable debug mode to see the mesh
    // mesh.traverse(c => {
    //   if (c instanceof THREE.Mesh) {
    //     c.material.wireframe = true
    //   }
    // })
    if (slotType === 'head') {
      // avoid z-fighting with the head
      mesh.children[0].position.y += 0.01
    }
    mesh.name = meshName
    material = mesh.material
    if (!isPlayerHead) {
      material.side = THREE.DoubleSide
    }
  }
  if (armorMaterial === 'leather' && !overlay) {
    const color = (item.nbt?.value as any)?.display?.value?.color?.value
    if (color) {
      const r = color >> 16 & 0xff
      const g = color >> 8 & 0xff
      const b = color & 0xff
      material.color.setRGB(r / 255, g / 255, b / 255)
    } else {
      material.color.setHex(0xB5_6D_51) // default brown color
    }
    addArmorModel(worldRenderer, entityMesh, slotType, item, layer, true)
  } else {
    material.color.setHex(0xFF_FF_FF)
  }
  const group = new THREE.Object3D()
  group.name = `armor_${slotType}${overlay ? '_overlay' : ''}`
  group.add(mesh)

  entityMesh.add(mesh)
}

function removeArmorModel (entityMesh: THREE.Object3D, slotType: string) {
  for (const c of entityMesh.children) {
    if (c.name === `geometry_armor_${slotType}` || c.name === `geometry_armor_${slotType}_overlay`) {
      c.removeFromParent()
    }
  }
}
