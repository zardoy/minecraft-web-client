import { Vec3 } from 'vec3'
import { World } from './world'
import { WorldBlock as Block } from './world'
import legacyJson from '../../../../src/preflatMap.json'
import worldBlockProvider, { WorldBlockProvider } from 'mc-assets/dist/worldBlockProvider'

let blockProvider: WorldBlockProvider
type BlockElement = NonNullable<ReturnType<typeof blockProvider.getResolvedModel0_1>['elements']>[0]

const tints: any = {}
let needTiles = false

let tintsData
try {
  tintsData = require('esbuild-data').tints
} catch (err) {
  tintsData = require("minecraft-data/minecraft-data/data/pc/1.16.2/tints.json")
}
for (const key of Object.keys(tintsData)) {
  tints[key] = prepareTints(tintsData[key])
}

function prepareTints (tints) {
  const map = new Map()
  const defaultValue = tintToGl(tints.default)
  for (let { keys, color } of tints.data) {
    color = tintToGl(color)
    for (const key of keys) {
      map.set(`${key}`, color)
    }
  }
  return new Proxy(map, {
    get: (target, key) => {
      return target.has(key) ? target.get(key) : defaultValue
    }
  })
}

const calculatedBlocksEntries = Object.entries(legacyJson.clientCalculatedBlocks)
export function preflatBlockCalculation (block: Block, world: World, position: Vec3) {
  const type = calculatedBlocksEntries.find(([name, blocks]) => blocks.includes(block.name))?.[0]
  if (!type) return
  switch (type) {
    case 'directional': {
      const isSolidConnection = !block.name.includes('redstone') && !block.name.includes('tripwire')
      const neighbors = [
        world.getBlock(position.offset(0, 0, 1)),
        world.getBlock(position.offset(0, 0, -1)),
        world.getBlock(position.offset(1, 0, 0)),
        world.getBlock(position.offset(-1, 0, 0))
      ]
      // set needed props to true: east:'false',north:'false',south:'false',west:'false'
      const props = {}
      for (const [i, neighbor] of neighbors.entries()) {
        const isConnectedToSolid = isSolidConnection ? (neighbor && !neighbor.transparent) : false
        if (isConnectedToSolid || neighbor?.name === block.name) {
          props[['south', 'north', 'east', 'west'][i]] = 'true'
        }
      }
      return props
    }
    // case 'gate_in_wall': {}
    case 'block_snowy': {
      const aboveIsSnow = world.getBlock(position.offset(0, 1, 0))?.name === 'snow'
      return {
        snowy: `${aboveIsSnow}`
      }
    }
    case 'door': {
      // upper half matches lower in
      const half = block.getProperties().half
      if (half === 'upper') {
        // copy other properties
        const lower = world.getBlock(position.offset(0, -1, 0))
        if (lower?.name === block.name) {
          return {
            ...lower.getProperties(),
            half: 'upper'
          }
        }
      }
    }
  }
}

function tintToGl (tint) {
  const r = (tint >> 16) & 0xff
  const g = (tint >> 8) & 0xff
  const b = tint & 0xff
  return [r / 255, g / 255, b / 255]
}

