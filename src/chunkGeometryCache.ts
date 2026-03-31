/**
 * Chunk Geometry Cache Manager
 *
 * Provides long-term caching of chunk geometry to improve performance when revisiting areas.
 * Uses browserfs + fs file storage for persistent caching.
 *
 * Storage structure: /data/geometry-cache/{serverAddress}/{x},{y},{z}.bin
 * Metadata stored in: /data/geometry-cache/{serverAddress}/metadata.json
 *
 * ## Server Scoping:
 * - Memory cache is cleared on server change via setServerSupportsChannel()
 * - Disk cache is server-scoped: /data/geometry-cache/{serverAddress}/
 * - Each server's cache is completely isolated to prevent cross-server data conflicts
 */

import fs from 'fs'
import { join } from 'path'
import sanitize from 'sanitize-filename'
import type { MesherGeometryOutput } from '../renderer/viewer/lib/mesher/shared'
import { computeBlockStateHash } from './blockHash'
import { mkdirRecursive, existsViaStats } from './browserfs'

const CACHE_BASE = '/data/geometry-cache'
const MAX_CACHE_SIZE = 500
const MAX_MEMORY_CACHE_SIZE = 100
const METADATA_FILE = 'metadata.json'

export interface CachedGeometry {
  sectionKey: string
  chunkKey: string
  blockHash: string
  geometry: SerializedGeometry
  lastAccessed: number
  serverAddress?: string
}

// Serializable version of MesherGeometryOutput
export interface SerializedGeometry {
  sx: number
  sy: number
  sz: number
  positions: number[]
  normals: number[]
  colors: number[]
  uvs: number[]
  t_positions?: number[]
  t_normals?: number[]
  t_colors?: number[]
  t_uvs?: number[]
  indices: number[]
  indicesCount: number
  transparentIndicesStart: number
  using32Array: boolean
  tiles: Record<string, any>
  heads: Record<string, any>
  signs: Record<string, any>
  banners: Record<string, any>
  hadErrors: boolean
  blocksCount: number
  customBlockModels?: Record<string, string>
}

type CacheableMesherGeometryOutput = MesherGeometryOutput & {
  transparentIndicesStart?: number
}

interface GeometryMetadata {
  blockHash: string
  lastAccessed: number
}

interface ServerMetadata {
  sections: Record<string, GeometryMetadata> // key is "x,y,z"
}

class ChunkGeometryCache {
  private readonly memoryCache = new Map<string, CachedGeometry>()
  private serverSupportsChannel = false
  private serverAddress = 'unknown'
  private metadata: ServerMetadata = { sections: {} }
  private metadataDirty = false
  private saveMetadataTimeout: ReturnType<typeof setTimeout> | null = null
  private serverStatePromise: Promise<void> = Promise.resolve()

  /**
   * Initialize the cache system
   */
  async init (): Promise<void> {
    try {
      await mkdirRecursive(CACHE_BASE)
      console.debug('Geometry cache initialized')
    } catch (error) {
      console.warn('Failed to initialize geometry cache:', error)
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
   * Get section file path
   */
  private getSectionPath (x: number, y: number, z: number): string {
    return join(this.getServerDir(), `${x},${y},${z}.bin`)
  }

  /**
   * Get metadata file path
   */
  private getMetadataPath (): string {
    return join(this.getServerDir(), METADATA_FILE)
  }

  /**
   * Set whether the server supports the chunk-cache channel
   */
  async setServerSupportsChannel (supports: boolean, serverAddress?: string): Promise<void> {
    const nextState = this.serverStatePromise.then(async () => {
      await this.flush()
      if (this.saveMetadataTimeout) {
        clearTimeout(this.saveMetadataTimeout)
        this.saveMetadataTimeout = null
      }
      this.metadataDirty = false

      this.serverSupportsChannel = supports
      this.serverAddress = serverAddress || 'unknown'
      this.memoryCache.clear()
      this.metadata = { sections: {} }

      console.debug(`Geometry cache: server=${this.serverAddress}, supportsChannel=${supports}`)

      await this.loadMetadata()
    })

    this.serverStatePromise = nextState
    await nextState
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
        console.debug(`Loaded geometry metadata for ${Object.keys(this.metadata.sections).length} cached sections`)
      }
    } catch (error) {
      console.warn('Failed to load geometry cache metadata:', error)
      this.metadata = { sections: {} }
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
      console.warn('Failed to save geometry cache metadata:', error)
    }
  }

  /**
   * Generate the same block hash contract used by the renderer cache lookup path.
   */
  async generateBlockHash (blockStateIds: Uint16Array | number[]): Promise<string> {
    return computeBlockStateHash(blockStateIds)
  }

  /**
   * Get full cache key for memory cache
   */
  private getMemoryCacheKey (x: number, y: number, z: number): string {
    return `${this.serverAddress}:${x},${y},${z}`
  }

