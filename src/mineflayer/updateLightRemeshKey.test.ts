import { describe, expect, it } from 'vitest'
import { updateLightRemeshBlockKey } from './updateLightRemeshKey'

describe('updateLightRemeshBlockKey', () => {
  it('maps chunk coords to block coords used by worldView loadedChunks', () => {
    expect(updateLightRemeshBlockKey(0, 0)).toBe('0,0')
    expect(updateLightRemeshBlockKey(1, 2)).toBe('16,32')
    expect(updateLightRemeshBlockKey(-1, -3)).toBe('-16,-48')
  })

  it('does not use raw chunk coords as keys', () => {
    const chunkX = 5
    const chunkZ = 7
    expect(updateLightRemeshBlockKey(chunkX, chunkZ)).not.toBe(`${chunkX},${chunkZ}`)
  })
})
