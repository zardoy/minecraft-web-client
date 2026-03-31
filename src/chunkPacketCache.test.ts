import fs from 'fs'
import os from 'os'
import { join } from 'path'
import { afterEach, expect, test, vi } from 'vitest'
import { ChunkPacketCache } from './chunkPacketCache'

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
  const dir = await fs.promises.mkdtemp(join(os.tmpdir(), 'chunk-packet-cache-test-'))
  tempDirs.push(dir)
  return dir
}

const bindChunkCacheToDir = (cache: ChunkPacketCache, dir: string) => {
  const cacheWithPrivatePaths = cache as any
  cacheWithPrivatePaths.getServerDir = () => dir
  cacheWithPrivatePaths.getMetadataPath = () => join(dir, 'metadata.json')
  cacheWithPrivatePaths.getChunkPath = (x: number, z: number) => join(dir, `${x},${z}.bin`)
}

const makePacket = (...bytes: number[]) => Uint8Array.from(bytes).buffer

// ─── existing test ────────────────────────────────────────────────────────────

test('ChunkPacketCache persists and reloads cached chunk packets from disk', async () => {
  const cacheDir = await createTempDir()
  const firstCache = new ChunkPacketCache()
  bindChunkCacheToDir(firstCache, cacheDir)

  await firstCache.setServerInfo('test-server', true)

  const packetData = Uint8Array.from([1, 2, 3, 4, 5, 6]).buffer
  await firstCache.set(0, 0, packetData, 'abcd1234')
  await firstCache.flush()

  const secondCache = new ChunkPacketCache()
  bindChunkCacheToDir(secondCache, cacheDir)
  await secondCache.setServerInfo('test-server', true)

  const cachedChunkInfo = await secondCache.getCachedChunksInfo()
  const loaded = await secondCache.get(0, 0)

  expect(cachedChunkInfo).toEqual([{ x: 0, z: 0, hash: 'abcd1234' }])
  expect(loaded).not.toBeNull()
  expect(loaded?.hash).toBe('abcd1234')
  expect([...new Uint8Array(loaded!.packetData)]).toEqual([1, 2, 3, 4, 5, 6])
  expect(secondCache.getStats().diskSize).toBe(1)
})

// ─── memory-only mode ─────────────────────────────────────────────────────────

test('ChunkPacketCache stores in memory when channel is not supported', async () => {
  const cacheDir = await createTempDir()
  const cache = new ChunkPacketCache()
  bindChunkCacheToDir(cache, cacheDir)

  await cache.setServerInfo('test-server', false)
  await cache.set(3, -5, makePacket(0xaa, 0xbb), 'deadbeef')

  // Memory hit
  const hit = await cache.get(3, -5)
  expect(hit).not.toBeNull()
  expect(hit?.hash).toBe('deadbeef')

  // No disk files written — readdir returns [] because the dir was never created
  const files = await fs.promises.readdir(cacheDir).catch(() => [])
  expect(files).toHaveLength(0)
})

// ─── hash auto-computation ────────────────────────────────────────────────────

test('ChunkPacketCache computes hash when not provided', async () => {
  const cache = new ChunkPacketCache()
  const data = makePacket(1, 2, 3)
  const expected = cache.computePacketHash(data)

  const cacheDir = await createTempDir()
  bindChunkCacheToDir(cache, cacheDir)
  await cache.setServerInfo('test-server', false)
  await cache.set(0, 0, data) // no explicit hash

  const hit = await cache.get(0, 0)
  expect(hit?.hash).toBe(expected)
})

// ─── computePacketHash consistency ───────────────────────────────────────────

test('ChunkPacketCache computePacketHash is deterministic and content-dependent', () => {
  const cache = new ChunkPacketCache()
  const dataA = makePacket(1, 2, 3, 4)
  const dataB = makePacket(1, 2, 3, 5)

  expect(cache.computePacketHash(dataA)).toBe(cache.computePacketHash(dataA))
  expect(cache.computePacketHash(dataA)).not.toBe(cache.computePacketHash(dataB))
  // 8-char hex
  expect(cache.computePacketHash(dataA)).toMatch(/^[\da-f]{8}$/)
})

// ─── hasValidCache ────────────────────────────────────────────────────────────

test('ChunkPacketCache hasValidCache returns true only when hash matches', async () => {
  const cacheDir = await createTempDir()
  const cache = new ChunkPacketCache()
  bindChunkCacheToDir(cache, cacheDir)

  await cache.setServerInfo('test-server', true)
  await cache.set(7, 3, makePacket(10, 20), 'myhash01')
  await cache.flush()

  expect(await cache.hasValidCache(7, 3, 'myhash01')).toBe(true)
  expect(await cache.hasValidCache(7, 3, 'wronghsh')).toBe(false)
  expect(await cache.hasValidCache(99, 99, 'myhash01')).toBe(false)
})

