import fs from 'fs'
import McAssets from 'minecraft-assets'
import { join } from 'path'
import { filesize } from 'filesize'
import minecraftDataLoader from 'minecraft-data'
import BlockLoader from 'prismarine-block'
import { JsonAtlas, makeTextureAtlas, writeCanvasStream } from './atlas'
import looksSame from 'looks-same' // ensure after canvas import
import { Version as _Version } from 'minecraft-data'
import { versionToNumber } from './utils'

// todo move it, remove it
const legacyInvsprite = JSON.parse(fs.readFileSync(join(__dirname, '../../../src/invsprite.json'), 'utf8'))

// Use latest assets version that minecraft-data actually supports (overrides may pin data behind assets)
const latestMcAssetsVersion = McAssets.versions.filter((v) => {
  try {
    minecraftDataLoader(v)
    return true
  } catch {
    return false
  }
}).at(-1)!
const mcData = minecraftDataLoader(latestMcAssetsVersion)
const PBlock = BlockLoader(latestMcAssetsVersion)

function isCube (name) {
  const id = mcData.blocksByName[name]?.id
  if (!id) return
  const block = new PBlock(id, 0, 0)
  const shape = block.shapes?.[0]
  return block.shapes?.length === 1 && shape[0] === 0 && shape[1] === 0 && shape[2] === 0 && shape[3] === 1 && shape[4] === 1 && shape[5] === 1
}

export type ItemsAtlasesOutputJson = {
  latest: JsonAtlas
  legacy: JsonAtlas
  legacyMap: [string, string[]][]
}

export const generateItemsAtlases = async () => {
  const latestAssets = McAssets(latestMcAssetsVersion)
  const latestItems = fs.readdirSync(join(latestAssets.directory, 'items')).map(f => f.split('.')[0])

  // item - texture path
  const toAddTextures = {
    fromBlocks: {} as Record<string, string>,
    remapItems: {} as Record<string, string>, // todo
  }

  const getItemTextureOfBlock = (name: string) => {
    const blockModel = latestAssets.blocksModels[name]
    // const isPlainBlockDisplay = blockModel?.display?.gui?.rotation?.[0] === 0 && blockModel?.display?.gui?.rotation?.[1] === 0 && blockModel?.display?.gui?.rotation?.[2] === 0
    // it seems that information about cross blocks is hardcoded
    if (blockModel?.parent?.endsWith('block/cross')) {
      toAddTextures.fromBlocks[name] = `blocks/${blockModel.textures.cross.split('/')[1]}`
      return true
    }

    if (legacyInvsprite[name]) {
      return true
    }

    if (fs.existsSync(join(latestAssets.directory, 'blocks', name + '.png'))) {
      // very last resort
      toAddTextures.fromBlocks[name] = `blocks/${name}`
      return true
    }
    if (name.endsWith('_spawn_egg')) {
      // todo also color
      toAddTextures.fromBlocks[name] = `items/spawn_egg`
    }
  }

  for (const item of mcData.itemsArray) {
    if (latestItems.includes(item.name)) {
      continue
    }
    // USE IN RUNTIME
    if (isCube(item.name)) {
      // console.log('cube', block.name)
    } else if (!getItemTextureOfBlock(item.name)) {
      console.warn('skipping item (not cube, no item texture)', item.name)
    }
  }

  let fullItemsMap = {} as Record<string, string[]>

  const itemsSizes = {}
  let saving = 0
  let overallsize = 0
  let prevItemsDir
  let prevVersion
  for (const version of [...McAssets.versions].reverse()) {
    const itemsDir = join(McAssets(version).directory, 'items')
    for (const item of fs.readdirSync(itemsDir)) {
      const prevItemPath = !prevItemsDir ? undefined : join(prevItemsDir, item)
      const itemSize = fs.statSync(join(itemsDir, item)).size
      if (prevItemPath && fs.existsSync(prevItemPath) && (await looksSame(join(itemsDir, item), prevItemPath, { strict: true })).equal) {
        saving += itemSize
      } else {
        fullItemsMap[version] ??= []
        fullItemsMap[version].push(item)
      }
      overallsize += itemSize
    }
    prevItemsDir = itemsDir
    prevVersion = version
  }

  fullItemsMap = Object.fromEntries(Object.entries(fullItemsMap).map(([ver, items]) => [ver, items.filter(item => item.endsWith('.png'))]))
  const latestVersionItems = fullItemsMap[latestMcAssetsVersion]
  delete fullItemsMap[latestMcAssetsVersion]
  const legacyItemsSortedEntries = Object.entries(fullItemsMap).sort(([a], [b]) => versionToNumber(a) - versionToNumber(b)).map(([key, value]) => [key, value.map(x => x.replace('.png', ''))] as [typeof key, typeof value])
  // const allItemsLength = Object.values(fullItemsMap).reduce((acc, x) => acc + x.length, 0)
  // console.log(`Items to generate: ${allItemsLength} (latest version: ${latestVersionItems.length})`)
  const fullLatestItemsObject = {
    ...Object.fromEntries(latestVersionItems.map(item => [item, `items/${item.replace('.png', '')}`])),
    ...toAddTextures.fromBlocks,
    ...toAddTextures.remapItems
  }

  const latestAtlas = makeTextureAtlas(Object.keys(fullLatestItemsObject), (name) => {
    const contents = `data:image/png;base64,${fs.readFileSync(join(latestAssets.directory, `${fullLatestItemsObject[name]}.png`), 'base64')}`
    return {
      contents,
    }
  }, undefined, 'remove')
  const texturesPath = join(__dirname, '../../public/textures')
  writeCanvasStream(latestAtlas.canvas, join(texturesPath, 'items.png'), () => {
    console.log('Generated latest items atlas')
  })

  const legacyItemsMap = legacyItemsSortedEntries.flatMap(([ver, items]) => items.map(item => `${ver}-${item}.png`))
  const legacyItemsAtlas = makeTextureAtlas(legacyItemsMap, (name) => {
    const [ver, item] = name.split('-')
    const contents = `data:image/png;base64,${fs.readFileSync(join(McAssets(ver).directory, `items/${item}`), 'base64')}`
    return {
      contents,
    }
  }, undefined, 'remove')
  writeCanvasStream(legacyItemsAtlas.canvas, join(texturesPath, 'items-legacy.png'), () => {
    console.log('Generated legacy items atlas')
  })

  const allItemsMaps: ItemsAtlasesOutputJson = {
    latest: latestAtlas.json,
    legacy: legacyItemsAtlas.json,
    legacyMap: legacyItemsSortedEntries
  }
  fs.writeFileSync(join(texturesPath, 'items.json'), JSON.stringify(allItemsMaps), 'utf8')

  console.log(`Generated items! Input size: ${filesize(overallsize)}, saving: ~${filesize(saving)}`)
}
