import { expect, test } from 'vitest'

import { extractChunkSectionBlockStates } from './chunkCacheIntegration'

const prismarineChunk: (version: string) => any = require('prismarine-chunk')

const getSectionIndex = (x: number, y: number, z: number) => ((y & 15) << 8) | (z << 4) | x

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
