import { useEffect } from 'react'
import { simplify } from 'prismarine-nbt'
import RegionFile from 'prismarine-provider-anvil/src/region'
import { Vec3 } from 'vec3'
import { versionToNumber } from 'renderer/viewer/common/utils'
import { WorldWarp } from 'flying-squid/dist/lib/modules/warps'
import { TypedEventEmitter } from 'contro-max/build/typedEventEmitter'
import { PCChunk } from 'prismarine-chunk'
import { Chunk } from 'prismarine-world/types/world'
import { Block } from 'prismarine-block'
import { INVISIBLE_BLOCKS } from 'renderer/viewer/lib/mesher/worldConstants'
import { getRenamedData } from 'flying-squid/dist/blockRenames'
import { useSnapshot, subscribe } from 'valtio'
import { subscribeKey } from 'valtio/utils'
import { getThreeJsRendererMethods } from 'renderer/viewer/three/threeJsMethods'
import BlockData from '../../renderer/viewer/lib/moreBlockDataGenerated.json'
import preflatMap from '../preflatMap.json'
import { contro } from '../controls'
import { gameAdditionalState, miscUiState } from '../globalState'
import { options } from '../optionsStorage'
import { lastConnectOptions } from '../appStatus'
import Minimap, { DisplayMode } from './Minimap'
import { ChunkInfo, DrawerAdapter, MapUpdates, MinimapDrawer } from './MinimapDrawer'
import { useIsModalActive } from './utilsApp'

const findHeightMap = (obj: PCChunk): number[] | undefined => {
  function search (obj: any): any | undefined {
    for (const key in obj) {
      if (['heightmap', 'heightmaps'].includes(key.toLowerCase())) {
        return obj[key]
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        const result = search(obj[key])
        return result
      }
    }
  }
  return search(obj)
}

export class DrawerAdapterImpl extends TypedEventEmitter<MapUpdates> implements DrawerAdapter {
  playerPosition: Vec3
  yaw: number
  world: string
  warps: WorldWarp[] = gameAdditionalState.warps
  chunksStore = new Map<string, undefined | null | 'requested' | ChunkInfo>()
  loadingChunksQueue = new Set<string>()
  loadChunk: (key: string) => Promise<void> = this.loadChunkMinimap
  mapDrawer = new MinimapDrawer(this.loadChunk.bind(this), this.warps, this.loadingChunksQueue, this.chunksStore)
  currChunk: PCChunk | undefined
  currChunkPos: { x: number, z: number } = { x: 0, z: 0 }
  isOldVersion: boolean
  blockData: Map<string | string[], string>
  heightMap: Record<string, number> = {}
  regions = new Map<string, RegionFile>()
  chunksHeightmaps: Record<string, any> = {}
  loadChunkFullmap: (key: string) => Promise<ChunkInfo | null | undefined>
  _full = false
  isBuiltinHeightmapAvailable = false
  unsubscribers: Array<() => void> = []

