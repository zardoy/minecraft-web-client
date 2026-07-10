import { DEFAULT_ATTENUATION_DISTANCE } from './soundAttenuation'

export interface SoundEntry {
  file: string
  weight: number
  volume: number
  attenuationDistance: number
}

export function parseSoundMapVariant (packed: string): SoundEntry {
  const [volume, name, weight, attenuationDistance] = packed.split(';')
  if (isNaN(Number(volume))) throw new Error('volume is not a number')
  if (isNaN(Number(weight))) throw new TypeError('weight is not a number')
  if (attenuationDistance !== undefined && attenuationDistance !== '' && isNaN(Number(attenuationDistance))) {
    throw new TypeError('attenuation distance is not a number')
  }
  return {
    file: name,
    weight: Number(weight),
    volume: Number(volume),
    attenuationDistance: attenuationDistance !== undefined && attenuationDistance !== ''
      ? Number(attenuationDistance)
      : DEFAULT_ATTENUATION_DISTANCE
  }
}