const elemFaces = {
  up: {
    dir: [0, 1, 0],
    mask1: [1, 1, 0],
    mask2: [0, 1, 1],
    corners: [
      [0, 1, 1, 0, 1],
      [1, 1, 1, 1, 1],
      [0, 1, 0, 0, 0],
      [1, 1, 0, 1, 0]
    ]
  },
  down: {
    dir: [0, -1, 0],
    mask1: [1, 1, 0],
    mask2: [0, 1, 1],
    corners: [
      [1, 0, 1, 0, 1],
      [0, 0, 1, 1, 1],
      [1, 0, 0, 0, 0],
      [0, 0, 0, 1, 0]
    ]
  },
  east: {
    dir: [1, 0, 0],
    mask1: [1, 1, 0],
    mask2: [1, 0, 1],
    corners: [
      [1, 1, 1, 0, 0],
      [1, 0, 1, 0, 1],
      [1, 1, 0, 1, 0],
      [1, 0, 0, 1, 1]
    ]
  },
  west: {
    dir: [-1, 0, 0],
    mask1: [1, 1, 0],
    mask2: [1, 0, 1],
    corners: [
      [0, 1, 0, 0, 0],
      [0, 0, 0, 0, 1],
      [0, 1, 1, 1, 0],
      [0, 0, 1, 1, 1]
    ]
  },
  north: {
    dir: [0, 0, -1],
    mask1: [1, 0, 1],
    mask2: [0, 1, 1],
    corners: [
      [1, 0, 0, 0, 1],
      [0, 0, 0, 1, 1],
      [1, 1, 0, 0, 0],
      [0, 1, 0, 1, 0]
    ]
  },
  south: {
    dir: [0, 0, 1],
    mask1: [1, 0, 1],
    mask2: [0, 1, 1],
    corners: [
      [0, 0, 1, 0, 1],
      [1, 0, 1, 1, 1],
      [0, 1, 1, 0, 0],
      [1, 1, 1, 1, 0]
    ]
  }
}

function getLiquidRenderHeight (world, block, type, pos) {
  if (!block || block.type !== type) return 1 / 9
  if (block.metadata === 0) { // source block
    const blockAbove = world.getBlock(pos.offset(0, 1, 0))
    if (blockAbove && blockAbove.type === type) return 1
    return 8 / 9
  }
  return ((block.metadata >= 8 ? 8 : 7 - block.metadata) + 1) / 9
}

const everyArray = (array, callback) => {
  if (!array?.length) return false
  return array.every(callback)
}


const isCube = (block) => {
  if (!block || block.transparent) return false
  if (block.isCube) return true
  // TODO
  // if (!block.variant) block.variant = getModelVariants(block)
  if (!block.variant?.length) return false
  return block.variant.every(v => everyArray(v?.model?.elements, e => {
    return e.from[0] === 0 && e.from[1] === 0 && e.from[2] === 0 && e.to[0] === 16 && e.to[1] === 16 && e.to[2] === 16
  }))
}

function renderLiquid (world, cursor, texture, type, biome, water, attr) {
  const heights: number[] = []
  for (let z = -1; z <= 1; z++) {
    for (let x = -1; x <= 1; x++) {
      const pos = cursor.offset(x, 0, z)
      heights.push(getLiquidRenderHeight(world, world.getBlock(pos), type, pos))
    }
  }
  const cornerHeights = [
    Math.max(Math.max(heights[0], heights[1]), Math.max(heights[3], heights[4])),
    Math.max(Math.max(heights[1], heights[2]), Math.max(heights[4], heights[5])),
    Math.max(Math.max(heights[3], heights[4]), Math.max(heights[6], heights[7])),
    Math.max(Math.max(heights[4], heights[5]), Math.max(heights[7], heights[8]))
  ]

  for (const face in elemFaces) {
    const { dir, corners } = elemFaces[face]
    const isUp = dir[1] === 1

    const neighborPos = cursor.offset(...dir)
    const neighbor = world.getBlock(neighborPos)
    if (!neighbor) continue
    if (neighbor.type === type) continue
    const isGlass = neighbor.name.includes('glass')
    if ((isCube(neighbor) && !isUp) || neighbor.material === 'plant' || neighbor.getProperties().waterlogged) continue

    let tint = [1, 1, 1]
    if (water) {
      let m = 1 // Fake lighting to improve lisibility
      if (Math.abs(dir[0]) > 0) m = 0.6
      else if (Math.abs(dir[2]) > 0) m = 0.8
      tint = tints.water[biome]
      tint = [tint[0] * m, tint[1] * m, tint[2] * m]
    }

    if (needTiles) {
      attr.tiles[`${cursor.x},${cursor.y},${cursor.z}`] ??= {
        block: 'water',
        faces: [],
      }
      attr.tiles[`${cursor.x},${cursor.y},${cursor.z}`].faces.push({
        face,
        neighbor: `${neighborPos.x},${neighborPos.y},${neighborPos.z}`,
        // texture: eFace.texture.name,
      })
    }

    const u = texture.u
    const v = texture.v
    const su = texture.su
    const sv = texture.sv

    for (const pos of corners) {
      const height = cornerHeights[pos[2] * 2 + pos[0]]
      attr.t_positions.push(
        (pos[0] ? 0.999 : 0.001) + (cursor.x & 15) - 8,
        (pos[1] ? height - 0.001 : 0.001) + (cursor.y & 15) - 8,
        (pos[2] ? 0.999 : 0.001) + (cursor.z & 15) - 8)
      attr.t_normals.push(...dir)
      attr.t_uvs.push(pos[3] * su + u, pos[4] * sv * (pos[1] ? 1 : height) + v)
      attr.t_colors.push(tint[0], tint[1], tint[2])
    }
  }
}