// ─── invalidation ─────────────────────────────────────────────────────────────

test('ChunkPacketCache invalidate removes chunk from memory and disk', async () => {
  const cacheDir = await createTempDir()
  const cache = new ChunkPacketCache()
  bindChunkCacheToDir(cache, cacheDir)

  await cache.setServerInfo('test-server', true)
  await cache.set(2, -2, makePacket(7, 8, 9), 'inv-hash')
  await cache.flush()

  expect(await cache.get(2, -2)).not.toBeNull()

  await cache.invalidate(2, -2)

  expect(await cache.get(2, -2)).toBeNull()
  expect(cache.getStats().diskSize).toBe(0)
  const diskFile = join(cacheDir, '2,-2.bin')
  expect(await fs.promises.stat(diskFile).catch(() => null)).toBeNull()
})

// ─── getCachedChunksInfo ─────────────────────────────────────────────────────

test('ChunkPacketCache getCachedChunksInfo returns all stored chunks', async () => {
  const cacheDir = await createTempDir()
  const cache = new ChunkPacketCache()
  bindChunkCacheToDir(cache, cacheDir)

  await cache.setServerInfo('test-server', true)
  await cache.set(0, 0, makePacket(1), 'hash-0-0')
  await cache.set(1, -1, makePacket(2), 'hash-1-1')
  await cache.flush()

  const info = await cache.getCachedChunksInfo()
  expect(info).toHaveLength(2)
  expect(info).toContainEqual({ x: 0, z: 0, hash: 'hash-0-0' })
  expect(info).toContainEqual({ x: 1, z: -1, hash: 'hash-1-1' })
})

test('ChunkPacketCache getCachedChunksInfo returns empty array when nothing cached', async () => {
  const cacheDir = await createTempDir()
  const cache = new ChunkPacketCache()
  bindChunkCacheToDir(cache, cacheDir)
  await cache.setServerInfo('test-server', true)

  expect(await cache.getCachedChunksInfo()).toEqual([])
})

// ─── server isolation ─────────────────────────────────────────────────────────

test('ChunkPacketCache isolates cache per server address', async () => {
  const dirA = await createTempDir()
  const dirB = await createTempDir()

  const cacheA = new ChunkPacketCache()
  bindChunkCacheToDir(cacheA, dirA)
  await cacheA.setServerInfo('server-a', true)
  await cacheA.set(0, 0, makePacket(0xff), 'server-a-hash')
  await cacheA.flush()

  const cacheB = new ChunkPacketCache()
  bindChunkCacheToDir(cacheB, dirB)
  await cacheB.setServerInfo('server-b', true)

  expect(await cacheB.get(0, 0)).toBeNull()
  expect(await cacheB.getCachedChunksInfo()).toEqual([])
})

// ─── server switch clears memory ─────────────────────────────────────────────

test('ChunkPacketCache clears memory cache when server changes', async () => {
  const dirA = await createTempDir()
  const dirB = await createTempDir()
  const cache = new ChunkPacketCache()

  bindChunkCacheToDir(cache, dirA)
  await cache.setServerInfo('server-a', false)
  await cache.set(0, 0, makePacket(1, 2), 'old-hash')
  expect(await cache.get(0, 0)).not.toBeNull()

  bindChunkCacheToDir(cache, dirB)
  await cache.setServerInfo('server-b', false)
  expect(await cache.get(0, 0)).toBeNull()
})

// ─── stale file cleanup ───────────────────────────────────────────────────────

test('ChunkPacketCache cleans up metadata when disk file is missing', async () => {
  const cacheDir = await createTempDir()
  const cache = new ChunkPacketCache()
  bindChunkCacheToDir(cache, cacheDir)

  await cache.setServerInfo('test-server', true)
  await cache.set(9, 9, makePacket(0x01, 0x02), 'stale-h')
  await cache.flush()

  await fs.promises.unlink(join(cacheDir, '9,9.bin'))

  const freshCache = new ChunkPacketCache()
  bindChunkCacheToDir(freshCache, cacheDir)
  await freshCache.setServerInfo('test-server', true)

  expect(await freshCache.get(9, 9)).toBeNull()
  expect(freshCache.getStats().diskSize).toBe(0)
})

// ─── clear ────────────────────────────────────────────────────────────────────

test('ChunkPacketCache clear removes all entries', async () => {
  const cacheDir = await createTempDir()
  const cache = new ChunkPacketCache()
  bindChunkCacheToDir(cache, cacheDir)

  await cache.setServerInfo('test-server', true)
  await cache.set(0, 0, makePacket(1), 'h1')
  await cache.set(1, 1, makePacket(2), 'h2')
  await cache.flush()

  expect(cache.getStats().diskSize).toBe(2)

  await cache.clear()

  expect(await cache.get(0, 0)).toBeNull()
  expect(await cache.get(1, 1)).toBeNull()
  expect(cache.getStats().diskSize).toBe(0)
})
