import { createBundledTexturesConfig } from 'minecraft-inventory/src/bundledTexturesConfig'

/**
 * Singleton bundled-textures config for the React inventory.
 * Used by Inventory.tsx for getGuiTextureUrl and by resourcePack.ts
 * to push resource-pack overrides via setOverride().
 */
export const inventoryBundledConfig = createBundledTexturesConfig({
  remoteFallback: false
})
