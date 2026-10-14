//@ts-check
import { build } from 'esbuild'
import { existsSync } from 'node:fs'
import Module from "node:module"
import { dirname } from 'node:path'
import supportedVersions from '../src/supportedVersions.mjs'
import { gzipSizeFromFileSync } from 'gzip-size'
import fs from 'fs'
import { default as _JsonOptimizer } from '../src/optimizeJson'
import { gzipSync } from 'zlib'
import MinecraftData from 'minecraft-data'
import MCProtocol from 'minecraft-protocol'

/** @type {typeof _JsonOptimizer} */
//@ts-ignore
const JsonOptimizer = _JsonOptimizer.default

// console.log(a.diff_main(JSON.stringify({ a: 1 }), JSON.stringify({ a: 1, b: 2 })))

const require = Module.createRequire(import.meta.url)

const dataPaths = require('minecraft-data/minecraft-data/data/dataPaths.json')

function toMajor(version) {
  const [a, b] = (version + '').split('.')
  return `${a}.${b}`
}

let versions = {}
const dataTypes = new Set()

for (const [version, dataSet] of Object.entries(dataPaths.pc)) {
  if (!supportedVersions.includes(version)) continue
  for (const type of Object.keys(dataSet)) {
    dataTypes.add(type)
  }
  versions[version] = dataSet
}

const versionToNumber = (ver) => {
  const [x, y = '0', z = '0'] = ver.split('.')
  return +`${x.padStart(2, '0')}${y.padStart(2, '0')}${z.padStart(2, '0')}`
}

// Version clipping support
const minVersion = process.env.MIN_MC_VERSION
const maxVersion = process.env.MAX_MC_VERSION

// Filter versions based on MIN_VERSION and MAX_VERSION if provided
if (minVersion || maxVersion) {
  const filteredVersions = {}
  const minVersionNum = minVersion ? versionToNumber(minVersion) : 0
  const maxVersionNum = maxVersion ? versionToNumber(maxVersion) : Infinity

  for (const [version, dataSet] of Object.entries(versions)) {
    const versionNum = versionToNumber(version)
    if (versionNum >= minVersionNum && versionNum <= maxVersionNum) {
      filteredVersions[version] = dataSet
    }
  }

  versions = filteredVersions

  console.log(`Version clipping applied: ${minVersion || 'none'} to ${maxVersion || 'none'}`)
  console.log(`Processing ${Object.keys(versions).length} versions:`, Object.keys(versions).sort((a, b) => versionToNumber(a) - versionToNumber(b)))
}

console.log('Bundling version range:', Object.keys(versions)[0], 'to', Object.keys(versions).at(-1))

// if not included here (even as {}) will not be bundled & accessible!
// const compressedOutput = !!process.env.SINGLE_FILE_BUILD
const compressedOutput = true
const dataTypeBundling2 = {
  blocks: {
    arrKey: 'name',
  },
  items: {
    arrKey: 'name',
  },
  recipes: {
    processData: processRecipes
  }
}
const dataTypeBundling = {
  language: process.env.SKIP_MC_DATA_LANGUAGE === 'true' ? {
    raw: {}
  } : {
    ignoreRemoved: true,
    ignoreChanges: true
  },
  blocks: {
    arrKey: 'name',
    processData(current, prev, _, version) {
      for (const block of current) {
        const prevBlock = prev?.find(x => x.name === block.name)
        if (block.transparent) {
          const forceOpaque = block.name.includes('shulker_box') || block.name.match(/^double_.+_slab\d?$/) || ['melon_block', 'lit_pumpkin', 'lit_redstone_ore', 'lit_furnace'].includes(block.name)

          if (forceOpaque || (prevBlock && !prevBlock.transparent)) {
            block.transparent = false
          }
        }
        if (block.hardness === 0 && prevBlock && prevBlock.hardness > 0) {
          block.hardness = prevBlock.hardness
        }
      }
    }
    // ignoreRemoved: true,
    // genChanges (source, diff) {
    //   const diffs = {}
    //   const newItems = {}
    //   for (const [key, val] of Object.entries(diff)) {
    //     const src = source[key]
    //     if (!src) {
    //       newItems[key] = val
    //       continue
    //     }
    //     const { minStateId, defaultState, maxStateId } = val
    //     if (defaultState === undefined || minStateId === src.minStateId || maxStateId === src.maxStateId || defaultState === src.defaultState) continue
    //     diffs[key] = [minStateId, defaultState, maxStateId]
    //   }
    //   return {
    //     stateChanges: diffs
    //   }
    // },
    // ignoreChanges: true
  },
  items: {
    arrKey: 'name'
  },
  attributes: {
    arrKey: 'name'
  },
  particles: {
    arrKey: 'name'
  },
  effects: {
    arrKey: 'name'
  },
  enchantments: {
    arrKey: 'name'
  },
  instruments: {
    arrKey: 'name'
  },
  foods: {
    arrKey: 'name'
  },
  entities: {
    arrKey: 'id+type'
  },
  materials: {},
  windows: {
    arrKey: 'name'
  },
  version: {
    raw: true
  },
  tints: {},
  biomes: {
    arrKey: 'name'
  },
  entityLoot: {
    arrKey: 'entity'
  },
  blockLoot: {
    arrKey: 'block'
  },
  recipes: process.env.SKIP_MC_DATA_RECIPES === 'true' ? {
    raw: {}
  } : {
    raw: true
    // processData: processRecipes
  },
  blockCollisionShapes: {},
  loginPacket: {},
  protocol: {
    raw: true
  },
  // sounds: {
  //   arrKey: 'name'
  // }
}

