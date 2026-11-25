import type { Entity } from 'prismarine-entity'

/**
 * Entity under the cursor from mineflayer-mouse's per-tick cache (its physicsTick update already raycast this tick).
 * `bot.mouse.getCursorState()` would raycast the blocks again; the method is private in the plugin's typings only.
 */
export const getCursorEntity = (): Entity | null => (bot.mouse as unknown as { getCachedRaycastEntity (): Entity | null }).getCachedRaycastEntity()
