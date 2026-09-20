import { describe, expect, test } from 'vitest'
import { computeUseIndicatorProgress, shouldDisplayUseIndicator, type UseIndicatorClock } from './useItemIndicator'
import type { UseItemSession } from 'minecraft-renderer/src/playerState/types'

const clock = (ticks?: number, changeMs = 0): UseIndicatorClock => ({
  lastElapsedTicks: ticks,
  lastElapsedChangeMs: changeMs,
})

const session = (overrides: Partial<UseItemSession> = {}): UseItemSession => ({
  id: 1,
  itemSnapshot: {
    name: 'bread',
    durationTicks: 32,
    action: 'EAT',
    particleEffect: 'food',
  },
  hand: 0,
  action: 'EAT',
  durationTicks: 32,
  elapsedTicks: 8,
  status: 'active',
  ...overrides,
})

describe('shouldDisplayUseIndicator', () => {
  test('stays visible while awaiting completion', () => {
    expect(shouldDisplayUseIndicator(session({ status: 'awaitingCompletion', elapsedTicks: 32 }))).toBe(true)
    expect(shouldDisplayUseIndicator(session({ status: 'completed' }))).toBe(false)
    expect(shouldDisplayUseIndicator(session({ status: 'cancelled' }))).toBe(false)
  })
})

describe('computeUseIndicatorProgress', () => {
  test('interpolates elapsed plus a 50ms partial toward the next tick', () => {
    const started = computeUseIndicatorProgress(session({ elapsedTicks: 8 }), 1000, clock())
    expect(started.progress).toBe(8 / 32)
    expect(started.pending).toBe(false)

    const halfway = computeUseIndicatorProgress(session({ elapsedTicks: 8 }), 1025, started.clock)
    expect(halfway.progress).toBeCloseTo((8 + 0.5) / 32)
    expect(halfway.pending).toBe(false)

    const fullPartial = computeUseIndicatorProgress(session({ elapsedTicks: 8 }), 1050, started.clock)
    expect(fullPartial.progress).toBeCloseTo(9 / 32)
  })

  test('clamps awaiting completion at 1 and marks it pending', () => {
    const visual = computeUseIndicatorProgress(
      session({ status: 'awaitingCompletion', elapsedTicks: 32 }),
      2000,
      clock(31, 1950)
    )
    expect(visual.progress).toBe(1)
    expect(visual.pending).toBe(true)
  })
})
