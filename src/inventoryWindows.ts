import { proxy, subscribe } from 'valtio'

import { RecipeItem } from 'minecraft-data'
import { flat } from '@xmcl/text-component'
import { splitEvery, equals } from 'rambda'
import PItem, { Item } from 'prismarine-item'
import { versionToNumber } from 'renderer/viewer/common/utils'
import { getInventoryType } from 'minecraft-inventory/src/registry'
import type { RecipeGuide, ItemStack as InventoryItemStack } from 'minecraft-inventory/src/types'
import type { JEIItem } from 'minecraft-inventory/src/components/JEI/JEI'
import { renderSlot } from 'renderer/viewer/three/renderSlot'
import { activeModalStack, hideCurrentModal, hideModal, miscUiState, showModal } from './globalState'
import { options } from './optionsStorage'
import { displayClientChat } from './botUtils'
import { getItemDescription } from './itemsDescriptions'
import { MessageFormatPart } from './chatUtils'
import { getItemModelName, getItemNameRaw, RenderItem } from './mineflayer/items'
import { clearInventoryCaches } from './react/inventory/Inventory'
import { buildBlockTexture, extractSpriteDataUrl } from './react/inventory/sharedConnectorSetup'

let PrismarineItem: typeof Item

export const jeiCustomCategories = proxy({
  value: [] as Array<{ id: string, categoryTitle: string, items: any[] }>
})

// ----- JEI items cache -----
let jeiItemsCache: JEIItem[] | null = null
const clearJeiItemsCache = () => { jeiItemsCache = null }
subscribe(jeiCustomCategories, clearJeiItemsCache)

export const onGameLoad = () => {
  PrismarineItem = PItem(bot.version)

  /** Maps mineflayer window type + inventoryStart to an exact key in the new library's registry */
  const mapWindowType = (type: string, inventoryStart: number): string => {
    // minecraft:container size is determined by inventoryStart
    if (type === 'minecraft:container') {
      if (inventoryStart === 45 - 9 * 4) return 'generic_9x1'
      if (inventoryStart === 45 - 9 * 3) return 'generic_9x2'
      if (inventoryStart === 45 - 9 * 2) return 'generic_9x3'
      if (inventoryStart === 45 - 9) return 'generic_9x4'
      if (inventoryStart === 45) return 'generic_9x5'
      if (inventoryStart === 45 + 9) return 'generic_9x6'
    }
    // Version-specific smithing table layout
    if (type === 'minecraft:smithing') {
      return versionToNumber(bot.version) < versionToNumber('1.20') ? 'smithing_table_legacy' : 'smithing_table'
    }
    // Strip minecraft: prefix then handle remaining aliases
    const stripped = type.startsWith('minecraft:') ? type.slice(10) : type
    const remap: Record<string, string> = {
      generic_5x1: 'hopper',
      generic_3x3: 'dispenser',
      crafting: 'crafting_table',
      crafting3x3: 'crafting_table',
    }
    return remap[stripped] ?? stripped
  }

  bot.on('windowOpen', (win) => {
    const mappedType = mapWindowType(win.type as string, win.inventoryStart)
    const isImplemented = !!getInventoryType(mappedType)

    if (isImplemented || options.unimplementedContainers) {
      if (activeModalStack.length && !miscUiState.disconnectedCleanup) {
        hideCurrentModal()
      }
      showModal({ reactType: `player_win:${isImplemented ? mappedType : 'chest'}` })
    } else {
      displayClientChat(`[client error] cannot open unimplemented window ${(win as any).id} (${win.type}). Slots: ${win.slots.map(item => getItemName(item as any)).filter(Boolean).join(', ')}`)
      displayClientChat('You can help us fix it! Open a pull request adding support for it on https://github.com/zardoy/minecraft-inventory')
      bot.currentWindow?.['close']()
    }
  })

  // Workaround: singleplayer player-inventory crafting
  let skipUpdate = false
  bot.inventory.on('updateSlot', ((_oldSlot, oldItem, newItem) => {
    const currentSlot = _oldSlot as number
    if (!miscUiState.singleplayer || oldItem === newItem || skipUpdate) return
    const { craftingResultSlot } = bot.inventory
    if (currentSlot === craftingResultSlot && oldItem && !newItem) {
      for (let i = 1; i < 5; i++) {
        const count = bot.inventory.slots[i]?.count
        if (count && count > 1) {
          const slot = bot.inventory.slots[i]!
          slot.count--
          void bot.creative.setInventorySlot(i, slot)
        } else {
          void bot.creative.setInventorySlot(i, null)
        }
      }
      return
    }
    if (currentSlot > 4) return
    const craftingSlots = bot.inventory.slots.slice(1, 5)
    try {
      const resultingItem = getResultingRecipe(craftingSlots, 2)
      skipUpdate = true
      void bot.creative.setInventorySlot(craftingResultSlot, resultingItem ?? null).then(() => {
        skipUpdate = false
      })
    } catch (err) {
      console.error(err)
    }
  }) as any)

  bot.on('windowClose', () => {
    const modal = activeModalStack.at(-1)
    if (modal?.reactType?.startsWith('player_win:')) {
      hideModal(undefined, undefined, { force: true })
    }
  })
  bot.on('respawn', () => {
    const modal = activeModalStack.at(-1)
    if (modal?.reactType?.startsWith('player_win:')) {
      hideModal(undefined, undefined, { force: true })
    }
  })

  if (!appViewer.resourcesManager['_inventoryChangeTracked']) {
    appViewer.resourcesManager['_inventoryChangeTracked'] = true
    appViewer.resourcesManager.on('assetsInventoryReady', () => { clearJeiItemsCache(); clearInventoryCaches() })
    appViewer.resourcesManager.on('assetsTexturesUpdated', () => { clearJeiItemsCache(); clearInventoryCaches() })
  }
}

