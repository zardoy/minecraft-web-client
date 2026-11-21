import { describe, expect, it } from 'vitest'
import { FrameStats, buildPerfReport, perfStatsAllowed } from './perfStatsCore'

const feed = (stats: FrameStats, count: number, dt: number, phase: 0 | 1 | 2) => {
  for (let i = 0; i < count; i++) stats.frame(dt, phase)
}

describe('FrameStats', () => {
  it('separates loading from playing and ignores unmeasured time', () => {
    const stats = new FrameStats()
    feed(stats, 100, 50, 1) // loading at 20 fps
    feed(stats, 300, 16.67, 2) // playing at 60 fps
    feed(stats, 50, 16.67, 0) // hidden
    feed(stats, 5, 5000, 2) // the machine slept
    const summary = stats.summary()
    expect(summary.loadFps).toBeCloseTo(20, 0)
    expect(summary.playFps).toBeCloseTo(60, 0)
    expect(summary.frames).toBe(300)
    expect(summary.stutters100).toBe(0)
  })

  it('counts frames over 50 and 100 ms only while playing, and the worst frame', () => {
    const stats = new FrameStats()
    feed(stats, 200, 16, 2)
    feed(stats, 3, 70, 2)
    feed(stats, 2, 140, 2)
    feed(stats, 4, 150, 1) // loading stutters are counted apart
    const summary = stats.summary()
    expect(summary.stutters50).toBe(5)
    expect(summary.stutters100).toBe(2)
    expect(summary.loadStutters100).toBe(4)
    expect(summary.worstMs).toBe(140)
    expect(summary.jankPct).toBeCloseTo((5 / 205) * 100, 0)
  })

  it('p95 is a frame time that 95% of the frames stay under', () => {
    const stats = new FrameStats()
    feed(stats, 95, 10, 2)
    feed(stats, 5, 80, 2)
    expect(stats.summary().p95Ms).toBe(10)
    feed(stats, 20, 80, 2)
    expect(stats.summary().p95Ms).toBe(80)
  })

  it('the window covers the time since the last call, in the phase that had more of it', () => {
    const stats = new FrameStats()
    feed(stats, 100, 16.67, 2)
    expect(stats.takeWindow()).toMatchObject({ phase: 2, stutters100: 0 })
    expect(stats.takeWindow()).toBeUndefined()
    feed(stats, 10, 100, 1)
    feed(stats, 10, 20, 2)
    const window = stats.takeWindow()!
    expect(window.phase).toBe(1)
    expect(window.fps).toBe(10)
    expect(window.stutters100).toBe(0) // 100 ms is not over 100
  })
})

describe('perfStatsAllowed', () => {
  it('is on by default and off with the setting', () => {
    expect(perfStatsAllowed({ option: true })).toBe(true)
    expect(perfStatsAllowed({ option: false })).toBe(false)
  })
  it('Do Not Track and the global privacy control turn it off even when the setting is on', () => {
    expect(perfStatsAllowed({ option: true, doNotTrack: '1' })).toBe(false)
    expect(perfStatsAllowed({ option: true, globalPrivacyControl: true })).toBe(false)
    expect(perfStatsAllowed({ option: true, doNotTrack: '0' })).toBe(true)
  })
  it('the url parameter wins over everything', () => {
    expect(perfStatsAllowed({ option: true, urlParam: '0' })).toBe(false)
    expect(perfStatsAllowed({ option: false, urlParam: '1', doNotTrack: '1' })).toBe(true)
  })
})

describe('buildPerfReport', () => {
  it('stays well under the proxy limit with a full device block and every setting', () => {
    const json = buildPerfReport({
      t: 123.4,
      phase: 2,
      device: { gpu: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)', cpuTier: 3, ramGb: 8, cores: 8, pixelRatio: 2, screenW: 1512, screenH: 982, canvasW: 3024, canvasH: 1964, touch: false },
      settings: { renderDistance: 6, newVersionsLighting: true, clientLighting: true, smoothLighting: true, animatedTextures: 'smooth', sunShadows: true, wavingFoliage: true, rendererMesher: 'wasm' },
      stages: { prepMs: 4200, loginMs: 900, chunksMs: 5100, chunksTotal: 169 },
      summary: new FrameStats().summary(),
      window: { phase: 2, fps: 58.5, p95Ms: 22, stutters100: 0 }
    })
    expect(json.length).toBeLessThan(1500)
    const parsed = JSON.parse(json)
    expect(parsed.v).toBe(1)
    expect(parsed.t).toBe(123)
  })
})
