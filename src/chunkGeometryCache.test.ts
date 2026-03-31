import fs from 'fs'
import os from 'os'
import { join } from 'path'
import { afterEach, expect, test, vi } from 'vitest'
import { ChunkGeometryCache } from './chunkGeometryCache'

vi.mock('./browserfs', () => ({
  async mkdirRecursive (dir: string) {
    return fs.promises.mkdir(dir, { recursive: true })
  },
  async existsViaStats (path: string) {
    try {
      await fs.promises.stat(path)
      return true
    } catch {
      return false
    }
  }
}))

const tempDirs: string[] = []

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map(async (dir) => {
    await fs.promises.rm(dir, { recursive: true, force: true })
  }))
})

const createTempDir = async () => {
  const dir = await fs.promises.mkdtemp(join(os.tmpdir(), 'chunk-geometry-cache-test-'))
  tempDirs.push(dir)
  return dir
}

const bindGeometryCacheToDir = (cache: ChunkGeometryCache, dir: string) => {
  const cacheWithPrivatePaths = cache as any
  cacheWithPrivatePaths.getServerDir = () => dir
  cacheWithPrivatePaths.getMetadataPath = () => join(dir, 'metadata.json')
  cacheWithPrivatePaths.getSectionPath = (x: number, y: number, z: number) => join(dir, `${x},${y},${z}.bin`)
}

const makeGeometry = (positions = [0, 1, 2]) => ({
  sx: 0,
  sy: 0,
  sz: 0,
  positions: new Float32Array(positions),
  normals: new Float32Array([0, 0, 1]),
  colors: new Float32Array([1, 1, 1]),
  uvs: new Float32Array([0, 0]),
  indices: new Uint16Array([0, 1, 2]),
  indicesCount: 3,
  transparentIndicesStart: 3,
  using32Array: false,
  tiles: {},
  heads: {},
  signs: {},
  banners: {},
  hadErrors: false,
  blocksCount: 1
} as any)

// ─── existing test ────────────────────────────────────────────────────────────

test('ChunkGeometryCache persists and reloads cached geometry from disk', async () => {
  const cacheDir = await createTempDir()
  const firstCache = new ChunkGeometryCache()
  bindGeometryCacheToDir(firstCache, cacheDir)

  await firstCache.setServerSupportsChannel(true, 'test-server')

  await firstCache.set(0, 16, 0, 'deadbeef', {
    sx: 0,
    sy: 16,
    sz: 0,
    positions: new Float32Array([0, 1, 2]),
    normals: new Float32Array([0, 0, 1]),
    colors: new Float32Array([1, 1, 1]),
    uvs: new Float32Array([0, 0, 1, 1]),
    indices: new Uint16Array([0, 1, 2]),
    indicesCount: 3,
    using32Array: false,
    tiles: {},
    heads: {},
    signs: {},
    banners: {},
    hadErrors: false,
    blocksCount: 1
  } as any)
  await firstCache.flush()

  const secondCache = new ChunkGeometryCache()
  bindGeometryCacheToDir(secondCache, cacheDir)
  await secondCache.setServerSupportsChannel(true, 'test-server')

  const loaded = await secondCache.get(0, 16, 0, 'deadbeef')

  expect(loaded).not.toBeNull()
  expect([...loaded!.positions]).toEqual([0, 1, 2])
  expect([...loaded!.indices]).toEqual([0, 1, 2])
  expect(secondCache.getStats().diskSize).toBe(1)
})

// ─── memory-only mode ─────────────────────────────────────────────────────────

test('ChunkGeometryCache stores in memory when channel is not supported', async () => {
  const cacheDir = await createTempDir()
  const cache = new ChunkGeometryCache()
  bindGeometryCacheToDir(cache, cacheDir)

  await cache.setServerSupportsChannel(false, 'test-server')
  await cache.set(1, 0, 1, 'abc12345', makeGeometry())

  // Memory hit works
  const hit = await cache.get(1, 0, 1, 'abc12345')
  expect(hit).not.toBeNull()

  // Nothing written to disk — readdir returns [] because the dir was never created
  const files = await fs.promises.readdir(cacheDir).catch(() => [])
  expect(files).toHaveLength(0)
})

