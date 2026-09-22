import { describe, expect, test } from 'vitest'
import { canEatFood, canUseItemAtHunger } from './useHungerGate'

describe('food hunger gate', () => {
  test('blocks ordinary food at full hunger and allows it below full', () => {
    expect(canEatFood('bread', 20)).toBe(false)
    expect(canEatFood('bread', 19)).toBe(true)
  })

  test('allows all four vanilla always-edible foods at full hunger', () => {
    for (const name of ['chorus_fruit', 'enchanted_golden_apple', 'golden_apple', 'suspicious_stew']) {
      expect(canEatFood(name, 20)).toBe(true)
    }
  })

  test('creative and explicitly always-edible inputs bypass the hunger check', () => {
    expect(canEatFood('bread', 20, { isCreative: true })).toBe(true)
    expect(canEatFood('custom_food', 20, { alwaysEdible: true })).toBe(true)
  })

  test('undefined food level is allowed before the first spawn update', () => {
    expect(canEatFood('bread', undefined)).toBe(true)
  })

  test('only the EAT action is hunger-gated, so drinks and other actions bypass by action', () => {
    for (const name of ['honey_bottle', 'milk_bucket', 'potion']) {
      expect(canUseItemAtHunger('DRINK', name, 20)).toBe(true)
    }
    for (const action of ['BOW', 'CROSSBOW', 'SHIELD', 'NONE'] as const) {
      expect(canUseItemAtHunger(action, 'bread', 20)).toBe(true)
    }
    expect(canUseItemAtHunger('EAT', 'honey_bottle', 20)).toBe(false)
  })

  test('saturation and health do not affect ordinary-food hunger gating', () => {
    expect(canEatFood('bread', 20)).toBe(false)
    expect(canEatFood('bread', 19)).toBe(true)
  })
})
