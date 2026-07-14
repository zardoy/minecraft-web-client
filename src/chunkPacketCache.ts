/**
 * Chunk Packet Cache Manager
 *
 * Stores raw map_chunk packet data for server-side chunk caching protocol.
 * This enables bandwidth savings when the server supports the chunk-cache channel
 * by allowing clients to reuse previously received chunk data.
 *
 * Uses browserfs + fs file storage for persistent caching.
 * Storage structure: /data/chunk-cache/{serverAddress}/{x},{z}.bin
 * Metadata stored in: /data/chunk-cache/{serverAddress}/metadata.json
 *
 * Protocol:
 * 1. On login, client sends array of cached chunks {x, z, hash} to server
 * 2. Server responds with:
 *    - {x, z, cacheHit: true} - client should use cached data
 *    - {x, z, hash: "..."} - server will send map_chunk, client should cache it
 * 3. For cache hits, client emits cached map_chunk packet data locally
 *
 * ## Server Scoping:
 * - Memory cache is cleared on server change via setServerInfo()
 * - Disk cache is server-scoped: /data/chunk-cache/{serverAddress}/
 * - Each server's cache is completely isolated to prevent cross-server data conflicts
 */

import fs from 'fs'
import { join } from 'path'
import sanitize from 'sanitize-filename'
import { mkdirRecursive, existsViaStats } from './browserfs'
import { computeSerializedPacketHash } from './chunkPacketHash'

const CACHE_BASE = '/data/chunk-cache'
const MAX_CACHE_SIZE = 1000 // Max chunks per server
const MAX_MEMORY_CACHE_BYTES = 64 * 1024 * 1024
const MAX_DISK_CACHE_BYTES = 256 * 1024 * 1024
const METADATA_FILE = 'metadata.json'

export interface CachedChunkPacket {
  chunkKey: string // "x,z"
  hash: string
  packetData: ArrayBuffer // Raw map_chunk packet data
  lastAccessed: number
  serverAddress: string
}

export interface CachedChunkInfo {
  x: number
  z: number
  hash: string
}

interface ChunkMetadata {
  hash: string
  lastAccessed: number
  byteLength?: number // absent in metadata written by pre-quota versions
}

interface ServerMetadata {
  chunks: Record<string, ChunkMetadata> // key is "x,z"
}

class ChunkPacketCache {
  private readonly memoryCache = new Map<string, CachedChunkPacket>()
  private memoryCacheBytes = 0
  private serverAddress = 'unknown'
  private serverSupportsChannel = false
  private metadata: ServerMetadata = { chunks: {} }
  private metadataDirty = false
  private saveMetadataTimeout: ReturnType<typeof setTimeout> | null = null
  private readonly writeQueues = new Map<string, Promise<void>>()

  /**
   * Initialize the cache system
   */
  async init (): Promise<void> {
    try {
      await mkdirRecursive(CACHE_BASE)
      console.debug('Chunk packet cache initialized')
    } catch (error) {
      console.warn('Failed to initialize chunk packet cache:', error)
    }
  }

  /**
   * Get sanitized server directory name
   */
  private getServerDir (): string {
    const sanitized = sanitize(this.serverAddress.replaceAll(/[/:]/g, '_')) || 'unknown'
    const addressBytes = new TextEncoder().encode(this.serverAddress)
    let scopeHash = 2_166_136_261
    for (const byte of addressBytes) {
      scopeHash ^= byte
      scopeHash = Math.imul(scopeHash, 16_777_619)
    }
    return join(CACHE_BASE, `${sanitized}-${(scopeHash >>> 0).toString(16).padStart(8, '0')}`)
  }

  /**
   * Get chunk file path
   */
  private getChunkPath (x: number, z: number): string {
    return join(this.getServerDir(), `${x},${z}.bin`)
  }

  /**
   * Get metadata file path
   */
  private getMetadataPath (): string {
    return join(this.getServerDir(), METADATA_FILE)
  }

