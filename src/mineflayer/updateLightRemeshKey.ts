/** Block-coord key for loadedChunks / waitingSpiralChunksLoad (matches worldView.loadChunk). */
export function updateLightRemeshBlockKey (chunkX: number, chunkZ: number): string {
  const bx = chunkX * 16
  const bz = chunkZ * 16
  return `${bx},${bz}`
}