  constructor (pos?: Vec3) {
    super()
    this.playerPosition = pos ?? new Vec3(0, 0, 0)

    // check if should use heightmap.
    // As there is no simple way to check if heightmap is present in region file, making an attempt to load one
    if (localServer) {
      const chunkX = Math.floor(this.playerPosition.x / 16)
      const chunkZ = Math.floor(this.playerPosition.z / 16)
      const regionX = Math.floor(chunkX / 32)
      const regionZ = Math.floor(chunkZ / 32)
      const regionKey = `${regionX},${regionZ}`
      const { worldFolder } = localServer.options
      if (worldFolder) {
        const path = `${worldFolder}/region/r.${regionX}.${regionZ}.mca`
        const region = new RegionFile(path)
        void region.initialize()
        this.regions.set(regionKey, region)
        const readX = chunkX % 32 < 0 ? 32 + chunkX % 32 : chunkX % 32
        const readZ = chunkZ % 32 < 0 ? 32 + chunkZ % 32 : chunkZ % 32
        console.log('heightmap check begun', readX, readZ)
        void this.regions.get(regionKey)?.read(readX, readZ)?.then((rawChunk) => {
          let heightmap: number[] | undefined
          try {
            const chunk = simplify(rawChunk as any)
            heightmap = findHeightMap(chunk)
          } catch (err) {
            console.warn('error getting heightmap', err)
          }
          if (heightmap) {
            this.isBuiltinHeightmapAvailable = true
            this.loadChunkFullmap = this.loadChunkFromRegion
            console.log('using heightmap')
          } else {
            this.isBuiltinHeightmapAvailable = false
            this.loadChunkFullmap = this.loadChunkNoRegion
            console.log('dont use heightmap')
          }
        })
      } else {
        this.isBuiltinHeightmapAvailable = false
        this.loadChunkFullmap = this.loadChunkNoRegion
        console.log('dont use heightmap')
      }
    } else {
      this.isBuiltinHeightmapAvailable = false
      this.loadChunkFullmap = this.loadChunkFromViewer
    }
    if (localServer) {
      this.overwriteWarps(localServer.warps)
    } else {
      const storageWarps = localStorage.getItem(`warps: ${lastConnectOptions.value?.server ?? 'server'} ${lastConnectOptions.value?.username ?? 'username'}`)
      this.overwriteWarps(JSON.parse(storageWarps ?? '[]'))
    }
    this.isOldVersion = versionToNumber(bot.version) < versionToNumber('1.13')
    this.blockData = new Map<string, string>()
    for (const blockKey of Object.keys(BlockData.colors)) {
      const renamedKey = getRenamedData('blocks', blockKey, '1.20.2', bot.version)
      this.blockData.set(renamedKey, BlockData.colors[blockKey])
    }

    subscribe(appViewer.rendererState.world, () => {
      for (const key of this.loadingChunksQueue) {
        if (appViewer.rendererState.world.chunksLoaded.has(key)) {
          this.loadingChunksQueue.delete(key)
          void this.loadChunk(key)
        }
      }
    })
  }

  destroy () {
    for (const unsubscriber of this.unsubscribers) {
      unsubscriber()
    }
  }

  get full () {
    return this._full
  }

  set full (full: boolean) {
    if (!full) {
      console.log('this is minimap')
      this.loadChunk = this.loadChunkMinimap
      this.mapDrawer.loadChunk = this.loadChunk
    }
    this._full = full
  }

  overwriteWarps (newWarps: WorldWarp[]) {
    this.warps.splice(0, this.warps.length)
    for (const warp of newWarps) {
      this.warps.push({ ...warp })
    }
  }

  setWarp (warp: WorldWarp, remove?: boolean): void {
    this.world = bot.game.dimension
    const index = this.warps.findIndex(w => w.name === warp.name)
    if (!remove && index === -1) {
      this.warps.push(warp)
    } else if (remove && index !== -1) {
      this.warps.splice(index, 1)
    } else {
      this.warps[index] = warp
    }
    if (localServer) {
      // type suppressed until server is updated. It works fine
      void (localServer as any).setWarp(warp, remove)
    } else if (remove) {
      localStorage.removeItem(`warps: ${bot.username} ${lastConnectOptions.value!.server}`)
    } else {
      localStorage.setItem(`warps: ${bot.username} ${lastConnectOptions.value!.server}`, JSON.stringify(this.warps))
    }
    this.emit('updateWarps')
  }

  getHighestBlockY (x: number, z: number, chunk?: Chunk) {
    const chunkX = Math.floor(x / 16) * 16
    const chunkZ = Math.floor(z / 16) * 16
    if (this.chunksHeightmaps[`${chunkX},${chunkZ}`]) {
      return this.chunksHeightmaps[`${chunkX},${chunkZ}`][x - chunkX + (z - chunkZ) * 16] - 1
    }
    const source = chunk ?? bot.world
    const { height, minY } = (bot.game as any)
    for (let i = height; i > 0; i -= 1) {
      const block = source.getBlock(new Vec3(x & 15, minY + i, z & 15))
      if (block && !INVISIBLE_BLOCKS.has(block.name)) {
        return minY + i
      }
    }
    return minY
  }