// ─── hash mismatch ────────────────────────────────────────────────────────────

test('ChunkGeometryCache returns null when block hash does not match', async () => {
  const cacheDir = await createTempDir()
  const cache = new ChunkGeometryCache()
  bindGeometryCacheToDir(cache, cacheDir)

  await cache.setServerSupportsChannel(true, 'test-server')
  await cache.set(0, 0, 0, 'correct-hash', makeGeometry())

  expect(await cache.get(0, 0, 0, 'wrong-hash')).toBeNull()
  expect(await cache.get(0, 0, 0, 'correct-hash')).not.toBeNull()
})

// ─── invalidation ─────────────────────────────────────────────────────────────

test('ChunkGeometryCache invalidate removes section from memory and disk', async () => {
  const cacheDir = await createTempDir()
  const cache = new ChunkGeometryCache()
  bindGeometryCacheToDir(cache, cacheDir)

  await cache.setServerSupportsChannel(true, 'test-server')
  await cache.set(2, 16, 3, 'aabbccdd', makeGeometry())
  await cache.flush()

  const before = await cache.get(2, 16, 3, 'aabbccdd')
  expect(before).not.toBeNull()

  await cache.invalidate(2, 16, 3)

  expect(await cache.get(2, 16, 3, 'aabbccdd')).toBeNull()
  expect(cache.getStats().diskSize).toBe(0)
  const diskFile = join(cacheDir, '2,16,3.bin')
  expect(await fs.promises.stat(diskFile).catch(() => null)).toBeNull()
})

// ─── server isolation ─────────────────────────────────────────────────────────

test('ChunkGeometryCache isolates cache per server address', async () => {
  const dirA = await createTempDir()
  const dirB = await createTempDir()

  const cacheA = new ChunkGeometryCache()
  bindGeometryCacheToDir(cacheA, dirA)
  await cacheA.setServerSupportsChannel(true, 'server-a')
  await cacheA.set(0, 0, 0, 'hash-a', makeGeometry([10, 20, 30]))
  await cacheA.flush()

  const cacheB = new ChunkGeometryCache()
  bindGeometryCacheToDir(cacheB, dirB)
  await cacheB.setServerSupportsChannel(true, 'server-b')

  // server-b should not see server-a's data
  expect(await cacheB.get(0, 0, 0, 'hash-a')).toBeNull()
})

// ─── clear ────────────────────────────────────────────────────────────────────

test('ChunkGeometryCache clear removes all entries for current server', async () => {
  const cacheDir = await createTempDir()
  const cache = new ChunkGeometryCache()
  bindGeometryCacheToDir(cache, cacheDir)

  await cache.setServerSupportsChannel(true, 'test-server')
  await cache.set(0, 0, 0, 'h1', makeGeometry())
  await cache.set(1, 0, 1, 'h2', makeGeometry())
  await cache.flush()

  expect(cache.getStats().diskSize).toBe(2)

  await cache.clear()

  expect(await cache.get(0, 0, 0, 'h1')).toBeNull()
  expect(await cache.get(1, 0, 1, 'h2')).toBeNull()
  expect(cache.getStats().diskSize).toBe(0)
})

// ─── transparent arrays round-trip ───────────────────────────────────────────

test('ChunkGeometryCache preserves transparent geometry arrays across disk round-trip', async () => {
  const cacheDir = await createTempDir()
  const firstCache = new ChunkGeometryCache()
  bindGeometryCacheToDir(firstCache, cacheDir)
  await firstCache.setServerSupportsChannel(true, 'test-server')

  const geo = {
    ...makeGeometry(),
    t_positions: new Float32Array([3, 4, 5]),
    t_normals: new Float32Array([0, 1, 0]),
    t_colors: new Float32Array([0.5, 0.5, 0.5]),
    t_uvs: new Float32Array([0.1, 0.2]),
    transparentIndicesStart: 1,
    using32Array: false
  }

  await firstCache.set(0, 0, 0, 'transp-hash', geo)
  await firstCache.flush()

  const secondCache = new ChunkGeometryCache()
  bindGeometryCacheToDir(secondCache, cacheDir)
  await secondCache.setServerSupportsChannel(true, 'test-server')

  const loaded = await secondCache.get(0, 0, 0, 'transp-hash')
  expect(loaded).not.toBeNull()
  expect(loaded!.t_positions).toBeInstanceOf(Float32Array)
  expect([...loaded!.t_positions!]).toEqual([3, 4, 5])
  expect(loaded!.t_normals).toBeInstanceOf(Float32Array)
  expect([...loaded!.t_normals!]).toEqual([0, 1, 0])
  expect((loaded as any).transparentIndicesStart).toBe(1)
})

