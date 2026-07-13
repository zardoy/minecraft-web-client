export type EntityMovementAnimation = 'idle' | 'walking' | 'running' | 'crouch' | 'crouchWalking' | 'riding'

export type EntityMovementAnimationInput = {
  isMounted: boolean
  isHorseMounted?: boolean
  isCrouched: boolean
  horizontalVelocity: { x: number; z: number }
}

export function getEntityMovementAnimation (input: EntityMovementAnimationInput): EntityMovementAnimation {
  if (input.isHorseMounted) return 'riding'
  if (input.isMounted) return 'idle'

  const WALKING_SPEED = 0.03
  const SPRINTING_SPEED = 0.18

  const { x, z } = input.horizontalVelocity
  const isWalking = Math.abs(x) > WALKING_SPEED || Math.abs(z) > WALKING_SPEED
  const isSprinting = Math.abs(x) > SPRINTING_SPEED || Math.abs(z) > SPRINTING_SPEED

  if (input.isCrouched) {
    return isWalking ? 'crouchWalking' : 'crouch'
  }
  if (isWalking) {
    return isSprinting ? 'running' : 'walking'
  }
  return 'idle'
}