  /**
   * Serialize geometry for storage
   */
  private serializeGeometry (geometry: MesherGeometryOutput): SerializedGeometry {
    const geometryWithTransparency = geometry as CacheableMesherGeometryOutput
    return {
      sx: geometry.sx,
      sy: geometry.sy,
      sz: geometry.sz,
      positions: [...geometry.positions],
      normals: [...geometry.normals],
      colors: [...geometry.colors],
      uvs: [...geometry.uvs],
      t_positions: geometry.t_positions ? [...geometry.t_positions] : undefined,
      t_normals: geometry.t_normals ? [...geometry.t_normals] : undefined,
      t_colors: geometry.t_colors ? [...geometry.t_colors] : undefined,
      t_uvs: geometry.t_uvs ? [...geometry.t_uvs] : undefined,
      indices: [...geometry.indices],
      indicesCount: geometry.indicesCount,
      transparentIndicesStart: geometryWithTransparency.transparentIndicesStart ?? geometry.indicesCount,
      using32Array: geometry.using32Array,
      tiles: geometry.tiles,
      heads: geometry.heads,
      signs: geometry.signs,
      banners: geometry.banners,
      hadErrors: geometry.hadErrors,
      blocksCount: geometry.blocksCount,
      customBlockModels: geometry.customBlockModels
    }
  }

  /**
   * Deserialize geometry from storage
   * @throws {Error} If serialized data is missing required fields
   */
  deserializeGeometry (serialized: SerializedGeometry): MesherGeometryOutput {
    // Validate required fields exist
    if (!serialized.positions || !serialized.indices) {
      throw new Error('Serialized geometry missing required fields (positions or indices)')
    }

    const geometry = {
      sx: serialized.sx,
      sy: serialized.sy,
      sz: serialized.sz,
      positions: new Float32Array(serialized.positions),
      normals: new Float32Array(serialized.normals),
      colors: new Float32Array(serialized.colors),
      uvs: new Float32Array(serialized.uvs),
      t_positions: serialized.t_positions ? new Float32Array(serialized.t_positions) : undefined,
      t_normals: serialized.t_normals ? new Float32Array(serialized.t_normals) : undefined,
      t_colors: serialized.t_colors ? new Float32Array(serialized.t_colors) : undefined,
      t_uvs: serialized.t_uvs ? new Float32Array(serialized.t_uvs) : undefined,
      indices: serialized.using32Array
        ? new Uint32Array(serialized.indices)
        : new Uint16Array(serialized.indices),
      indicesCount: serialized.indicesCount,
      using32Array: serialized.using32Array,
      tiles: serialized.tiles,
      heads: serialized.heads,
      signs: serialized.signs,
      banners: serialized.banners,
      hadErrors: serialized.hadErrors,
      blocksCount: serialized.blocksCount,
      customBlockModels: serialized.customBlockModels
    } as CacheableMesherGeometryOutput

    geometry.transparentIndicesStart = serialized.transparentIndicesStart
    return geometry
  }

  /**
   * Get cached geometry by section key and block hash
   */
  async get (x: number, y: number, z: number, blockHash: string): Promise<MesherGeometryOutput | null> {
    await this.serverStatePromise
    const memKey = this.getMemoryCacheKey(x, y, z)
    const sectionKey = `${x},${y},${z}`

    // Check memory cache first
    const memCached = this.memoryCache.get(memKey)
    if (memCached && memCached.blockHash === blockHash) {
      memCached.lastAccessed = Date.now()
      this.metadata.sections[sectionKey] = {
        blockHash: memCached.blockHash,
        lastAccessed: memCached.lastAccessed
      }
      this.scheduleSaveMetadata()
      return this.deserializeGeometry(memCached.geometry)
    }

    // Check if we have metadata for this section
    const meta = this.metadata.sections[sectionKey]
    if (!meta || meta.blockHash !== blockHash) return null

    // Try to load from disk
    try {
      const sectionPath = this.getSectionPath(x, y, z)
      if (await existsViaStats(sectionPath)) {
        const data = await fs.promises.readFile(sectionPath)
        const cached: CachedGeometry = JSON.parse(data.toString())

        // Verify hash matches
        if (cached.blockHash !== blockHash) {
          // Hash mismatch, invalidate
          delete this.metadata.sections[sectionKey]
          this.scheduleSaveMetadata()
          return null
        }

        // Update last accessed
        cached.lastAccessed = Date.now()
        meta.lastAccessed = cached.lastAccessed
        this.scheduleSaveMetadata()

        // Add to memory cache
        this.addToMemoryCache(memKey, cached)

        return this.deserializeGeometry(cached.geometry)
      }
    } catch (error) {
      console.warn(`Failed to load geometry ${sectionKey} from disk:`, error)
    }

    // File doesn't exist or failed to load, clean up metadata
    delete this.metadata.sections[sectionKey]
    this.scheduleSaveMetadata()
    return null
  }