function vecadd3 (a, b) {
  if (!b) return a
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
}

function vecsub3 (a, b) {
  if (!b) return a
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}

function matmul3 (matrix, vector): [number, number, number] {
  if (!matrix) return vector
  return [
    matrix[0][0] * vector[0] + matrix[0][1] * vector[1] + matrix[0][2] * vector[2],
    matrix[1][0] * vector[0] + matrix[1][1] * vector[1] + matrix[1][2] * vector[2],
    matrix[2][0] * vector[0] + matrix[2][1] * vector[1] + matrix[2][2] * vector[2]
  ]
}

function matmulmat3 (a, b) {
  const te = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]

  const a11 = a[0][0]; const a12 = a[1][0]; const a13 = a[2][0]
  const a21 = a[0][1]; const a22 = a[1][1]; const a23 = a[2][1]
  const a31 = a[0][2]; const a32 = a[1][2]; const a33 = a[2][2]

  const b11 = b[0][0]; const b12 = b[1][0]; const b13 = b[2][0]
  const b21 = b[0][1]; const b22 = b[1][1]; const b23 = b[2][1]
  const b31 = b[0][2]; const b32 = b[1][2]; const b33 = b[2][2]

  te[0][0] = a11 * b11 + a12 * b21 + a13 * b31
  te[1][0] = a11 * b12 + a12 * b22 + a13 * b32
  te[2][0] = a11 * b13 + a12 * b23 + a13 * b33

  te[0][1] = a21 * b11 + a22 * b21 + a23 * b31
  te[1][1] = a21 * b12 + a22 * b22 + a23 * b32
  te[2][1] = a21 * b13 + a22 * b23 + a23 * b33

  te[0][2] = a31 * b11 + a32 * b21 + a33 * b31
  te[1][2] = a31 * b12 + a32 * b22 + a33 * b32
  te[2][2] = a31 * b13 + a32 * b23 + a33 * b33

  return te
}

function buildRotationMatrix (axis, degree) {
  const radians = degree / 180 * Math.PI
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)

  const axis0 = { x: 0, y: 1, z: 2 }[axis]
  const axis1 = (axis0 + 1) % 3
  const axis2 = (axis0 + 2) % 3

  const matrix = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0]
  ]

  matrix[axis0][axis0] = 1
  matrix[axis1][axis1] = cos
  matrix[axis1][axis2] = -sin
  matrix[axis2][axis1] = +sin
  matrix[axis2][axis2] = cos

  return matrix
}

let needRecompute = false

