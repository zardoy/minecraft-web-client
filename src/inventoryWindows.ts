import { proxy, subscribe } from 'valtio'
import { showInventory } from 'minecraft-inventory-gui/web/ext.mjs'

// import Dirt from 'mc-assets/dist/other-textures/latest/blocks/dirt.png'
import { RecipeItem } from 'minecraft-data'
import { flat, fromFormattedString } from '@xmcl/text-component'
import { splitEvery, equals } from 'rambda'
import PItem, { Item } from 'prismarine-item'
import { versionToNumber } from 'renderer/viewer/common/utils'
import { getRenamedData } from 'flying-squid/dist/blockRenames'
import PrismarineChatLoader from 'prismarine-chat'
import * as nbt from 'prismarine-nbt'
import { BlockModel } from 'mc-assets'
import { renderSlot } from 'renderer/viewer/three/renderSlot'
import { loadSkinFromUsername } from 'renderer/viewer/lib/utils/skins'
import Generic95 from '../assets/generic_95.png'
import { appReplacableResources } from './generated/resources'
import { activeModalStack, hideCurrentModal, hideModal, miscUiState, showModal } from './globalState'
import { options } from './optionsStorage'
import { assertDefined, inGameError } from './utils'
import { displayClientChat } from './botUtils'
import { currentScaling } from './scaleInterface'
import { getItemDescription } from './itemsDescriptions'
import { MessageFormatPart } from './chatUtils'
import { GeneralInputItem, getItemMetadata, getItemModelName, getItemNameRaw, RenderItem } from './mineflayer/items'
import { playerState } from './mineflayer/playerState'
import { modelViewerState } from './react/OverlayModelViewer'

const loadedImagesCache = new Map<string, HTMLImageElement | ImageBitmap>()
const cleanLoadedImagesCache = () => {
  loadedImagesCache.delete('blocks')
  loadedImagesCache.delete('items')
}

let lastWindow: ReturnType<typeof showInventory>
let lastWindowType: string | null | undefined // null is inventory
/** bot version */
let version: string
let PrismarineItem: typeof Item

export const jeiCustomCategories = proxy({
  value: [] as Array<{ id: string, categoryTitle: string, items: any[] }>
})

let remotePlayerSkin: string | undefined | Promise<string>

export const showInventoryPlayer = () => {
  modelViewerState.model = {
    positioning: {
      windowWidth: 176,
      windowHeight: 166,
      x: 25,
      y: 8,
      width: 50,
      height: 70,
      scaled: true,
      onlyInitialScale: true,
    },
    followCursor: true,
    followCursorCenter: {
      x: 51,
      y: 27,
    },
    // models: ['https://bucket.mcraft.fun/sitarbuckss.glb'],
    // debug: true,
    steveModelSkin: appViewer.playerState.reactive.playerSkin ?? (typeof remotePlayerSkin === 'string' ? remotePlayerSkin : ''),
  }
  if (remotePlayerSkin === undefined && !appViewer.playerState.reactive.playerSkin) {
    remotePlayerSkin = loadSkinFromUsername(bot.username, 'skin').then(a => {
      setTimeout(() => {
        // Check if player inventory is still open before updating
        if (lastWindowType === null) {
          showInventoryPlayer()
        }
      }, 0) // todo patch instead and make reactive
      remotePlayerSkin = a ?? ''
      return remotePlayerSkin
    })
  }
}

