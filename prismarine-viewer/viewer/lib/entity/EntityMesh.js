//@ts-check
import * as THREE from 'three'
import { OBJLoader } from 'three-stdlib'
import huskPng from 'mc-assets/dist/other-textures/latest/entity/zombie/husk.png'
import { Vec3 } from 'vec3'
import entities from './entities.json'
import { externalModels } from './objModels'
import externalTexturesJson from './externalTextures.json'
import { sheep, sheepCoat } from './exportedModels.js'
// import { loadTexture } from globalThis.isElectron ? '../utils.electron.js' : '../utils';
const { loadTexture } = globalThis.isElectron ? require('../utils.electron.js') : require('../utils')

const elemFaces = {
  up: {
    dir: [0, 1, 0],
    u0: [0, 0, 1],
    v0: [0, 0, 0],
    u1: [1, 0, 1],
    v1: [0, 0, 1],
    corners: [
      [0, 1, 1, 0, 0],
      [1, 1, 1, 1, 0],
      [0, 1, 0, 0, 1],
      [1, 1, 0, 1, 1]
    ]
  },
  down: {
    dir: [0, -1, 0],
    u0: [1, 0, 1],
    v0: [0, 0, 0],
    u1: [2, 0, 1],
    v1: [0, 0, 1],
    corners: [
      [1, 0, 1, 0, 0],
      [0, 0, 1, 1, 0],
      [1, 0, 0, 0, 1],
      [0, 0, 0, 1, 1]
    ]
  },
  east: {
    dir: [1, 0, 0],
    u0: [0, 0, 0],
    v0: [0, 0, 1],
    u1: [0, 0, 1],
    v1: [0, 1, 1],
    corners: [
      [1, 1, 1, 0, 0],
      [1, 0, 1, 0, 1],
      [1, 1, 0, 1, 0],
      [1, 0, 0, 1, 1]
    ]
  },
  west: {
    dir: [-1, 0, 0],
    u0: [1, 0, 1],
    v0: [0, 0, 1],
    u1: [1, 0, 2],
    v1: [0, 1, 1],
    corners: [
      [0, 1, 0, 0, 0],
      [0, 0, 0, 0, 1],
      [0, 1, 1, 1, 0],
      [0, 0, 1, 1, 1]
    ]
  },
  north: {
    dir: [0, 0, -1],
    u0: [0, 0, 1],
    v0: [0, 0, 1],
    u1: [1, 0, 1],
    v1: [0, 1, 1],
    corners: [
      [1, 0, 0, 0, 1],
      [0, 0, 0, 1, 1],
      [1, 1, 0, 0, 0],
      [0, 1, 0, 1, 0]
    ]
  },
  south: {
    dir: [0, 0, 1],
    u0: [1, 0, 2],
    v0: [0, 0, 1],
    u1: [2, 0, 2],
    v1: [0, 1, 1],
    corners: [
      [0, 0, 1, 0, 1],
      [1, 0, 1, 1, 1],
      [0, 1, 1, 0, 0],
      [1, 1, 1, 1, 0]
    ]
  }
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

function addCube(attr, boneId, bone, cube, texWidth = 64, texHeight = 64) {
  const cubeRotation = new THREE.Euler(0, 0, 0)
  if (cube.rotation) {
    cubeRotation.x = -cube.rotation[0] * Math.PI / 180
    cubeRotation.y = -cube.rotation[1] * Math.PI / 180
    cubeRotation.z = -cube.rotation[2] * Math.PI / 180
  }
  for (const { dir, corners, u0, v0, u1, v1 } of Object.values(elemFaces)) {
    const ndx = Math.floor(attr.positions.length / 3)

    for (const pos of corners) {
      const u = (cube.uv[0] + dot(pos[3] ? u1 : u0, cube.size)) / texWidth
      const v = (cube.uv[1] + dot(pos[4] ? v1 : v0, cube.size)) / texHeight

      const inflate = cube.inflate ?? 0
      let vecPos = new THREE.Vector3(
        cube.origin[0] + pos[0] * cube.size[0] + (pos[0] ? inflate : -inflate),
        cube.origin[1] + pos[1] * cube.size[1] + (pos[1] ? inflate : -inflate),
        cube.origin[2] + pos[2] * cube.size[2] + (pos[2] ? inflate : -inflate)
      )

      vecPos = vecPos.applyEuler(cubeRotation)
      vecPos = vecPos.sub(bone.position)
      vecPos = vecPos.applyEuler(bone.rotation)
      vecPos = vecPos.add(bone.position)

      attr.positions.push(vecPos.x, vecPos.y, vecPos.z)
      attr.normals.push(...dir)
      attr.uvs.push(u, v)
      attr.skinIndices.push(boneId, 0, 0, 0)
      attr.skinWeights.push(1, 0, 0, 0)
    }

    attr.indices.push(ndx, ndx + 1, ndx + 2, ndx + 2, ndx + 1, ndx + 3)
  }
}

function getMesh(texture, jsonModel, overrides = {}) {
  const bones = {}

  const geoData = {
    positions: [],
    normals: [],
    uvs: [],
    indices: [],
    skinIndices: [],
    skinWeights: []
  }
  let i = 0
  for (const jsonBone of jsonModel.bones) {
    const bone = new THREE.Bone()
    if (jsonBone.pivot) {
      bone.position.x = jsonBone.pivot[0]
      bone.position.y = jsonBone.pivot[1]
      bone.position.z = jsonBone.pivot[2]
    }
    if (jsonBone.bind_pose_rotation) {
      bone.rotation.x = -jsonBone.bind_pose_rotation[0] * Math.PI / 180
      bone.rotation.y = -jsonBone.bind_pose_rotation[1] * Math.PI / 180
      bone.rotation.z = -jsonBone.bind_pose_rotation[2] * Math.PI / 180
    } else if (jsonBone.rotation) {
      bone.rotation.x = -jsonBone.rotation[0] * Math.PI / 180
      bone.rotation.y = -jsonBone.rotation[1] * Math.PI / 180
      bone.rotation.z = -jsonBone.rotation[2] * Math.PI / 180
    }
    if (overrides.rotation?.[jsonBone.name]) {
      bone.rotation.x -= (overrides.rotation[jsonBone.name].x ?? 0) * Math.PI / 180
      bone.rotation.y -= (overrides.rotation[jsonBone.name].y ?? 0) * Math.PI / 180
      bone.rotation.z -= (overrides.rotation[jsonBone.name].z ?? 0) * Math.PI / 180
    }
    bone.name = `bone_${jsonBone.name}`
    bones[jsonBone.name] = bone

    if (jsonBone.cubes) {
      for (const cube of jsonBone.cubes) {
        addCube(geoData, i, bone, cube, jsonModel.texturewidth, jsonModel.textureheight)
      }
    }
    i++
  }

  const rootBones = []
  for (const jsonBone of jsonModel.bones) {
    if (jsonBone.parent && bones[jsonBone.parent]) { bones[jsonBone.parent].add(bones[jsonBone.name]) } else {
      rootBones.push(bones[jsonBone.name])
    }
  }

  const skeleton = new THREE.Skeleton(Object.values(bones))

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(geoData.positions, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(geoData.normals, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(geoData.uvs, 2))
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(geoData.skinIndices, 4))
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(geoData.skinWeights, 4))
  geometry.setIndex(geoData.indices)

  const material = new THREE.MeshLambertMaterial({ transparent: true, alphaTest: 0.1 })
  const mesh = new THREE.SkinnedMesh(geometry, material)
  mesh.add(...rootBones)
  mesh.bind(skeleton)
  mesh.scale.set(1 / 16, 1 / 16, 1 / 16)

  loadTexture(texture, texture => {
    if (material.map) {
      // texture is already loaded
      return
    }
    texture.magFilter = THREE.NearestFilter
    texture.minFilter = THREE.NearestFilter
    texture.flipY = false
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    material.map = texture
  })

  return mesh
}