function processRecipes(current, prev, getData, version) {
  // can require the same multiple times per different versions
  if (current._proccessed) return
  const items = getData('items')
  const blocks = getData('blocks')
  const itemsIdsMap = Object.fromEntries(items.map((b) => [b.id, b.name]))
  const blocksIdsMap = Object.fromEntries(blocks.map((b) => [b.id, b.name]))
  for (const key of Object.keys(current)) {
    const mapId = (id) => {
      if (typeof id !== 'string' && typeof id !== 'number') throw new Error('Incorrect type')
      const mapped = itemsIdsMap[id] ?? blocksIdsMap[id]
      if (!mapped) {
        throw new Error(`No item/block name with id ${id}`)
      }
      return mapped
    }
    const processRecipe = (obj) => {
      // if (!obj) return
      // if (Array.isArray(obj)) {
      //   obj.forEach((id, i) => {
      //     obj[i] = mapId(obj[id])
      //   })
      // } else if (obj && typeof obj === 'object') {
      //   if (!'count metadata id'.split(' ').every(x => x in obj)) {
      //     throw new Error(`process error: Unknown deep object pattern: ${JSON.stringify(obj)}`)
      //   }
      //   obj.id = mapId(obj.id)
      // } else {
      //   throw new Error('unknown type')
      // }
      const parseRecipeItem = (item) => {
        if (typeof item === 'number') return mapId(item)
        if (Array.isArray(item)) return [mapId(item), ...item.slice(1)]
        if (!item) {
          return item
        }
        if ('id' in item) {
          item.id = mapId(item.id)
          return item
        }
        throw new Error('unhandled')
      }
      const maybeProccessShape = (shape) => {
        if (!shape) return
        for (const shapeRow of shape) {
          for (const [i, item] of shapeRow.entries()) {
            shapeRow[i] = parseRecipeItem(item)
          }
        }
      }
      if (obj.result) obj.result = parseRecipeItem(obj.result)
      maybeProccessShape(obj.inShape)
      maybeProccessShape(obj.outShape)
      if (obj.ingredients) {
        for (const [i, ingredient] of obj.ingredients.entries()) {
          obj.ingredients[i] = parseRecipeItem(ingredient)
        }
      }
    }
    try {
      const name = mapId(key)
      for (const [i, recipe] of current[key].entries()) {
        try {
          processRecipe(recipe)
        } catch (err) {
          console.warn(`${version} [warn] Removing incorrect recipe: ${err}`)
          delete current[i]
        }
      }
      current[name] = current[key]
    } catch (err) {
      console.warn(`${version} [warn] Removing incorrect recipe: ${err}`)
    }
    delete current[key]
  }
  current._proccessed = true
}

const notBundling = [...dataTypes.keys()].filter(x => !Object.keys(dataTypeBundling).includes(x))
console.log("Not bundling minecraft-data data:", notBundling)