export const onGameLoad = () => {
  version = bot.version

  PrismarineItem = PItem(version)

  const mapWindowType = (type: string, inventoryStart: number) => {
    if (type === 'minecraft:container') {
      if (inventoryStart === 45 - 9 * 4) return 'minecraft:generic_9x1'
      if (inventoryStart === 45 - 9 * 3) return 'minecraft:generic_9x2'
      if (inventoryStart === 45 - 9 * 2) return 'minecraft:generic_9x3'
      if (inventoryStart === 45 - 9) return 'minecraft:generic_9x4'
      if (inventoryStart === 45) return 'minecraft:generic_9x5'
      if (inventoryStart === 45 + 9) return 'minecraft:generic_9x6'
    }
    return type
  }

  const maybeParseNbtJson = (data: any) => {
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data)
      } catch (err) {
        // ignore
      }
    }
    return nbt.simplify(data) ?? data
  }

  bot.on('windowOpen', (win) => {
    const implementedWindow = implementedContainersGuiMap[mapWindowType(win.type as string, win.inventoryStart)]
    if (implementedWindow) {
      openWindow(implementedWindow, maybeParseNbtJson(win.title))
    } else if (options.unimplementedContainers) {
      openWindow('ChestWin', maybeParseNbtJson(win.title))
    } else {
      // todo format
      displayClientChat(`[client error] cannot open unimplemented window ${win.id} (${win.type}). Slots: ${win.slots.map(item => getItemName(item)).filter(Boolean).join(', ')}`)
      bot.currentWindow?.['close']()
    }
  })

  // workaround: singleplayer player inventory crafting
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
      // todo resolve the error! and why would we ever get here on every update?
    }
  }) as any)

  bot.on('windowClose', () => {
    // todo hide up to the window itself!
    if (lastWindow) {
      hideCurrentModal()
    }
  })
  bot.on('respawn', () => { // todo validate logic against native client (maybe login)
    if (lastWindow) {
      hideCurrentModal()
    }
  })

  customEvents.on('search', (q) => {
    if (!lastWindow) return
    upJei(q)
  })

  if (!appViewer.resourcesManager['_inventoryChangeTracked']) {
    appViewer.resourcesManager['_inventoryChangeTracked'] = true
    const texturesChanged = () => {
      cleanLoadedImagesCache()
      if (!lastWindow) return
      upWindowItemsLocal()
      upJei(lastJeiSearch)
    }
    appViewer.resourcesManager.on('assetsInventoryReady', () => texturesChanged())
    appViewer.resourcesManager.on('assetsTexturesUpdated', () => texturesChanged())
  }
}

const getImageSrc = (path): string | HTMLImageElement | ImageBitmap => {
  switch (path) {
    case 'gui/container/inventory': return appReplacableResources.latest_gui_container_inventory.content
    case 'blocks': return appViewer.resourcesManager.blocksAtlasParser.latestImage
    case 'items': return appViewer.resourcesManager.itemsAtlasParser.latestImage
    case 'gui': return appViewer.resourcesManager.currentResources!.guiAtlas!.image
    case 'gui/container/dispenser': return appReplacableResources.latest_gui_container_dispenser.content
    case 'gui/container/furnace': return appReplacableResources.furnace_gui_texture.content
    case 'gui/container/crafting_table': return appReplacableResources.latest_gui_container_crafting_table.content
    case 'gui/container/shulker_box': return appReplacableResources.latest_gui_container_shulker_box.content
    case 'gui/container/generic_54': return appReplacableResources.latest_gui_container_generic_54.content
    case 'gui/container/generic_95': return Generic95
    case 'gui/container/hopper': return appReplacableResources.latest_gui_container_hopper.content
    case 'gui/container/horse': return appReplacableResources.latest_gui_container_horse.content
    case 'gui/container/villager2': return appReplacableResources.latest_gui_container_villager2.content
    case 'gui/container/enchanting_table': return appReplacableResources.latest_gui_container_enchanting_table.content
    case 'gui/container/anvil': return appReplacableResources.latest_gui_container_anvil.content
    case 'gui/container/beacon': return appReplacableResources.latest_gui_container_beacon.content
    case 'gui/container/smithing':
      return versionToNumber(bot.version) < versionToNumber('1.20')
        ? appReplacableResources._1_19_4_gui_container_smithing.content
        : appReplacableResources.latest_gui_container_smithing.content
    case 'gui/widgets': return appReplacableResources.other_textures_latest_gui_widgets.content
  }
  // empty texture
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
}