  async getChunkSingleplayer (chunkX: number, chunkZ: number) {
    // absolute coords
    const region = (localServer!.overworld.storageProvider as any).getRegion(chunkX * 16, chunkZ * 16)
    if (!region) return 'unavailable'
    const chunk = await localServer!.players[0]!.world.getColumn(chunkX, chunkZ)
    return chunk
  }

  async loadChunkMinimap (key: string) {
    const [chunkX, chunkZ] = key.split(',').map(Number)
    const chunkWorldX = chunkX * 16
    const chunkWorldZ = chunkZ * 16
    if (appViewer.rendererState.world.chunksLoaded.has(key)) {
      // console.log('[MinimapProvider] loading chunk for minimap', key)
      const heightmap = appViewer.rendererState.world.heightmaps.get(key)
      if (heightmap) {
        // console.log('[MinimapProvider] did get highest blocks')
      } else {
        console.warn('[MinimapProvider] no highestBlocks from renderMethods')
        return undefined
      }
      const colors = Array.from({ length: 256 }).fill('') as string[]
      // avoid creating new object every time
      const blockPos = new Vec3(0, 0, 0)
      // filling up colors
      for (let z = 0; z < 16; z += 1) {
        for (let x = 0; x < 16; x += 1) {
          const blockX = chunkWorldX + x
          const blockZ = chunkWorldZ + z
          const index = z * 16 + x
          blockPos.x = blockX; blockPos.z = blockZ; blockPos.y = heightmap[index]
          const block = bot.world.getBlock(blockPos)
          // blocks which are not set are shown as half transparent
          if (!block) {
            colors[index] = 'rgba(0, 0, 0, 0.5)'
            continue
          }
          colors[index] = this.setColor(block)
        }
      }
      const chunk = { heightmap, colors }
      this.applyShadows(chunk)
      this.chunksStore.set(key, chunk)
      this.emit(`chunkReady`, `${chunkX},${chunkZ}`)
    } else {
      this.loadingChunksQueue.add(`${chunkX},${chunkZ}`)
      this.chunksStore.set(key, 'requested')
      // console.log('[MinimapProvider] requested new chunk', key)
    }
  }

  async loadChunkNoRegion (key: string) {
    const [chunkX, chunkZ] = key.split(',').map(Number)
    const chunkWorldX = chunkX * 16
    const chunkWorldZ = chunkZ * 16
    const chunkInfo = await this.getChunkSingleplayer(chunkX, chunkZ)
    if (chunkInfo === 'unavailable') return null
    const heightmap = new Uint8Array(256)
    const colors = Array.from({ length: 256 }).fill('') as string[]
    for (let z = 0; z < 16; z += 1) {
      for (let x = 0; x < 16; x += 1) {
        const blockX = chunkWorldX + x
        const blockZ = chunkWorldZ + z
        const blockY = this.getHighestBlockY(blockX, blockZ, chunkInfo)
        const blockPos = new Vec3(blockX & 15, blockY, blockZ & 15)
        let block = chunkInfo.getBlock(blockPos)
        while (block?.name.includes('air')) {
          blockPos.y -= 1
          block = chunkInfo.getBlock(blockPos)
        }
        if (!block) {
          console.warn(`[cannot get the block] ${chunkX}, ${chunkZ}, ${chunkWorldX + x}, ${chunkWorldZ + z}`)
          return null
        }
        const index = z * 16 + x
        heightmap[index] = blockPos.y
        colors[index] = this.setColor(block)
      }
    }
    const chunk: ChunkInfo = { heightmap, colors }
    this.applyShadows(chunk)
    return chunk
  }

