//@ts-check
import EventEmitter from 'events'
import nbt from 'prismarine-nbt'
import * as TWEEN from '@tweenjs/tween.js'
import * as THREE from 'three'
import { PlayerObject, PlayerAnimation } from 'skinview3d'
import { loadSkinToCanvas, loadEarsToCanvasFromSkin, inferModelType, loadCapeToCanvas, loadImage } from 'skinview-utils'
// todo replace with url
import stevePng from 'mc-assets/dist/other-textures/latest/entity/player/wide/steve.png'
import { NameTagObject } from 'skinview3d/libs/nametag'
import { flat, fromFormattedString } from '@xmcl/text-component'
import mojangson from 'mojangson'
import * as Entity from './entity/EntityMesh'
import { WalkingGeneralSwing } from './entity/animations'
import externalTexturesJson from './entity/externalTextures.json'
import { disposeObject } from './threeJsUtils'

export const TWEEN_DURATION = 120

type PlayerObjectType = PlayerObject & { animation?: PlayerAnimation }

function getUsernameTexture (username: string, { fontFamily = 'sans-serif' }: any) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not get 2d context')

  const fontSize = 50
  const padding = 5
  ctx.font = `${fontSize}px ${fontFamily}`

  const textWidth = ctx.measureText(username).width + padding * 2

  canvas.width = textWidth
  canvas.height = fontSize + padding * 2

  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.font = `${fontSize}px ${fontFamily}`
  ctx.fillStyle = 'white'
  ctx.fillText(username, padding, fontSize)

  return canvas
}

const addNametag = (entity, options, mesh) => {
  if (entity.username !== undefined) {
    if (mesh.children.some(c => c.name === 'nametag')) return // todo update
    const canvas = getUsernameTexture(entity.username, options)
    const tex = new THREE.Texture(canvas)
    tex.needsUpdate = true
    const spriteMat = new THREE.SpriteMaterial({ map: tex })
    const sprite = new THREE.Sprite(spriteMat)
    sprite.renderOrder = 1000
    sprite.scale.set(canvas.width * 0.005, canvas.height * 0.005, 1)
    sprite.position.y += entity.height + 0.6
    sprite.name = 'nametag'

    mesh.add(sprite)
  }
}

// todo cleanup
const nametags = {}

function getEntityMesh (entity, scene, options, overrides) {
  if (entity.name) {
    try {
      // https://github.com/PrismarineJS/prismarine-viewer/pull/410
      const entityName = entity.name.toLowerCase()
      const e = new Entity.EntityMesh('1.16.4', entityName, scene, overrides)

      if (e.mesh) {
        addNametag(entity, options, e.mesh)
        return e.mesh
      }
    } catch (err) {
      reportError?.(err)
    }
  }

  const geometry = new THREE.BoxGeometry(entity.width, entity.height, entity.width)
  geometry.translate(0, entity.height / 2, 0)
  const material = new THREE.MeshBasicMaterial({ color: 0xff_00_ff })
  const cube = new THREE.Mesh(geometry, material)
  const nametagCount = (nametags[entity.name] = (nametags[entity.name] || 0) + 1)
  if (nametagCount < 6) {
    addNametag({
      username: entity.name,
      height: entity.height,
    }, options, cube)
  }
  return cube
}

export type SceneEntity = THREE.Object3D & {
  playerObject?: PlayerObject & {
    animation?: PlayerAnimation
  }
  username?: string
  additionalCleanup?: () => void
}

export class Entities extends EventEmitter {
  entities = {} as Record<string, SceneEntity>
  entitiesOptions: {
    fontFamily?: string
  } = {}
  debugMode: string
  onSkinUpdate: () => void
  clock = new THREE.Clock()
  rendering = true
  itemsTexture: THREE.Texture | null = null
  getItemUv: undefined | ((idOrName: number | string) => {
    texture: THREE.Texture;
    u: number;
    v: number;
    su?: number;
    sv?: number;
    size?: number;
  })

  constructor (public scene: THREE.Scene) {
    super()
    this.entitiesOptions = {}
    this.debugMode = 'none'
    this.onSkinUpdate = () => { }
  }

