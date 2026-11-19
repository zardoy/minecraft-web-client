import { describe, expect, it } from 'vitest'
import { lowMemoryWorldgenWorkers } from './lowMemoryDevice'

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.7 Mobile/15E148 Safari/604.1'
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'
const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15'
const WINDOWS = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'

describe('lowMemoryWorldgenWorkers', () => {
  it('uses one worker on iPhone and on iPadOS, which reports itself as a Mac', () => {
    expect(lowMemoryWorldgenWorkers({ userAgent: IPHONE })).toBe(1)
    expect(lowMemoryWorldgenWorkers({ userAgent: MAC, platform: 'MacIntel', maxTouchPoints: 5 })).toBe(1)
  })

  it('uses one worker on Android with 8 GB or less, or when the memory is not reported', () => {
    expect(lowMemoryWorldgenWorkers({ userAgent: ANDROID, deviceMemory: 4 })).toBe(1)
    expect(lowMemoryWorldgenWorkers({ userAgent: ANDROID, deviceMemory: 8 })).toBe(1)
    expect(lowMemoryWorldgenWorkers({ userAgent: ANDROID })).toBe(1)
  })

  it('keeps the default on a Mac and on Windows', () => {
    expect(lowMemoryWorldgenWorkers({ userAgent: MAC, platform: 'MacIntel', maxTouchPoints: 0 })).toBeUndefined()
    expect(lowMemoryWorldgenWorkers({ userAgent: WINDOWS, platform: 'Win32', deviceMemory: 8 })).toBeUndefined()
  })
})
