import { Vec3 } from 'vec3'
import type { Block } from 'prismarine-block'
import { isBoatEntityName } from 'minecraft-renderer/src/three/entity/boatModelRotation'
import { BoatStatus } from '@nxg-org/mineflayer-physics-util'

type BoatEntityLike = {
  name?: string
  position: Vec3
  width?: number
  height?: number
}

type WorldLike = {
  getBlock: (pos: Vec3) => Block | null
}

type WaterIds = {
  waterId: number
  flowingWaterId?: number
}

function getEntityBB (entity: BoatEntityLike) {
  const width = entity.width ?? 1.375
  const height = entity.height ?? 0.5625
  const halfWidth = width / 2
  const { x, y, z } = entity.position
  return {
    minX: x - halfWidth,
    maxX: x + halfWidth,
    minY: y,
    maxY: y + height,
    minZ: z - halfWidth,
    maxZ: z + halfWidth,
  }
}

function isWaterBlock (block: Block | null | undefined, ids: WaterIds): block is Block {
  if (!block) return false
  if (block.type === ids.waterId) return true
  if (ids.flowingWaterId != null && block.type === ids.flowingWaterId) return true
  return !!block.getProperties?.().waterlogged
}

function isSourceWater (block: Block, ids: WaterIds): boolean {
  if (block.getProperties?.().waterlogged) return true
  if (block.type !== ids.waterId) return true
  return Number(block.getProperties?.().level ?? 0) === 0
}

function getFluidHeight (block: Block, world: WorldLike, pos: Vec3, ids: WaterIds): number {
  const above = world.getBlock(pos.offset(0, 1, 0))
  if (above && isWaterBlock(above, ids) && (above.type === block.type || above.getProperties?.().waterlogged)) {
    return 1
  }
  if (isWaterBlock(block, ids)) {
    const level = Number(block.getProperties?.().level ?? 0)
    return 1 - level / 9
  }
  return 0
}

function isUnderwater (bb: ReturnType<typeof getEntityBB>, world: WorldLike, ids: WaterIds): boolean | null {
  const topY = bb.maxY + 0.001
  const minX = Math.floor(bb.minX)
  const maxX = Math.ceil(bb.maxX)
  const minY = Math.floor(bb.maxY)
  const maxY = Math.ceil(topY)
  const minZ = Math.floor(bb.minZ)
  const maxZ = Math.ceil(bb.maxZ)
  let foundSource = false
  const cursor = new Vec3(0, 0, 0)

  for (cursor.y = minY; cursor.y < maxY; cursor.y++) {
    for (cursor.x = minX; cursor.x < maxX; cursor.x++) {
      for (cursor.z = minZ; cursor.z < maxZ; cursor.z++) {
        const block = world.getBlock(cursor)
        if (block == null) return null
        if (!isWaterBlock(block, ids)) continue
        const fluidHeight = cursor.y + getFluidHeight(block, world, cursor, ids)
        if (topY < fluidHeight) {
          if (!isSourceWater(block, ids)) {
            return true
          }
          foundSource = true
        }
      }
    }
  }

  return foundSource ? true : false
}

function isInWater (bb: ReturnType<typeof getEntityBB>, world: WorldLike, ids: WaterIds): boolean | null {
  const minX = Math.floor(bb.minX)
  const maxX = Math.ceil(bb.maxX)
  const minY = Math.floor(bb.minY)
  const maxY = Math.ceil(bb.minY + 0.001)
  const minZ = Math.floor(bb.minZ)
  const maxZ = Math.ceil(bb.maxZ)
  const cursor = new Vec3(0, 0, 0)

  for (cursor.x = minX; cursor.x < maxX; cursor.x++) {
    for (cursor.y = minY; cursor.y < maxY; cursor.y++) {
      for (cursor.z = minZ; cursor.z < maxZ; cursor.z++) {
        const block = world.getBlock(cursor)
        if (block == null) return null
        if (!isWaterBlock(block, ids)) continue
        const fluidHeight = cursor.y + getFluidHeight(block, world, cursor, ids)
        if (bb.minY < fluidHeight) {
          return true
        }
      }
    }
  }

  return false
}

export function getRemoteBoatWaterPatchVisible (
  entity: BoatEntityLike,
  world: WorldLike,
  ids: WaterIds,
): boolean {
  if (!isBoatEntityName(entity.name)) return false
  const bb = getEntityBB(entity)
  const underwater = isUnderwater(bb, world, ids)
  if (underwater == null) return false
  if (underwater) return false
  const inWater = isInWater(bb, world, ids)
  if (inWater == null) return false
  return inWater
}

export function getLocalBoatWaterPatchVisible (status: BoatStatus | null | undefined): boolean {
  return status === BoatStatus.IN_WATER
}

export function buildEntityRenderHints (
  entity: BoatEntityLike & { id?: number },
  options: {
    localVehicle: BoatEntityLike | null | undefined
    localBoatStatus: BoatStatus | null | undefined
    world: WorldLike
    waterIds: WaterIds
  },
) {
  const renderHints: {
    localVehicle?: boolean
    boatWaterPatchVisible?: boolean
  } = {}
  if (options.localVehicle && entity === options.localVehicle) {
    renderHints.localVehicle = true
  }
  if (!isBoatEntityName(entity.name)) {
    return renderHints
  }
  if (renderHints.localVehicle) {
    renderHints.boatWaterPatchVisible = getLocalBoatWaterPatchVisible(options.localBoatStatus)
  } else {
    renderHints.boatWaterPatchVisible = getRemoteBoatWaterPatchVisible(entity, options.world, options.waterIds)
  }
  return renderHints
}
