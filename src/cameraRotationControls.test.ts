import { expect, test } from 'vitest'
import { getClampedBoatPassengerYaw, isBoatEntityName } from 'minecraft-renderer/src/three/entity/boatPassengerRotation'

const BOAT_YAW = 1

function resolveBoatPassengerLookYaw (requestedYaw: number, vehicle: { name: string; yaw: number } | null): number {
  if (!vehicle || !isBoatEntityName(vehicle.name)) return requestedYaw
  const boatYaw = vehicle.yaw
  if (!Number.isFinite(boatYaw) || !Number.isFinite(requestedYaw)) return requestedYaw
  return getClampedBoatPassengerYaw(requestedYaw, boatYaw)
}

test('camera controls clamp boat look yaw before look/updateCamera', () => {
  const vehicle = { name: 'boat', yaw: BOAT_YAW }
  const requested = BOAT_YAW + 2.5
  const clamped = resolveBoatPassengerLookYaw(requested, vehicle)
  expect(clamped).toBeLessThan(requested)
  expect(clamped - BOAT_YAW).toBeCloseTo((105 * Math.PI) / 180)
})

test('camera controls leave minecart look yaw unchanged', () => {
  const vehicle = { name: 'minecart', yaw: BOAT_YAW }
  const requested = BOAT_YAW + 2.5
  expect(resolveBoatPassengerLookYaw(requested, vehicle)).toBe(requested)
})

test('camera controls fallback when vehicle missing', () => {
  expect(resolveBoatPassengerLookYaw(1.75, null)).toBe(1.75)
})
