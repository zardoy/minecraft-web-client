import { describe, expect, it } from 'vitest'
import { ESTIMATE_CAP, LoadingProgressModel } from './loadingProgressModel'

const stages = [
  { id: 'a', label: 'A', weight: 10, expectedMs: 1000 },
  { id: 'b', label: 'B', weight: 30, expectedMs: 4000 },
  { id: 'c', label: 'C', weight: 60, expectedMs: 2000 }
]

const make = () => {
  let t = 0
  const model = new LoadingProgressModel(stages, () => t)
  return { model, advance (ms: number) { t += ms } }
}

describe('LoadingProgressModel', () => {
  it('starts at 0 and counts finished stages by their weight', () => {
    const { model } = make()
    expect(model.value()).toBe(0)
    model.begin('a')
    model.begin('b')
    expect(model.value()).toBeCloseTo(0.1)
    model.begin('c')
    expect(model.value()).toBeCloseTo(0.4)
  })

  it('estimates a stage without progress from its expected duration and never completes it on its own', () => {
    const { model, advance } = make()
    model.begin('b')
    advance(4000)
    // stage a (10 %) counts as done, plus 1 - exp(-1) of stage b which is worth 30 %
    expect(model.value()).toBeCloseTo(0.1 + 0.3 * (1 - Math.exp(-1)))
    advance(10 * 60_000)
    expect(model.value()).toBeCloseTo(0.1 + 0.3 * ESTIMATE_CAP)
    expect(model.value()).toBeLessThan(0.4)
  })

  it('uses the real progress of the running stage instead of the estimate', () => {
    const { model, advance } = make()
    model.begin('a')
    model.begin('b')
    advance(60_000)
    model.report('b', 0.5, '3 / 6 MB')
    expect(model.value()).toBeCloseTo(0.1 + 0.3 * 0.5)
    expect(model.detail).toBe('3 / 6 MB')
    // a stage that is not running ignores reports
    model.report('c', 1)
    expect(model.value()).toBeCloseTo(0.25)
  })

  it('never goes backwards, even when a late real report is lower than the estimate that was shown', () => {
    const { model, advance } = make()
    model.begin('b')
    advance(8000)
    const shownByEstimate = model.value()
    model.report('b', 0.1)
    expect(model.value()).toBeGreaterThanOrEqual(shownByEstimate)
  })

  it('ignores a stage that already passed and reaches 1 only with finishAll', () => {
    const { model } = make()
    model.begin('c')
    model.report('c', 5)
    expect(model.value()).toBeLessThan(1)
    model.begin('a')
    expect(model.currentStage?.id).toBe('c')
    model.finishAll()
    expect(model.value()).toBe(1)
  })
})