  /**
   * Set server address and channel support status
   */
  async setServerInfo (serverAddress: string, supportsChannel: boolean): Promise<void> {
    // Flush pending saves for the previous server before switching
    await this.flush()
    if (this.saveMetadataTimeout) {
      clearTimeout(this.saveMetadataTimeout)
      this.saveMetadataTimeout = null
    }
    this.metadataDirty = false

    this.serverAddress = serverAddress
    this.serverSupportsChannel = supportsChannel
    this.memoryCache.clear()
    this.memoryCacheBytes = 0
    this.metadata = { chunks: {} }

    console.debug(`Chunk packet cache: server=${serverAddress}, supportsChannel=${supportsChannel}`)

    // Load existing metadata for this server
    await this.loadMetadata()
  }

  /**
   * Load metadata from disk
   */
  private async loadMetadata (): Promise<void> {
    try {
      const metadataPath = this.getMetadataPath()
      if (await existsViaStats(metadataPath)) {
        const data = await fs.promises.readFile(metadataPath)
        this.metadata = JSON.parse(data.toString())
        console.debug(`Loaded metadata for ${Object.keys(this.metadata.chunks).length} cached chunks`)
      }
    } catch (error) {
      console.warn('Failed to load chunk cache metadata:', error)
      this.metadata = { chunks: {} }
    }
  }

  /**
   * Save metadata to disk (debounced)
   */
  private scheduleSaveMetadata (): void {
    this.metadataDirty = true

    if (this.saveMetadataTimeout) {
      clearTimeout(this.saveMetadataTimeout)
    }

    this.saveMetadataTimeout = setTimeout(() => {
      void this.saveMetadata()
    }, 1000)
  }

  /**
   * Save metadata to disk immediately
   */
  private async saveMetadata (): Promise<void> {
    if (!this.metadataDirty) return

    const serialized = JSON.stringify(this.metadata, null, 2)
    // Clear before I/O: a mutation while this write is pending will set the
    // flag again and cannot be accidentally erased by the older save.
    this.metadataDirty = false
    try {
      await mkdirRecursive(this.getServerDir())
      const metadataPath = this.getMetadataPath()
      const temporaryPath = `${metadataPath}.tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`
      await fs.promises.writeFile(temporaryPath, serialized)
      await fs.promises.rename(temporaryPath, metadataPath)
    } catch (error) {
      this.metadataDirty = true
      console.warn('Failed to save chunk cache metadata:', error)
    }
  }

  /**
   * Get full cache key for memory cache
   */
  private getMemoryCacheKey (x: number, z: number): string {
    return `${this.serverAddress}:${x},${z}`
  }

  /**
   * Compute hash from map_chunk packet data using FNV-1a
   * This hash algorithm should be reproducible in Java for server-side implementation
   */
  computePacketHash (packetData: ArrayBuffer): string {
    return computeSerializedPacketHash(packetData)
  }

  /**
   * Get all cached chunks for current server (for sending to server on login)
   */
  async getCachedChunksInfo (): Promise<CachedChunkInfo[]> {
    const result: CachedChunkInfo[] = []

    const entries = Object.entries(this.metadata.chunks)
      .sort((a, b) => b[1].lastAccessed - a[1].lastAccessed)

    for (const [chunkKey, meta] of entries) {
      const [x, z] = chunkKey.split(',').map(Number)
      if (!Number.isNaN(x) && !Number.isNaN(z)) {
        result.push({ x, z, hash: meta.hash })
      }
    }

    return result
  }

  /** Return a cache entry synchronously only when it is already memory-resident. */
  getFromMemory (x: number, z: number): { packetData: ArrayBuffer; hash: string } | null {
    const memKey = this.getMemoryCacheKey(x, z)
    const chunkKey = `${x},${z}`
    const cached = this.memoryCache.get(memKey)
    if (!cached) return null

    cached.lastAccessed = Date.now()
    if (this.serverSupportsChannel) {
      this.metadata.chunks[chunkKey] = {
        hash: cached.hash,
        lastAccessed: cached.lastAccessed,
        byteLength: cached.packetData.byteLength
      }
      this.scheduleSaveMetadata()
    }
    return { packetData: cached.packetData, hash: cached.hash }
  }

