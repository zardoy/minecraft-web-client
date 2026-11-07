import type { UseItemAction } from 'minecraft-renderer/src/playerState/types'

export type HungerGateOptions = {
  isCreative?: boolean
  alwaysEdible?: boolean
}

const ALWAYS_EDIBLE_FOOD_NAMES: Record<string, true> = {
  chorus_fruit: true,
  enchanted_golden_apple: true,
  golden_apple: true,
  suspicious_stew: true,
}

/**
 * Return whether vanilla permits the food action at the current hunger level.
 *
 * Verified against 1.17.1 with `git show 1.17.1:<path>`:
 * - `minecraft/src/net/minecraft/world/entity/player/Player.java:1629-1630`
 *   implements `canEat(boolean)` as `abilities.invulnerable || bl || needsFood()`.
 * - `minecraft/src/net/minecraft/world/food/FoodData.java:100-101` implements
 *   `needsFood()` as `foodLevel < 20`.
 * - `minecraft/src/net/minecraft/world/food/Foods.java:20,31-47,81` marks
 *   chorus fruit, enchanted golden apple, golden apple, and suspicious stew as
 *   `alwaysEat`; honey at line 48 is not marked always-edible.
 * - Honey, milk, and potion use paths call `startUsingInstantly` at
 *   `HoneyBottleItem.java:70-71`, `MilkBucketItem.java:48-49`, and
 *   `PotionItem.java:83-84`; those are drinks and are gated by action, not name.
 *
 * An unknown food level is allowed so a pre-spawn client never suppresses input.
 * Saturation and health are intentionally not consulted.
 */
export const canEatFood = (
  name: string,
  foodLevel: number | undefined,
  options: HungerGateOptions = {},
): boolean => {
  if (options.isCreative || options.alwaysEdible || ALWAYS_EDIBLE_FOOD_NAMES[name]) return true
  return foodLevel === undefined || foodLevel < 20
}

/**
 * Hunger only constrains the EAT action. Drinks and other use actions must
 * remain available regardless of item name or hunger level.
 */
export const canUseItemAtHunger = (
  action: UseItemAction,
  name: string,
  foodLevel: number | undefined,
  options?: HungerGateOptions,
): boolean => action !== 'EAT' || canEatFood(name, foodLevel, options)