const getItemName = (slot: Item | RenderItem | null) => {
  const parsed = getItemNameRaw(slot, appViewer.resourcesManager)
  if (!parsed) return
  const text = flat(parsed as MessageFormatPart).map(x => (typeof x === 'string' ? x : x.text))
  return text.join('')
}

export const openPlayerInventory = () => {
  showModal({ reactType: 'player_win:player' })
}

const getResultingRecipe = (slots: Array<Item | null>, gridRows: number) => {
  const inputSlotsItems = slots.map(blockSlot => blockSlot?.type)
  let currentShape = splitEvery(gridRows, inputSlotsItems as Array<number | undefined | null>)
  if (currentShape.length > 1) {
    // eslint-disable-next-line @typescript-eslint/no-for-in-array
    for (const slotX in currentShape[0]) {
      if (currentShape[0][slotX] !== undefined) {
        for (const [otherY] of Array.from({ length: gridRows }).entries()) {
          if (currentShape[otherY]?.[slotX] === undefined) {
            currentShape[otherY]![slotX] = null
          }
        }
      }
    }
  }
  currentShape = currentShape.map(arr => arr.filter(x => x !== undefined)).filter(x => x.length !== 0)

  // eslint-disable-next-line @typescript-eslint/require-array-sort-compare
  const slotsIngredients = [...inputSlotsItems].sort().filter(item => item !== undefined)
  type Result = RecipeItem | undefined
  let shapelessResult: Result
  let shapeResult: Result
  outer: for (const [id, recipeVariants] of Object.entries(loadedData.recipes ?? {})) {
    for (const recipeVariant of recipeVariants) {
      if ('inShape' in recipeVariant && equals(currentShape, recipeVariant.inShape as number[][])) {
        shapeResult = recipeVariant.result!
        break outer
      }
      if ('ingredients' in recipeVariant && equals(slotsIngredients, recipeVariant.ingredients?.sort() as number[])) {
        shapelessResult = recipeVariant.result
        break outer
      }
    }
  }
  const result = shapeResult ?? shapelessResult
  if (!result) return
  const id = typeof result === 'number' ? result : Array.isArray(result) ? result[0] : (result as any).id
  if (!id) return
  const count = (typeof result === 'number' ? undefined : Array.isArray(result) ? result[1] : (result as any).count) ?? 1
  const metadata = typeof result === 'object' && !Array.isArray(result) ? (result as any).metadata : undefined
  const item = new PrismarineItem(id as number, count, metadata)
  return item
}

const ingredientToItem = (recipeItem) => (recipeItem === null ? null : new PrismarineItem(recipeItem, 1))

// Legacy format used by openItemsCanvas / HotbarRenderApp
// const getAllItemRecipesLegacy = (itemName: string) => {
//   const item = loadedData.itemsByName[itemName]
//   if (!item) return
//   const itemId = item.id
//   const recipes = loadedData.recipes?.[itemId]
//   if (!recipes) return
//   const results = [] as Array<{
//     result: Item,
//     ingredients: Array<Item | null>,
//     description?: string
//   }>