const getImage = ({ path = undefined as string | undefined, texture = undefined as string | undefined, blockData = undefined as any, image = undefined as HTMLImageElement | undefined }, onLoad = () => { }) => {
  if (image) {
    return image
  }
  if (!path && !texture) {
    throw new Error('Either pass path or texture')
  }
  const loadPath = (blockData ? 'blocks' : path ?? texture)!
  if (loadedImagesCache.has(loadPath)) {
    onLoad()
  } else {
    const imageSrc = getImageSrc(loadPath)
    if (imageSrc instanceof ImageBitmap) {
      onLoad()
      loadedImagesCache.set(loadPath, imageSrc)
      return imageSrc
    }

    let image: HTMLImageElement
    if (imageSrc instanceof Image) {
      image = imageSrc
    } else {
      image = new Image()
      image.src = imageSrc
    }
    image.onload = onLoad
    loadedImagesCache.set(loadPath, image)
  }
  return loadedImagesCache.get(loadPath)
}

const getItemName = (slot: Item | RenderItem | null) => {
  const parsed = getItemNameRaw(slot, appViewer.resourcesManager)
  if (!parsed) return
  // todo display full text renderer from sign renderer
  const text = flat(parsed as MessageFormatPart).map(x => (typeof x === 'string' ? x : x.text))
  return text.join('')
}

let lastMappedSlots = [] as any[]
const itemToVisualKey = (slot: RenderItem | Item | null) => {
  if (!slot) return ''
  const keys = [
    slot.name,
    slot.durabilityUsed,
    slot.maxDurability,
    slot['count'],
    slot['metadata'],
    slot.nbt ? JSON.stringify(slot.nbt) : '',
    slot['components'] ? JSON.stringify(slot['components']) : '',
    appViewer.resourcesManager.currentResources!.guiAtlasVersion,
  ].join('|')
  return keys
}
const validateSlot = (slot: any, index: number) => {
  if (!slot.texture) {
    throw new Error(`Slot has no texture: ${index} ${slot.name}`)
  }
}
const mapSlots = (slots: Array<RenderItem | Item | null>, isJei = false) => {
  const newSlots = slots.map((slot, i) => {
    if (!slot) return null

    if (!isJei) {
      const oldKey = lastMappedSlots[i]?.cacheKey
      const newKey = itemToVisualKey(slot)
      slot['cacheKey'] = i + '|' + newKey
      if (oldKey && oldKey === newKey) {
        validateSlot(lastMappedSlots[i], i)
        return lastMappedSlots[i]
      }
    }

    try {
      if (slot.durabilityUsed && slot.maxDurability) slot.durabilityUsed = Math.min(slot.durabilityUsed, slot.maxDurability)
      const debugIsQuickbar = !isJei && i === bot.inventory.hotbarStart + bot.quickBarSlot
      const modelName = getItemModelName(slot, { 'minecraft:display_context': 'gui', }, appViewer.resourcesManager, appViewer.playerState.reactive)
      const slotCustomProps = renderSlot({ modelName, originalItemName: slot.name }, appViewer.resourcesManager, debugIsQuickbar)
      const itemCustomName = getItemName(slot)
      Object.assign(slot, { ...slotCustomProps, displayName: itemCustomName ?? slot.displayName })
      //@ts-expect-error
      slot.toJSON = () => {
        // Allow to serialize slot to JSON as minecraft-inventory-gui creates icon property as cache (recursively)
        //@ts-expect-error
        const { icon, ...rest } = slot
        return rest
      }
      validateSlot(slot, i)
    } catch (err) {
      inGameError(err)
    }
    return slot
  })
  lastMappedSlots = JSON.parse(JSON.stringify(newSlots))
  return newSlots
}

export const upInventoryItems = (isInventory: boolean, invWindow = lastWindow) => {
  // inv.pwindow.inv.slots[2].displayName = 'test'
  // inv.pwindow.inv.slots[2].blockData = getBlockData('dirt')
  const customSlots = mapSlots((isInventory ? bot.inventory : bot.currentWindow)!.slots)
  invWindow.pwindow.setSlots(customSlots)
  return customSlots
}

export const onModalClose = (callback: () => any) => {
  const modal = activeModalStack.at(-1)
  const unsubscribe = subscribe(activeModalStack, () => {
    const newModal = activeModalStack.at(-1)
    if (modal?.reactType !== newModal?.reactType) {
      callback()
      unsubscribe()
    }
  }, true)
}

