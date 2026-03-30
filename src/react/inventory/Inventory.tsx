import { createPortal } from 'react-dom'
import { useEffect, useMemo, useCallback, useState } from 'react'
import { useSnapshot } from 'valtio'
import {
  TextureProvider,
  ScaleProvider,
  InventoryProvider,
  InventoryOverlay,
  createMineflayerConnector,
  type MineflayerBot,
  type JEIItem,
  type RecipeGuide,
} from 'minecraft-inventory/src'
import type { ItemStack, BlockTextureRender } from 'minecraft-inventory/src/types'
import { flat } from '@xmcl/text-component'
import PItem from 'prismarine-item'
import type { Item } from 'prismarine-item'
import { renderSlot } from 'renderer/viewer/three/renderSlot'
import { getItemModelName, getItemNameRaw, RenderItem } from '../../mineflayer/items'
import { useAppScale } from '../../scaleInterface'
import { activeModalStack, hideCurrentModal } from '../../globalState'
import { options } from '../../optionsStorage'
import { getJeiItems, getItemRecipes, getItemUsages } from '../../inventoryWindows'
import { inventoryBundledConfig } from './inventoryTexturesConfig'

// ----- Atlas sprite extraction (for item textures with resource pack support) -----

const spriteCache = new Map<string, string>()

/** Clear sprite extraction cache (call when atlases are updated). */
export function clearInventoryCaches (): void {
  spriteCache.clear()
  inventoryBundledConfig.resetRenderedSlots()
}

function getAtlas (texture: string): CanvasImageSource | null {
  if (!appViewer?.resourcesManager) return null
  const r = appViewer.resourcesManager
  if (texture === 'gui') return (r.currentResources?.guiAtlas?.image ?? null) as unknown as CanvasImageSource | null
  if (texture === 'items') return (r.itemsAtlasParser?.latestImage ?? null) as unknown as CanvasImageSource | null
  if (texture === 'blocks') return (r.blocksAtlasParser?.latestImage ?? null) as unknown as CanvasImageSource | null
  return null
}

/** Extract a single-face sprite from the GUI or items atlas as a data URL. */
function extractSpriteDataUrl (texture: string, slice: number[]): string | undefined {
  const atlas = getAtlas(texture)
  if (!atlas || !slice) return undefined
  const [x, y, w, h] = slice
  const cacheKey = `${texture}:${x}:${y}:${w}:${h}`
  if (spriteCache.has(cacheKey)) return spriteCache.get(cacheKey)

  try {
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(atlas, x, y, w, h, 0, 0, w, h)
    const url = canvas.toDataURL()
    spriteCache.set(cacheKey, url)
    return url
  } catch {
    return undefined
  }
}

/** Build an isometric BlockTextureRender from blockData returned by renderSlot. */
function buildBlockTexture (blockData: Record<string, { slice: number[] } | undefined>): BlockTextureRender | undefined {
  const source = getAtlas('blocks')
  if (!source) return undefined

  const getFace = (...names: string[]): { slice: [number, number, number, number] } | undefined => {
    for (const n of names) {
      const face = (blockData as any)[n]
      if (face?.slice) return { slice: face.slice as [number, number, number, number] }
    }
    return undefined
  }

  const top = getFace('top', 'up', 'all', 'south', 'east', 'west', 'north')
  if (!top) return undefined
  const left = getFace('west', 'north', 'all', 'south', 'east') ?? top
  const right = getFace('south', 'east', 'all', 'north', 'west') ?? top

  return {
    source: source as unknown as HTMLImageElement,
    top,
    left,
    right,
  }
}

// ----- Item mapper – enriches raw bot slots with textures and display info -----