function renderElement (world: World, cursor: Vec3, element: BlockElement, doAO: boolean, attr, globalMatrix, globalShift, block: Block, biome) {
  const position = cursor
  // const key = `${position.x},${position.y},${position.z}`
  // if (!globalThis.allowedBlocks.includes(key)) return
  const cullIfIdentical = block.name.indexOf('glass') >= 0

  for (const face in element.faces) {
    const eFace = element.faces[face]
    const { corners, mask1, mask2 } = elemFaces[face]
    const dir = matmul3(globalMatrix, elemFaces[face].dir)

    if (eFace.cullface) {
      const neighbor = world.getBlock(cursor.plus(new Vec3(...dir)))
      if (neighbor) {
        if (cullIfIdentical && neighbor.type === block.type) continue
        if (!neighbor.transparent && isCube(neighbor)) continue
      } else {
        needRecompute = true
        continue
      }
    }

    const minx = element.from[0]
    const miny = element.from[1]
    const minz = element.from[2]
    const maxx = element.to[0]
    const maxy = element.to[1]
    const maxz = element.to[2]

    const texture = eFace.texture as any
    const u = texture.u
    const v = texture.v
    const su = texture.su
    const sv = texture.sv

    const ndx = Math.floor(attr.positions.length / 3)

    let tint = [1, 1, 1]
    if (eFace.tintindex !== undefined) {
      if (eFace.tintindex === 0) {
        if (block.name === 'redstone_wire') {
          tint = tints.redstone[`${block.getProperties().power}`]
        } else if (block.name === 'birch_leaves' ||
          block.name === 'spruce_leaves' ||
          block.name === 'lily_pad') {
          tint = tints.constant[block.name]
        } else if (block.name.includes('leaves') || block.name === 'vine') {
          tint = tints.foliage[biome]
        } else {
          tint = tints.grass[biome]
        }
      }
    }

    // UV rotation
    const r = eFace.rotation || 0
    const uvcs = Math.cos(r * Math.PI / 180)
    const uvsn = -Math.sin(r * Math.PI / 180)

    let localMatrix = null as any
    let localShift = null as any

    if (element.rotation) {
      // todo do we support rescale?
      localMatrix = buildRotationMatrix(
        element.rotation.axis,
        element.rotation.angle
      )

      localShift = vecsub3(
        element.rotation.origin,
        matmul3(
          localMatrix,
          element.rotation.origin
        )
      )
    }

    const aos: number[] = []
    const neighborPos = position.plus(new Vec3(...dir))
    const baseLight = world.getLight(neighborPos, undefined, undefined, block.name) / 15
    for (const pos of corners) {
      let vertex = [
        (pos[0] ? maxx : minx),
        (pos[1] ? maxy : miny),
        (pos[2] ? maxz : minz)
      ]

      vertex = vecadd3(matmul3(localMatrix, vertex), localShift)
      vertex = vecadd3(matmul3(globalMatrix, vertex), globalShift)
      vertex = vertex.map(v => v / 16)

      attr.positions.push(
        vertex[0] + (cursor.x & 15) - 8,
        vertex[1] + (cursor.y & 15) - 8,
        vertex[2] + (cursor.z & 15) - 8
      )

      attr.normals.push(...dir)

      const baseu = (pos[3] - 0.5) * uvcs - (pos[4] - 0.5) * uvsn + 0.5
      const basev = (pos[3] - 0.5) * uvsn + (pos[4] - 0.5) * uvcs + 0.5
      attr.uvs.push(baseu * su + u, basev * sv + v)

      let light = 1
      if (doAO) {
        const dx = pos[0] * 2 - 1
        const dy = pos[1] * 2 - 1
        const dz = pos[2] * 2 - 1
        const cornerDir = matmul3(globalMatrix, [dx, dy, dz])
        const side1Dir = matmul3(globalMatrix, [dx * mask1[0], dy * mask1[1], dz * mask1[2]])
        const side2Dir = matmul3(globalMatrix, [dx * mask2[0], dy * mask2[1], dz * mask2[2]])
        const side1 = world.getBlock(cursor.offset(...side1Dir))
        const side2 = world.getBlock(cursor.offset(...side2Dir))
        const corner = world.getBlock(cursor.offset(...cornerDir))

        let cornerLightResult = 15
        if (/* world.config.smoothLighting */false) { // todo fix
          const side1Light = world.getLight(cursor.plus(new Vec3(...side1Dir)), true)
          const side2Light = world.getLight(cursor.plus(new Vec3(...side2Dir)), true)
          const cornerLight = world.getLight(cursor.plus(new Vec3(...cornerDir)), true)
          // interpolate
          cornerLightResult = (side1Light + side2Light + cornerLight) / 3
        }

        const side1Block = world.shouldMakeAo(side1) ? 1 : 0
        const side2Block = world.shouldMakeAo(side2) ? 1 : 0
        const cornerBlock = world.shouldMakeAo(corner) ? 1 : 0

        // TODO: correctly interpolate ao light based on pos (evaluate once for each corner of the block)

        const ao = (side1Block && side2Block) ? 0 : (3 - (side1Block + side2Block + cornerBlock))
        // todo light should go upper on lower blocks
        light = (ao + 1) / 4 * (cornerLightResult / 15)
        aos.push(ao)
      }

      attr.colors.push(baseLight * tint[0] * light, baseLight * tint[1] * light, baseLight * tint[2] * light)
    }

    if (needTiles) {
      attr.tiles[`${cursor.x},${cursor.y},${cursor.z}`] ??= {
        block: block.name,
        faces: [],
      }
      attr.tiles[`${cursor.x},${cursor.y},${cursor.z}`].faces.push({
        face,
        neighbor: `${neighborPos.x},${neighborPos.y},${neighborPos.z}`,
        light: baseLight
        // texture: eFace.texture.name,
      })
    }

    if (doAO && aos[0] + aos[3] >= aos[1] + aos[2]) {
      attr.indices.push(
        ndx, ndx + 3, ndx + 2,
        ndx, ndx + 1, ndx + 3
      )
    } else {
      attr.indices.push(
        ndx, ndx + 1, ndx + 2,
        ndx + 2, ndx + 1, ndx + 3
      )
    }
  }
}