export const knownNotHandled = [
  'area_effect_cloud', 'block_display',
  'chest_boat', 'end_crystal',
  'falling_block', 'furnace_minecart',
  'giant', 'glow_item_frame',
  'glow_squid', 'illusioner',
  'interaction', 'item',
  'item_display', 'item_frame',
  'lightning_bolt', 'marker',
  'painting', 'spawner_minecart',
  'spectral_arrow', 'text_display',
  'tnt', 'trader_llama', 'zombie_horse'
]

export const temporaryMap = {
  'furnace_minecart': 'minecart',
  'spawner_minecart': 'minecart',
  'chest_minecart': 'minecart',
  'hopper_minecart': 'minecart',
  'command_block_minecart': 'minecart',
  'tnt_minecart': 'minecart',
  'glow_squid': 'squid',
  'trader_llama': 'llama',
  'chest_boat': 'boat',
  'spectral_arrow': 'arrow',
  'husk': 'zombie',
  'zombie_horse': 'horse',
  'donkey': 'horse',
  'skeleton_horse': 'horse',
  'mule': 'horse',
  'ocelot': 'cat',
  // 'falling_block': 'block',
  // 'lightning_bolt': 'lightning',
}

const getEntity = (name) => {
  return entities[name]
}

// const externalModelsTextures = {
//   allay: 'allay/allay',
//   axolotl: 'axolotl/axolotl_blue',
//   blaze: 'blaze',
//   camel: 'camel/camel',
//   cat: 'cat/black',
//   chicken: 'chicken',
//   cod: 'fish/cod',
//   creeper: 'creeper/creeper',
//   dolphin: 'dolphin',
//   ender_dragon: 'enderdragon/dragon',
//   enderman: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAgCAYAAACinX6EAAAABGdBTUEAALGPC/xhBQAAAY5JREFUaN7lWNESgzAI8yv8/z/tXjZPHSShYitb73rXedo1AQJ0WchY17WhudQZ7TS18Qb5AXtY/yUBO8tXIaCRqRNwXlcgwDJgmAALfBUP8AjYEdHnAZUIAGdvPy+CnobJIVw9DVIPEABawuEyyvYx1sMIMP8fAbUO7ukBImZmCCEP2AhglnRip8vio7MIxYEsaVkdeYNjYfbN/BBA1twP9AxpB0qlMwj48gBP5Ji1rXc8nfBImk6A5+KqShNwdTwgKy0xYRzdS4yoY651W8EDRwGVJEDVITGtjiEAaEBq3o4SwGqRVAKsdVYIsAzDCACV6VwCFMBCpqLvgudzQ6CnjL5afmeX4pdE0LIQuYCBzZbQfT4rC6COUQGn9B3MQ28pSIxDSDdNrKdQSZJ7lDurMeZm6iEjKVENh8cQgBowBFK5gEHhsO3xFA/oKXp6vg8RoHaD2QRkiaDnAYcZAcB+E6GTRVAhQCVJyVImKOUiBLW3KL4jzU2POHp64RIQ/ADO6D6Ry1gl9tlN1Xm+AK8s2jHadDijAAAAAElFTkSuQmCC',
//   endermite: 'endermite',
//   fox: 'fox/fox',
//   frog: 'frog/cold_frog',
//   ghast: 'ghast/ghast',
//   goat: 'goat/goat',
//   guardian: 'guardian',
//   horse: 'horse/horse_brown',
//   llama: 'llama/creamy',
//   minecart: 'minecart',
//   parrot: 'parrot/parrot_grey',
//   piglin: 'piglin/piglin',
//   pillager: 'illager/pillager',
//   rabbit: 'rabbit/brown',
//   sheep: 'sheep/sheep',
//   shulker: 'shulker/shulker',
//   sniffer: 'sniffer/sniffer',
//   spider: 'spider/spider',
//   tadpole: 'tadpole/tadpole',
//   turtle: 'turtle/big_sea_turtle',
//   vex: 'illager/vex',
//   villager: 'villager/villager',
//   warden: 'warden/warden',
//   witch: 'witch',
//   wolf: 'wolf/wolf',
//   zombie_villager: 'zombie_villager/zombie_villager'
// }

