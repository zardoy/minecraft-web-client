import { Vec3 } from 'vec3'
import { expect, test } from 'vitest'
import { BoatStatus } from '@nxg-org/mineflayer-physics-util'
import {
  buildEntityRenderHints,
  getLocalBoatWaterPatchVisible,
  getRemoteBoatPaddleState,
  getRemoteBoatWaterPatchVisible,
  isRideableHorseEntityName,
  isRideableMinecartEntityName,
} from './boatRenderHints'

const waterId = 123
const flowingWaterId = 124
const stoneId = 1
const airId = 0

type StubBlock = {
  type: number
  name: string
  getProperties: () => Record<string, string | number | boolean>
}

function makeBlock (type: number, props: Record<string, string | number | boolean> = {}): StubBlock {
  return {
    type,
    name: type === waterId ? 'water' : type === flowingWaterId ? 'flowing_water' : type === stoneId ? 'stone' : 'air',
    getProperties: () => props,
  }
}

function makeWorld (blocks: Record<string, number | StubBlock | null>) {
  return {
    getBlock (pos: Vec3) {
      const key = `${Math.trunc(pos.x)},${Math.trunc(pos.y)},${Math.trunc(pos.z)}`
      const entry = blocks[key]
      if (entry === null) return null
      if (typeof entry === 'object') return entry
      if (entry === undefined) return makeBlock(airId)
      return makeBlock(entry)
    },
  }
}

const boatEntity = {
  name: 'oak_boat',
  position: new Vec3(0, 62.2, 0),
  width: 1.375,
  height: 0.5625,
}

test('local boat patch visible only in IN_WATER status', () => {
  expect(getLocalBoatWaterPatchVisible(BoatStatus.IN_WATER)).toBe(true)
  expect(getLocalBoatWaterPatchVisible(BoatStatus.UNDER_WATER)).toBe(false)
  expect(getLocalBoatWaterPatchVisible(BoatStatus.UNDER_FLOWING_WATER)).toBe(false)
  expect(getLocalBoatWaterPatchVisible(BoatStatus.ON_LAND)).toBe(false)
  expect(getLocalBoatWaterPatchVisible(BoatStatus.IN_AIR)).toBe(false)
  expect(getLocalBoatWaterPatchVisible(null)).toBe(false)
})

test('remote boat patch visible on source water', () => {
  const world = makeWorld({
    '0,62,0': makeBlock(waterId, { level: 7 }),
  })
  expect(getRemoteBoatWaterPatchVisible(boatEntity, world, { waterId, flowingWaterId })).toBe(true)
})

test('remote boat patch hidden for fully submerged source water', () => {
  const world = makeWorld({
    '0,62,0': waterId,
    '0,63,0': waterId,
  })
  expect(getRemoteBoatWaterPatchVisible(boatEntity, world, { waterId, flowingWaterId })).toBe(false)
})

test('remote boat patch hidden on flowing water cover', () => {
  const world = makeWorld({
    '0,62,0': waterId,
    '0,63,0': makeBlock(flowingWaterId, { level: 3 }),
  })
  expect(getRemoteBoatWaterPatchVisible(boatEntity, world, { waterId, flowingWaterId })).toBe(false)
})

test('remote boat patch hidden on land', () => {
  const world = makeWorld({
    '0,62,0': stoneId,
  })
  expect(getRemoteBoatWaterPatchVisible(boatEntity, world, { waterId, flowingWaterId })).toBe(false)
})

test('remote boat patch hidden when world is unloaded', () => {
  const world = makeWorld({
    '0,62,0': null,
  })
  expect(getRemoteBoatWaterPatchVisible(boatEntity, world, { waterId, flowingWaterId })).toBe(false)
})

test('remote boat patch hidden for waterlogged full block at hull', () => {
  const world = makeWorld({
    '0,62,0': makeBlock(stoneId, { waterlogged: true }),
  })
  expect(getRemoteBoatWaterPatchVisible(boatEntity, world, { waterId, flowingWaterId })).toBe(false)
})

