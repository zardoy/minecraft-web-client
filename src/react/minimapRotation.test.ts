import { describe, expect, it } from 'vitest'
import { nextMinimapRotation } from './minimapRotation'

describe('nextMinimapRotation', () => {
  it('turns a little when the yaw wraps past 2π', () => {
    const shown = nextMinimapRotation(undefined, Math.PI * 2 - 0.02)
    const next = nextMinimapRotation(shown, 0.01)
    expect(next - shown).toBeCloseTo(0.03)
    expect(nextMinimapRotation(next, Math.PI * 2 - 0.02) - next).toBeCloseTo(-0.03)
  })

  it('keeps following the yaw after many full turns', () => {
    let shown: number | undefined
    for (let i = 0; i <= 1000; i++) shown = nextMinimapRotation(shown, (i * 0.1) % (Math.PI * 2))
    expect(shown).toBeCloseTo(100)
  })

  it('starts at the yaw', () => {
    expect(nextMinimapRotation(undefined, 1.5)).toBe(1.5)
  })
})