  async loadChunkFromRegion (key: string): Promise<ChunkInfo | null | undefined> {
    const [chunkX, chunkZ] = key.split(',').map(Number)
    const chunkWorldX = chunkX * 16
    const chunkWorldZ = chunkZ * 16
    const heightmap = await this.getChunkHeightMapFromRegion(chunkX, chunkZ) as unknown as Uint8Array
    if (!heightmap) return null
    const chunkInfo = await this.getChunkSingleplayer(chunkX, chunkZ)
    if (chunkInfo === 'unavailable') return null
    const colors = Array.from({ length: 256 }).fill('') as string[]
    for (let z = 0; z < 16; z += 1) {
      for (let x = 0; x < 16; x += 1) {
        const blockX = chunkWorldX + x
        const blockZ = chunkWorldZ + z
        const index = z * 16 + x
        heightmap[index] -= 1
        if (heightmap[index] < 0) heightmap[index] = 0
        const blockY = heightmap[index]
        const blockPos = new Vec3(blockX & 15, blockY, blockZ & 15)
        let block = chunkInfo.getBlock(blockPos)
        while (block?.name.includes('air')) {
          blockPos.y -= 1
          block = chunkInfo.getBlock(blockPos)
        }
        if (!block) {
          console.warn(`[cannot get the block] ${chunkX}, ${chunkZ}, ${chunkWorldX + x}, ${chunkWorldZ + z}`)
          return null
        }
        colors[index] = this.setColor(block)
      }
    }
    const chunk: ChunkInfo = { heightmap, colors }
    this.applyShadows(chunk)
    return chunk
  }

  async getChunkHeightMapFromRegion (chunkX: number, chunkZ: number, cb?: (hm: number[]) => void) {
    const regionX = Math.floor(chunkX / 32)
    const regionZ = Math.floor(chunkZ / 32)
    const regionKey = `${regionX},${regionZ}`
    if (!this.regions.has(regionKey)) {
      const { worldFolder } = localServer!.options
      const path = `${worldFolder}/region/r.${regionX}.${regionZ}.mca`
      const region = new RegionFile(path)
      await region.initialize()
      this.regions.set(regionKey, region)
    }
    const rawChunk = await this.regions.get(regionKey)!.read(chunkX % 32, chunkZ % 32)
    const chunk = simplify(rawChunk as any)
    console.log(`chunk ${chunkX}, ${chunkZ}:`, chunk)
    const heightmap = findHeightMap(chunk)
    console.log(`heightmap ${chunkX}, ${chunkZ}:`, heightmap)
    cb?.(heightmap!)
    return heightmap
    // this.chunksHeightmaps[`${chunkX},${chunkZ}`] = heightmap
  }

  async loadChunkFromViewer (key: string) {
    const [chunkX, chunkZ] = key.split(',').map(Number)
    const chunkWorldX = chunkX * 16
    const chunkWorldZ = chunkZ * 16
    const highestBlocks = await getThreeJsRendererMethods()?.getHighestBlocks(`${chunkWorldX},${chunkWorldZ}`)
    if (appViewer.rendererState.world.chunksLoaded.has(`${chunkWorldX},${chunkWorldZ}`)) {
      const heightmap = new Uint8Array(256)
      const colors = Array.from({ length: 256 }).fill('') as string[]
      if (!highestBlocks) return null
      for (let z = 0; z < 16; z += 1) {
        for (let x = 0; x < 16; x += 1) {
          const blockX = chunkWorldX + x
          const blockZ = chunkWorldZ + z
          const hBlock = highestBlocks[`${blockX},${blockZ}`]
          const block = bot.world.getBlock(new Vec3(blockX, hBlock?.y ?? 0, blockZ))
          // const block = Block.fromStateId(hBlock?.stateId ?? -1, hBlock?.biomeId ?? -1)
          const index = z * 16 + x
          if (!block || !hBlock) {
            console.warn(`[loadChunk] ${chunkX}, ${chunkZ}, ${chunkWorldX + x}, ${chunkWorldZ + z}`)
            heightmap[index] = 0
            colors[index] = 'rgba(0, 0, 0, 0.5)'
            continue
          }
          heightmap[index] = hBlock.y
          colors[index] = this.setColor(block)
        }
      }
      const chunk = { heightmap, colors }
      this.applyShadows(chunk)
      return chunk
    } else {
      return null
    }
  }