const implementedContainersGuiMap = {
  // todo allow arbitrary size instead!
  'minecraft:generic_9x1': 'ChestWin',
  'minecraft:generic_9x2': 'ChestWin',
  'minecraft:generic_9x3': 'ChestWin',
  'minecraft:generic_9x4': 'Generic95Win',
  'minecraft:generic_9x5': 'Generic95Win',
  // hopper
  'minecraft:hopper': 'HopperWin',
  'minecraft:generic_5x1': 'HopperWin',
  'minecraft:generic_9x6': 'LargeChestWin',
  'minecraft:generic_3x3': 'DropDispenseWin',
  'minecraft:furnace': 'FurnaceWin',
  'minecraft:smoker': 'FurnaceWin',
  'minecraft:blast_furnace': 'FurnaceWin',
  'minecraft:shulker_box': 'ChestWin',
  'minecraft:crafting': 'CraftingWin',
  'minecraft:smithing': 'will_be_patched_in_openWindow',
  'minecraft:crafting3x3': 'CraftingWin', // todo different result slot
  'minecraft:anvil': 'AnvilWin',
  // enchant
  'minecraft:enchanting_table': 'EnchantingWin',
  // horse
  'minecraft:horse': 'HorseWin',
  // villager
  'minecraft:villager': 'VillagerWin',
}

let lastJeiSearch = ''
const upJei = (search: string) => {
  lastJeiSearch = search
  search = search.toLowerCase()
  // todo fix pre flat
  const itemsArray = [
    ...jeiCustomCategories.value.flatMap(x => x.items).filter(x => x !== null),
    ...loadedData.itemsArray.filter(x => x.displayName.toLowerCase().includes(search)).map(item => new PrismarineItem(item.id, 1)).filter(x => x !== null)
  ]
  const matchedSlots = itemsArray.map(x => {
    x.displayName = getItemName(x) ?? x.displayName
    if (!x.displayName.toLowerCase().includes(search)) return null
    return x
  }).filter(a => a !== null)
  lastWindow.pwindow.win.jeiSlotsPage = 0
  lastWindow.pwindow.win.jeiSlots = mapSlots(matchedSlots, true)
}

export const openItemsCanvas = (type, _bot = bot as typeof bot | null) => {
  const inv = showInventory(type, getImage, {}, _bot);
  (inv.canvasManager.children[0].callbacks as any).getItemRecipes = (item) => {
    const allRecipes = getAllItemRecipes(item.name)
    inv.canvasManager.children[0].messageDisplay = ''
    const itemDescription = getItemDescription(item)
    if (!allRecipes?.length && !itemDescription) {
      inv.canvasManager.children[0].messageDisplay = `No recipes found for ${item.displayName}`
    }
    return [...allRecipes ?? [], ...itemDescription ? [
      [
        'GenericDescription',
        mapSlots([item], true)[0],
        [],
        itemDescription
      ]
    ] : []]
  }
  (inv.canvasManager.children[0].callbacks as any).getItemUsages = (item) => {
    const allItemUsages = getAllItemUsages(item.name)
    inv.canvasManager.children[0].messageDisplay = ''
    if (!allItemUsages?.length) {
      inv.canvasManager.children[0].messageDisplay = `No usages found for ${item.displayName}`
    }
    return allItemUsages
  }
  return inv
}

const upWindowItemsLocal = () => {
  void Promise.resolve().then(() => {
    if (!lastWindow && bot.currentWindow) {
      // edge case: might happen due to high ping, inventory should be closed soon!
      // openWindow(implementedContainersGuiMap[bot.currentWindow.type])
      return
    }
    upInventoryItems(lastWindowType === null)
  })
}

