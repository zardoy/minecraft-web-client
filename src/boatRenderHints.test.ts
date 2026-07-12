import { Vec3 } from 'vec3'
import { expect, test } from 'vitest'
import { BoatStatus } from '@nxg-org/mineflayer-physics-util'
import {
  buildEntityRenderHints,
  getLocalBoatWaterPatchVisible,
  getRemoteBoatWaterPatchVisible,
} from './boatRenderHints'

const waterId = 123
const flowingWaterId = 124
const stoneId = 1
const airId = 0

type StubBlock = {
  type: number
  name: string
  getProperties: () => Record<string, unknown>
}

function makeBlock (type: number, props: Record<string, unknown> = {}): StubBlock {
  return {
    type,
    name: type === waterId ? 'water' : type === flowingWaterId ? 'flowing_water' : type === stoneId ? 'stone' : 'air',
    getProperties: () => props,
  }
}

function makeWorld (blocks: Record<string, number | StubBlock | null>) {
  return {
    getBlock (pos: Vec3) {
      const key = `${pos.x | 0},${pos.y | 0},${pos.z | 0}`
      const entry = blocks[key]
      if (entry === null) return null
      if (typeof entry === 'object') return entry
      if (entry == null) return makeBlock(airId)
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
})
