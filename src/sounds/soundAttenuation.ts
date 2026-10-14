export const DEFAULT_ATTENUATION_DISTANCE = 16

export function computeEffectiveVolume (soundEntryVolume: number, packetVolume: number): number {
  return soundEntryVolume * Math.max(packetVolume, 0)
}
