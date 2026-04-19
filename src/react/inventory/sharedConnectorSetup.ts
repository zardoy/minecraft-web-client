import type { ItemStack, BlockTextureRender } from 'minecraft-inventory/src/types'
import { flat } from '@xmcl/text-component'
import PItem from 'prismarine-item'
import type { Item } from 'prismarine-item'
import { renderSlot } from 'renderer/viewer/three/renderSlot'
import { getItemModelName, getItemNameRaw, RenderItem } from '../../mineflayer/items'
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
  if (texture === 'items') return (r.currentResources?.itemsAtlasImage ?? null) as unknown as CanvasImageSource | null
  if (texture === 'blocks') return (r.currentResources?.blocksAtlasImage ?? null) as unknown as CanvasImageSource | null
  return null
}

/** Get atlas source suitable for the block renderer (accepts string data URLs). */
function getAtlasForBlockRenderer (texture: string): HTMLImageElement | string | null {
  if (!appViewer?.resourcesManager) return null
  const r = appViewer.resourcesManager
  if (texture === 'blocks') return (r.blocksAtlasParser?.latestImage ?? null)
  return null
}

/** Extract a single-face sprite from the GUI or items atlas as a data URL. */
export function extractSpriteDataUrl (texture: string, slice: number[]): string | undefined {
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
export function buildBlockTexture (blockData: Record<string, { slice: number[] } | undefined>): BlockTextureRender | undefined {
  const source = getAtlasForBlockRenderer('blocks')
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
  const left = getFace('left', 'east', 'west', 'all') ?? top
  const right = getFace('right', 'north', 'south', 'all') ?? top

  return {
    source: source as unknown as HTMLImageElement,
    top,
    left,
    right,
  }
}

// ----- Item mapper – enriches raw bot slots with textures and display info -----

export function buildItemMapper (version: string) {
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
        durability: (typeof slot.maxDurability === 'number' && typeof slot.durabilityUsed === 'number')
          ? slot.maxDurability - slot.durabilityUsed
          : undefined,
        maxDurability: (slot.maxDurability ?? undefined) as number | undefined,
        enchantments: slot.enchants?.map((e: any) => ({ name: e.name, level: e.lvl })),
      }
    } catch {
      return mapped
    }
  }
}

// ----- Texture config – delegates GUI lookups to inventoryBundledConfig -----

export const textureConfig = {
  getGuiTextureUrl: (path: string) => inventoryBundledConfig.getGuiTextureUrl(path),
  getItemTextureUrl (_item: ItemStack) {
    return ''
  },
  getBlockTextureUrl (_item: ItemStack) {
    return ''
  },
}

// ----- Window title formatter – resolves JSON text components to display strings -----

/** Parse a raw window title (JSON string, NBT object, or plain text) into a readable string. */
export function formatWindowTitle (rawTitle: any): string {
  if (rawTitle === null || rawTitle === undefined) return ''
  if (typeof rawTitle === 'string') {
    // Try to parse JSON text component
    if (rawTitle.startsWith('{') || rawTitle.startsWith('"')) {
      try {
        return formatWindowTitle(JSON.parse(rawTitle))
      } catch {
        // Not valid JSON — treat as plain text
      }
    }
    return rawTitle
  }
  if (typeof rawTitle === 'object') {
    // Handle NBT-simplified format: { value: "...", type: "string" }
    if ('value' in rawTitle && rawTitle.type === 'string') {
      return formatWindowTitle(rawTitle.value)
    }
    // Handle translate key: { translate: "container.chestDouble" }
    if (rawTitle.translate) {
      const lang = (globalThis as any).loadedData?.language
      return lang?.[rawTitle.translate] ?? rawTitle.translate
    }
    // Handle text key: { text: "Custom Name" }
    if (typeof rawTitle.text === 'string') {
      return rawTitle.text
    }
    // Handle extra/with arrays by joining
    if (rawTitle.extra) {
      return (rawTitle.extra as any[]).map(formatWindowTitle).join('')
    }
    // Fallback: stringify for non-empty objects
    if (typeof rawTitle[''] === 'string') return rawTitle['']
  }
  return String(rawTitle)
}