  applyShadows (chunk: ChunkInfo) {
    for (let j = 0; j < 16; j += 1) {
      for (let i = 0; i < 16; i += 1) {
        const index = j * 16 + i
        const color = chunk.colors[index]
        // if (i === 0 || j === 0 || i === 15 || j === 16) {
        //   const r = Math.floor(Math.random() * 2)
        //   chunk.colors[index] = r===0 ? this.makeDarker(color) : this.makeLighter(color)
        //   continue
        // }

        const h = chunk.heightmap[index]
        let isLighterOrDarker = 0

        const r = chunk.heightmap[index + 1] ?? 0
        const u = chunk.heightmap[index - 16] ?? 0
        const ur = chunk.heightmap[index - 15] ?? 0
        if (r > h || u > h || ur > h) {
          chunk.colors[index] = this.makeDarker(color)
          isLighterOrDarker -= 1
        }

        const l = chunk.heightmap[index - 1] ?? 0
        const d = chunk.heightmap[index + 16] ?? 0
        const dl = chunk.heightmap[index + 15] ?? 0
        if (l > h || d > h || dl > h) {
          chunk.colors[index] = this.makeLighter(color)
          isLighterOrDarker += 1
        }

        let linkedIndex: number | undefined
        if (i === 1) {
          linkedIndex = index - 1
        } else if (i === 14) {
          linkedIndex = index + 1
        } else if (j === 1) {
          linkedIndex = index - 16
        } else if (j === 14) {
          linkedIndex = index + 16
        }
        if (linkedIndex !== undefined) {
          const linkedColor = chunk.colors[linkedIndex]
          switch (isLighterOrDarker) {
            case 1:
              chunk.colors[linkedIndex] = this.makeLighter(linkedColor)
              break
            case -1:
              chunk.colors[linkedIndex] = this.makeDarker(linkedColor)
              break
            default:
              break
          }
        }
      }
    }
  }

  makeDarker (color: string) {
    let rgbArray = color.match(/\d+/g)?.map(Number) ?? []
    if (rgbArray.length !== 3) return color
    rgbArray = rgbArray.map(element => {
      let newColor = element - 20
      if (newColor < 0) newColor = 0
      return newColor
    })
    return `rgb(${rgbArray.join(',')})`
  }

  makeLighter (color: string) {
    let rgbArray = color.match(/\d+/g)?.map(Number) ?? []
    if (rgbArray.length !== 3) return color
    rgbArray = rgbArray.map(element => {
      let newColor = element + 20
      if (newColor > 255) newColor = 255
      return newColor
    })
    return `rgb(${rgbArray.join(',')})`
  }

  clearChunksStore (x: number, z: number) {
    for (const key of Object.keys(this.chunksStore)) {
      const [chunkX, chunkZ] = key.split(',').map(Number)
      if (Math.hypot((chunkX - x), (chunkZ - z)) > 300) {
        delete this.chunksStore[key]
        delete this.chunksHeightmaps[key]
        for (let i = 0; i < 16; i += 1) {
          for (let j = 0; j < 16; j += 1) {
            delete this.heightMap[`${chunkX + i},${chunkZ + j}`]
          }
        }
      }
    }
  }

