import { expect, test, beforeEach } from 'vitest'

import { computeBlockStateHash } from '../../../src/blockHash'
import {
  computeBlockHash,
  computeChunkDataHash,
  createSectionKey,
  clearAllBlockStates,
  clearSectionBlockStates,
  extractChunkSectionBlockStates,
  getSectionBlockStates,
  isGeometryCacheable,
  parseSectionKey,
  storeSectionBlockStates,
} from './chunkCacheIntegration'

const prismarineChunk: (version: string) => any = require('prismarine-chunk')

const getSectionIndex = (x: number, y: number, z: number) => ((y & 15) << 8) | (z << 4) | x

beforeEach(() => {
  clearAllBlockStates()
})

// ─── existing tests ───────────────────────────────────────────────────────────

test('extractChunkSectionBlockStates decodes legacy paletted sections', () => {
  const Chunk = prismarineChunk('1.14.4')
  const chunk = new Chunk()
  chunk.setBlockStateId({ x: 1, y: 2, z: 3 }, 33)
  chunk.setBlockStateId({ x: 4, y: 5, z: 6 }, 10)

  const sections = extractChunkSectionBlockStates(chunk.toJson())

  expect(sections).not.toBeNull()
  expect(sections?.has(16)).toBe(false)
  expect(sections?.get(0)?.[getSectionIndex(1, 2, 3)]).toBe(33)
  expect(sections?.get(0)?.[getSectionIndex(4, 5, 6)]).toBe(10)
})

test('extractChunkSectionBlockStates decodes palette-container sections with minY offsets', () => {
  const Chunk = prismarineChunk('1.18.2')
  const chunk = new Chunk({ minY: -64, worldHeight: 384 } as any)
  chunk.setBlockStateId({ x: 2, y: -64, z: 3 }, 5)
  chunk.setBlockStateId({ x: 7, y: -48, z: 8 }, 12)

  const sections = extractChunkSectionBlockStates(chunk.toJson())

  expect(sections).not.toBeNull()
  expect(sections?.get(-64)?.[getSectionIndex(2, 0, 3)]).toBe(5)
  expect(sections?.get(-48)?.[getSectionIndex(7, 0, 8)]).toBe(12)
})

test('computeChunkDataHash returns null for unsupported chunk data instead of a shared sentinel hash', () => {
  expect(computeChunkDataHash(Symbol('chunk'))).toBeNull()
  expect(computeChunkDataHash({ length: 1, 0: Symbol('bad-byte') } as unknown as ArrayLike<number>)).toBeNull()
})

// ─── computeBlockHash matches blockHash.ts ────────────────────────────────────

test('computeBlockHash produces the same output as computeBlockStateHash', () => {
  const ids = new Uint16Array([1, 2, 255, 1024, 4095, 17])
  expect(computeBlockHash(ids)).toBe(computeBlockStateHash(ids))
  expect(computeBlockHash(ids)).toBe('c8ebb195')
})

test('computeBlockHash returns distinct hashes for distinct block states', () => {
  const a = new Uint16Array([1, 2, 3])
  const b = new Uint16Array([1, 2, 4])
  expect(computeBlockHash(a)).not.toBe(computeBlockHash(b))
})

// ─── section block state store ────────────────────────────────────────────────

test('storeSectionBlockStates / getSectionBlockStates round-trip', () => {
  const key = createSectionKey(1, 16, -3)
  const ids = new Uint16Array([10, 20, 30])

  storeSectionBlockStates(key, ids)
  const retrieved = getSectionBlockStates(key)

  expect(retrieved).not.toBeNull()
  expect([...retrieved!]).toEqual([10, 20, 30])
})

test('storeSectionBlockStates accepts number[] and stores as Uint16Array', () => {
  const key = createSectionKey(0, 0, 0)
  storeSectionBlockStates(key, [5, 10, 15])
  const retrieved = getSectionBlockStates(key)
  expect(retrieved).toBeInstanceOf(Uint16Array)
  expect([...retrieved!]).toEqual([5, 10, 15])
})

test('getSectionBlockStates returns null for unknown key', () => {
  expect(getSectionBlockStates('99,99,99')).toBeNull()
})

test('clearSectionBlockStates removes only the specified section', () => {
  storeSectionBlockStates('1,0,0', new Uint16Array([1]))
  storeSectionBlockStates('2,0,0', new Uint16Array([2]))

  clearSectionBlockStates('1,0,0')

  expect(getSectionBlockStates('1,0,0')).toBeNull()
  expect(getSectionBlockStates('2,0,0')).not.toBeNull()
})

test('clearAllBlockStates removes every stored section', () => {
  storeSectionBlockStates('0,0,0', new Uint16Array([1]))
  storeSectionBlockStates('1,0,1', new Uint16Array([2]))

  clearAllBlockStates()

  expect(getSectionBlockStates('0,0,0')).toBeNull()
  expect(getSectionBlockStates('1,0,1')).toBeNull()
})

// ─── parseSectionKey ──────────────────────────────────────────────────────────

test('parseSectionKey parses valid keys including negative coordinates', () => {
  expect(parseSectionKey('0,16,-32')).toEqual({ x: 0, y: 16, z: -32 })
  expect(parseSectionKey('-5,-64,100')).toEqual({ x: -5, y: -64, z: 100 })
})

test('parseSectionKey returns null for malformed keys', () => {
  expect(parseSectionKey('1,2')).toBeNull()
  expect(parseSectionKey('1,2,3,4')).toBeNull()
  expect(parseSectionKey('a,b,c')).toBeNull()
  expect(parseSectionKey('')).toBeNull()
})

test('createSectionKey round-trips through parseSectionKey', () => {
  const key = createSectionKey(-3, 64, 128)
  expect(parseSectionKey(key)).toEqual({ x: -3, y: 64, z: 128 })
})

// ─── isGeometryCacheable ──────────────────────────────────────────────────────

test('isGeometryCacheable returns true for valid geometry with positions', () => {
  const geo = {
    positions: new Float32Array([0, 1, 2]),
    hadErrors: false
  } as any
  expect(isGeometryCacheable(geo)).toBe(true)
})

test('isGeometryCacheable returns false for empty positions', () => {
  const geo = {
    positions: new Float32Array([]),
    hadErrors: false
  } as any
  expect(isGeometryCacheable(geo)).toBe(false)
})

test('isGeometryCacheable returns false when hadErrors is true', () => {
  const geo = {
    positions: new Float32Array([0, 1, 2]),
    hadErrors: true
  } as any
  expect(isGeometryCacheable(geo)).toBe(false)
})

test('isGeometryCacheable returns false when positions is undefined', () => {
  const geo = { hadErrors: false } as any
  expect(isGeometryCacheable(geo)).toBe(false)
})

// ─── computeChunkDataHash valid inputs ───────────────────────────────────────

test('computeChunkDataHash computes stable hash from Buffer', () => {
  const buf = Buffer.from([1, 2, 3, 4])
  const h1 = computeChunkDataHash(buf)
  const h2 = computeChunkDataHash(buf)
  expect(h1).not.toBeNull()
  expect(h1).toBe(h2)
  expect(h1).toMatch(/^[\da-f]{8}$/)
})

test('computeChunkDataHash returns different hashes for different data', () => {
  expect(computeChunkDataHash(Buffer.from([1]))).not.toBe(
    computeChunkDataHash(Buffer.from([2]))
  )
})

test('computeChunkDataHash returns null for null input', () => {
  expect(computeChunkDataHash(null)).toBeNull()
})
