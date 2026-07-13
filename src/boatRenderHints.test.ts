import { Vec3 } from 'vec3'
import { expect, test } from 'vitest'
import { BoatStatus } from '@nxg-org/mineflayer-physics-util'
import {
  buildEntityRenderHints,
  getLocalBoatWaterPatchVisible,
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
    world: makeWorld({ '0,62,0': makeBlock(waterId, { level: 7 }) }),
    waterIds: { waterId, flowingWaterId },
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
    world: makeWorld({ '0,62,0': makeBlock(waterId, { level: 7 }) }),
    waterIds: { waterId, flowingWaterId },
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
    world: makeWorld({}),
    waterIds: { waterId, flowingWaterId },
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
    world: makeWorld({}),
    waterIds: { waterId, flowingWaterId },
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
    world: makeWorld({}),
    waterIds: { waterId, flowingWaterId },
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
    world: makeWorld({}),
    waterIds: { waterId, flowingWaterId },
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
    world: makeWorld({}),
    waterIds: { waterId, flowingWaterId },
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
      world: makeWorld({}),
      waterIds: { waterId, flowingWaterId },
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
    world: makeWorld({}),
    waterIds: { waterId, flowingWaterId },
  })
  expect(hints.localVehicle).toBe(true)
  expect(hints.passengerLayout).toBe('horse')
  expect(hints.passengerIds).toEqual([1])
})

test('remote horse omits localVehicle flag', () => {
  const horse = {
    name: 'horse',
    position: new Vec3(0, 64, 0),
    passengers: [{ id: 2 }],
  }
  const hints = buildEntityRenderHints(horse, {
    localVehicle: null,
    localBoatStatus: null,
    world: makeWorld({}),
    waterIds: { waterId, flowingWaterId },
  })
  expect(hints.localVehicle).toBeUndefined()
  expect(hints.passengerLayout).toBe('horse')
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
    world: makeWorld({}),
    waterIds: { waterId, flowingWaterId },
  })
  expect(hints.passengerIds).toEqual([])
  expect(hints.passengerLayout).toBe('horse')
})
