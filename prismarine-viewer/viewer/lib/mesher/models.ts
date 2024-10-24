import { Vec3 } from 'vec3'
import worldBlockProvider, { WorldBlockProvider } from 'mc-assets/dist/worldBlockProvider'
import legacyJson from '../../../../src/preflatMap.json'
import { BlockType } from '../../../examples/shared'
import { World, BlockModelPartsResolved, WorldBlock as Block } from './world'
import { BlockElement, buildRotationMatrix, elemFaces, matmul3, matmulmat3, vecadd3, vecsub3 } from './modelsGeometryCommon'
import { INVISIBLE_BLOCKS } from './worldConstants'
import { MesherGeometryOutput, HighestBlockInfo } from './shared'


let blockProvider: WorldBlockProvider

const tints: any = {}
let needTiles = false

let tintsData
try {
  tintsData = require('esbuild-data').tints
} catch (err) {
  tintsData = require('minecraft-data/minecraft-data/data/pc/1.16.2/tints.json')
}
for (const key of Object.keys(tintsData)) {
  tints[key] = prepareTints(tintsData[key])
}

type Tiles = {
  [blockPos: string]: BlockType
}

function prepareTints(tints) {
  const map = new Map()
  const defaultValue = tintToGl(tints.default)
  for (let { keys, color } of tints.data) {
    color = tintToGl(color)
    for (const key of keys) {
      map.set(`${key}`, color)
    }
  }
  return new Proxy(map, {
    get(target, key) {
      return target.has(key) ? target.get(key) : defaultValue
    }
  })
}

function mod(x: number, n: number) {
  return ((x % n) + n) % n
}

const calculatedBlocksEntries = Object.entries(legacyJson.clientCalculatedBlocks)
export function preflatBlockCalculation(block: Block, world: World, position: Vec3) {
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
      let changed = false
      for (const [i, neighbor] of neighbors.entries()) {
        const isConnectedToSolid = isSolidConnection ? (neighbor && !neighbor.transparent) : false
        if (isConnectedToSolid || neighbor?.name === block.name) {
          props[['south', 'north', 'east', 'west'][i]] = 'true'
          changed = true
        }
      }
      return changed ? props : undefined
    }
    // case 'gate_in_wall': {}
    case 'block_snowy': {
      const aboveIsSnow = world.getBlock(position.offset(0, 1, 0))?.name === 'snow'
      if (aboveIsSnow) {
        return {
          snowy: `${aboveIsSnow}`
        }
      } else {
        return
      }
    }
    case 'door': {
      // upper half matches lower in
      const { half } = block.getProperties()
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

function tintToGl(tint) {
  const r = (tint >> 16) & 0xff
  const g = (tint >> 8) & 0xff
  const b = tint & 0xff
  return [r / 255, g / 255, b / 255]
}

function getLiquidRenderHeight(world, block, type, pos) {
  if (!block || block.type !== type) return 1 / 9
  if (block.metadata === 0) { // source block
    const blockAbove = world.getBlock(pos.offset(0, 1, 0))
    if (blockAbove && blockAbove.type === type) return 1
    return 8 / 9
  }
  return ((block.metadata >= 8 ? 8 : 7 - block.metadata) + 1) / 9
}


const isCube = (block: Block) => {
  if (!block || block.transparent) return false
  if (block.isCube) return true
  if (!block.models?.length || block.models.length !== 1) return false
  // all variants
  return block.models[0].every(v => v.elements!.every(e => {
    return e.from[0] === 0 && e.from[1] === 0 && e.from[2] === 0 && e.to[0] === 16 && e.to[1] === 16 && e.to[2] === 16
  }))
}

function renderLiquid(world: World, cursor: Vec3, texture: any | undefined, type: number, biome: string, water: boolean, attr: Record<string, any>) {
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

  // eslint-disable-next-line guard-for-in
  for (const face in elemFaces) {
    const { dir, corners } = elemFaces[face]
    const isUp = dir[1] === 1

    const neighborPos = cursor.offset(...dir as [number, number, number])
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
      const tiles = attr.tiles as Tiles
      tiles[`${cursor.x},${cursor.y},${cursor.z}`] ??= {
        block: 'water',
        faces: [],
      }
      tiles[`${cursor.x},${cursor.y},${cursor.z}`].faces.push({
        face,
        neighbor: `${neighborPos.x},${neighborPos.y},${neighborPos.z}`,
        side: 0, // todo
        textureIndex: 0,
        // texture: eFace.texture.name,
      })
    }

    const { u } = texture
    const { v } = texture
    const { su } = texture
    const { sv } = texture

    for (const pos of corners) {
      const height = cornerHeights[pos[2] * 2 + pos[0]]
      attr.t_positions.push(
        (pos[0] ? 0.999 : 0.001) + (cursor.x & 15) - 8,
        (pos[1] ? height - 0.001 : 0.001) + (cursor.y & 15) - 8,
        (pos[2] ? 0.999 : 0.001) + (cursor.z & 15) - 8
      )
      attr.t_normals.push(...dir)
      attr.t_uvs.push(pos[3] * su + u, pos[4] * sv * (pos[1] ? 1 : height) + v)
      attr.t_colors.push(tint[0], tint[1], tint[2])
    }
  }
}