  clear () {
    for (const mesh of Object.values(this.entities)) {
      this.scene.remove(mesh)
      disposeObject(mesh)
    }
    this.entities = {}
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
    this.rendering = rendering
    for (const ent of entity ? [entity] : Object.values(this.entities)) {
      if (rendering) {
        if (!this.scene.children.includes(ent)) this.scene.add(ent)
      } else {
        this.scene.remove(ent)
      }
    }
  }

  render () {
    const dt = this.clock.getDelta()
    for (const entityId of Object.keys(this.entities)) {
      const playerObject = this.getPlayerObject(entityId)
      if (playerObject?.animation) {
        playerObject.animation.update(playerObject, dt)
      }
    }
  }

  getPlayerObject (entityId: string | number) {
    const playerObject = this.entities[entityId]?.playerObject as PlayerObjectType | undefined
    return playerObject
  }

  // fixme workaround
  defaultSteveTexture

  // true means use default skin url
  updatePlayerSkin (entityId: string | number, username: string | undefined, skinUrl: string | true, capeUrl: string | true | undefined = undefined) {
    let playerObject = this.getPlayerObject(entityId)
    if (!playerObject) return
    // const username = this.entities[entityId].username
    // or https://mulv.vercel.app/
    if (skinUrl === true) {
      skinUrl = `https://mulv.tycrek.dev/api/lookup?username=${username}&type=skin`
      if (!username) return
    }
    loadImage(skinUrl).then(image => {
      playerObject = this.getPlayerObject(entityId)
      if (!playerObject) return
      /** @type {THREE.CanvasTexture} */
      let skinTexture
      if (skinUrl === stevePng && this.defaultSteveTexture) {
        skinTexture = this.defaultSteveTexture
      } else {
        const skinCanvas = document.createElement('canvas')
        loadSkinToCanvas(skinCanvas, image)
        skinTexture = new THREE.CanvasTexture(skinCanvas)
        if (skinUrl === stevePng) {
          this.defaultSteveTexture = skinTexture
        }
      }
      skinTexture.magFilter = THREE.NearestFilter
      skinTexture.minFilter = THREE.NearestFilter
      skinTexture.needsUpdate = true
      playerObject.skin.map = skinTexture
      playerObject.skin.modelType = inferModelType(skinTexture.image)

      const earsCanvas = document.createElement('canvas')
      loadEarsToCanvasFromSkin(earsCanvas, image)
      if (isCanvasBlank(earsCanvas)) {
        playerObject.ears.map = null
        playerObject.ears.visible = false
      } else {
        const earsTexture = new THREE.CanvasTexture(earsCanvas)
        earsTexture.magFilter = THREE.NearestFilter
        earsTexture.minFilter = THREE.NearestFilter
        earsTexture.needsUpdate = true
        //@ts-expect-error
        playerObject.ears.map = earsTexture
        playerObject.ears.visible = true
      }
      this.onSkinUpdate?.()
      if (capeUrl) {
        if (capeUrl === true) capeUrl = `https://mulv.tycrek.dev/api/lookup?username=${username}&type=cape`
        loadImage(capeUrl).then(capeImage => {
          playerObject = this.getPlayerObject(entityId)
          if (!playerObject) return
          const capeCanvas = document.createElement('canvas')
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
        }, () => { })
      }
    }, () => { })


    playerObject.cape.visible = false
    if (!capeUrl) {
      playerObject.backEquipment = null
      playerObject.elytra.map = null
      if (playerObject.cape.map) {
        playerObject.cape.map.dispose()
      }
      playerObject.cape.map = null
    }

    function isCanvasBlank (canvas) {
      return !canvas.getContext('2d')
        .getImageData(0, 0, canvas.width, canvas.height).data
        .some(channel => channel !== 0)
    }
  }

  playAnimation (entityPlayerId, animation: 'walking' | 'running' | 'oneSwing' | 'idle') {
    const playerObject = this.getPlayerObject(entityPlayerId)
    if (!playerObject) return

    if (animation === 'oneSwing') {
      if (!(playerObject.animation instanceof WalkingGeneralSwing)) throw new Error('Expected WalkingGeneralSwing')
      playerObject.animation.swingArm()
      return
    }

    if (playerObject.animation instanceof WalkingGeneralSwing) {
      playerObject.animation.switchAnimationCallback = () => {
        if (!(playerObject.animation instanceof WalkingGeneralSwing)) throw new Error('Expected WalkingGeneralSwing')
        playerObject.animation.isMoving = animation !== 'idle'
        playerObject.animation.isRunning = animation === 'running'
      }
    }

  }

