import { expect, test } from 'vitest'
import { getEntityMovementAnimation } from './entityMovementAnimation'

const walkingVelocity = { x: 0.05, z: 0 }
const sprintingVelocity = { x: 0.25, z: 0 }
const highVehicleVelocity = { x: 1.5, z: 0.8 }

test('mounted player with zero speed uses riding', () => {
  expect(getEntityMovementAnimation({
    isMounted: true,
    isCrouched: false,
    horizontalVelocity: { x: 0, z: 0 },
  })).toBe('riding')
})

test('mounted player with high vehicle speed uses riding', () => {
  expect(getEntityMovementAnimation({
    isMounted: true,
    isCrouched: false,
    horizontalVelocity: highVehicleVelocity,
  })).toBe('riding')
})

test('mounted crouched player uses riding', () => {
  expect(getEntityMovementAnimation({
    isMounted: true,
    isCrouched: true,
    horizontalVelocity: walkingVelocity,
  })).toBe('riding')
})

test('unmounted walking speed uses walking', () => {
  expect(getEntityMovementAnimation({
    isMounted: false,
    isCrouched: false,
    horizontalVelocity: walkingVelocity,
  })).toBe('walking')
})

test('unmounted sprinting speed uses running', () => {
  expect(getEntityMovementAnimation({
    isMounted: false,
    isCrouched: false,
    horizontalVelocity: sprintingVelocity,
  })).toBe('running')
})

test('unmounted crouched movement uses crouchWalking', () => {
  expect(getEntityMovementAnimation({
    isMounted: false,
    isCrouched: true,
    horizontalVelocity: walkingVelocity,
  })).toBe('crouchWalking')
})

test('unmounted stationary crouch uses crouch', () => {
  expect(getEntityMovementAnimation({
    isMounted: false,
    isCrouched: true,
    horizontalVelocity: { x: 0, z: 0 },
  })).toBe('crouch')
})
