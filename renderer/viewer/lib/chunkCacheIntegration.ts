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

import { computeBlockStateHash } from '../../../src/blockHash'
import type { MesherGeometryOutput } from './mesher/shared'

const SECTION_VOLUME = 16 * 16 * 16

type SerializedBitArray = {
  data: number[]
  capacity: number
  bitsPerValue: number
  valuesPerLong?: number
  valueMask?: number
}

type SerializedLegacyChunkSection = {
  data: string | SerializedBitArray
  palette?: number[] | null
}

type SerializedPaletteContainer =
  | {
    type: 'single'
    value: number
    capacity?: number
  }
  | {
    type: 'indirect'
    palette: number[]
    data: string | SerializedBitArray
  }
  | {
    type: 'direct'
    data: string | SerializedBitArray
  }

type SerializedChunkSection = {
  data: string | SerializedPaletteContainer | SerializedBitArray
  palette?: number[] | null
}

// Store for block state IDs by section for hash computation
const sectionBlockStates = new Map<string, Uint16Array>()

function parseJsonValue<T> (value: unknown): T | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T
    } catch {
      return null
    }
  }
  if (typeof value === 'object') return value as T
  return null
}

function createEmptySectionBlockStates (): Uint16Array {
  return new Uint16Array(SECTION_VOLUME)
}

function isSerializedBitArray (value: unknown): value is SerializedBitArray {
  if (!value || typeof value !== 'object') return false
  const bitArray = value as Partial<SerializedBitArray>
  return Array.isArray(bitArray.data)
    && typeof bitArray.capacity === 'number'
    && typeof bitArray.bitsPerValue === 'number'
    && bitArray.bitsPerValue > 0
}

function getSerializedBitArrayValue (bitArray: SerializedBitArray, index: number): number {
  const valuesPerLong = bitArray.valuesPerLong ?? Math.floor(64 / bitArray.bitsPerValue)
  const valueMask = bitArray.valueMask ?? ((1 << bitArray.bitsPerValue) - 1)
  const startLongIndex = Math.floor(index / valuesPerLong)
  const indexInLong = (index - startLongIndex * valuesPerLong) * bitArray.bitsPerValue
  if (indexInLong >= 32) {
    const startLong = bitArray.data[startLongIndex * 2 + 1] ?? 0
    return (startLong >>> (indexInLong - 32)) & valueMask
  }

  const startLong = bitArray.data[startLongIndex * 2] ?? 0
  let result = startLong >>> indexInLong
  const endBitOffset = indexInLong + bitArray.bitsPerValue
  if (endBitOffset > 32) {
    const endLong = bitArray.data[startLongIndex * 2 + 1] ?? 0
    result |= endLong << (32 - indexInLong)
  }
  return result & valueMask
}

function decodeBitArrayBlockStates (
  bitArrayValue: unknown,
  palette?: number[] | null
): Uint16Array | null {
  const parsedBitArray = parseJsonValue<SerializedBitArray>(bitArrayValue)
  if (!isSerializedBitArray(parsedBitArray)) return null

  const valuesPerLong = parsedBitArray.valuesPerLong ?? Math.floor(64 / parsedBitArray.bitsPerValue)
  if (!Number.isFinite(valuesPerLong) || valuesPerLong <= 0) return null

  const bitArray: SerializedBitArray = {
    ...parsedBitArray,
    valuesPerLong,
    valueMask: parsedBitArray.valueMask ?? ((1 << parsedBitArray.bitsPerValue) - 1)
  }

  const blockStates = createEmptySectionBlockStates()
  const length = Math.min(blockStates.length, bitArray.capacity)
  for (let index = 0; index < length; index++) {
    const value = getSerializedBitArrayValue(bitArray, index)
    if (!palette) {
      blockStates[index] = value
      continue
    }

    // Invalid palette indexes can show up in malformed serialized chunks. Fall
    // back to the raw value explicitly so the behavior is intentional.
    blockStates[index] = value < palette.length ? palette[value] : value
  }
  return blockStates
}

function decodePaletteContainerBlockStates (paletteContainerValue: unknown): Uint16Array | null {
  const paletteContainer = parseJsonValue<SerializedPaletteContainer>(paletteContainerValue)
  if (!paletteContainer || typeof paletteContainer !== 'object' || !('type' in paletteContainer)) return null

  if (paletteContainer.type === 'single') {
    return new Uint16Array(paletteContainer.capacity ?? SECTION_VOLUME).fill(paletteContainer.value)
  }

  return decodeBitArrayBlockStates(
    paletteContainer.data,
    paletteContainer.type === 'indirect' ? paletteContainer.palette : undefined
  )
}

function decodeChunkSectionBlockStates (sectionValue: unknown): Uint16Array | null {
  const section = parseJsonValue<SerializedChunkSection & SerializedLegacyChunkSection>(sectionValue)
  if (!section?.data) return null

  const legacyBlockStates = decodeBitArrayBlockStates(
    section.data,
    Array.isArray(section.palette) ? section.palette : section.palette === null ? null : undefined
  )
  if (legacyBlockStates) return legacyBlockStates

  return decodePaletteContainerBlockStates(section.data)
}

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
 * Decode serialized chunk JSON into per-section block state arrays.
 */
export function extractChunkSectionBlockStates (chunkData: unknown): Map<number, Uint16Array> | null {
  const parsedChunk = parseJsonValue<{
    minY?: number
    sections?: unknown[]
  }>(chunkData)
  if (!parsedChunk?.sections || !Array.isArray(parsedChunk.sections)) return null

  const sectionBlockStatesByY = new Map<number, Uint16Array>()
  const minY = parsedChunk.minY ?? 0
  for (const [sectionIndex, sectionValue] of parsedChunk.sections.entries()) {
    if (sectionValue === null) continue

    const blockStates = decodeChunkSectionBlockStates(sectionValue)
    if (!blockStates) {
      console.warn(`Skipping invalid chunk section at y=${minY + sectionIndex * 16}`)
      continue
    }

    sectionBlockStatesByY.set(minY + sectionIndex * 16, blockStates)
  }

  return sectionBlockStatesByY
}

/**
 * Compute the shared section hash used by both renderer-side lookups and
 * persistent geometry cache metadata.
 */
export function computeBlockHash (blockStateIds: Uint16Array): string {
  return computeBlockStateHash(blockStateIds)
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
export function computeChunkDataHash (chunkData: unknown): string | null {
  // Type guard: validate input is hashable
  let data: Uint8Array

  if (typeof chunkData === 'string') {
    data = new TextEncoder().encode(chunkData)
  } else if (chunkData instanceof ArrayBuffer) {
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
      // Invalid chunk-like data should skip cache warming instead of polluting
      // unrelated sections with a shared sentinel hash.
      console.warn('computeChunkDataHash: Invalid chunk data, skipping fallback hash')
      return null
    }
  } else {
    console.warn('computeChunkDataHash: Unknown chunk data type, skipping fallback hash')
    return null
  }

  // Use FNV-1a hash
  let hash = 2_166_136_261 // FNV offset basis
  for (const byte of data) {
    hash ^= byte
    hash = Math.imul(hash, 16_777_619) // FNV prime
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}