//   for (const recipe of recipes) {
//     const { result } = recipe
//     if (!result) continue
//     const resultId = typeof result === 'number' ? result : Array.isArray(result) ? result[0]! : (result as any).id
//     const resultCount = (typeof result === 'number' ? undefined : Array.isArray(result) ? result[1] : (result as any).count) ?? 1
//     const resultMetadata = typeof result === 'object' && !Array.isArray(result) ? (result as any).metadata : undefined
//     const resultItem = new PrismarineItem(resultId as number, resultCount, resultMetadata)
//     if ('inShape' in recipe) {
//       const ingredients = recipe.inShape
//       if (!ingredients) continue
//       const ingredientsItems = ingredients.flatMap(items => items.map(item => ingredientToItem(item)))
//       results.push({ result: resultItem, ingredients: ingredientsItems })
//     }
//     if ('ingredients' in recipe) {
//       const { ingredients } = recipe
//       if (!ingredients) continue
//       const ingredientsItems = ingredients.map(item => ingredientToItem(item))
//       results.push({ result: resultItem, ingredients: ingredientsItems, description: 'Shapeless' })
//     }
//   }
//   return results.map(({ result, ingredients, description }) => {
//     return [
//       'CraftingTableGuide',
//       mapSlots([result], true)[0],
//       mapSlots(ingredients, true),
//       description
//     ]
//   })
// }

// const getAllItemUsagesLegacy = (itemName: string) => {
//   const item = loadedData.itemsByName[itemName]
//   if (!item) return
//   const foundRecipeIds = [] as string[]

//   for (const [id, recipes] of Object.entries(loadedData.recipes ?? {})) {
//     for (const recipe of recipes) {
//       if ('inShape' in recipe) {
//         if (recipe.inShape.some(row => row.includes(item.id))) {
//           foundRecipeIds.push(id)
//         }
//       }
//       if ('ingredients' in recipe) {
//         if (recipe.ingredients.includes(item.id)) {
//           foundRecipeIds.push(id)
//         }
//       }
//     }
//   }

//   return foundRecipeIds.flatMap(id => {
//     return getAllItemRecipesLegacy(loadedData.items[id].name)
//   })
// }

// ----- New React inventory exports -----

/** Enrich a single item with texture data from the rendering pipeline (same as JEI enrichment) */
const enrichItemTexture = (item: InventoryItemStack): void => {
  if (!appViewer?.resourcesManager?.currentResources) return
  const playerState = appViewer.playerState?.reactive
  if (!playerState) return
  try {
    const modelName = getItemModelName(
      { name: item.name ?? '', nbt: null },
      { 'minecraft:display_context': 'gui' },
      appViewer.resourcesManager,
      playerState
    )
    const slotProps = renderSlot({ modelName, originalItemName: item.name ?? '' }, appViewer.resourcesManager)
    if (slotProps.blockData) {
      item.blockTexture = buildBlockTexture(slotProps.blockData as Record<string, { slice: number[] } | undefined>)
    } else if (slotProps.slice) {
      item.texture = extractSpriteDataUrl(slotProps.texture, slotProps.slice)
    }
  } catch { /* skip items that fail enrichment */ }
}

/** Helper: convert a minecraft-data item ID to a minimal ItemStack for recipe guides */
const idToItemStack = (id: number | null | undefined): InventoryItemStack | null => {
  if (!id) return null
  const data = loadedData.items[id]
  if (!data) return null
  const stack: InventoryItemStack = { type: id, count: 1, name: data.name, displayName: data.displayName }
  enrichItemTexture(stack)
  return stack
}

/**
 * Returns recipes for the given item name in the new library's RecipeGuide format.
 * Used by Inventory.tsx for JEI recipe lookup.
 */