function buildItemMapper (version: string) {
  const PrismarineItem = PItem(version)

  return (raw: { type: number; count: number; metadata?: number; nbt?: unknown },
    mapped: ItemStack): ItemStack => {
    try {
      const slot = new PrismarineItem(raw.type, raw.count, raw.metadata ?? 0) as Item & RenderItem
      if (raw.nbt) (slot as any).nbt = raw.nbt

      const modelName = getItemModelName(
        slot,
        { 'minecraft:display_context': 'gui' },
        appViewer.resourcesManager,
        appViewer.playerState.reactive
      )
      const slotProps = renderSlot({ modelName, originalItemName: slot.name }, appViewer.resourcesManager)

      let texture: string | undefined
      let blockTexture: BlockTextureRender | undefined

      if (slotProps.blockData) {
        blockTexture = buildBlockTexture(slotProps.blockData as Record<string, { slice: number[] } | undefined>)
      } else if (slotProps.slice) {
        texture = extractSpriteDataUrl(slotProps.texture, slotProps.slice)
      }

      const nameRaw = getItemNameRaw(slot, appViewer.resourcesManager)
      const displayName = nameRaw
        ? flat(nameRaw).map((p: any) => (typeof p === 'string' ? p : p.text)).join('')
        : slot.displayName

      return {
        ...mapped,
        name: slot.name,
        displayName,
        texture,
        blockTexture,
        durability: (slot.durabilityUsed ?? undefined) as number | undefined,
        maxDurability: (slot.maxDurability ?? undefined) as number | undefined,
        enchantments: slot.enchants?.map((e: any) => ({ name: e.name, level: e.lvl })),
      }
    } catch {
      return mapped
    }
  }
}

// ----- Texture config – delegates GUI lookups to inventoryBundledConfig -----

const REMOTE_ASSETS = 'https://raw.githubusercontent.com/zardoy/mc-assets/refs/heads/gh-pages/1.21.11/textures'

const textureConfig = {
  getGuiTextureUrl: (path: string) => inventoryBundledConfig.getGuiTextureUrl(path),
  getItemTextureUrl (item: ItemStack) {
    return `${REMOTE_ASSETS}/item/${item.name ?? item.type}.png`
  },
  getBlockTextureUrl (item: ItemStack) {
    return `${REMOTE_ASSETS}/block/${item.name ?? item.type}.png`
  },
}

// ----- Inventory component -----

export const Inventory = () => {
  const appScale = useAppScale()
  const [textureVersion, setTextureVersion] = useState(0)

  const modalStack = useSnapshot(activeModalStack) as Array<{ reactType: string }>
  const activeInvModal = useMemo(
    () => modalStack.findLast(m => m.reactType.startsWith('player_win:')),
    [modalStack],
  )
  const inventoryType = activeInvModal?.reactType.replace('player_win:', '') ?? null

  // Recreate connector when textures refresh so itemMapper re-extracts sprites
  const connector = useMemo(() => {
    if (!inventoryType) return null
    return createMineflayerConnector(bot as MineflayerBot, {
      itemMapper: buildItemMapper(bot.version),
    })
  }, [textureVersion, !!inventoryType])

  // Clear caches and force connector refresh on resource-pack changes
  useEffect(() => {
    const refresh = () => {
      clearInventoryCaches()
      setTextureVersion(v => v + 1)
    }
    appViewer.resourcesManager.on('assetsTexturesUpdated', refresh)
    appViewer.resourcesManager.on('assetsInventoryReady', refresh)
    return () => {
      appViewer.resourcesManager.off('assetsTexturesUpdated', refresh)
      appViewer.resourcesManager.off('assetsInventoryReady', refresh)
    }
  }, [])

  const jeiEnabled = options.jeiEnabled === true
    || (Array.isArray(options.jeiEnabled) && options.jeiEnabled.includes(bot.game?.gameMode as any))

  const jeiItems = useMemo(
    (): JEIItem[] => (inventoryType && jeiEnabled ? getJeiItems() : []),
    [!!inventoryType, jeiEnabled],
  )

  const handleGetRecipes = useCallback(
    (item: JEIItem): RecipeGuide[] => getItemRecipes(item.name),
    [],
  )
  const handleGetUsages = useCallback(
    (item: JEIItem): RecipeGuide[] => getItemUsages(item.name),
    [],
  )

  const handleClose = useCallback(() => {
    if (bot.currentWindow) (bot.currentWindow as any).close?.()
    hideCurrentModal()
  }, [])

  if (!inventoryType || !connector) return null

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000 }}>
      <TextureProvider config={textureConfig}>
        <ScaleProvider scale={appScale}>
          <InventoryProvider connector={connector}>
            <InventoryOverlay
              type={inventoryType}
              showJEI={jeiEnabled}
              jeiItems={jeiEnabled ? jeiItems : []}
              jeiOnGetRecipes={handleGetRecipes}
              jeiOnGetUsages={handleGetUsages}
              onClose={handleClose}
              noWatermark
            />
          </InventoryProvider>
        </ScaleProvider>
      </TextureProvider>
    </div>,
    document.body,
  )
}
