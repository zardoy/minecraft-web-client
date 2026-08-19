import { expect, test } from 'vitest'
import { updateMountedBobState, updateMountedMovementState } from './mountedPlayerState'

const movingBobInput = {
  mounted: false,
  walkDist: 2,
  bob: 0,
  horizontalDist: 0.2,
  onGround: true,
  isDeadOrDying: false,
  isSwimming: false,
}

test('walking player continues accumulating distance and bob', () => {
  const next = updateMountedBobState(movingBobInput)
  expect(next.prevWalkDist).toBe(2)
  expect(next.prevBob).toBe(0)
  expect(next.walkDist).toBeCloseTo(2.12)
  expect(next.bob).toBeCloseTo(0.04)
})

test.each(['horse', 'boat', 'minecart'])('mounted %s keeps speed out of bob state', (vehicle) => {
  const next = updateMountedBobState({
    ...movingBobInput,
    mounted: true,
    walkDist: 5,
    bob: 0.08,
  })
  expect(next.walkDist).toBe(5)
  expect(next.bob).toBe(0)
  expect(vehicle).toBeTruthy()
})

test('mounting clears an already non-zero bob in one tick', () => {
  const next = updateMountedBobState({ ...movingBobInput, mounted: true, bob: 0.09 })
  expect(next.prevBob).toBe(0.09)
  expect(next.bob).toBe(0)
})

test('mounted player selects NOT_MOVING and resets airborne movement timer', () => {
  expect(updateMountedMovementState({
    mounted: true,
    velocity: { x: 1, z: 1 },
    onGround: false,
    isSneaking: true,
    isFlying: false,
    timeOffGround: 100,
    deltaTime: 50,
  })).toEqual({ movementState: 'NOT_MOVING', timeOffGround: 0 })
})

test('dismounted player resumes ordinary movement state detection', () => {
  expect(updateMountedMovementState({
    mounted: false,
    velocity: { x: 0.2, z: 0 },
    onGround: true,
    isSneaking: false,
    isFlying: false,
    timeOffGround: 100,
    deltaTime: 50,
  })).toEqual({ movementState: 'SPRINTING', timeOffGround: 0 })
})