let needRecompute = false

function renderElement(world: World, cursor: Vec3, element: BlockElement, doAO: boolean, attr: MesherGeometryOutput, globalMatrix: any, globalShift: any, block: Block, biome: string) {
  const position = cursor
  // const key = `${position.x},${position.y},${position.z}`
  // if (!globalThis.allowedBlocks.includes(key)) return
  const cullIfIdentical = block.name.includes('glass')

  // eslint-disable-next-line guard-for-in
  for (const face in element.faces) {
    const eFace = element.faces[face]
    const { corners, mask1, mask2, side } = elemFaces[face]
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
    const { u } = texture
    const { v } = texture
    const { su } = texture
    const { sv } = texture

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
    let r = eFace.rotation || 0
    if (face === 'down') {
      r += 180
    }
    const uvcs = Math.cos(r * Math.PI / 180)
    const uvsn = -Math.sin(r * Math.PI / 180)

    let localMatrix = null as any
    let localShift = null as any

    if (element.rotation && !needTiles) {
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
    // 10%
    const baseLight = world.getLight(neighborPos, undefined, undefined, block.name) / 15
    for (const pos of corners) {
      let vertex = [
        (pos[0] ? maxx : minx),
        (pos[1] ? maxy : miny),
        (pos[2] ? maxz : minz)
      ]

      if (!needTiles) { // 10%
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
      }

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
        // eslint-disable-next-line no-constant-condition, sonarjs/no-gratuitous-expressions
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

      if (!needTiles) {
        attr.colors.push(baseLight * tint[0] * light, baseLight * tint[1] * light, baseLight * tint[2] * light)
      }
    }

    const lightWithColor = [baseLight * tint[0], baseLight * tint[1], baseLight * tint[2]] as [number, number, number]

    if (needTiles) {
      const tiles = attr.tiles as Tiles
      tiles[`${cursor.x},${cursor.y},${cursor.z}`] ??= {
        block: block.name,
        faces: [],
      }
      const needsOnlyOneFace = false
      const isTilesEmpty = tiles[`${cursor.x},${cursor.y},${cursor.z}`].faces.length < 1
      if (isTilesEmpty || !needsOnlyOneFace) {
        tiles[`${cursor.x},${cursor.y},${cursor.z}`].faces.push({
          face,
          side,
          textureIndex: eFace.texture.tileIndex,
          neighbor: `${neighborPos.x},${neighborPos.y},${neighborPos.z}`,
          light: baseLight,
          tint: lightWithColor,
          //@ts-expect-error debug prop
          texture: eFace.texture.debugName || block.name,
        } satisfies BlockType['faces'][number])
      }
    }

    if (!needTiles) {
      if (doAO && aos[0] + aos[3] >= aos[1] + aos[2]) {
        attr.indices.push(
          ndx, ndx + 3, ndx + 2, ndx, ndx + 1, ndx + 3
        )
      } else {
        attr.indices.push(
          ndx, ndx + 1, ndx + 2, ndx + 2, ndx + 1, ndx + 3
        )
      }
    }
  }
}

const isBlockWaterlogged = (block: Block) => block.getProperties().waterlogged === true || block.getProperties().waterlogged === 'true'

let unknownBlockModel: BlockModelPartsResolved
let erroredBlockModel: BlockModelPartsResolved
export function getSectionGeometry(sx, sy, sz, world: World) {
  let delayedRender = [] as Array<() => void>

  const attr: MesherGeometryOutput = {
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
    signs: {},
    // isFull: true,
    highestBlocks: new Map<string, HighestBlockInfo>([]), 
    hadErrors: false,
    blocksCount: 0
  }

  const cursor = new Vec3(0, 0, 0)
  for (cursor.y = sy; cursor.y < sy + 16; cursor.y++) {
    for (cursor.z = sz; cursor.z < sz + 16; cursor.z++) {
      for (cursor.x = sx; cursor.x < sx + 16; cursor.x++) {
        const block = world.getBlock(cursor)!
        if (!INVISIBLE_BLOCKS.has(block.name)) {
          const highest = attr.highestBlocks.get(`${cursor.x},${cursor.z}`)
          if (!highest || highest.y < cursor.y) {
            attr.highestBlocks.set(`${cursor.x},${cursor.z}`, { y: cursor.y, stateId: block.stateId, biomeId: block.biome.id })
          }
        }
        if (INVISIBLE_BLOCKS.has(block.name)) continue
        if (block.name.includes('_sign') || block.name === 'sign') {
          const key = `${cursor.x},${cursor.y},${cursor.z}`
          const props: any = block.getProperties()
          const facingRotationMap = {
            'north': 2,
            'south': 0,
            'west': 1,
            'east': 3
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

        if (world.preflat) { // 10% perf
          const patchProperties = preflatBlockCalculation(block, world, cursor)
          if (patchProperties) {
            block._originalProperties ??= block._properties
            block._properties = { ...block._originalProperties, ...patchProperties }
            if (block.models && JSON.stringify(block._originalProperties) !== JSON.stringify(block._properties)) {
              // recompute models
              block.models = undefined
            }
          } else {
            block._properties = block._originalProperties ?? block._properties
            block._originalProperties = undefined
          }
        }

        const isWaterlogged = isBlockWaterlogged(block)
        if (block.name === 'water' || isWaterlogged) {
          const pos = cursor.clone()
          // eslint-disable-next-line @typescript-eslint/no-loop-func
          delayedRender.push(() => {
            renderLiquid(world, pos, blockProvider.getTextureInfo('water_still'), block.type, biome, true, attr)
          })
          attr.blocksCount++
        } else if (block.name === 'lava') {
          renderLiquid(world, cursor, blockProvider.getTextureInfo('lava_still'), block.type, biome, false, attr)
          attr.blocksCount++
        }
        if (block.name !== 'water' && block.name !== 'lava' && !INVISIBLE_BLOCKS.has(block.name)) {
          // cache
          let { models } = block
          if (block.models === undefined) {
            const props = block.getProperties()
            try {
              // fixme
              if (world.preflat) {
                if (block.name === 'cobblestone_wall') {
                  props.up = 'true'
                  for (const key of ['north', 'south', 'east', 'west']) {
                    const val = props[key]
                    if (val === 'false' || val === 'true') {
                      props[key] = val === 'true' ? 'low' : 'none'
                    }
                  }
                }
              }

              models = blockProvider.getAllResolvedModels0_1({
                name: block.name,
                properties: props,
              }, world.preflat)! // fixme! this is a hack (also need a setting for all versions)
              if (!models.length) {
                console.debug('[mesher] block to render not found', block.name, props)
                models = null
              }
            } catch (err) {
              models ??= erroredBlockModel
              console.error(`Critical assets error. Unable to get block model for ${block.name}[${JSON.stringify(props)}]: ` + err.message, err.stack)
              attr.hadErrors = true
            }
          }
          block.models = models ?? null

          models ??= unknownBlockModel

          const firstForceVar = world.config.debugModelVariant?.[0]
          let part = 0
          for (const modelVars of models ?? []) {
            const pos = cursor.clone()
            // const variantRuntime = mod(Math.floor(pos.x / 16) + Math.floor(pos.y / 16) + Math.floor(pos.z / 16), modelVars.length)
            const variantRuntime = 0
            const useVariant = world.config.debugModelVariant?.[part] ?? firstForceVar ?? variantRuntime
            part++
            const model = modelVars[useVariant] ?? modelVars[0]
            if (!model) continue

            // #region 10%
            let globalMatrix = null as any
            let globalShift = null as any
            for (const axis of ['x', 'y', 'z'] as const) {
              if (axis in model) {
                globalMatrix = globalMatrix ?
                  matmulmat3(globalMatrix, buildRotationMatrix(axis, -(model[axis] ?? 0))) :
                  buildRotationMatrix(axis, -(model[axis] ?? 0))
              }
            }
            if (globalMatrix) {
              globalShift = [8, 8, 8]
              globalShift = vecsub3(globalShift, matmul3(globalMatrix, globalShift))
            }
            // #endregion

            for (const element of model.elements ?? []) {
              const ao = model.ao ?? true
              if (block.transparent) {
                const pos = cursor.clone()
                delayedRender.push(() => {
                  renderElement(world, pos, element, ao, attr, globalMatrix, globalShift, block, biome)
                })
              } else {
                // 60%
                renderElement(world, cursor, element, ao, attr, globalMatrix, globalShift, block, biome)
              }
            }
          }
          if (part > 0) attr.blocksCount++
        }
      }
    }
  }

  for (const render of delayedRender) {
    render()
  }
  delayedRender = []

  let ndx = attr.positions.length / 3
  for (let i = 0; i < attr.t_positions!.length / 12; i++) {
    attr.indices.push(
      ndx, ndx + 1, ndx + 2, ndx + 2, ndx + 1, ndx + 3,
      // eslint-disable-next-line @stylistic/function-call-argument-newline
      // back face
      ndx, ndx + 2, ndx + 1, ndx + 2, ndx + 3, ndx + 1
    )
    ndx += 4
  }

  attr.positions.push(...attr.t_positions!)
  attr.normals.push(...attr.t_normals!)
  attr.colors.push(...attr.t_colors!)
  attr.uvs.push(...attr.t_uvs!)

  delete attr.t_positions
  delete attr.t_normals
  delete attr.t_colors
  delete attr.t_uvs

  attr.positions = new Float32Array(attr.positions) as any
  attr.normals = new Float32Array(attr.normals) as any
  attr.colors = new Float32Array(attr.colors) as any
  attr.uvs = new Float32Array(attr.uvs) as any

  if (needTiles) {
    delete attr.positions
    delete attr.normals
    delete attr.colors
    delete attr.uvs
  }

  return attr
}

export const setBlockStatesData = (blockstatesModels, blocksAtlas: any, _needTiles = false, useUnknownBlockModel = true) => {
  blockProvider = worldBlockProvider(blockstatesModels, blocksAtlas, 'latest')
  globalThis.blockProvider = blockProvider
  if (useUnknownBlockModel) {
    unknownBlockModel = blockProvider.getAllResolvedModels0_1({ name: 'unknown', properties: {} })
    erroredBlockModel = blockProvider.getAllResolvedModels0_1({ name: 'errored', properties: {} })
  }

  needTiles = _needTiles
}
