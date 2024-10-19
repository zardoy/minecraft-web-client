/* eslint-disable guard-for-in */

// todo refactor into its own commons module
import { EventEmitter } from 'events'
import { generateSpiralMatrix, ViewRect } from 'flying-squid/dist/utils'
import { Vec3 } from 'vec3'
import { BotEvents } from 'mineflayer'
import { getItemFromBlock } from '../../../src/chatUtils'
import { chunkPos } from './simpleUtils'

export type ChunkPosKey = string
type ChunkPos = { x: number, z: number }

/**
 * Usually connects to mineflayer bot and emits world data (chunks, entities)
 * It's up to the consumer to serialize the data if needed
 */
export class WorldDataEmitter extends EventEmitter {
  private loadedChunks: Record<ChunkPosKey, boolean>
  private readonly lastPos: Vec3
  private eventListeners: Record<string, any> = {}
  private readonly emitter: WorldDataEmitter
  keepChunksDistance = 0
  addWaitTime = 1
  _handDisplay = false
  get handDisplay () {
    return this._handDisplay
  }
  set handDisplay (newVal) {
    this._handDisplay = newVal
    this.eventListeners.heldItemChanged?.()
  }

  constructor (public world: typeof __type_bot['world'], public viewDistance: number, position: Vec3 = new Vec3(0, 0, 0)) {
    super()
    this.loadedChunks = {}
    this.lastPos = new Vec3(0, 0, 0).update(position)
    // todo
    this.emitter = this

    this.emitter.on('mouseClick', async (click) => {
      const ori = new Vec3(click.origin.x, click.origin.y, click.origin.z)
      const dir = new Vec3(click.direction.x, click.direction.y, click.direction.z)
      const block = this.world.raycast(ori, dir, 256)
      if (!block) return
      this.emit('blockClicked', block, block.face, click.button)
    })
  }

  updateViewDistance (viewDistance: number) {
    this.viewDistance = viewDistance
    this.emitter.emit('renderDistance', viewDistance)
  }

  listenToBot (bot: typeof __type_bot) {
    const emitEntity = (e) => {
      if (!e || e === bot.entity) return
      this.emitter.emit('entity', {
        ...e,
        pos: e.position,
        username: e.username,
        // set debugTree (obj) {
        //   e.debugTree = obj
        // }
      })
    }

    this.eventListeners = {
      // 'move': botPosition,
      entitySpawn (e: any) {
        emitEntity(e)
      },
      entityUpdate (e: any) {
        emitEntity(e)
      },
      entityMoved (e: any) {
        emitEntity(e)
      },
      entityGone: (e: any) => {
        this.emitter.emit('entity', { id: e.id, delete: true })
      },
      chunkColumnLoad: (pos: Vec3) => {
        void this.loadChunk(pos)
      },
      chunkColumnUnload: (pos: Vec3) => {
        this.unloadChunk(pos)
      },
      blockUpdate: (oldBlock: any, newBlock: any) => {
        const stateId = newBlock.stateId ?? ((newBlock.type << 4) | newBlock.metadata)
        this.emitter.emit('blockUpdate', { pos: oldBlock.position, stateId })
      },
      time: () => {
        this.emitter.emit('time', bot.time.timeOfDay)
      },
      heldItemChanged: () => {
        if (!this.handDisplay) {
          viewer.world.onHandItemSwitch(undefined)
          return
        }
        const newItem = bot.heldItem
        if (!newItem) {
          viewer.world.onHandItemSwitch(undefined)
          return
        }
        const block = loadedData.blocksByName[newItem.name]
        // todo clean types
        const blockProperties = block ? new window.PrismarineBlock(block.id, 'void', newItem.metadata).getProperties() : {}
        viewer.world.onHandItemSwitch({ name: newItem.name, properties: blockProperties })
      },
    } satisfies Partial<BotEvents>
    this.eventListeners.heldItemChanged()


    bot._client.on('update_light', ({ chunkX, chunkZ }) => {
      const chunkPos = new Vec3(chunkX * 16, 0, chunkZ * 16)
      void this.loadChunk(chunkPos, true)
    })

    this.emitter.on('listening', () => {
      this.emitter.emit('blockEntities', new Proxy({}, {
        get (_target, posKey, receiver) {
          if (typeof posKey !== 'string') return
          const [x, y, z] = posKey.split(',').map(Number)
          return bot.world.getBlock(new Vec3(x, y, z))?.entity
        },
      }))
      this.emitter.emit('renderDistance', this.viewDistance)
      this.emitter.emit('time', bot.time.timeOfDay)
    })
    // node.js stream data event pattern
    if (this.emitter.listenerCount('blockEntities')) {
      this.emitter.emit('listening')
    }

    for (const [evt, listener] of Object.entries(this.eventListeners)) {
      bot.on(evt as any, listener)
    }

    for (const id in bot.entities) {
      const e = bot.entities[id]
      emitEntity(e)
    }
  }