  setColor (block: Block) {
    let color: string
    if (this.isOldVersion) {
      color = BlockData.colors[preflatMap.blocks[`${block.type}:${block.metadata}`]?.replaceAll(/\[.*?]/g, '')]
        ?? 'rgb(0, 0, 255)'
    } else {
      color = this.blockData.get(block.name) ?? 'rgb(0, 255, 0)'
    }
    if (color === 'rgb(0, 255, 0)' || color === 'rgb(0, 0, 255)') {
      // this should never happen
      // console.warn('[MinimapProvider] did not find block name,', block.name)
      // hack to find close color. Problem with colors should be fixed differently in the future
      const blockNamePieces = block.name.split('_')
      const keys = [...this.blockData.keys()]
      for (const piece of blockNamePieces) {
        const match = keys.find(x => x.includes(piece))
        if (match) {
          color = this.blockData.get(match) ?? 'rgb(255, 0, 0)'
          break
        }
      }
    }

    return color
  }

  quickTp (x: number, z: number) {
    const y = this.getHighestBlockY(x, z)
    bot.chat(`/tp ${x} ${y + 20} ${z}`)
    const timeout = setTimeout(() => {
      const y = this.getHighestBlockY(x, z)
      bot.chat(`/tp ${x} ${y + 20} ${z}`)
      clearTimeout(timeout)
    }, 500)
  }

  async drawChunkOnCanvas (key: string, canvas: HTMLCanvasElement) {
    const chunk = await this.loadChunkFullmap(key)
    const [worldX, worldZ] = key.split(',').map(x => Number(x) * 16)
    const center = new Vec3(worldX + 8, 0, worldZ + 8)
    this.mapDrawer.lastBotPos = center
    this.mapDrawer.canvas = canvas
    this.mapDrawer.full = true
    this.mapDrawer.drawChunk(key, chunk)
    this.mapDrawer.drawWarps(center)
    this.mapDrawer.lastBotPos = this.playerPosition
    this.mapDrawer.yaw = this.yaw
    this.mapDrawer.drawPlayerPos(worldX, worldZ)
  }
}

const Inner = (
  { adapter, displayMode, toggleFullMap }:
  {
    adapter: DrawerAdapterImpl
    displayMode?: DisplayMode,
    toggleFullMap?: () => void
  }
) => {

  const updateWarps = (newWarps: WorldWarp[] | Error) => {
    if (newWarps instanceof Error) {
      console.error('An error occurred:', newWarps.message)
      return
    }

    adapter.overwriteWarps(newWarps)
  }

  const updateMap = () => {
    if (!adapter || miscUiState.displayFullmap) return
    adapter.playerPosition = bot.entity.position
    adapter.yaw = bot.entity.yaw
    adapter.emit('updateMap')
  }

  useEffect(() => {
    bot.on('move', updateMap)
    localServer?.on('warpsUpdated' as keyof ServerEvents, updateWarps)

    return () => {
      bot?.off('move', updateMap)
      localServer?.off('warpsUpdated' as keyof ServerEvents, updateWarps)
    }
  }, [])

  return <div>
    <Minimap
      adapter={adapter}
      showMinimap={options.showMinimap}
      showFullmap='always'
      singleplayer={miscUiState.singleplayer}
      fullMap={displayMode === 'fullmapOnly'}
      toggleFullMap={toggleFullMap}
      displayMode={displayMode}
    />
  </div>
}

export default ({ adapter, displayMode }: { adapter: DrawerAdapterImpl, displayMode?: DisplayMode }) => {

  const { showMinimap } = useSnapshot(options)
  const fullMapOpened = useIsModalActive('full-map')

  const toggleFullMap = () => {
    void contro.emit('trigger', { command: 'ui.toggleMap' })
  }

  if (
    displayMode === 'minimapOnly'
      ? showMinimap === 'never' || (showMinimap === 'singleplayer' && !miscUiState.singleplayer)
      : !fullMapOpened
  ) {
    return null
  }

  return <Inner adapter={adapter} displayMode={displayMode} toggleFullMap={toggleFullMap} />
}
