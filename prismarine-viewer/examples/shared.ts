import { world } from 'prismarine-world'
import WorldLoader from 'prismarine-world'
import ChunkLoader from 'prismarine-chunk'

export type BlockFaceType = {
  side: number
  textureIndex: number
  tint?: [number, number, number]
  isTransparent?: boolean

  // for testing
  face?: string
  neighbor?: string
  light?: number
}

export type BlockType = {
  faces: BlockFaceType[]

  // for testing
  block: string
}

export const makeError = (str: string) => {
  reportError?.(str)
}
export const makeErrorCritical = (str: string) => {
  throw new Error(str)
}

export const getSyncWorld = (version: string): world.WorldSync => {
  const World = (WorldLoader as any)(version)
  const Chunk = (ChunkLoader as any)(version)

  const world = new World(version).sync

  const methods = getAllMethods(world)
  for (const method of methods) {
    if (method.startsWith('set') && method !== 'setColumn') {
      const oldMethod = world[method].bind(world)
      world[method] = (...args) => {
        const arg = args[0]
        if (arg.x !== undefined && !world.getColumnAt(arg)) {
          world.setColumn(Math.floor(arg.x / 16), Math.floor(arg.z / 16), new Chunk(undefined as any))
        }
        oldMethod(...args)
      }
    }
  }

  return world
}

function getAllMethods (obj) {
  const methods = new Set()
  let currentObj = obj

  do {
    for (const name of Object.getOwnPropertyNames(currentObj)) {
      if (typeof obj[name] === 'function' && name !== 'constructor') {
        methods.add(name)
      }
    }
  } while ((currentObj = Object.getPrototypeOf(currentObj)))

  return [...methods] as string[]
}
