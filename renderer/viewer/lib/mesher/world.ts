import Chunks from 'prismarine-chunk'
import mcData from 'minecraft-data'
import { Block } from 'prismarine-block'
import { Vec3 } from 'vec3'
import { WorldBlockProvider } from 'mc-assets/dist/worldBlockProvider'
import moreBlockDataGeneratedJson from '../moreBlockDataGenerated.json'
import legacyJson from '../../../../src/preflatMap.json'
import { defaultMesherConfig, CustomBlockModels, BlockStateModelInfo, getBlockAssetsCacheKey } from './shared'
import { INVISIBLE_BLOCKS } from './worldConstants'

const ignoreAoBlocks = Object.keys(moreBlockDataGeneratedJson.noOcclusions)

function columnKey (x, z) {
  return `${x},${z}`
}

function isCube (shapes) {
  if (!shapes || shapes.length !== 1) return false
  const shape = shapes[0]
  return shape[0] === 0 && shape[1] === 0 && shape[2] === 0 && shape[3] === 1 && shape[4] === 1 && shape[5] === 1
}

export type BlockModelPartsResolved = ReturnType<WorldBlockProvider['getAllResolvedModels0_1']>

export type WorldBlock = Omit<Block, 'position'> & {
  // todo
  isCube: boolean
  /** cache */
  models?: BlockModelPartsResolved | null
  _originalProperties?: Record<string, any>
  _properties?: Record<string, any>
}

export class World {
  config = defaultMesherConfig
  Chunk: typeof import('prismarine-chunk/types/index').PCChunk
  columns = {} as { [key: string]: import('prismarine-chunk/types/index').PCChunk }
  blockCache = {}
  biomeCache: { [id: number]: mcData.Biome }
  preflat: boolean
  erroredBlockModel?: BlockModelPartsResolved
  customBlockModels = new Map<string, CustomBlockModels>() // chunkKey -> blockModels
  sentBlockStateModels = new Set<string>()
  blockStateModelInfo = new Map<string, BlockStateModelInfo>()

  constructor (version) {
    this.Chunk = Chunks(version) as any
    this.biomeCache = mcData(version).biomes
    this.preflat = !mcData(version).supportFeature('blockStateId')
    this.config.version = version
  }

  getLight (pos: Vec3, isNeighbor = false, skipMoreChecks = false, curBlockName = '') {
    // for easier testing
    if (!(pos instanceof Vec3)) pos = new Vec3(...pos as [number, number, number])
    const { enableLighting, skyLight } = this.config
    if (!enableLighting) return 15
    // const key = `${pos.x},${pos.y},${pos.z}`
    // if (lightsCache.has(key)) return lightsCache.get(key)
    const column = this.getColumnByPos(pos)
    if (!column || !hasChunkSection(column, pos)) return 15
    let result = Math.min(
      15,
      Math.max(
        column.getBlockLight(posInChunk(pos)),
        Math.min(skyLight, column.getSkyLight(posInChunk(pos)))
      ) + 2
    )
    // lightsCache.set(key, result)
    if (result === 2 && [this.getBlock(pos)?.name ?? '', curBlockName].some(x => /_stairs|slab|glass_pane/.exec(x)) && !skipMoreChecks) { // todo this is obviously wrong
      const lights = [
        this.getLight(pos.offset(0, 1, 0), undefined, true),
        this.getLight(pos.offset(0, -1, 0), undefined, true),
        this.getLight(pos.offset(0, 0, 1), undefined, true),
        this.getLight(pos.offset(0, 0, -1), undefined, true),
        this.getLight(pos.offset(1, 0, 0), undefined, true),
        this.getLight(pos.offset(-1, 0, 0), undefined, true)
      ].filter(x => x !== 2)
      if (lights.length) {
        const min = Math.min(...lights)
        result = min
      }
    }
    if (isNeighbor && result === 2) result = 15 // TODO
    return result
  }

  addColumn (x, z, json) {
    const chunk = this.Chunk.fromJson(json)
    this.columns[columnKey(x, z)] = chunk as any
    return chunk
  }

  removeColumn (x, z) {
    delete this.columns[columnKey(x, z)]
  }

  getColumn (x, z) {
    return this.columns[columnKey(x, z)]
  }

  setBlockStateId (pos: Vec3, stateId) {
    if (stateId === undefined) throw new Error('stateId is undefined')
    const key = columnKey(Math.floor(pos.x / 16) * 16, Math.floor(pos.z / 16) * 16)

    const column = this.columns[key]
    // null column means chunk not loaded
    if (!column) return false

    column.setBlockStateId(posInChunk(pos.floored()), stateId)

    return true
  }

  getColumnByPos (pos: Vec3) {
    return this.getColumn(Math.floor(pos.x / 16) * 16, Math.floor(pos.z / 16) * 16)
  }

