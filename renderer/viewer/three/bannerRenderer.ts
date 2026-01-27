import * as THREE from 'three'
import { Vec3 } from 'vec3'
import { createCanvas } from '../lib/utils'
import type { WorldRendererThree } from './worldrendererThree'

type BannerBlockEntity = {
  Patterns?: Array<{
    Color?: number
    Pattern?: string
  }>
}

// Banner cloth size is 20x40
const BANNER_WIDTH = 20
const BANNER_HEIGHT = 40

// Map banner block names to base color IDs
const BANNER_NAME_TO_COLOR: Record<string, number> = {
  'white_banner': 15,
  'orange_banner': 14,
  'magenta_banner': 13,
  'light_blue_banner': 12,
  'yellow_banner': 11,
  'lime_banner': 10,
  'pink_banner': 9,
  'gray_banner': 8,
  'light_gray_banner': 7,
  'cyan_banner': 6,
  'purple_banner': 5,
  'blue_banner': 4,
  'brown_banner': 3,
  'green_banner': 2,
  'red_banner': 1,
  'black_banner': 0,
}

// Basic Minecraft banner colors (DyeColor enum values)
const BANNER_COLORS: Record<number, string> = {
  0: '#1d1d21', // black
  1: '#b02e26', // red
  2: '#5e7c16', // green
  3: '#835432', // brown
  4: '#3c44aa', // blue
  5: '#8932b8', // purple
  6: '#169c9c', // cyan
  7: '#9d9d97', // light_gray
  8: '#474f52', // gray
  9: '#f38baa', // pink
  10: '#80c71f', // lime
  11: '#fed83d', // yellow
  12: '#3ab3da', // light_blue
  13: '#c74ebd', // magenta
  14: '#f9801d', // orange
  15: '#f9fffe', // white
}

// Extract base color from banner block name
function getBannerBaseColor (blockName: string): number {
  // Remove _wall_banner suffix if present
  const baseName = blockName.replace('_wall_banner', '_banner')
  return BANNER_NAME_TO_COLOR[baseName] ?? 15 // Default to white
}

// Basic pattern rendering (simplified - just solid colors for now)
const renderPattern = (
  ctx: OffscreenCanvasRenderingContext2D,
  pattern: string,
  color: string,
  x: number,
  y: number,
  width: number,
  height: number
) => {
  ctx.fillStyle = color
  // For now, just render basic patterns as solid colors
  // TODO: Implement actual pattern shapes (stripes, crosses, etc.)
  switch (pattern) {
    case 'bs': // Base
      ctx.fillRect(x, y, width, height)
      break
    case 'ls': // Left stripe
      ctx.fillRect(x, y, width / 3, height)
      break
    case 'rs': // Right stripe
      ctx.fillRect(x + (width * 2 / 3), y, width / 3, height)
      break
    case 'ts': // Top stripe
      ctx.fillRect(x, y, width, height / 3)
      break
    case 'ms': // Middle stripe
      ctx.fillRect(x, y + (height / 3), width, height / 3)
      break
    case 'drs': // Down-right stripe
      ctx.fillRect(x, y, width / 2, height / 2)
      break
    case 'dls': // Down-left stripe
      ctx.fillRect(x + (width / 2), y, width / 2, height / 2)
      break
    case 'ss': // Small stripes
      for (let i = 0; i < width; i += 2) {
        ctx.fillRect(x + i, y, 1, height)
      }
      break
    case 'cr': // Cross
      ctx.fillRect(x, y + (height / 3), width, height / 3)
      ctx.fillRect(x + (width / 3), y, width / 3, height)
      break
    case 'sc': // Straight cross
      ctx.fillRect(x, y + (height / 2) - 1, width, 2)
      ctx.fillRect(x + (width / 2) - 1, y, 2, height)
      break
    default:
      // Default: fill entire area
      ctx.fillRect(x, y, width, height)
  }
}

// Create a cache key from banner content (base color + patterns)
function createBannerCacheKey (baseColor: number, patterns: Array<{ Color?: number, Pattern?: string }> | undefined): string {
  if (!patterns || patterns.length === 0) {
    return `banner_${baseColor}_empty`
  }
  const patternStr = patterns.map(p => `${p.Pattern ?? 'bs'}_${p.Color ?? 0}`).join(',')
  return `banner_${baseColor}_${patternStr}`
}

