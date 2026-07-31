import type { MovementState } from 'minecraft-renderer/src/playerState/types'

export type MountedBobStateInput = {
  mounted: boolean
  walkDist: number
  bob: number
  horizontalDist: number
  onGround: boolean
  isDeadOrDying: boolean
  isSwimming: boolean
}

export type MountedBobState = {
  prevWalkDist: number
  prevBob: number
  walkDist: number
  bob: number
}

export function updateMountedBobState (input: MountedBobStateInput): MountedBobState {
  const { mounted, walkDist, bob, horizontalDist, onGround, isDeadOrDying, isSwimming } = input

  if (mounted) {
    return {
      prevWalkDist: walkDist,
      prevBob: bob,
      walkDist,
      bob: 0,
    }
  }

  const nextWalkDist = walkDist + horizontalDist * 0.6
  const bobTarget = (onGround && !isDeadOrDying && !isSwimming) ? Math.min(0.1, horizontalDist) : 0
  return {
    prevWalkDist: walkDist,
    prevBob: bob,
    walkDist: nextWalkDist,
    bob: bob + (bobTarget - bob) * 0.4,
  }
}

export type MountedMovementStateInput = {
  mounted: boolean
  velocity: { x: number, z: number }
  onGround: boolean
  isSneaking: boolean
  isFlying: boolean
  timeOffGround: number
  deltaTime: number
}

export type MountedMovementState = {
  movementState: MovementState
  timeOffGround: number
}

export function updateMountedMovementState (input: MountedMovementStateInput): MountedMovementState {
  const { mounted, velocity, onGround, isSneaking, isFlying, timeOffGround, deltaTime } = input

  if (mounted) {
    return { movementState: 'NOT_MOVING', timeOffGround: 0 }
  }

  const nextTimeOffGround = onGround ? 0 : timeOffGround + deltaTime
  if (isSneaking || isFlying || nextTimeOffGround > 0) {
    return { movementState: 'SNEAKING', timeOffGround: nextTimeOffGround }
  }

  const velocityThreshold = 0.01
  const sprintingVelocity = 0.15
  if (Math.abs(velocity.x) > velocityThreshold || Math.abs(velocity.z) > velocityThreshold) {
    return {
      movementState: Math.abs(velocity.x) > sprintingVelocity || Math.abs(velocity.z) > sprintingVelocity
        ? 'SPRINTING'
        : 'WALKING',
      timeOffGround: nextTimeOffGround,
    }
  }

  return { movementState: 'NOT_MOVING', timeOffGround: nextTimeOffGround }
}