  /**
   * Store geometry in cache
   */
  async set (
    x: number,
    y: number,
    z: number,
    blockHash: string,
    geometry: MesherGeometryOutput
  ): Promise<void> {
    await this.serverStatePromise
    const memKey = this.getMemoryCacheKey(x, y, z)
    const sectionKey = `${x},${y},${z}`
    const chunkKey = `${x},${z}`
    const now = Date.now()

    const cachedGeometry: CachedGeometry = {
      sectionKey,
      chunkKey,
      blockHash,
      geometry: this.serializeGeometry(geometry),
      lastAccessed: now,
      serverAddress: this.serverAddress
    }

    // Always add to memory cache
    this.addToMemoryCache(memKey, cachedGeometry)

    // Persist to disk only when server supports channel
    if (this.serverSupportsChannel) {
      // Update metadata only when persistence is enabled
      this.metadata.sections[sectionKey] = {
        blockHash,
        lastAccessed: now
      }
      try {
        await mkdirRecursive(this.getServerDir())
        await fs.promises.writeFile(
          this.getSectionPath(x, y, z),
          JSON.stringify(cachedGeometry)
        )
        await this.evictOldEntries()
        this.scheduleSaveMetadata()
      } catch (error) {
        console.warn(`Failed to save geometry ${sectionKey} to disk:`, error)
      }
    }
  }

  /**
   * Invalidate cache for a specific section
   */
  async invalidate (x: number, y: number, z: number): Promise<void> {
    await this.serverStatePromise
    const memKey = this.getMemoryCacheKey(x, y, z)
    const sectionKey = `${x},${y},${z}`

    this.memoryCache.delete(memKey)
    delete this.metadata.sections[sectionKey]
    this.scheduleSaveMetadata()

    try {
      const sectionPath = this.getSectionPath(x, y, z)
      if (await existsViaStats(sectionPath)) {
        await fs.promises.unlink(sectionPath)
      }
    } catch (error) {
      console.warn(`Failed to delete geometry ${sectionKey} from disk:`, error)
    }
  }

  /**
   * Clear all cached geometry for the current server
   */
  async clear (): Promise<void> {
    await this.serverStatePromise
    // Clear memory cache for current server
    const serverPrefix = `${this.serverAddress}:`
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(serverPrefix)) {
        this.memoryCache.delete(key)
      }
    }

    // Clear metadata
    this.metadata = { sections: {} }

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
      console.warn('Failed to clear geometry cache directory:', error)
    }
  }

  /**
   * Add entry to memory cache with LRU eviction
   */
  private addToMemoryCache (key: string, entry: CachedGeometry): void {
    this.memoryCache.set(key, entry)

    // Evict oldest entries if cache is full
    if (this.memoryCache.size > MAX_MEMORY_CACHE_SIZE) {
      const entries = [...this.memoryCache.entries()]
      entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed)

      // Remove oldest 20% of entries
      const toRemove = Math.floor(MAX_MEMORY_CACHE_SIZE * 0.2)
      for (let i = 0; i < toRemove && i < entries.length; i++) {
        this.memoryCache.delete(entries[i][0])
      }
    }
  }

  /**
   * Evict old entries when cache exceeds max size
   */
  private async evictOldEntries (): Promise<void> {
    const sectionCount = Object.keys(this.metadata.sections).length
    if (sectionCount <= MAX_CACHE_SIZE) return

    // Sort by lastAccessed and remove oldest
    const entries = Object.entries(this.metadata.sections)
      .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed)

    const toDelete = sectionCount - MAX_CACHE_SIZE + Math.floor(MAX_CACHE_SIZE * 0.1)

    await Promise.all(entries.slice(0, toDelete).map(async ([sectionKey]) => {
      const [x, y, z] = sectionKey.split(',').map(Number)

      // Remove from memory cache
      const memKey = this.getMemoryCacheKey(x, y, z)
      this.memoryCache.delete(memKey)

      // Remove from metadata
      delete this.metadata.sections[sectionKey]

      // Delete file
      try {
        const sectionPath = this.getSectionPath(x, y, z)
        if (await existsViaStats(sectionPath)) {
          await fs.promises.unlink(sectionPath)
        }
      } catch (error) {
        // Ignore deletion errors
      }
    }))

    console.debug(`Evicted ${toDelete} old geometry entries from cache`)
  }

  /**
   * Get cache statistics
   */
  getStats (): { memorySize: number; diskSize: number; supportsChannel: boolean; serverAddress: string } {
    return {
      memorySize: this.memoryCache.size,
      diskSize: Object.keys(this.metadata.sections).length,
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
export const chunkGeometryCache = new ChunkGeometryCache()

// Export for testing
export { ChunkGeometryCache }