let previousData = {}
// /** @type {Record<string, JsonOptimizer>} */
const diffSources = {}
const versionsArr = Object.entries(versions)
const sizePerDataType = {}
const rawDataVersions = {}
// const versionsArr = Object.entries(versions).slice(-1)
for (const [i, [version, dataSet]] of versionsArr.reverse().entries()) {
  for (const [dataType, dataPath] of Object.entries(dataSet)) {
    const config = dataTypeBundling[dataType]
    if (!config) continue
    const ignoreCollisionShapes = dataType === 'blockCollisionShapes' && versionToNumber(version) >= versionToNumber('1.13')

    let injectCode = ''
    const getRealData = (type) => {
      const loc = `minecraft-data/data/${dataSet[type]}/`
      const dataPathAbsolute = require.resolve(`minecraft-data/${loc}${type}`)
      // const data = fs.readFileSync(dataPathAbsolute, 'utf8')
      const dataRaw = require(dataPathAbsolute)
      return dataRaw
    }
    const dataRaw = getRealData(dataType)
    let rawData = dataRaw
    if (config.raw) {
      rawDataVersions[dataType] ??= {}
      rawDataVersions[dataType][version] = rawData
      if (config.raw === true) {
        rawData = dataRaw
      } else {
        rawData = config.raw
      }

      if (ignoreCollisionShapes && dataType === 'blockCollisionShapes') {
        rawData = {
          blocks: {},
          shapes: {}
        }
      }
    } else {
      if (!diffSources[dataType]) {
        diffSources[dataType] = new JsonOptimizer(config.arrKey, config.ignoreChanges, config.ignoreRemoved)
      }
      try {
        config.processData?.(dataRaw, previousData[dataType], getRealData, version)
        diffSources[dataType].recordDiff(version, dataRaw)
        injectCode = `restoreDiff(sources, ${JSON.stringify(dataType)}, ${JSON.stringify(version)})`
      } catch (err) {
        const error = new Error(`Failed to diff ${dataType} for ${version}: ${err.message}`)
        error.stack = err.stack
        throw error
      }
    }
    sizePerDataType[dataType] ??= 0
    sizePerDataType[dataType] += Buffer.byteLength(JSON.stringify(injectCode || rawData), 'utf8')
    if (config.genChanges && previousData[dataType]) {
      const changes = config.genChanges(previousData[dataType], dataRaw)
      // Object.assign(data, changes)
    }
    previousData[dataType] = dataRaw
  }
}
const sources = Object.fromEntries(Object.entries(diffSources).map(x => {
  const data = x[1].export()
  // const data = {}
  sizePerDataType[x[0]] += Buffer.byteLength(JSON.stringify(data), 'utf8')
  return [x[0], data]
}))
Object.assign(sources, rawDataVersions)
sources.versionKey = require('minecraft-data/package.json').version

const totalSize = Object.values(sizePerDataType).reduce((acc, val) => acc + val, 0)
console.log('total size (mb)', totalSize / 1024 / 1024)
console.log(
  'size per data type (mb, %)',
  Object.fromEntries(Object.entries(sizePerDataType).map(([dataType, size]) => {
    return [dataType, [size / 1024 / 1024, Math.round(size / totalSize * 100)]]
  }).sort((a, b) => {
    //@ts-ignore
    return b[1][1] - a[1][1]
  }))
)

function compressToBase64(input) {
  const buffer = gzipSync(input)
  return buffer.toString('base64')
}

const filePath = './generated/minecraft-data-optimized.json'
fs.writeFileSync(filePath, JSON.stringify(sources), 'utf8')
if (compressedOutput) {
  const minizedCompressed = compressToBase64(fs.readFileSync(filePath))
  console.log('size of compressed', Buffer.byteLength(minizedCompressed, 'utf8') / 1000 / 1000)
  const compressedFilePath = './generated/mc-data-compressed.js'
  fs.writeFileSync(compressedFilePath, `export default ${JSON.stringify(minizedCompressed)}`, 'utf8')

  const mcAssets = JSON.stringify(require('mc-assets/dist/blockStatesModels.json'))
  fs.writeFileSync('./generated/mc-assets-compressed.js', `export default ${JSON.stringify(compressToBase64(mcAssets))}`, 'utf8')

  // const modelsObj = fs.readFileSync('./prismarine-renderer/viewer/lib/entity/exportedModels.js')
  // const models =
}

console.log('size', fs.lstatSync(filePath).size / 1000 / 1000, gzipSizeFromFileSync(filePath) / 1000 / 1000)

// always bundled

const { defaultVersion } = MCProtocol
const data = MinecraftData(defaultVersion)
console.log('defaultVersion', defaultVersion, !!data)
const initialMcData = {
  [defaultVersion]: {
    version: data.version,
    protocol: data.protocol,
  }
}

// fs.writeFileSync('./generated/minecraft-initial-data.json', JSON.stringify(initialMcData), 'utf8')