test('buildEntityRenderHints marks local vehicle and water patch', () => {
  const localBoat = {
    ...boatEntity,
    id: 1,
    position: new Vec3(1, 63, 2),
    passengers: [{ id: 7 }, { id: 8 }],
  }
  const hints = buildEntityRenderHints(localBoat, {
    localVehicle: localBoat,
    localBoatStatus: BoatStatus.IN_WATER,
    horseControllerActive: false,
    world: makeWorld({ '0,62,0': makeBlock(waterId, { level: 7 }) }),
    waterIds: { waterId, flowingWaterId },
    version: '1.17.1',
  })
  expect(hints.localVehicle).toBe(true)
  expect(hints.boatWaterPatchVisible).toBe(true)
  expect(hints.boatPassengerIds).toEqual([7, 8])
})

test('buildEntityRenderHints keeps remote boat on ordinary tween policy inputs', () => {
  const remoteBoat = { ...boatEntity, id: 2 }
  const hints = buildEntityRenderHints(remoteBoat, {
    localVehicle: { ...boatEntity, id: 1 },
    localBoatStatus: BoatStatus.IN_WATER,
    horseControllerActive: false,
    world: makeWorld({ '0,62,0': makeBlock(waterId, { level: 7 }) }),
    waterIds: { waterId, flowingWaterId },
    version: '1.17.1',
  })
  expect(hints.localVehicle).toBeUndefined()
  expect(hints.boatWaterPatchVisible).toBe(true)
  expect(hints.boatPassengerIds).toEqual([])
})

test('buildEntityRenderHints sends an empty passenger list after boat detach', () => {
  const remoteBoat = { ...boatEntity, id: 2, passengers: [] }
  const hints = buildEntityRenderHints(remoteBoat, {
    localVehicle: null,
    localBoatStatus: null,
    horseControllerActive: false,
    world: makeWorld({}),
    waterIds: { waterId, flowingWaterId },
    version: '1.17.1',
  })
  expect(hints.boatPassengerIds).toEqual([])
  expect(hints.passengerIds).toEqual([])
})

test('local minecart receives localVehicle hint for camera-synced rendering', () => {
  const localMinecart = {
    name: 'minecart',
    id: 5,
    position: new Vec3(1, 63, 2),
    width: 0.98,
    height: 0.7,
    passengers: [{ id: 7 }],
  }
  const hints = buildEntityRenderHints(localMinecart, {
    localVehicle: localMinecart,
    localBoatStatus: null,
    horseControllerActive: false,
    world: makeWorld({}),
    waterIds: { waterId, flowingWaterId },
    version: '1.17.1',
  })
  expect(hints.localVehicle).toBe(true)
  expect(hints.passengerLayout).toBe('minecart')
  expect(hints.passengerIds).toEqual([7])
  expect(hints.boatWaterPatchVisible).toBeUndefined()
})

test('remote minecart does not receive localVehicle hint', () => {
  const remoteMinecart = {
    name: 'minecart',
    id: 6,
    position: new Vec3(0, 63, 0),
    width: 0.98,
    height: 0.7,
    passengers: [{ id: 11 }],
  }
  const hints = buildEntityRenderHints(remoteMinecart, {
    localVehicle: {
      name: 'minecart',
      id: 5,
      position: new Vec3(1, 63, 2),
      passengers: [{ id: 7 }],
    },
    localBoatStatus: null,
    horseControllerActive: false,
    world: makeWorld({}),
    waterIds: { waterId, flowingWaterId },
    version: '1.17.1',
  })
  expect(hints.localVehicle).toBeUndefined()
  expect(hints.passengerLayout).toBe('minecart')
})