const scaleEntity = {
  zombie: 1.85,
  husk: 1.85,
  sheep: 2
}
const offsetEntity = {
  zombie: new Vec3(0, 1, 0),
  husk: new Vec3(0, 1, 0),
  boat: new Vec3(0, -1, 0),
}

export class EntityMesh {
  constructor(version, type, scene, /** @type {{textures?, rotation?: Record<string, {x,y,z}>}} */overrides = {}) {
    const originalType = type
    const mappedValue = temporaryMap[type]
    if (mappedValue) type = mappedValue

    if (externalModels[type]) {
      const objLoader = new OBJLoader()
      let texturePath = externalTexturesJson[type]

      if (type === 'sheep') {
        this.mesh = this.handleSheep(objLoader, originalType, overrides)
        return
      }

      texturePath = this.getTexturePath(originalType, version, texturePath)
      if (!texturePath) throw new Error(`No texture for ${type}`)

      const material = this.loadMaterial(texturePath)
      const obj = objLoader.parse(externalModels[type])
      this.applyMaterialAndTransform(obj, originalType, material, overrides)

      this.mesh = obj
      return
    }

    const e = getEntity(type)
    if (!e) {
      if (knownNotHandled.includes(type)) return
      throw new Error(`Unknown entity ${type}`)
    }

    this.mesh = this.loadDefaultEntity(e, overrides)
  }

