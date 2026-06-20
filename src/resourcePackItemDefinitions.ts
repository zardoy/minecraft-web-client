import fs from 'fs'

export type ResourcePackItemDefinition = {
  model:
    | {
        type: 'minecraft:model'
        model: string
        tints?: Array<{
          type: 'minecraft:constant'
          value: number // eg 12596533
        }>
      }
    | {
        type: 'minecraft:empty'
      }
}

export type ItemDefinitions = Record<string, ResourcePackItemDefinition>

export type ItemRenderDefinitionInput = {
  item: string
}

const readFilesSafe = async (path: string) => {
  try {
    return await fs.promises.readdir(path)
  } catch (error) {
    return null
  }
}

export const readResourcePackItemDefinitions = async (assetsPath: string) => {
  const namespaces = fs.readdirSync(assetsPath)

  const itemDefinitions: ItemDefinitions = {}
  for (const namespace of namespaces) {
    // eslint-disable-next-line no-await-in-loop
    const items = await readFilesSafe(`${assetsPath}/${namespace}/items`)
    if (!items) continue
    for (const item of items) {
      if (!item.endsWith('.json')) continue
      const file = fs.readFileSync(`${assetsPath}/${namespace}/items/${item}`, 'utf8')
      const json = JSON.parse(file)
      itemDefinitions[`${namespace}:${item}`] = json
    }
  }
  return itemDefinitions
}

export const itemsDefaultNamespace = 'minecraft'