export const getItemRecipes = (itemName: string): RecipeGuide[] => {
  if (!PrismarineItem) return []
  const item = loadedData.itemsByName[itemName]
  if (!item) return []
  const recipes = loadedData.recipes?.[item.id]
  if (!recipes) {
    const description = getItemDescription(item as any)
    if (description) return [{ type: 'custom', title: item.displayName, description }]
    return []
  }

  const guides: RecipeGuide[] = []

  for (const recipe of recipes) {
    const { result } = recipe
    if (!result) continue
    const resultId = typeof result === 'number' ? result : Array.isArray(result) ? result[0]! : (result as any).id
    const resultCount = (typeof result === 'number' ? undefined : Array.isArray(result) ? result[1] : (result as any).count) ?? 1
    const resultData = resultId ? loadedData.items[resultId as number] : undefined
    if (!resultData) continue
    const resultStack: InventoryItemStack = { type: resultId, count: resultCount, name: resultData.name, displayName: resultData.displayName }
    enrichItemTexture(resultStack)

    if ('inShape' in recipe && recipe.inShape) {
      // Expand shaped recipe into a 9-element 3x3 grid (top-left aligned)
      const grid: Array<InventoryItemStack | null> = Array.from({ length: 9 }, () => null)
      for (const [rowIdx, row] of recipe.inShape.entries()) {
        if (rowIdx >= 3) continue
        for (const [colIdx, id] of row.entries()) {
          if (colIdx >= 3) continue
          grid[rowIdx * 3 + colIdx] = idToItemStack(id as number | null | undefined)
        }
      }
      guides.push({ type: 'crafting', title: resultData.displayName, ingredients: grid, result: resultStack })
    }

    if ('ingredients' in recipe && recipe.ingredients) {
      const grid: Array<InventoryItemStack | null> = Array.from({ length: 9 }, () => null)
      for (const [i, id] of recipe.ingredients.slice(0, 9).entries()) { grid[i] = idToItemStack(id as number | null | undefined) }
      guides.push({ type: 'crafting', title: resultData.displayName, description: 'Shapeless', ingredients: grid, result: resultStack })
    }
  }

  const description = getItemDescription(item as any)
  if (description) guides.push({ type: 'custom', title: item.displayName, description })

  return guides
}

/**
 * Returns usages (recipes where this item is an ingredient) in RecipeGuide format.
 * Used by Inventory.tsx for JEI usage lookup.
 */
export const getItemUsages = (itemName: string): RecipeGuide[] => {
  const item = loadedData.itemsByName[itemName]
  if (!item) return []
  const foundItemIds = new Set<string>()

  for (const [id, recipes] of Object.entries(loadedData.recipes ?? {})) {
    for (const recipe of recipes) {
      if ('inShape' in recipe && recipe.inShape.some(row => row.includes(item.id))) {
        foundItemIds.add(id)
      }
      if ('ingredients' in recipe && recipe.ingredients.includes(item.id)) {
        foundItemIds.add(id)
      }
    }
  }

  return [...foundItemIds].flatMap(id => getItemRecipes(loadedData.items[id].name))
}

/**
 * Returns all JEI items (custom categories + vanilla items) for the new inventory UI.
 * Items are enriched with texture/blockTexture data from the rendering pipeline.
 */
export const getJeiItems = (): JEIItem[] => {
  if (jeiItemsCache) return jeiItemsCache
  if (!PrismarineItem) return []

  const customItems: JEIItem[] = jeiCustomCategories.value.flatMap(cat => (cat.items).filter(Boolean).map(item => ({
    type: item.type ?? item.id ?? 0,
    name: item.name ?? '',
    displayName: getItemName(item) ?? item.displayName ?? item.name ?? '',
  })))

  const vanillaItems: JEIItem[] = loadedData.itemsArray.map(item => ({
    type: item.id,
    name: item.name,
    displayName: item.displayName,
  }))

  const allItems = [...customItems, ...vanillaItems]

  // Enrich items with texture data if the rendering pipeline is available
  if (!appViewer?.resourcesManager?.currentResources) return allItems

  const { resourcesManager } = appViewer
  const playerState = appViewer.playerState?.reactive
  if (!playerState) return allItems

  for (const item of allItems) {
    try {
      const modelName = getItemModelName(
        { name: item.name, nbt: null },
        { 'minecraft:display_context': 'gui' },
        resourcesManager,
        playerState
      )
      const slotProps = renderSlot({ modelName, originalItemName: item.name }, resourcesManager)

      if (slotProps.blockData) {
        item.blockTexture = buildBlockTexture(slotProps.blockData as Record<string, { slice: number[] } | undefined>)
      } else if (slotProps.slice) {
        item.texture = extractSpriteDataUrl(slotProps.texture, slotProps.slice)
      }
    } catch {
      // Skip texture enrichment for items that fail — they'll fall back to CDN sprites
    }
  }

  jeiItemsCache = allItems
  return allItems
}