const invisibleBlocks = ['air', 'cave_air', 'void_air', 'barrier']

export function getSectionGeometry (sx, sy, sz, world: World) {
  const unknownBlockModel = blockProvider.getResolvedModel0_1({ name: 'unknown', properties: {} })

  let delayedRender = [] as (() => void)[]

  const attr = {
    sx: sx + 8,
    sy: sy + 8,
    sz: sz + 8,
    positions: [],
    normals: [],
    colors: [],
    uvs: [],
    t_positions: [],
    t_normals: [],
    t_colors: [],
    t_uvs: [],
    indices: [],
    tiles: {},
    // todo this can be removed here
    signs: {}
  } as Record<string, any>

  const cursor = new Vec3(0, 0, 0)
  for (cursor.y = sy; cursor.y < sy + 16; cursor.y++) {
    for (cursor.z = sz; cursor.z < sz + 16; cursor.z++) {
      for (cursor.x = sx; cursor.x < sx + 16; cursor.x++) {
        const block = world.getBlock(cursor)!
        if (invisibleBlocks.includes(block.name)) continue
        if (block.name.includes('_sign') || block.name === 'sign') {
          const key = `${cursor.x},${cursor.y},${cursor.z}`
          const props: any = block.getProperties()
          const facingRotationMap = {
            "north": 2,
            "south": 0,
            "west": 1,
            "east": 3
          }
          const isWall = block.name.endsWith('wall_sign') || block.name.endsWith('wall_hanging_sign')
          const isHanging = block.name.endsWith('hanging_sign')
          attr.signs[key] = {
            isWall,
            isHanging,
            rotation: isWall ? facingRotationMap[props.facing] : +props.rotation
          }
        }
        const biome = block.biome.name

        let preflatRecomputeVariant = !!(block as any)._originalProperties
        if (world.preflat) {
          const patchProperties = preflatBlockCalculation(block, world, cursor)
          if (patchProperties) {
            //@ts-ignore
            block._originalProperties ??= block._properties
            //@ts-ignore
            block._properties = { ...block._originalProperties, ...patchProperties }
            preflatRecomputeVariant = true
          } else {
            //@ts-ignore
            block._properties = block._originalProperties ?? block._properties
            //@ts-ignore
            block._originalProperties = undefined
          }
        }

        const isWaterlogged = block.getProperties().waterlogged
        if (block.name === 'water' || isWaterlogged) {
          const pos = cursor.clone()
          delayedRender.push(() => {
            renderLiquid(world, pos, blockProvider.getTextureInfo('water_still'), block.type, biome, true, attr)
          })
        } else if (block.name === 'lava') {
          renderLiquid(world, cursor, blockProvider.getTextureInfo('lava_still'), block.type, biome, false, attr)
        }
        if (block.name !== "water" && block.name !== "lava" && !invisibleBlocks.includes(block.name)) {
          let globalMatrix = null as any
          let globalShift = null as any

          // cache
          let model = block['model'] as ReturnType<typeof blockProvider.getResolvedModel0_1> | null;
          if (block['model'] === undefined || preflatRecomputeVariant) {
            try {
              model = blockProvider.getResolvedModel0_1({
                name: block.name,
                properties: block.getProperties(),
              })
              if (!model.elements) model = null
            } catch (err) {
              console.error(`Critical assets error. Unable to get block model for ${block.name}[${JSON.stringify(block.getProperties())}]: ` + err.message, err.stack)
            }
          }
          block['model'] = model ?? null

          model ??= unknownBlockModel

          for (const axis of ['x', 'y', 'z'] as const) {
            if (axis in model) {
              if (!globalMatrix) globalMatrix = buildRotationMatrix(axis, -(model[axis] ?? 0))
              else globalMatrix = matmulmat3(globalMatrix, buildRotationMatrix(axis, -(model[axis] ?? 0)))
            }
          }

          if (globalMatrix) {
            globalShift = [8, 8, 8]
            globalShift = vecsub3(globalShift, matmul3(globalMatrix, globalShift))
          }

          for (const element of model.elements ?? []) {
            const ao = model.ao ?? true
            if (block.transparent) {
              const pos = cursor.clone()
              delayedRender.push(() => {
                renderElement(world, pos, element, ao, attr, globalMatrix, globalShift, block, biome)
              })
            } else {
              renderElement(world, cursor, element, ao, attr, globalMatrix, globalShift, block, biome)
            }
          }

        }
      }
    }
  }

  for (const render of delayedRender) {
    render()
  }
  delayedRender = []

  let ndx = attr.positions.length / 3
  for (let i = 0; i < attr.t_positions.length / 12; i++) {
    attr.indices.push(
      ndx, ndx + 1, ndx + 2,
      ndx + 2, ndx + 1, ndx + 3,
      // back face
      ndx, ndx + 2, ndx + 1,
      ndx + 2, ndx + 3, ndx + 1
    )
    ndx += 4
  }

  attr.positions.push(...attr.t_positions)
  attr.normals.push(...attr.t_normals)
  attr.colors.push(...attr.t_colors)
  attr.uvs.push(...attr.t_uvs)

  delete attr.t_positions
  delete attr.t_normals
  delete attr.t_colors
  delete attr.t_uvs

  attr.positions = new Float32Array(attr.positions) as any
  attr.normals = new Float32Array(attr.normals) as any
  attr.colors = new Float32Array(attr.colors) as any
  attr.uvs = new Float32Array(attr.uvs) as any

  return attr
}

export const setBlockStatesData = (blockstatesModels, blocksAtlas: any, _needTiles = false) => {
  blockProvider = worldBlockProvider(blockstatesModels, blocksAtlas, 'latest')
  globalThis.blockProvider = blockProvider
  needTiles = _needTiles
}