  /**
   * Get cached packet data for a chunk
   */
  async get (x: number, z: number): Promise<{ packetData: ArrayBuffer; hash: string } | null> {
    const memKey = this.getMemoryCacheKey(x, z)
    const chunkKey = `${x},${z}`

    // Check memory cache first
    const memCached = this.getFromMemory(x, z)
    if (memCached) return memCached

    // Check if we have metadata for this chunk
    const meta = this.metadata.chunks[chunkKey]
    if (!meta) return null

    // Try to load from disk
    try {
      const chunkPath = this.getChunkPath(x, z)
      if (await existsViaStats(chunkPath)) {
        const data = await fs.promises.readFile(chunkPath)
        // Ensure we get a properly bounded ArrayBuffer from the Buffer
        // Buffer instances can share an underlying ArrayBuffer with an offset
        const uint8 = new Uint8Array(data)
        const packetData = uint8.buffer.slice(uint8.byteOffset, uint8.byteOffset + uint8.byteLength)

        // Update last accessed and migrate pre-quota metadata lazily.
        meta.lastAccessed = Date.now()
        meta.byteLength = packetData.byteLength
        this.scheduleSaveMetadata()

        // Add to memory cache
        const cached: CachedChunkPacket = {
          chunkKey,
          hash: meta.hash,
          packetData,
          lastAccessed: meta.lastAccessed,
          serverAddress: this.serverAddress
        }
        this.addToMemoryCache(memKey, cached)

        return { packetData, hash: meta.hash }
      }
    } catch (error) {
      console.warn(`Failed to load chunk ${chunkKey} from disk:`, error)
    }

    // File doesn't exist, clean up metadata
    delete this.metadata.chunks[chunkKey]
    this.scheduleSaveMetadata()
    return null
  }

  /**
   * Store packet data in cache
   */
  async set (x: number, z: number, packetData: ArrayBuffer, hash?: string): Promise<void> {
    const memKey = this.getMemoryCacheKey(x, z)
    const chunkKey = `${x},${z}`
    const computedHash = hash || this.computePacketHash(packetData)
    const now = Date.now()

    const cached: CachedChunkPacket = {
      chunkKey,
      hash: computedHash,
      packetData,
      lastAccessed: now,
      serverAddress: this.serverAddress
    }

    // Always add to memory cache
    this.addToMemoryCache(memKey, cached)

    // Persist to disk only when server supports channel. Per-chunk queues
    // preserve packet order, and temp+rename prevents partial files.
    if (this.serverSupportsChannel) {
      await this.enqueueChunkWrite(memKey, async () => {
        try {
          await mkdirRecursive(this.getServerDir())
          const chunkPath = this.getChunkPath(x, z)
          const temporaryPath = `${chunkPath}.tmp`
          await fs.promises.writeFile(temporaryPath, Buffer.from(packetData))
          await fs.promises.rename(temporaryPath, chunkPath)
          this.metadata.chunks[chunkKey] = {
            hash: computedHash,
            lastAccessed: now,
            byteLength: packetData.byteLength
          }
          await this.evictOldEntries()
          this.scheduleSaveMetadata()
        } catch (error) {
          console.warn(`Failed to save chunk ${chunkKey} to disk:`, error)
          throw error
        }
      })
    }
  }

  /**
   * Check if a chunk is cached with the given hash
   */
  async hasValidCache (x: number, z: number, expectedHash: string): Promise<boolean> {
    const chunkKey = `${x},${z}`
    const meta = this.metadata.chunks[chunkKey]
    return meta !== undefined && meta.hash === expectedHash
  }

  /**
   * Invalidate cache for a specific chunk
   */
  async invalidate (x: number, z: number): Promise<void> {
    const memKey = this.getMemoryCacheKey(x, z)
    const chunkKey = `${x},${z}`

    await this.writeQueues.get(memKey)?.catch(() => {})
    this.removeMemoryEntry(memKey)
    delete this.metadata.chunks[chunkKey]
    this.scheduleSaveMetadata()

    try {
      const chunkPath = this.getChunkPath(x, z)
      if (await existsViaStats(chunkPath)) {
        await fs.promises.unlink(chunkPath)
      }
    } catch (error) {
      console.warn(`Failed to delete chunk ${chunkKey} from disk:`, error)
    }
  }

