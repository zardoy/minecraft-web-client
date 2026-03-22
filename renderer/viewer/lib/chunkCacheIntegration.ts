/**
 * Chunk Geometry Cache Integration
 *
 * This module provides integration between the chunk geometry cache
 * and the world renderer system. It handles:
 * - Computing block hashes for cache keys
 * - Checking cache before requesting geometry from workers
 * - Saving generated geometry to cache
 *
 * ## Cache Flow:
 * 1. **Chunk Load**: When a chunk is loaded, hash the block data and store in sectionHashes
 * 2. **Section Dirty**: When a section needs rendering, check geometryCache for a hash match
 *    - If cache hit: skip worker computation, use cached geometry directly
 *    - If cache miss: send to mesher worker for geometry generation
 * 3. **Geometry Received**: When worker returns geometry, store in geometryCache with hash
 * 4. **Block Update**: When a block changes, invalidate the affected section's cache entry
 *
 * ## Server Protocol (when supported via minecraft-web-client:chunk-cache channel):
 * - Client sends list of cached chunk hashes to server on login
 * - Server responds with hit/miss for each chunk:
 *   - Cache hit: Server sends only a confirmation, client uses local cached packet data
 *   - Cache miss: Server sends full map_chunk packet, client caches it for future sessions
 * - This saves significant network bandwidth for unchanged chunks
 *
 * ## Server Scoping:
 * - Memory cache is cleared when connecting to a different server (via setServerSupportsChannel)
 * - Disk cache is server-scoped: /data/geometry-cache/{serverAddress}/ and /data/chunk-cache/{serverAddress}/
 * - Each server has isolated cache storage to prevent data conflicts
 */

import type { MesherGeometryOutput } from './mesher/shared'

// Store for block state IDs by section for hash computation
const sectionBlockStates = new Map<string, Uint16Array>()

/**
 * Store block state IDs for a section (called when chunk data is loaded)
 */
export function storeSectionBlockStates (
  sectionKey: string,
  blockStateIds: Uint16Array | number[]
): void {
  const data = blockStateIds instanceof Uint16Array
    ? blockStateIds
    : new Uint16Array(blockStateIds)
  sectionBlockStates.set(sectionKey, data)
}

/**
 * Get stored block state IDs for a section
 */
export function getSectionBlockStates (sectionKey: string): Uint16Array | null {
  return sectionBlockStates.get(sectionKey) || null
}

/**
 * Clear block state data for a section
 */
export function clearSectionBlockStates (sectionKey: string): void {
  sectionBlockStates.delete(sectionKey)
}

/**
 * Clear all stored block state data
 */
export function clearAllBlockStates (): void {
  sectionBlockStates.clear()
}

/**
 * Compute a simple hash from block state IDs
 * Uses a fast non-cryptographic hash for performance
 */
export function computeBlockHash (blockStateIds: Uint16Array): string {
  // Use FNV-1a hash for fast hashing
  let hash = 2_166_136_261 // FNV offset basis
  for (const stateId of blockStateIds) {
    hash ^= stateId
    hash = Math.imul(hash, 16_777_619) // FNV prime
  }
  // Convert to unsigned 32-bit and then to hex
  return (hash >>> 0).toString(16).padStart(8, '0')
}

/**
 * Generate a simple hash from block state IDs (async version using crypto.subtle)
 * Use this for more secure hashing when persistent storage is used
 */
export async function computeBlockHashAsync (blockStateIds: Uint16Array): Promise<string> {
  if (globalThis.crypto?.subtle) {
    try {
      // Pass the typed array view directly (not .buffer which includes the entire ArrayBuffer)
      const viewBytes = new Uint8Array(blockStateIds.buffer, blockStateIds.byteOffset, blockStateIds.byteLength)
      const buffer = await crypto.subtle.digest('SHA-256', viewBytes)
      const hashArray = [...new Uint8Array(buffer)]
      // Use first 8 bytes for a shorter hash
      return hashArray.slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('')
    } catch {
      // Fall back to simple hash
      return computeBlockHash(blockStateIds)
    }
  }
  return computeBlockHash(blockStateIds)
}

/**
 * Check if geometry data is valid and can be cached
 */
export function isGeometryCacheable (geometry: MesherGeometryOutput): boolean {
  // Don't cache empty geometry or geometry with errors
  return Boolean(geometry.positions?.length) && !geometry.hadErrors
}

/**
 * Get section coordinates from section key
 */
export function parseSectionKey (sectionKey: string): { x: number; y: number; z: number } | null {
  const parts = sectionKey.split(',')
  if (parts.length !== 3) return null
  const [x, y, z] = parts.map(Number)
  if (Number.isNaN(x) || Number.isNaN(y) || Number.isNaN(z)) return null
  return { x, y, z }
}

/**
 * Create a section key from coordinates
 */
export function createSectionKey (x: number, y: number, z: number): string {
  return `${x},${y},${z}`
}

/**
 * Create a chunk key from coordinates
 */
export function createChunkKey (x: number, z: number): string {
  return `${x},${z}`
}

/**
 * Compute a hash from raw chunk data (ArrayBuffer, TypedArray, or ArrayLike)
 * Uses FNV-1a for fast hashing
 */
export function computeChunkDataHash (chunkData: unknown): string {
  // Type guard: validate input is hashable
  let data: Uint8Array

  if (chunkData instanceof ArrayBuffer) {
    data = new Uint8Array(chunkData)
  } else if (ArrayBuffer.isView(chunkData)) {
    // Handle TypedArrays (Uint8Array, Int32Array, etc.)
    data = new Uint8Array(chunkData.buffer, chunkData.byteOffset, chunkData.byteLength)
  } else if (Array.isArray(chunkData) || (typeof chunkData === 'object' && chunkData !== null && 'length' in chunkData)) {
    // Handle ArrayLike<number>
    try {
      // eslint-disable-next-line unicorn/prefer-spread -- ArrayLike is not Iterable
      data = new Uint8Array(Array.from(chunkData as ArrayLike<number>))
    } catch {
      // Fallback for invalid data - return a default hash
      console.warn('computeChunkDataHash: Invalid chunk data, using fallback hash')
      return '00000000'
    }
  } else {
    // Unknown type - return fallback hash
    console.warn('computeChunkDataHash: Unknown chunk data type, using fallback hash')
    return '00000000'
  }

  // Use FNV-1a hash
  let hash = 2_166_136_261 // FNV offset basis
  for (const byte of data) {
    hash ^= byte
    hash = Math.imul(hash, 16_777_619) // FNV prime
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}
