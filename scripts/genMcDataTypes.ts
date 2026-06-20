import minecraftData from 'minecraft-data'
import fs from 'fs'
import supportedVersions from '../src/supportedVersions.mjs'

const data = minecraftData('1.20.1')

let types = ''
types += `\nexport type BlockNames = ${Object.keys(data.blocksByName)
  .map(blockName => `'${blockName}'`)
  .join(' | ')};`
types += `\nexport type ItemNames = ${Object.keys(data.itemsByName)
  .map(blockName => `'${blockName}'`)
  .join(' | ')};`
types += `\nexport type EntityNames = ${Object.keys(data.entitiesByName)
  .map(blockName => `'${blockName}'`)
  .join(' | ')};`
types += `\nexport type BiomesNames = ${Object.keys(data.biomesByName)
  .map(blockName => `'${blockName}'`)
  .join(' | ')};`
types += `\nexport type EnchantmentNames = ${Object.keys(data.enchantmentsByName)
  .map(blockName => `'${blockName}'`)
  .join(' | ')};`

type Version = string
const allVersionsEntitiesMetadata = {} as Record<
  string,
  Record<
    string,
    {
      version: Version
      firstKey: number
    }
  >
>
for (const version of supportedVersions) {
  const data = minecraftData(version)
  for (const { name, metadataKeys } of data.entitiesArray) {
    allVersionsEntitiesMetadata[name] ??= {}
    if (!metadataKeys) {
      // console.warn('Entity has no metadata', name, version)
    }
    for (const [i, key] of (metadataKeys ?? []).entries()) {
      allVersionsEntitiesMetadata[name][key] ??= {
        version: version,
        firstKey: i
      }
    }
  }
}

types += '\n\nexport type EntityMetadataVersions = {\n'
for (const [name, versions] of Object.entries(allVersionsEntitiesMetadata)) {
  types += `'${name}': {`
  for (const [key, v] of Object.entries(versions)) {
    types += `\n/** ${v.version}+ (${v.firstKey}) */\n`
    types += `'${key}': string;`
  }
  types += '},'
}
types += '\n}'

const minify = false
if (minify) {
  types = types.replaceAll(/[\t]/g, '')
}

fs.writeFileSync('./src/mcDataTypes.ts', types, 'utf8')