let skipClosePacketSending = false
const openWindow = (type: string | undefined, title: string | any = undefined) => {
  // patch implementedContainersGuiMap
  implementedContainersGuiMap['minecraft:smithing'] = versionToNumber(bot.version) < versionToNumber('1.20') ? 'SmithingTableLegacyWin' : 'SmithingTableWin'

  // if (activeModalStack.some(x => x.reactType?.includes?.('player_win:'))) {
  if (activeModalStack.length && !miscUiState.disconnectedCleanup) { // game is not in foreground, don't close current modal
    if (type) {
      skipClosePacketSending = true
      hideCurrentModal()
    } else {
      bot.currentWindow?.['close']()
      return
    }
  }
  lastWindowType = type ?? null
  showModal({
    reactType: `player_win:${type}`,
  })
  if (type === undefined) {
    showInventoryPlayer()
  }
  cleanLoadedImagesCache()
  const inv = openItemsCanvas(type)
  inv.canvasManager.children[0].mobileHelpers = miscUiState.currentTouch
  window.inventory = inv
  const PrismarineChat = PrismarineChatLoader(bot.version)
  try {
    inv.canvasManager.children[0].customTitleText = title ?
      typeof title === 'string' ?
        fromFormattedString(title).text :
        new PrismarineChat(title).toString() :
      undefined
  } catch (err) {
    reportError?.(err)
    inv.canvasManager.children[0].customTitleText = undefined
  }
  // todo
  inv.canvasManager.setScale(currentScaling.scale === 1 ? 1.5 : currentScaling.scale)
  inv.canvas.style.zIndex = '10'
  inv.canvas.style.position = 'fixed'
  inv.canvas.style.inset = '0'

  inv.canvasManager.onClose = async () => {
    await new Promise(resolve => {
      setTimeout(resolve, 0)
    })
    if (activeModalStack.at(-1)?.reactType?.includes('player_win:')) {
      hideModal(undefined, undefined, { force: true })
    }
    inv.canvasManager.destroy()
  }

  lastWindow = inv

  onModalClose(() => {
    // might be already closed (event fired)
    if (type !== undefined && bot.currentWindow && !skipClosePacketSending) bot.currentWindow['close']()
    lastWindow.destroy()
    lastWindow = null as any
    lastWindowType = undefined
    window.inventory = null
    miscUiState.displaySearchInput = false
    destroyFn()
    skipClosePacketSending = false

    modelViewerState.model = undefined
  })

  upWindowItemsLocal()

  lastWindow.pwindow.touch = miscUiState.currentTouch ?? false
  const oldOnInventoryEvent = lastWindow.pwindow.onInventoryEvent.bind(lastWindow.pwindow)
  lastWindow.pwindow.onInventoryEvent = (type, containing, windowIndex, inventoryIndex, item) => {
    if (inv.canvasManager.children[0].currentGuide) {
      const isRightClick = type === 'rightclick'
      const isLeftClick = type === 'leftclick'
      if (isLeftClick || isRightClick) {
        modelViewerState.model = undefined
        inv.canvasManager.children[0].showRecipesOrUsages(isLeftClick, item)
      }
    } else {
      oldOnInventoryEvent(type, containing, windowIndex, inventoryIndex, item)
    }
  }
  lastWindow.pwindow.onJeiClick = (slotItem, _index, isRightclick) => {
    if (versionToNumber(bot.version) < versionToNumber('1.13')) {
      alert('Item give is broken on 1.12.2 and below, we are working on it!')
      return
    }
    // slotItem is the slot from mapSlots
    const itemId = loadedData.itemsByName[slotItem.name]?.id
    if (!itemId) {
      inGameError(`Item for block ${slotItem.name} not found`)
      return
    }
    const item = PrismarineItem.fromNotch({
      ...slotItem,
      itemId,
      itemCount: isRightclick ? 64 : 1,
      components: slotItem.components ?? [],
      removeComponents: slotItem.removedComponents ?? [],
      itemDamage: slotItem.metadata ?? 0,
      nbt: slotItem.nbt,
    })
    if (bot.game.gameMode === 'creative') {
      const freeSlot = bot.inventory.firstEmptyInventorySlot()
      if (freeSlot === null) return
      void bot.creative.setInventorySlot(freeSlot, item)
    } else {
      modelViewerState.model = undefined
      inv.canvasManager.children[0].showRecipesOrUsages(!isRightclick, mapSlots([item], true)[0])
    }
  }

  const isJeiEnabled = () => {
    if (typeof options.jeiEnabled === 'boolean') return options.jeiEnabled
    if (Array.isArray(options.jeiEnabled)) {
      return options.jeiEnabled.includes(bot.game?.gameMode as any)
    }
    return false
  }

  if (isJeiEnabled()) {
    lastWindow.pwindow.win.jeiSlotsPage = 0
    // todo workaround so inventory opens immediately (though it still lags)
    setTimeout(() => {
      upJei('')
    })
    miscUiState.displaySearchInput = true
  } else {
    lastWindow.pwindow.win.jeiSlots = []
    miscUiState.displaySearchInput = false
  }

  if (type === undefined) {
    // player inventory
    bot.inventory.on('updateSlot', upWindowItemsLocal)
    destroyFn = () => {
      bot.inventory.off('updateSlot', upWindowItemsLocal)
    }
  } else {
    //@ts-expect-error
    bot.currentWindow.on('updateSlot', () => {
      upWindowItemsLocal()
    })
  }
}