export const renderBanner = (
  baseColor: number,
  blockEntity: BannerBlockEntity,
  canvasCreator = (width: number, height: number): OffscreenCanvas => {
    return createCanvas(width, height)
  }
) => {
  // Create canvas with banner cloth size (20x40)
  const scale = 1
  const canvas = canvasCreator(BANNER_WIDTH * scale, BANNER_HEIGHT * scale)
  const ctx = canvas.getContext('2d')!

  if (!ctx) {
    console.warn('Failed to get 2d context for banner rendering')
    return undefined
  }

  ctx.imageSmoothingEnabled = false

  // Base color rendering disabled
  // // Always render base color first (even if no patterns)
  // const baseColorHex = BANNER_COLORS[baseColor] || BANNER_COLORS[15]
  // ctx.fillStyle = baseColorHex
  // ctx.fillRect(0, 0, BANNER_WIDTH * scale, BANNER_HEIGHT * scale)

  // Render patterns on top of base color (if any)
  if (blockEntity?.Patterns && blockEntity.Patterns.length > 0) {
    for (const patternData of blockEntity.Patterns) {
      const colorId = patternData.Color ?? 0
      const pattern = patternData.Pattern ?? 'bs'
      const color = BANNER_COLORS[colorId] || BANNER_COLORS[0]

      // Render each pattern on top of previous ones
      renderPattern(
        ctx,
        pattern,
        color,
        0,
        0,
        BANNER_WIDTH * scale,
        BANNER_HEIGHT * scale
      )
    }
  }

  return canvas
}


// Banner texture cache with reference counting
const bannerTextureCache = new Map<string, { texture: THREE.Texture, refCount: number }>()

export function getBannerTexture (
  worldRenderer: WorldRendererThree,
  blockName: string,
  blockEntity: any
): THREE.Texture | undefined {
  // Extract base color from block name
  const baseColor = getBannerBaseColor(blockName)

  // Create cache key from banner content (not position)
  const cacheKey = createBannerCacheKey(baseColor, blockEntity?.Patterns)

  // Check cache
  const cached = bannerTextureCache.get(cacheKey)
  if (cached) {
    cached.refCount++
    return cached.texture
  }

  // Render new banner
  const canvas = renderBanner(baseColor, blockEntity)
  if (!canvas) return undefined

  const tex = new THREE.Texture(canvas)
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestFilter
  tex.needsUpdate = true

  // Store in cache with reference count
  bannerTextureCache.set(cacheKey, { texture: tex, refCount: 1 })
  return tex
}

export function releaseBannerTexture (texture: THREE.Texture): void {
  // Find and decrement reference count
  for (const [key, cached] of bannerTextureCache.entries()) {
    if (cached.texture === texture) {
      cached.refCount--
      if (cached.refCount <= 0) {
        // Cleanup unused texture
        cached.texture.dispose()
        bannerTextureCache.delete(key)
      }
      return
    }
  }
}

export function createBannerMesh (
  position: Vec3,
  rotation: number,
  isWall: boolean,
  texture: THREE.Texture
): THREE.Group & { bannerTexture?: THREE.Texture } {
  const bannerWidth = 13.6 / 16
  const bannerHeight = 28 / 16
  const clothXOffset = 0

  let clothYOffset: number
  let clothZPosition: number
  let heightOffset: number

  if (isWall) {
    // Wall banner: Cloth from [1.2, -14.6, 14.5] to [14.8, 13.4, 15]
    clothYOffset = (-14.6 + 13.4) / 2 / 16 - 0.5
    clothZPosition = 1 - 14.75 / 16 - 0.5
    heightOffset = 1 / 2
  } else {
    // Standing banner: Cloth from [1.2, 1.4, 7] to [14.8, 29.4, 7.5]
    clothYOffset = (1.4 + 29.4) / 2 / 16
    clothZPosition = 1 - 7.25 / 16 - 0.5
    heightOffset = 0
  }

  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(bannerWidth, bannerHeight),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true })
  )
  mesh.renderOrder = 999

  const thickness = 0.5 / 16
  const wallSpacing = 0.25 / 16
  if (isWall) {
    mesh.position.set(clothXOffset, clothYOffset, clothZPosition + wallSpacing + 0.004)
  } else {
    mesh.position.set(clothXOffset, clothYOffset, clothZPosition + thickness / 2 + 0.004)
  }

  const group = new THREE.Group() as THREE.Group & { bannerTexture?: THREE.Texture }
  group.rotation.set(
    0,
    -THREE.MathUtils.degToRad(rotation * (isWall ? 90 : 45 / 2)),
    0
  )
  group.add(mesh)
  group.bannerTexture = texture
  group.position.set(position.x + 0.5, position.y + heightOffset, position.z + 0.5)
  return group
}
