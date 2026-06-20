//@ts-check
// tsx ./scripts/getMissingRecipes.mjs
import MinecraftData from 'minecraft-data'
import supportedVersions from '../src/supportedVersions.mjs'
import fs from 'fs'

console.time('import-data')
const { descriptionGenerators } = await import('../src/itemsDescriptions')
console.timeEnd('import-data')

const data = MinecraftData(supportedVersions.at(-1))

const hasDescription = name => {
  for (const [key, value] of descriptionGenerators) {
    if (Array.isArray(key) && key.includes(name)) {
      return true
    }
    if (key instanceof RegExp && key.test(name)) {
      return true
    }
  }
  return false
}

const result = []
for (const item of data.itemsArray) {
  const recipes = data.recipes[item.id]
  if (!recipes) {
    if (item.name.endsWith('_slab') || item.name.endsWith('_stairs') || item.name.endsWith('_wall')) {
      console.warn('Must have recipe!', item.name)
      continue
    }
    if (hasDescription(item.name)) {
      continue
    }

    result.push(item.name)
  }
}

fs.writeFileSync('./generated/noRecipies.json', JSON.stringify(result, null, 2))
