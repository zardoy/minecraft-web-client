/**
 * Browser bundle shim for minecraft-renderer `require('esbuild-data').tints`.
 * Avoids direct minecraft-data/json paths blocked by rspackViewerConfig.
 */
import optimized from '../../generated/minecraft-data-optimized.json'
import { restoreMinecraftData } from '../optimizeJson'

const VERSION = '1.16.5'

let tintsCache: Record<string, unknown> | undefined

function loadTints(): Record<string, unknown> {
  if (!tintsCache) {
    tintsCache = restoreMinecraftData(optimized, 'tints', VERSION) as Record<string, unknown>
  }
  return tintsCache
}

/** Named export so `require('esbuild-data').tints` works under rspack. */
export const tints = loadTints()

export default { tints }