  parseEntityLabel (jsonLike) {
    if (!jsonLike) return
    try {
      const parsed = typeof jsonLike === 'string' ? mojangson.simplify(mojangson.parse(jsonLike)) : nbt.simplify(jsonLike)
      const text = flat(parsed).map(x => x.text)
      return text.join('')
    } catch (err) {
      return jsonLike
    }
  }

  getItemMesh (item) {
    const textureUv = this.getItemUv?.(item.itemId ?? item.blockId)
    if (textureUv) {
      // todo use geometry buffer uv instead!
      const { u, v, size, su, sv, texture } = textureUv
      const itemsTexture = texture.clone()
      itemsTexture.flipY = true
      const sizeY = (sv ?? size)!
      const sizeX = (su ?? size)!
      itemsTexture.offset.set(u, 1 - v - sizeY)
      itemsTexture.repeat.set(sizeX, sizeY)
      itemsTexture.needsUpdate = true
      itemsTexture.magFilter = THREE.NearestFilter
      itemsTexture.minFilter = THREE.NearestFilter
      const itemsTextureFlipped = itemsTexture.clone()
      itemsTextureFlipped.repeat.x *= -1
      itemsTextureFlipped.needsUpdate = true
      itemsTextureFlipped.offset.set(u + (sizeX), 1 - v - sizeY)
      const material = new THREE.MeshStandardMaterial({
        map: itemsTexture,
        transparent: true,
        alphaTest: 0.1,
      })
      const materialFlipped = new THREE.MeshStandardMaterial({
        map: itemsTextureFlipped,
        transparent: true,
        alphaTest: 0.1,
      })
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0), [
        // top left and right bottom are black box materials others are transparent
        new THREE.MeshBasicMaterial({ color: 0x00_00_00 }), new THREE.MeshBasicMaterial({ color: 0x00_00_00 }),
        new THREE.MeshBasicMaterial({ color: 0x00_00_00 }), new THREE.MeshBasicMaterial({ color: 0x00_00_00 }),
        material, materialFlipped,
      ])
      return {
        mesh,
        itemsTexture,
        itemsTextureFlipped,
      }
    }
  }

  update (entity: import('prismarine-entity').Entity & { delete?; pos }, overrides) {
    const isPlayerModel = entity.name === 'player'
    if (entity.name === 'zombie' || entity.name === 'zombie_villager' || entity.name === 'husk') {
      overrides.texture = `textures/1.16.4/entity/${entity.name === 'zombie_villager' ? 'zombie_villager/zombie_villager.png' : `zombie/${entity.name}.png`}`
    }
    if (!this.entities[entity.id] && !entity.delete) {
      const group = new THREE.Group()
      let mesh
      if (entity.name === 'item') {
        const item = entity.metadata?.find((m: any) => typeof m === 'object' && m?.itemCount)
        if (item) {
          const object = this.getItemMesh(item)
          if (object) {
            mesh = object.mesh
            mesh.scale.set(0.5, 0.5, 0.5)
            mesh.position.set(0, 0.2, 0)
            // set faces
            // mesh.position.set(targetPos.x + 0.5 + 2, targetPos.y + 0.5, targetPos.z + 0.5)
            // viewer.scene.add(mesh)
            const clock = new THREE.Clock()
            mesh.onBeforeRender = () => {
              const delta = clock.getDelta()
              mesh.rotation.y += delta
            }
            //@ts-expect-error
            group.additionalCleanup = () => {
              // important: avoid texture memory leak and gpu slowdown
              object.itemsTexture.dispose()
              object.itemsTextureFlipped.dispose()
            }
          }
        }
      } else if (isPlayerModel) {
        // CREATE NEW PLAYER ENTITY
        const wrapper = new THREE.Group()
        const playerObject = new PlayerObject() as PlayerObjectType
        playerObject.position.set(0, 16, 0)

        // fix issues with starfield
        playerObject.traverse((obj) => {
          if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
            obj.material.transparent = true
          }
        })
        //@ts-expect-error
        wrapper.add(playerObject)
        const scale = 1 / 16
        wrapper.scale.set(scale, scale, scale)

        if (entity.username) {
          // todo proper colors
          const nameTag = new NameTagObject(fromFormattedString(entity.username).text, {
            font: `48px ${this.entitiesOptions.fontFamily}`,
          })
          nameTag.position.y = playerObject.position.y + playerObject.scale.y * 16 + 3
          nameTag.renderOrder = 1000

          //@ts-expect-error
          wrapper.add(nameTag)
        }

        //@ts-expect-error
        group.playerObject = playerObject
        wrapper.rotation.set(0, Math.PI, 0)
        mesh = wrapper
        playerObject.animation = new WalkingGeneralSwing()
        //@ts-expect-error
        playerObject.animation.isMoving = false
      } else {
        mesh = getEntityMesh(entity, this.scene, this.entitiesOptions, overrides)
      }
      if (!mesh) return
      mesh.name = 'mesh'
      // set initial position so there are no weird jumps update after
      group.position.set(entity.pos.x, entity.pos.y, entity.pos.z)

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
      this.scene.add(group)

      this.entities[entity.id] = group

      this.emit('add', entity)

      if (isPlayerModel) {
        this.updatePlayerSkin(entity.id, '', overrides?.texture || stevePng)
      }
      this.setDebugMode(this.debugMode, group)
      this.setRendering(this.rendering, group)
    }

    //@ts-expect-error
    // set visibility
    const isInvisible = entity.metadata?.[0] & 0x20
    for (const child of this.entities[entity.id]?.children.find(c => c.name === 'mesh')?.children ?? []) {
      if (child.name !== 'nametag') {
        child.visible = !isInvisible
      }
    }
    // ---
    // not player
    const displayText = entity.metadata?.[3] && this.parseEntityLabel(entity.metadata[2])
    if (entity.name !== 'player' && displayText) {
      addNametag({ ...entity, username: displayText }, this.entitiesOptions, this.entities[entity.id].children.find(c => c.name === 'mesh'))
    }

    // todo handle map, map_chunks events
    // if (entity.name === 'item_frame' || entity.name === 'glow_item_frame') {
    //   const example = {
    //     "present": true,
    //     "itemId": 847,
    //     "itemCount": 1,
    //     "nbtData": {
    //         "type": "compound",
    //         "name": "",
    //         "value": {
    //             "map": {
    //                 "type": "int",
    //                 "value": 2146483444
    //             },
    //             "interactiveboard": {
    //                 "type": "byte",
    //                 "value": 1
    //             }
    //         }
    //     }
    // }
    //   const item = entity.metadata?.[8]
    //   if (item.nbtData) {
    //     const nbt = nbt.simplify(item.nbtData)
    //   }
    // }

    // this can be undefined in case where packet entity_destroy was sent twice (so it was already deleted)
    const e = this.entities[entity.id]

    if (entity.username) {
      e.username = entity.username
    }

    if (e?.playerObject && overrides?.rotation?.head) {
      const playerObject = e.playerObject as PlayerObjectType
      const headRotationDiff = overrides.rotation.head.y ? overrides.rotation.head.y - entity.yaw : 0
      playerObject.skin.head.rotation.y = -headRotationDiff
      playerObject.skin.head.rotation.x = overrides.rotation.head.x ? - overrides.rotation.head.x : 0
    }

    if (entity.delete && e) {
      if (e.additionalCleanup) e.additionalCleanup()
      this.emit('remove', entity)
      this.scene.remove(e)
      disposeObject(e)
      // todo dispose textures as well ?
      delete this.entities[entity.id]
    }

    if (entity.pos) {
      new TWEEN.Tween(e.position).to({ x: entity.pos.x, y: entity.pos.y, z: entity.pos.z }, TWEEN_DURATION).start()
    }
    if (entity.yaw) {
      const da = (entity.yaw - e.rotation.y) % (Math.PI * 2)
      const dy = 2 * da % (Math.PI * 2) - da
      new TWEEN.Tween(e.rotation).to({ y: e.rotation.y + dy }, TWEEN_DURATION).start()
    }
  }

  handleDamageEvent (entityId, damageAmount) {
    const entityMesh = this.entities[entityId]?.children.find(c => c.name === 'mesh')
    if (entityMesh) {
      entityMesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
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
}