  /**
   * Clear all cached packets for current server
   */
  async clear (): Promise<void> {
    await Promise.allSettled(this.writeQueues.values())
    this.memoryCache.clear()
    this.memoryCacheBytes = 0

    // Clear metadata
    this.metadata = { chunks: {} }

    // Delete server directory
    try {
      const serverDir = this.getServerDir()
      if (await existsViaStats(serverDir)) {
        const files = await fs.promises.readdir(serverDir)
        await Promise.all(files.map(async (file) => {
          await fs.promises.unlink(join(serverDir, file))
        }))
        await fs.promises.rmdir(serverDir)
      }
    } catch (error) {
      console.warn('Failed to clear chunk cache directory:', error)
    }
  }

  private async enqueueChunkWrite (key: string, task: () => Promise<void>): Promise<void> {
    const previous = this.writeQueues.get(key) ?? Promise.resolve()
    const next = previous.catch(() => {}).then(task)
    this.writeQueues.set(key, next)
    const cleanup = () => {
      if (this.writeQueues.get(key) === next) this.writeQueues.delete(key)
    }
    void next.then(cleanup, cleanup)
    return next
  }

  private addToMemoryCache (key: string, entry: CachedChunkPacket): void {
    this.removeMemoryEntry(key)
    this.memoryCache.set(key, entry)
    this.memoryCacheBytes += entry.packetData.byteLength

    // Evict oldest entries until both count and byte ceilings are met.
    if (this.memoryCache.size > MAX_CACHE_SIZE / 2 || this.memoryCacheBytes > MAX_MEMORY_CACHE_BYTES) {
      const entries = [...this.memoryCache.entries()]
        .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed)
      for (const [entryKey] of entries) {
        if (this.memoryCache.size <= MAX_CACHE_SIZE / 2 && this.memoryCacheBytes <= MAX_MEMORY_CACHE_BYTES) break
        this.removeMemoryEntry(entryKey)
      }
    }
  }

  private removeMemoryEntry (key: string): void {
    const existing = this.memoryCache.get(key)
    if (!existing) return
    this.memoryCacheBytes -= existing.packetData.byteLength
    this.memoryCache.delete(key)
  }

  /**
   * Evict old entries when cache exceeds max size
   */
  private async evictOldEntries (): Promise<void> {
    const entries = Object.entries(this.metadata.chunks)
      .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed)
    let chunkCount = entries.length
    let totalBytes = entries.reduce((sum, [, meta]) => sum + (meta.byteLength ?? 0), 0)
    if (chunkCount <= MAX_CACHE_SIZE && totalBytes <= MAX_DISK_CACHE_BYTES) return

    let evicted = 0
    for (const [chunkKey, meta] of entries) {
      if (chunkCount <= MAX_CACHE_SIZE && totalBytes <= MAX_DISK_CACHE_BYTES) break
      const [x, z] = chunkKey.split(',').map(Number)
      this.removeMemoryEntry(this.getMemoryCacheKey(x, z))
      delete this.metadata.chunks[chunkKey]
      chunkCount--
      totalBytes -= meta.byteLength ?? 0
      evicted++

      try {
        const chunkPath = this.getChunkPath(x, z)
        if (await existsViaStats(chunkPath)) await fs.promises.unlink(chunkPath)
      } catch {
        // Ignore deletion errors; metadata eviction still prevents reuse.
      }
    }

    console.debug(`Evicted ${evicted} old chunks from cache`)
  }

  /**
   * Get cache statistics
   */
  getStats (): { memorySize: number; diskSize: number; supportsChannel: boolean; serverAddress: string } {
    return {
      memorySize: this.memoryCache.size,
      diskSize: Object.keys(this.metadata.chunks).length,
      supportsChannel: this.serverSupportsChannel,
      serverAddress: this.serverAddress
    }
  }

  /**
   * Flush any pending metadata saves
   */
  async flush (): Promise<void> {
    await Promise.allSettled(this.writeQueues.values())
    if (this.saveMetadataTimeout) {
      clearTimeout(this.saveMetadataTimeout)
      this.saveMetadataTimeout = null
    }
    await this.saveMetadata()
  }
}

// Singleton instance
export const chunkPacketCache = new ChunkPacketCache()

export { ChunkPacketCache }