test('minecart receives ordered passengerIds', () => {
  const minecart = {
    name: 'chest_minecart',
    id: 6,
    position: new Vec3(0, 63, 0),
    width: 0.98,
    height: 0.7,
    passengers: [{ id: 11 }, { id: 12 }],
  }
  const hints = buildEntityRenderHints(minecart, {
    localVehicle: null,
    localBoatStatus: null,
    horseControllerActive: false,
    world: makeWorld({}),
    waterIds: { waterId, flowingWaterId },
    version: '1.17.1',
  })
  expect(hints.passengerIds).toEqual([11, 12])
  expect(hints.passengerLayout).toBe('minecart')
  expect(hints.boatPassengerIds).toBeUndefined()
})

test('minecart detach creates empty passenger list', () => {
  const minecart = {
    name: 'minecart',
    id: 7,
    position: new Vec3(0, 63, 0),
    passengers: [],
  }
  const hints = buildEntityRenderHints(minecart, {
    localVehicle: null,
    localBoatStatus: null,
    horseControllerActive: false,
    world: makeWorld({}),
    waterIds: { waterId, flowingWaterId },
    version: '1.17.1',
  })
  expect(hints.passengerIds).toEqual([])
})

test.each([
  'minecart',
  'chest_minecart',
  'furnace_minecart',
  'hopper_minecart',
  'tnt_minecart',
  'spawner_minecart',
  'command_block_minecart',
])('recognizes minecart variant %s', name => {
  expect(isRideableMinecartEntityName(name)).toBe(true)
  const hints = buildEntityRenderHints(
    { name, position: new Vec3(0, 63, 0), passengers: [{ id: 1 }] },
    {
      localVehicle: null,
      localBoatStatus: null,
      horseControllerActive: false,
      world: makeWorld({}),
      waterIds: { waterId, flowingWaterId },
      version: '1.17.1',
    },
  )
  expect(hints.passengerLayout).toBe('minecart')
})

test.each([
  'horse',
  'donkey',
  'mule',
  'skeleton_horse',
  'zombie_horse',
])('recognizes horse variant %s', name => {
  expect(isRideableHorseEntityName(name)).toBe(true)
})

test('local horse sets passengerLayout horse', () => {
  const horse = {
    name: 'horse',
    id: 5,
    position: new Vec3(0, 64, 0),
    passengers: [{ id: 1 }],
  }
  const hints = buildEntityRenderHints(horse, {
    localVehicle: horse,
    localBoatStatus: null,
    horseControllerActive: true,
    world: makeWorld({}),
    waterIds: { waterId, flowingWaterId },
    version: '1.17.1',
  })
  expect(hints.localVehicle).toBe(true)
  expect(hints.passengerLayout).toBe('horse')
  expect(hints.passengerIds).toEqual([1])
  expect(hints.localVehicleVerticalCameraLock).toBe('horse')
  expect(hints.localVehicleYawLock).toBe('horse')
})

test('local horse without active controller omits vertical camera lock', () => {
  const horse = {
    name: 'horse',
    id: 5,
    position: new Vec3(0, 64, 0),
    passengers: [{ id: 1 }],
  }
  const hints = buildEntityRenderHints(horse, {
    localVehicle: horse,
    localBoatStatus: null,
    horseControllerActive: false,
    world: makeWorld({}),
    waterIds: { waterId, flowingWaterId },
    version: '1.17.1',
  })
  expect(hints.localVehicle).toBe(true)
  expect(hints.localVehicleVerticalCameraLock).toBeUndefined()
  expect(hints.localVehicleYawLock).toBeUndefined()
})

test('remote horse omits localVehicle and vertical camera lock', () => {
  const horse = {
    name: 'horse',
    position: new Vec3(0, 64, 0),
    passengers: [{ id: 2 }],
  }
  const hints = buildEntityRenderHints(horse, {
    localVehicle: null,
    localBoatStatus: null,
    horseControllerActive: false,
    world: makeWorld({}),
    waterIds: { waterId, flowingWaterId },
    version: '1.17.1',
  })
  expect(hints.localVehicle).toBeUndefined()
  expect(hints.localVehicleVerticalCameraLock).toBeUndefined()
  expect(hints.localVehicleYawLock).toBeUndefined()
  expect(hints.passengerLayout).toBe('horse')
})