  getBlock (pos: Vec3, blockProvider?: WorldBlockProvider, attr?: { hadErrors?: boolean }): WorldBlock | null {
    // for easier testing
    if (!(pos instanceof Vec3)) pos = new Vec3(...pos as [number, number, number])
    const key = columnKey(Math.floor(pos.x / 16) * 16, Math.floor(pos.z / 16) * 16)
    const blockPosKey = `${pos.x},${pos.y},${pos.z}`
    const modelOverride = this.customBlockModels.get(key)?.[blockPosKey]

    const column = this.columns[key]
    // null column means chunk not loaded
    if (!column) return null

    const loc = pos.floored()
    const locInChunk = posInChunk(loc)
    const stateId = column.getBlockStateId(locInChunk)

    const cacheKey = getBlockAssetsCacheKey(stateId, modelOverride)

    if (!this.blockCache[cacheKey]) {
      const b = column.getBlock(locInChunk) as unknown as WorldBlock
      if (modelOverride) {
        b.name = modelOverride
      }
      b.isCube = isCube(b.shapes)
      this.blockCache[cacheKey] = b
      Object.defineProperty(b, 'position', {
        get () {
          throw new Error('position is not reliable, use pos parameter instead of block.position')
        }
      })
      if (this.preflat) {
        b._properties = {}

        const namePropsStr = legacyJson.blocks[b.type + ':' + b.metadata] || findClosestLegacyBlockFallback(b.type, b.metadata, pos)
        if (namePropsStr) {
          b.name = namePropsStr.split('[')[0]
          const propsStr = namePropsStr.split('[')?.[1]?.split(']')
          if (propsStr) {
            const newProperties = Object.fromEntries(propsStr.join('').split(',').map(x => {
              let [key, val] = x.split('=')
              if (!isNaN(val)) val = parseInt(val, 10)
              return [key, val]
            }))
            b._properties = newProperties
          }
        }
      }
    }

    const block: WorldBlock = this.blockCache[cacheKey]

    if (block.models === undefined && blockProvider) {
      if (!attr) throw new Error('attr is required')
      const props = block.getProperties()

      try {
        // fixme
        if (this.preflat) {
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

        const useFallbackModel = !!(this.preflat || modelOverride)
        const issues = [] as string[]
        const resolvedModelNames = [] as string[]
        const resolvedConditions = [] as string[]
        block.models = blockProvider.getAllResolvedModels0_1(
          {
            name: block.name,
            properties: props,
          },
          useFallbackModel,
          issues,
          resolvedModelNames,
          resolvedConditions
        )!

        // Track block state model info
        if (!this.sentBlockStateModels.has(cacheKey)) {
          this.blockStateModelInfo.set(cacheKey, {
            cacheKey,
            issues,
            modelNames: resolvedModelNames,
            conditions: resolvedConditions
          })
        }

        if (!block.models.length) {
          if (block.name !== 'water' && block.name !== 'lava' && !INVISIBLE_BLOCKS.has(block.name)) {
            console.debug('[mesher] block to render not found', block.name, props)
          }
          block.models = null
        }

        if (block.models && modelOverride) {
          const model = block.models[0]
          block.transparent = model[0]?.['transparent'] ?? block.transparent
        }
      } catch (err) {
        this.erroredBlockModel ??= blockProvider.getAllResolvedModels0_1({ name: 'errored', properties: {} })
        block.models ??= this.erroredBlockModel
        console.error(`Critical assets error. Unable to get block model for ${block.name}[${JSON.stringify(props)}]: ` + err.message, err.stack)
        attr.hadErrors = true
      }
    }

    if (block.name === 'flowing_water') block.name = 'water'
    if (block.name === 'flowing_lava') block.name = 'lava'
    if (block.name === 'bubble_column') block.name = 'water' // TODO need to distinguish between water and bubble column
    // block.position = loc // it overrides position of all currently loaded blocks
    //@ts-expect-error
    block.biome = this.biomeCache[column.getBiome(locInChunk)] ?? this.biomeCache[1] ?? this.biomeCache[0]
    if (block.name === 'redstone_ore') block.transparent = false
    return block
  }

  shouldMakeAo (block: WorldBlock | null) {
    return block?.isCube && !ignoreAoBlocks.includes(block.name) && block.boundingBox !== 'empty'
  }
}

const findClosestLegacyBlockFallback = (id, metadata, pos) => {
  console.warn(`[mesher] Unknown block with ${id}:${metadata} at ${pos}, falling back`) // todo has known issues
  for (const [key, value] of Object.entries(legacyJson.blocks)) {
    const [idKey, meta] = key.split(':')
    if (idKey === id) return value
  }
  return null
}

// todo export in chunk instead
const hasChunkSection = (column, pos) => {
  if (column._getSection) return column._getSection(pos)
  if (column.skyLightSections) {
    return column.skyLightSections[getLightSectionIndex(pos, column.minY)] || column.blockLightSections[getLightSectionIndex(pos, column.minY)]
  }
  if (column.sections) return column.sections[pos.y >> 4]
}

function posInChunk (pos) {
  return new Vec3(Math.floor(pos.x) & 15, Math.floor(pos.y), Math.floor(pos.z) & 15)
}

function getLightSectionIndex (pos, minY = 0) {
  return Math.floor((pos.y - minY) / 16) + 1
}
