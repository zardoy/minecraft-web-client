import { describe, expect, test } from 'vitest'
import { buildUseEffectBoundaries, getCrossedUseEffectBoundaries, getUseEffectDescriptor, shouldTriggerUseEffect } from './useItemEffects'

describe('use-item effect boundaries', () => {
  test('normal food uses the vanilla duration-minus-seven boundaries', () => {
    expect([...buildUseEffectBoundaries(32, false)]).toEqual([24, 20, 16, 12, 8, 4])
  })

  test('fast food keeps the vanilla OR branch at the initial boundary', () => {
    expect([...buildUseEffectBoundaries(16, true)]).toEqual([16, 12, 8, 4])
    expect([...buildUseEffectBoundaries(16, false)]).toEqual([8, 4])
  })

  test('honey drink follows the normal 40-tick boundary set', () => {
    expect([...buildUseEffectBoundaries(40, false)]).toEqual([32, 28, 24, 20, 16, 12, 8, 4])
  })

  test('remaining zero is never a periodic boundary', () => {
    expect(shouldTriggerUseEffect(0, 32, false)).toBe(false)
    expect(buildUseEffectBoundaries(0, false).has(0)).toBe(false)
  })

  test('repeated elapsed values do not fire a boundary twice', () => {
    const boundaries = buildUseEffectBoundaries(16, true)
    const fired = new Set<number>()
    const first = getCrossedUseEffectBoundaries(0, 5, 16, boundaries, fired)
    first.forEach(remaining => fired.add(remaining))
    expect(first).toEqual([16, 12])
    expect(getCrossedUseEffectBoundaries(0, 5, 16, boundaries, fired)).toEqual([])
  })
})

describe('use-item effect descriptors', () => {
  test('drink descriptors never request EAT particles', () => {
    expect(getUseEffectDescriptor('DRINK', 'potion', 'periodic')).toEqual({
      sound: 'entity.generic.drink',
      particleCount: 0,
      burp: false,
    })
    expect(getUseEffectDescriptor('DRINK', 'honey_bottle', 'finish')).toEqual({
      sound: 'item.honey_bottle.drink',
      particleCount: 0,
      burp: true,
    })
  })

  test('food descriptors distinguish periodic and finish effects', () => {
    expect(getUseEffectDescriptor('EAT', 'bread', 'periodic')).toEqual({
      sound: 'entity.generic.eat',
      particleCount: 5,
      burp: false,
    })
    expect(getUseEffectDescriptor('EAT', 'bread', 'finish')).toEqual({
      sound: 'entity.generic.eat',
      particleCount: 16,
      burp: true,
    })
  })

  test('non-consumable actions produce no effects', () => {
    expect(getUseEffectDescriptor('BOW', 'bow', 'periodic')).toEqual({ particleCount: 0, burp: false })
    expect(getUseEffectDescriptor('SHIELD', 'shield', 'finish')).toEqual({ particleCount: 0, burp: false })
  })
})