test('local boat does not set horse vertical camera lock', () => {
  const localBoat = {
    ...boatEntity,
    id: 1,
    position: new Vec3(1, 63, 2),
    passengers: [{ id: 7 }],
  }
  const hints = buildEntityRenderHints(localBoat, {
    localVehicle: localBoat,
    localBoatStatus: BoatStatus.IN_WATER,
    horseControllerActive: true,
    world: makeWorld({ '0,62,0': makeBlock(waterId, { level: 7 }) }),
    waterIds: { waterId, flowingWaterId },
    version: '1.17.1',
  })
  expect(hints.localVehicleVerticalCameraLock).toBeUndefined()
  expect(hints.localVehicleYawLock).toBeUndefined()
})

test('local minecart does not set horse vertical camera lock', () => {
  const localMinecart = {
    name: 'minecart',
    id: 5,
    position: new Vec3(1, 63, 2),
    passengers: [{ id: 7 }],
  }
  const hints = buildEntityRenderHints(localMinecart, {
    localVehicle: localMinecart,
    localBoatStatus: null,
    horseControllerActive: true,
    world: makeWorld({}),
    waterIds: { waterId, flowingWaterId },
    version: '1.17.1',
  })
  expect(hints.localVehicleVerticalCameraLock).toBeUndefined()
  expect(hints.localVehicleYawLock).toBeUndefined()
})

test('empty horse passenger list still reports horse layout', () => {
  const horse = {
    name: 'horse',
    position: new Vec3(0, 64, 0),
    passengers: [],
  }
  const hints = buildEntityRenderHints(horse, {
    localVehicle: null,
    localBoatStatus: null,
    horseControllerActive: false,
    world: makeWorld({}),
    waterIds: { waterId, flowingWaterId },
    version: '1.17.1',
  })
  expect(hints.passengerIds).toEqual([])
  expect(hints.passengerLayout).toBe('horse')
})

test('local boat paddle hints pass through physics state unchanged', () => {
  const localBoat = {
    ...boatEntity,
    id: 1,
    passengers: [{ id: 7 }],
  }
  const hints = buildEntityRenderHints(localBoat, {
    localVehicle: localBoat,
    localBoatStatus: BoatStatus.IN_WATER,
    localBoatPaddleState: { leftPaddle: true, rightPaddle: false },
    horseControllerActive: false,
    world: makeWorld({}),
    waterIds: { waterId, flowingWaterId },
    version: '1.17.1',
  })
  expect(hints.boatPaddleLeft).toBe(true)
  expect(hints.boatPaddleRight).toBe(false)
})

test('local boat paddle hints default to false when physics state is null', () => {
  const localBoat = {
    ...boatEntity,
    id: 1,
    passengers: [{ id: 7 }],
  }
  const hints = buildEntityRenderHints(localBoat, {
    localVehicle: localBoat,
    localBoatStatus: null,
    localBoatPaddleState: null,
    horseControllerActive: false,
    world: makeWorld({}),
    waterIds: { waterId, flowingWaterId },
    version: '1.17.1',
  })
  expect(hints.boatPaddleLeft).toBe(false)
  expect(hints.boatPaddleRight).toBe(false)
})

test('remote boat paddle hints resolve 1.17.1 metadata indices 12 and 13', () => {
  const remoteBoat = {
    ...boatEntity,
    id: 2,
    passengers: [{ id: 9 }],
    metadata: [false, false, false, false, false, false, false, false, false, false, false, false, true, false],
  }
  const hints = buildEntityRenderHints(remoteBoat, {
    localVehicle: null,
    localBoatStatus: null,
    horseControllerActive: false,
    world: makeWorld({}),
    waterIds: { waterId, flowingWaterId },
    version: '1.17.1',
  })
  expect(hints.boatPaddleLeft).toBe(true)
  expect(hints.boatPaddleRight).toBe(false)
})

