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

const CACHE_BASE = '/data/chunk-cache'
const MAX_CACHE_SIZE = 1000 // Max chunks per server
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
}

interface ServerMetadata {
  chunks: Record<string, ChunkMetadata> // key is "x,z"
}

class ChunkPacketCache {
  private readonly memoryCache = new Map<string, CachedChunkPacket>()
  private serverAddress = 'unknown'
  private serverSupportsChannel = false
  private metadata: ServerMetadata = { chunks: {} }
  private metadataDirty = false
  private saveMetadataTimeout: ReturnType<typeof setTimeout> | null = null

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
    const sanitized = sanitize(this.serverAddress.replaceAll(/[/:]/g, '_'))
    return join(CACHE_BASE, sanitized || 'unknown')
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

    try {
      await mkdirRecursive(this.getServerDir())
      await fs.promises.writeFile(
        this.getMetadataPath(),
        JSON.stringify(this.metadata, null, 2)
      )
      this.metadataDirty = false
    } catch (error) {
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
    const data = new Uint8Array(packetData)
    let hash = 2_166_136_261 // FNV offset basis (32-bit)

    for (const byte of data) {
      hash ^= byte
      hash = Math.imul(hash, 16_777_619) // FNV prime
    }

    // Convert to unsigned 32-bit and then to hex (8 chars)
    return (hash >>> 0).toString(16).padStart(8, '0')
  }

  /**
   * Get all cached chunks for current server (for sending to server on login)
   */
  async getCachedChunksInfo (): Promise<CachedChunkInfo[]> {
    const result: CachedChunkInfo[] = []

    for (const [chunkKey, meta] of Object.entries(this.metadata.chunks)) {
      const [x, z] = chunkKey.split(',').map(Number)
      if (!Number.isNaN(x) && !Number.isNaN(z)) {
        result.push({ x, z, hash: meta.hash })
      }
    }

    return result
  }

  /**
   * Get cached packet data for a chunk
   */
  async get (x: number, z: number): Promise<{ packetData: ArrayBuffer; hash: string } | null> {
    const memKey = this.getMemoryCacheKey(x, z)
    const chunkKey = `${x},${z}`

    // Check memory cache first
    const memCached = this.memoryCache.get(memKey)
    if (memCached) {
      memCached.lastAccessed = Date.now()
      this.metadata.chunks[chunkKey] = {
        hash: memCached.hash,
        lastAccessed: memCached.lastAccessed
      }
      this.scheduleSaveMetadata()
      return { packetData: memCached.packetData, hash: memCached.hash }
    }

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

        // Update last accessed
        meta.lastAccessed = Date.now()
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

    // Persist to disk only when server supports channel
    if (this.serverSupportsChannel) {
      // Update metadata only when persistence is enabled
      this.metadata.chunks[chunkKey] = {
        hash: computedHash,
        lastAccessed: now
      }
      try {
        await mkdirRecursive(this.getServerDir())
        await fs.promises.writeFile(
          this.getChunkPath(x, z),
          Buffer.from(packetData)
        )
        await this.evictOldEntries()
        this.scheduleSaveMetadata()
      } catch (error) {
        console.warn(`Failed to save chunk ${chunkKey} to disk:`, error)
      }
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

    this.memoryCache.delete(memKey)
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
    // Clear memory cache for current server
    const serverPrefix = `${this.serverAddress}:`
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(serverPrefix)) {
        this.memoryCache.delete(key)
      }
    }

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

  private addToMemoryCache (key: string, entry: CachedChunkPacket): void {
    this.memoryCache.set(key, entry)

    // Evict oldest entries if memory cache is full
    if (this.memoryCache.size > MAX_CACHE_SIZE / 2) {
      const entries = [...this.memoryCache.entries()]
      entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed)

      const toRemove = Math.floor(entries.length * 0.2)
      for (let i = 0; i < toRemove; i++) {
        this.memoryCache.delete(entries[i][0])
      }
    }
  }

  /**
   * Evict old entries when cache exceeds max size
   */
  private async evictOldEntries (): Promise<void> {
    const chunkCount = Object.keys(this.metadata.chunks).length
    if (chunkCount <= MAX_CACHE_SIZE) return

    // Sort by lastAccessed and remove oldest
    const entries = Object.entries(this.metadata.chunks)
      .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed)

    const toDelete = chunkCount - MAX_CACHE_SIZE + Math.floor(MAX_CACHE_SIZE * 0.1)

    for (let i = 0; i < toDelete && i < entries.length; i++) {
      const [chunkKey] = entries[i]
      const [x, z] = chunkKey.split(',').map(Number)

      // Remove from memory cache
      const memKey = this.getMemoryCacheKey(x, z)
      this.memoryCache.delete(memKey)

      // Remove from metadata
      delete this.metadata.chunks[chunkKey]

      // Delete file
      try {
        const chunkPath = this.getChunkPath(x, z)
        if (await existsViaStats(chunkPath)) {
          await fs.promises.unlink(chunkPath)
        }
      } catch (error) {
        // Ignore deletion errors
      }
    }

    console.debug(`Evicted ${toDelete} old chunks from cache`)
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
