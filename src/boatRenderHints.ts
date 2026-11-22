import { Vec3 } from 'vec3'
import type { Block } from 'prismarine-block'
import { isBoatEntityName } from 'minecraft-renderer/src/three/entity/boatModelRotation'
import { BoatStatus } from '@nxg-org/mineflayer-physics-util'

type VehicleEntityLike = {
  id?: number
  name?: string
  position: Vec3
  width?: number
  height?: number
  passengers?: Array<{ id?: number }>
}

type BlockLike = Pick<Block, 'type' | 'getProperties'>

type WorldLike = {
  getBlock: (pos: Vec3) => BlockLike | null
}

type WaterIds = {
  waterId: number
  flowingWaterId?: number
}

export type VehicleRenderHints = {
  localVehicle?: boolean
  localVehicleVerticalCameraLock?: 'horse'
  localVehicleYawLock?: 'horse'
  passengerIds?: number[]
  passengerLayout?: 'boat' | 'minecart' | 'horse'
  boatWaterPatchVisible?: boolean
  boatPaddleLeft?: boolean
  boatPaddleRight?: boolean
  /** @deprecated Use passengerIds */
  boatPassengerIds?: number[]
}

export type BoatPaddleState = {
  leftPaddle: boolean
  rightPaddle: boolean
}

const RIDEABLE_MINECART_ENTITY_NAMES = new Set([
  'minecart',
  'chest_minecart',
  'furnace_minecart',
  'hopper_minecart',
  'tnt_minecart',
  'spawner_minecart',
  'command_block_minecart',
])

const RIDEABLE_HORSE_ENTITY_NAMES = new Set([
  'horse',
  'donkey',
  'mule',
  'skeleton_horse',
  'zombie_horse',
])

export function isRideableHorseEntityName (name?: string): boolean {
  if (!name) return false
  return RIDEABLE_HORSE_ENTITY_NAMES.has(name)
}

export function isRideableMinecartEntityName (name?: string): boolean {
  if (!name) return false
  return RIDEABLE_MINECART_ENTITY_NAMES.has(name)
}

function collectPassengerIds (entity: VehicleEntityLike): number[] {
  return (entity.passengers ?? [])
    .map(passenger => passenger.id)
    .filter((id): id is number => typeof id === 'number' && Number.isInteger(id))
}

function getEntityBB (entity: VehicleEntityLike) {
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

function isWaterBlock (block: BlockLike | null | undefined, ids: WaterIds): block is BlockLike {
  if (!block) return false
  if (block.type === ids.waterId) return true
  if (ids.flowingWaterId !== null && ids.flowingWaterId !== undefined && block.type === ids.flowingWaterId) return true
  return !!block.getProperties?.().waterlogged
}

function isSourceWater (block: BlockLike, ids: WaterIds): boolean {
  if (block.getProperties?.().waterlogged) return true
  if (block.type !== ids.waterId) return false
  return Number(block.getProperties?.().level ?? 0) === 0
}

function getFluidHeight (block: BlockLike, world: WorldLike, pos: Vec3, ids: WaterIds): number {
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
        if (block === null) return null
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

  return foundSource
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
        if (block === null) return null
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
  entity: VehicleEntityLike,
  world: WorldLike,
  ids: WaterIds,
): boolean {
  if (!isBoatEntityName(entity.name)) return false
  const bb = getEntityBB(entity)
  const underwater = isUnderwater(bb, world, ids)
  if (underwater === null) return false
  if (underwater) return false
  const inWater = isInWater(bb, world, ids)
  if (inWater === null) return false
  return inWater
}

export function getLocalBoatWaterPatchVisible (status: BoatStatus | null | undefined): boolean {
  return status === BoatStatus.IN_WATER
}

type EntityWithMetadata = VehicleEntityLike & {
  metadata?: unknown[]
}

export function getRemoteBoatPaddleState (
  entity: EntityWithMetadata,
  version: string,
  metadataKeys?: string[],
): BoatPaddleState {
  const passengerIds = collectPassengerIds(entity)
  if (passengerIds.length === 0) {
    return { leftPaddle: false, rightPaddle: false }
  }

  let leftIndex = -1
  let rightIndex = -1

  if (metadataKeys?.includes('paddle_left') && metadataKeys?.includes('paddle_right')) {
    leftIndex = metadataKeys.indexOf('paddle_left')
    rightIndex = metadataKeys.indexOf('paddle_right')
  } else if (version === '1.17' || version === '1.17.1') {
    leftIndex = 12
    rightIndex = 13
  } else {
    return { leftPaddle: false, rightPaddle: false }
  }

  const { metadata } = entity
  if (!Array.isArray(metadata)) {
    return { leftPaddle: false, rightPaddle: false }
  }

  return {
    leftPaddle: metadata[leftIndex] === true,
    rightPaddle: metadata[rightIndex] === true,
  }
}

function resolveBoatPaddleHints (
  entity: EntityWithMetadata,
  isLocalVehicle: boolean,
  options: {
    localBoatPaddleState?: BoatPaddleState | null
    version: string
    entityMetadataKeys?: string[]
  },
): Pick<VehicleRenderHints, 'boatPaddleLeft' | 'boatPaddleRight'> {
  if (isLocalVehicle) {
    const state = options.localBoatPaddleState
    return {
      boatPaddleLeft: state?.leftPaddle === true,
      boatPaddleRight: state?.rightPaddle === true,
    }
  }

  const remote = getRemoteBoatPaddleState(entity, options.version, options.entityMetadataKeys)
  return {
    boatPaddleLeft: remote.leftPaddle,
    boatPaddleRight: remote.rightPaddle,
  }
}

export function buildEntityRenderHints (
  entity: VehicleEntityLike,
  options: {
    localVehicle: VehicleEntityLike | null | undefined
    localBoatStatus: BoatStatus | null | undefined
    localBoatPaddleState?: BoatPaddleState | null
    horseControllerActive: boolean
    world: WorldLike
    waterIds: WaterIds
    version: string
    entityMetadataKeys?: string[]
  },
): VehicleRenderHints {
  const renderHints: VehicleRenderHints = {}
  const isLocalVehicle = options.localVehicle === entity && (
    isBoatEntityName(entity.name) ||
    isRideableMinecartEntityName(entity.name) ||
    isRideableHorseEntityName(entity.name)
  )
  if (isLocalVehicle) {
    renderHints.localVehicle = true
  }

  const passengerIds = collectPassengerIds(entity)

  if (isBoatEntityName(entity.name)) {
    renderHints.passengerIds = passengerIds
    renderHints.boatPassengerIds = passengerIds
    renderHints.passengerLayout = 'boat'
    Object.assign(renderHints, resolveBoatPaddleHints(entity, renderHints.localVehicle === true, options))
    if (renderHints.localVehicle) {
      renderHints.boatWaterPatchVisible = getLocalBoatWaterPatchVisible(options.localBoatStatus)
    } else {
      renderHints.boatWaterPatchVisible = getRemoteBoatWaterPatchVisible(entity, options.world, options.waterIds)
    }
    return renderHints
  }

  if (isRideableMinecartEntityName(entity.name)) {
    renderHints.passengerIds = passengerIds
    renderHints.passengerLayout = 'minecart'
  }

  if (isRideableHorseEntityName(entity.name)) {
    renderHints.passengerIds = passengerIds
    renderHints.passengerLayout = 'horse'
    if (renderHints.localVehicle === true && options.horseControllerActive) {
      renderHints.localVehicleVerticalCameraLock = 'horse'
      renderHints.localVehicleYawLock = 'horse'
    }
  }

  return renderHints
}