let destroyFn = () => { }

export const openPlayerInventory = () => {
  openWindow(undefined)
}

const getResultingRecipe = (slots: Array<Item | null>, gridRows: number) => {
  const inputSlotsItems = slots.map(blockSlot => blockSlot?.type)
  let currentShape = splitEvery(gridRows, inputSlotsItems as Array<number | undefined | null>)
  // todo rewrite with candidates search
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

  // todo rewrite
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
  const id = typeof result === 'number' ? result : Array.isArray(result) ? result[0] : result.id
  if (!id) return
  const count = (typeof result === 'number' ? undefined : Array.isArray(result) ? result[1] : result.count) ?? 1
  const metadata = typeof result === 'object' && !Array.isArray(result) ? result.metadata : undefined
  const item = new PrismarineItem(id, count, metadata)
  return item
}

const ingredientToItem = (recipeItem) => (recipeItem === null ? null : new PrismarineItem(recipeItem, 1))

const getAllItemRecipes = (itemName: string) => {
  const item = loadedData.itemsByName[itemName]
  if (!item) return
  const itemId = item.id
  const recipes = loadedData.recipes?.[itemId]
  if (!recipes) return
  const results = [] as Array<{
    result: Item,
    ingredients: Array<Item | null>,
    description?: string
  }>

  // get recipes here
  for (const recipe of recipes) {
    const { result } = recipe
    if (!result) continue
    const resultId = typeof result === 'number' ? result : Array.isArray(result) ? result[0]! : result.id
    const resultCount = (typeof result === 'number' ? undefined : Array.isArray(result) ? result[1] : result.count) ?? 1
    const resultMetadata = typeof result === 'object' && !Array.isArray(result) ? result.metadata : undefined
    const resultItem = new PrismarineItem(resultId!, resultCount, resultMetadata)
    if ('inShape' in recipe) {
      const ingredients = recipe.inShape
      if (!ingredients) continue

      const ingredientsItems = ingredients.flatMap(items => items.map(item => ingredientToItem(item)))
      results.push({ result: resultItem, ingredients: ingredientsItems })
    }
    if ('ingredients' in recipe) {
      const { ingredients } = recipe
      if (!ingredients) continue
      const ingredientsItems = ingredients.map(item => ingredientToItem(item))
      results.push({ result: resultItem, ingredients: ingredientsItems, description: 'Shapeless' })
    }
  }
  return results.map(({ result, ingredients, description }) => {
    return [
      'CraftingTableGuide',
      mapSlots([result], true)[0],
      mapSlots(ingredients, true),
      description
    ]
  })
}

const getAllItemUsages = (itemName: string) => {
  const item = loadedData.itemsByName[itemName]
  if (!item) return
  const foundRecipeIds = [] as string[]

  for (const [id, recipes] of Object.entries(loadedData.recipes ?? {})) {
    for (const recipe of recipes) {
      if ('inShape' in recipe) {
        if (recipe.inShape.some(row => row.includes(item.id))) {
          foundRecipeIds.push(id)
        }
      }
      if ('ingredients' in recipe) {
        if (recipe.ingredients.includes(item.id)) {
          foundRecipeIds.push(id)
        }
      }
    }
  }

  return foundRecipeIds.flatMap(id => {
    // todo should use exact match, not include all recipes!
    return getAllItemRecipes(loadedData.items[id].name)
  })
}