  removeListenersFromBot (bot: import('mineflayer').Bot) {
    for (const [evt, listener] of Object.entries(this.eventListeners)) {
      bot.removeListener(evt as any, listener)
    }
  }

  async init (pos: Vec3) {
    this.updateViewDistance(this.viewDistance)
    this.emitter.emit('chunkPosUpdate', { pos })
    const [botX, botZ] = chunkPos(pos)

    const positions = generateSpiralMatrix(this.viewDistance).map(([x, z]) => new Vec3((botX + x) * 16, 0, (botZ + z) * 16))

    this.lastPos.update(pos)
    await this._loadChunks(positions)
  }

  async _loadChunks (positions: Vec3[], sliceSize = 5) {
    let i = 0
    const promises = [] as Array<Promise<void>>
    return new Promise<void>(resolve => {
      const interval = setInterval(() => {
        if (i >= positions.length) {
          clearInterval(interval)
          void Promise.all(promises).then(() => resolve())
          return
        }
        promises.push(this.loadChunk(positions[i]))
        i++
      }, this.addWaitTime)
    })
  }

  readdDebug () {
    const clonedLoadedChunks = { ...this.loadedChunks }
    this.unloadAllChunks()
    for (const loadedChunk in clonedLoadedChunks) {
      const [x, z] = loadedChunk.split(',').map(Number)
      void this.loadChunk(new Vec3(x, 0, z))
    }
  }

  // debugGotChunkLatency = [] as number[]
  // lastTime = 0

  async loadChunk (pos: ChunkPos, isLightUpdate = false) {
    const [botX, botZ] = chunkPos(this.lastPos)
    const dx = Math.abs(botX - Math.floor(pos.x / 16))
    const dz = Math.abs(botZ - Math.floor(pos.z / 16))
    if (dx <= this.viewDistance && dz <= this.viewDistance) {
      // eslint-disable-next-line @typescript-eslint/await-thenable -- todo allow to use async world provider but not sure if needed
      const column = await this.world.getColumnAt(pos['y'] ? pos as Vec3 : new Vec3(pos.x, 0, pos.z))
      if (column) {
        // const latency = Math.floor(performance.now() - this.lastTime)
        // this.debugGotChunkLatency.push(latency)
        // this.lastTime = performance.now()
        // todo optimize toJson data, make it clear why it is used
        const chunk = column.toJson()
        // TODO: blockEntities
        const worldConfig = {
          minY: column['minY'] ?? 0,
          worldHeight: column['worldHeight'] ?? 256,
        }
        //@ts-expect-error
        this.emitter.emit('loadChunk', { x: pos.x, z: pos.z, chunk, blockEntities: column.blockEntities, worldConfig, isLightUpdate })
        this.loadedChunks[`${pos.x},${pos.z}`] = true
      } else {
        this.emitter.emit('markAsLoaded', { x: pos.x, z: pos.z })
      }
    } else {
      // console.debug('skipped loading chunk', dx, dz, '>', this.viewDistance)
    }
  }

  unloadAllChunks () {
    for (const coords of Object.keys(this.loadedChunks)) {
      const [x, z] = coords.split(',').map(Number)
      this.unloadChunk({ x, z })
    }
  }

  unloadChunk (pos: ChunkPos) {
    this.emitter.emit('unloadChunk', { x: pos.x, z: pos.z })
    delete this.loadedChunks[`${pos.x},${pos.z}`]
  }

  async updatePosition (pos: Vec3, force = false) {
    return
    const [lastX, lastZ] = chunkPos(this.lastPos)
    const [botX, botZ] = chunkPos(pos)
    if (lastX !== botX || lastZ !== botZ || force) {
      this.emitter.emit('chunkPosUpdate', { pos })
      const newViewToUnload = new ViewRect(botX, botZ, this.viewDistance + this.keepChunksDistance)
      const chunksToUnload: Vec3[] = []
      for (const coords of Object.keys(this.loadedChunks)) {
        const x = parseInt(coords.split(',')[0], 10)
        const z = parseInt(coords.split(',')[1], 10)
        const p = new Vec3(x, 0, z)
        const [chunkX, chunkZ] = chunkPos(p)
        if (!newViewToUnload.contains(chunkX, chunkZ)) {
          chunksToUnload.push(p)
        }
      }
      console.log('unloading', chunksToUnload.length, 'total now', Object.keys(this.loadedChunks).length)
      for (const p of chunksToUnload) {
        this.unloadChunk(p)
      }
      const positions = generateSpiralMatrix(this.viewDistance).map(([x, z]) => {
        const pos = new Vec3((botX + x) * 16, 0, (botZ + z) * 16)
        if (!this.loadedChunks[`${pos.x},${pos.z}`]) return pos
        return undefined!
      }).filter(a => !!a)
      this.lastPos.update(pos)
      void this._loadChunks(positions)
    } else {
      this.emitter.emit('chunkPosUpdate', { pos }) // todo-low
      this.lastPos.update(pos)
    }
  }
}
