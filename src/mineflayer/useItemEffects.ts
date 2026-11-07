import type { UseItemAction } from 'minecraft-renderer/src/playerState/types'

/**
 * Vanilla 1.17.1 LivingEntity.shouldTriggerItemUseEffects (tag source
 * minecraft/src/net/minecraft/world/entity/LivingEntity.java:2829-2835):
 * fast food uses the OR branch before the four-tick modulo check, while
 * ordinary items only trigger once remaining <= duration - 7.
 */
export function shouldTriggerUseEffect (remaining: number, durationTicks: number, isFastFood: boolean): boolean {
  if (remaining <= 0) return false
  return (isFastFood || remaining <= durationTicks - 7) && remaining % 4 === 0
}

/** Build the remaining-tick boundaries in the order they are crossed. */
export function buildUseEffectBoundaries (durationTicks: number, isFastFood: boolean): Set<number> {
  const boundaries = new Set<number>()
  for (let remaining = Math.floor(durationTicks); remaining > 0; remaining--) {
    if (shouldTriggerUseEffect(remaining, durationTicks, isFastFood)) boundaries.add(remaining)
  }
  return boundaries
}

/**
 * Return each boundary crossed by an elapsed-tick advance, descending from
 * the old remaining value. Both endpoints are included so a fast-food
 * duration boundary (for example 16) fires on the first tick, never at
 * session start. The caller owns the fired set and therefore controls
 * idempotence without adding fields to UseItemSession.
 */
export function getCrossedUseEffectBoundaries (
  previousElapsedTicks: number,
  nextElapsedTicks: number,
  durationTicks: number,
  boundaries: ReadonlySet<number>,
  fired: ReadonlySet<number>
): number[] {
  if (nextElapsedTicks <= previousElapsedTicks) return []

  const previousRemaining = durationTicks - previousElapsedTicks
  const nextRemaining = durationTicks - nextElapsedTicks
  const crossed: number[] = []
  for (let remaining = previousRemaining; remaining >= nextRemaining; remaining--) {
    if (remaining > 0 && boundaries.has(remaining) && !fired.has(remaining)) crossed.push(remaining)
  }
  return crossed
}

export type UseEffectPhase = 'periodic' | 'finish'
export type UseEffectSound = 'entity.generic.eat' | 'entity.generic.drink' | 'item.honey_bottle.drink' | 'entity.player.burp'

export interface UseEffectDescriptor {
  sound?: UseEffectSound
  particleCount: number
  burp: boolean
}

/**
 * Vanilla 1.17.1 LivingEntity.triggerItemUseEffects (tag source
 * LivingEntity.java:2897-2908) emits five item particles plus an eating sound
 * for EAT, but only the drinking sound for DRINK. completeUsingItem invokes it
 * with 16 (LivingEntity.java:2924-2937). Foods marks dried kelp as fast
 * (Foods.java:30); Player.eat updates FoodData.eat (FoodData.java:22-31) and
 * then emits PLAYER_BURP (Player.java:1969-1977). HoneyBottleItem delegates
 * to that edible path before returning its bottle (HoneyBottleItem.java:23-45),
 * so honey also burps on finish despite using the DRINK animation. Item
 * defaults are GENERIC_EAT and GENERIC_DRINK (Item.java:348-354), while honey
 * overrides drinking sound to HONEY_DRINK (HoneyBottleItem.java:60-67).
 */
export function getUseEffectDescriptor (action: UseItemAction, itemName: string, phase: UseEffectPhase): UseEffectDescriptor {
  if (action === 'EAT') {
    return {
      sound: 'entity.generic.eat',
      particleCount: phase === 'periodic' ? 5 : 16,
      burp: phase === 'finish',
    }
  }

  if (action === 'DRINK') {
    return {
      sound: itemName === 'honey_bottle' ? 'item.honey_bottle.drink' : 'entity.generic.drink',
      particleCount: 0,
      burp: phase === 'finish' && itemName === 'honey_bottle',
    }
  }

  return { particleCount: 0, burp: false }
}