test('remote boat paddle hints prefer named metadata keys when supplied', () => {
  const remoteBoat = {
    ...boatEntity,
    id: 2,
    passengers: [{ id: 9 }],
    metadata: [false, false, true, false],
  }
  const hints = buildEntityRenderHints(remoteBoat, {
    localVehicle: null,
    localBoatStatus: null,
    horseControllerActive: false,
    world: makeWorld({}),
    waterIds: { waterId, flowingWaterId },
    version: '1.19.4',
    entityMetadataKeys: ['shared_flags', 'air_supply', 'paddle_left', 'paddle_right'],
  })
  expect(hints.boatPaddleLeft).toBe(true)
  expect(hints.boatPaddleRight).toBe(false)
})

test('remote boat without passengers forces paddle hints false', () => {
  const remoteBoat = {
    ...boatEntity,
    id: 2,
    passengers: [],
    metadata: [false, false, false, false, false, false, false, false, false, false, false, false, true, true],
  }
  const hints = buildEntityRenderHints(remoteBoat, {
    localVehicle: null,
    localBoatStatus: null,
    horseControllerActive: false,
    world: makeWorld({}),
    waterIds: { waterId, flowingWaterId },
    version: '1.17.1',
  })
  expect(hints.boatPaddleLeft).toBe(false)
  expect(hints.boatPaddleRight).toBe(false)
})

test('remote boat never receives local physics paddle state', () => {
  const remoteBoat = {
    ...boatEntity,
    id: 2,
    passengers: [{ id: 9 }],
    metadata: [false, false, false, false, false, false, false, false, false, false, false, false, false, false],
  }
  const hints = buildEntityRenderHints(remoteBoat, {
    localVehicle: { ...boatEntity, id: 1 },
    localBoatStatus: BoatStatus.IN_WATER,
    localBoatPaddleState: { leftPaddle: true, rightPaddle: true },
    horseControllerActive: false,
    world: makeWorld({}),
    waterIds: { waterId, flowingWaterId },
    version: '1.17.1',
  })
  expect(hints.boatPaddleLeft).toBe(false)
  expect(hints.boatPaddleRight).toBe(false)
})

test('getRemoteBoatPaddleState resolves all four boolean combinations on 1.17.1', () => {
  const entity = {
    ...boatEntity,
    passengers: [{ id: 1 }],
    metadata: [false, false, false, false, false, false, false, false, false, false, false, false, false, false],
  }
  expect(getRemoteBoatPaddleState(entity, '1.17.1').leftPaddle).toBe(false)
  expect(getRemoteBoatPaddleState(entity, '1.17.1').rightPaddle).toBe(false)

  entity.metadata[12] = true
  expect(getRemoteBoatPaddleState(entity, '1.17.1')).toEqual({ leftPaddle: true, rightPaddle: false })

  entity.metadata[13] = true
  expect(getRemoteBoatPaddleState(entity, '1.17.1')).toEqual({ leftPaddle: true, rightPaddle: true })

  entity.metadata[12] = false
  expect(getRemoteBoatPaddleState(entity, '1.17.1')).toEqual({ leftPaddle: false, rightPaddle: true })
})

test('getRemoteBoatPaddleState ignores truthy non-boolean metadata', () => {
  const entity = {
    ...boatEntity,
    passengers: [{ id: 1 }],
    metadata: [false, false, false, false, false, false, false, false, false, false, false, false, 1, 'true'],
  }
  expect(getRemoteBoatPaddleState(entity, '1.17.1')).toEqual({ leftPaddle: false, rightPaddle: false })
})
