import fs from 'fs'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { DEFAULT_ATTENUATION_DISTANCE } from './soundAttenuation'
import { parseSoundMapVariant } from './soundMapFormat'
import { SoundMap } from './soundsMap'

vi.mock('../basicSounds', () => ({ stopAllSounds: vi.fn() }))
vi.mock('./musicSystem', () => ({ musicSystem: { stopMusic: vi.fn(), playMusic: vi.fn() } }))

describe('parseSoundMapVariant', () => {
  it('parses legacy 3-field bundles with default attenuation distance', () => {
    expect(parseSoundMapVariant('1;dig/stone1;1')).toEqual({
      file: 'dig/stone1',
      weight: 1,
      volume: 1,
      attenuationDistance: DEFAULT_ATTENUATION_DISTANCE
    })
  })

  it('parses new 4-field bundles with explicit attenuation distance', () => {
    expect(parseSoundMapVariant('12;block/bell/bell_use01;1;16')).toEqual({
      file: 'block/bell/bell_use01',
      weight: 1,
      volume: 12,
      attenuationDistance: 16
    })
    expect(parseSoundMapVariant('1;block/amethyst/resonate1;1;48')).toEqual({
      file: 'block/amethyst/resonate1',
      weight: 1,
      volume: 1,
      attenuationDistance: 48
    })
    expect(parseSoundMapVariant('1;block/beacon/activate;1;7')).toEqual({
      file: 'block/beacon/activate',
      weight: 1,
      volume: 1,
      attenuationDistance: 7
    })
  })
})

describe('SoundMap.getSoundUrl', () => {
  const soundData = {
    allSoundsMap: {
      '1.21.4': {
        '0;block.stone.break': '1;dig/stone1;1',
        '1;block.bell.use': '12;block/bell/bell_use01;1;16',
        '2;block.amethyst_block.resonate': '1;block/amethyst/resonate1;1;48',
        '3;block.beacon.activate': '1;block/beacon/activate;1;7'
      }
    },
    soundsLegacyMap: {},
    soundsMeta: {
      format: 'mp3',
      baseUrl: 'https://example.com/sounds'
    }
  }

  it('returns effective volume without upper clamp for bell-like entries', async () => {
    const map = new SoundMap(soundData, '1.21.4')
    const result = await map.getSoundUrl('block.bell.use', 2)
    expect(result).toMatchObject({
      volume: 24,
      attenuationDistance: 16
    })
    expect(result?.url).toContain('block/bell/bell_use01.mp3')
  })

  it('keeps custom attenuation distance from packed bundle', async () => {
    const map = new SoundMap(soundData, '1.21.4')
    const result = await map.getSoundUrl('block.amethyst_block.resonate', 1)
    expect(result).toMatchObject({
      volume: 1,
      attenuationDistance: 48
    })
  })

  it('defaults attenuation distance for legacy bundle entries', async () => {
    const map = new SoundMap(soundData, '1.21.4')
    const result = await map.getSoundUrl('block.stone.break', 0.6)
    expect(result).toMatchObject({
      volume: 0.6,
      attenuationDistance: DEFAULT_ATTENUATION_DISTANCE
    })
  })

  it('reads attenuation_distance from resource-pack sounds.json', async () => {
    const readFileSpy = vi.spyOn(fs.promises, 'readFile').mockImplementation(async (filePath) => {
      if (String(filePath).endsWith('sounds.json')) {
        return JSON.stringify({
          'block.custom.sound': {
            category: 'block',
            sounds: [{
              name: 'custom/sound',
              volume: 1,
              attenuation_distance: 7
            }]
          }
        })
      }
      return Buffer.from('audio')
    })
    const map = new SoundMap(soundData, '1.21.4')
    await map.updateActiveResourcePackBasePath('/resourcepack')

    const result = await map.getSoundUrl('block.custom.sound', 1)
    expect(result).toMatchObject({
      volume: 1,
      attenuationDistance: 7
    })
    readFileSpy.mockRestore()
  })
})