  handleSheep(objLoader, originalType, overrides) {
    const sheepObj = objLoader.parse(sheep)
    const sheepMaterial = new THREE.MeshLambertMaterial({ color: 0xff_ff_ff })
    this.applyMaterialToMesh(sheepObj, sheepMaterial)

    const sheepCoatObj = objLoader.parse(sheepCoat)
    const sheepCoatMaterial = new THREE.MeshLambertMaterial({ color: 0xff_d7_00 })
    this.applyMaterialToMesh(sheepCoatObj, sheepCoatMaterial)

    this.applyEntityScaleAndPosition(sheepObj, sheepCoatObj, originalType)

    if (overrides.rotation?.head) {
      this.applyHeadRotation(sheepObj, overrides.rotation.head)
    }

    const mesh = new THREE.Object3D()
    mesh.add(sheepObj)
    mesh.add(sheepCoatObj)

    return mesh
  }

  getTexturePath(type, version, texturePath) {
    switch (type) {
      case 'zombie_horse':
        return `textures/${version}/entity/horse/horse_zombie.png`
      case 'husk':
        return huskPng
      case 'skeleton_horse':
        return `textures/${version}/entity/horse/horse_skeleton.png`
      case 'donkey':
        return `textures/${version}/entity/horse/donkey.png`
      case 'mule':
        return `textures/${version}/entity/horse/mule.png`
      case 'ocelot':
        return `textures/${version}/entity/cat/ocelot.png`
      default:
        return texturePath
    }
  }

  loadMaterial(texturePath) {
    const texture = new THREE.TextureLoader().load(texturePath)
    texture.minFilter = THREE.NearestFilter
    texture.magFilter = THREE.NearestFilter
    return new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.1
    })
  }

  applyMaterialAndTransform(obj, originalType, material, overrides) {
    const scale = scaleEntity[originalType]
    const offset = offsetEntity[originalType]
    obj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = material
        if (child.name === 'Head' && overrides.rotation?.head) {
          this.applyHeadRotation(child, overrides.rotation.head)
        }
      }
    })

    if (scale) obj.scale.set(scale, scale, scale)
    if (offset) obj.position.set(offset.x, offset.y, offset.z)
  }

  applyMaterialToMesh(obj, material) {
    obj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = material
      }
    })
  }

  applyEntityScaleAndPosition(sheepObj, sheepCoatObj, originalType) {
    const scale = scaleEntity[originalType]
    const offset = offsetEntity[originalType]

    if (scale) {
      sheepObj.scale.set(scale, scale, scale)
      sheepCoatObj.scale.set(scale, scale, scale)
    }
    if (offset) {
      sheepObj.position.set(offset.x, offset.y, offset.z)
      sheepCoatObj.position.set(offset.x, offset.y, offset.z)
    }
  }

  applyHeadRotation(mesh, rotation) {
    mesh.rotation.x -= (rotation.x ?? 0) * Math.PI / 180
    mesh.rotation.y -= (rotation.y ?? 0) * Math.PI / 180
    mesh.rotation.z -= (rotation.z ?? 0) * Math.PI / 180
  }

  loadDefaultEntity(entity, overrides) {
    const mesh = new THREE.Object3D()
    for (const [name, jsonModel] of Object.entries(entity.geometry)) {
      const texture = overrides.textures?.[name] ?? entity.textures[name]
      if (!texture) continue
      const entityMesh = getMesh(texture + '.png', jsonModel, overrides)
      entityMesh.name = `geometry_${name}`
      mesh.add(entityMesh)
    }
    return mesh
  }

  static getStaticData(name) {
    name = temporaryMap[name] || name
    if (externalModels[name]) {
      return {
        boneNames: [] // todo
      }
    }
    const e = getEntity(name)
    if (!e) throw new Error(`Unknown entity ${name}`)
    return {
      boneNames: Object.values(e.geometry).flatMap((x) => x.name)
    }
  }
}
