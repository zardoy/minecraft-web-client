export const computeBlockStateHash = (blockStateIds: Uint16Array | number[]): string => {
  const data = blockStateIds instanceof Uint16Array
    ? blockStateIds
    : new Uint16Array(blockStateIds)

  let hash = 2_166_136_261 // FNV offset basis
  for (const stateId of data) {
    hash ^= stateId
    hash = Math.imul(hash, 16_777_619) // FNV prime
  }

  return (hash >>> 0).toString(16).padStart(8, '0')
}
