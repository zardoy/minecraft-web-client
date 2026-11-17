import { describe, expect, it, vi } from 'vitest'
import { resolveAuthProxy } from './authProxy'

const base = { proxy: undefined, selected: undefined, proxies: ['https://a.example', 'https://b.example'], isAutoSelect: true }

describe('resolveAuthProxy', () => {
  it('uses the proxy of the connection when there is one', async () => {
    const selectBest = vi.fn()
    expect(await resolveAuthProxy({ ...base, proxy: 'https://mine.example' }, selectBest)).toBe('https://mine.example')
    expect(selectBest).not.toHaveBeenCalled()
  })

  it('for a direct WebSocket server (no proxy) uses the proxy selected in the settings', async () => {
    const selectBest = vi.fn()
    expect(await resolveAuthProxy({ ...base, selected: 'https://picked.example', isAutoSelect: false }, selectBest)).toBe('https://picked.example')
    expect(selectBest).not.toHaveBeenCalled()
  })

  it('when auto-selecting, uses the best of the known proxies', async () => {
    expect(await resolveAuthProxy({ ...base, selected: 'https://old.example' }, async proxies => proxies[1])).toBe('https://b.example')
  })

  it('falls back to the selected proxy when none of the known ones works, and fails with a clear message when there is nothing', async () => {
    expect(await resolveAuthProxy({ ...base, selected: 'https://old.example' }, async () => null)).toBe('https://old.example')
    await expect(resolveAuthProxy({ ...base, proxies: [] }, async () => null)).rejects.toThrow('needs a proxy server')
  })
})