// ─── Uint32Array indices ──────────────────────────────────────────────────────

test('ChunkGeometryCache uses Uint32Array for indices when using32Array is true', async () => {
  const cacheDir = await createTempDir()
  const cache = new ChunkGeometryCache()
  bindGeometryCacheToDir(cache, cacheDir)
  await cache.setServerSupportsChannel(true, 'test-server')

  const geo = {
    ...makeGeometry(),
    indices: new Uint32Array([0, 1, 2, 3]),
    indicesCount: 4,
    using32Array: true
  }

  await cache.set(0, 0, 0, 'u32-hash', geo)
  await cache.flush()

  const freshCache = new ChunkGeometryCache()
  bindGeometryCacheToDir(freshCache, cacheDir)
  await freshCache.setServerSupportsChannel(true, 'test-server')

  const loaded = await freshCache.get(0, 0, 0, 'u32-hash')
  expect(loaded).not.toBeNull()
  expect(loaded!.indices).toBeInstanceOf(Uint32Array)
  expect([...loaded!.indices]).toEqual([0, 1, 2, 3])
})

// ─── stale file cleanup ───────────────────────────────────────────────────────

test('ChunkGeometryCache cleans up metadata when disk file is missing', async () => {
  const cacheDir = await createTempDir()
  const cache = new ChunkGeometryCache()
  bindGeometryCacheToDir(cache, cacheDir)
  await cache.setServerSupportsChannel(true, 'test-server')

  await cache.set(5, 0, 5, 'stale-hash', makeGeometry())
  await cache.flush()

  // Simulate file being deleted externally while metadata still refers to it
  await fs.promises.unlink(join(cacheDir, '5,0,5.bin'))

  // Second instance loads metadata but file is gone
  const freshCache = new ChunkGeometryCache()
  bindGeometryCacheToDir(freshCache, cacheDir)
  await freshCache.setServerSupportsChannel(true, 'test-server')

  // Should return null and clean up the stale metadata entry
  expect(await freshCache.get(5, 0, 5, 'stale-hash')).toBeNull()
  expect(freshCache.getStats().diskSize).toBe(0)
})

// ─── generateBlockHash uses FNV-1a ────────────────────────────────────────────

test('ChunkGeometryCache generateBlockHash matches computeBlockStateHash', async () => {
  const cache = new ChunkGeometryCache()
  const ids = [1, 2, 255, 1024, 4095, 17]
  const hash = await cache.generateBlockHash(new Uint16Array(ids))
  expect(hash).toBe('c8ebb195') // same expected value as blockHash.test.ts
})

// ─── server switch clears memory ─────────────────────────────────────────────

test('ChunkGeometryCache clears memory cache when server changes', async () => {
  const dirA = await createTempDir()
  const dirB = await createTempDir()
  const cache = new ChunkGeometryCache()

  // Bind to dirA for server-a
  bindGeometryCacheToDir(cache, dirA)
  await cache.setServerSupportsChannel(false, 'server-a')
  await cache.set(0, 0, 0, 'old-hash', makeGeometry([1, 2, 3]))

  expect(await cache.get(0, 0, 0, 'old-hash')).not.toBeNull()

  // Switch to server-b
  bindGeometryCacheToDir(cache, dirB)
  await cache.setServerSupportsChannel(false, 'server-b')

  // Memory from server-a should be gone
  expect(await cache.get(0, 0, 0, 'old-hash')).toBeNull()
})
