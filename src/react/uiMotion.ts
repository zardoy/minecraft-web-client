import { proxy, subscribe } from 'valtio'
import * as THREE from 'three'
import { useEffect } from 'react'

export const motionState = proxy({
  offset: { x: 0, y: 0 }
})

const MOTION_DAMPING = 0.92
const MAX_MOTION_OFFSET = 100
const motionVelocity = { x: 0, y: 0 }
let lastUpdate = performance.now()
let lastYaw = 0
let lastPitch = 0

export function updateMotion() {
  if (!bot?.entity) return
  const now = performance.now()
  const deltaTime = (now - lastUpdate) / 1000 // Convert to seconds
  lastUpdate = now

  // Get camera movement contribution
  const yawDiff = bot.entity.yaw - lastYaw
  const pitchDiff = bot.entity.pitch - lastPitch
  lastYaw = bot.entity.yaw
  lastPitch = bot.entity.pitch

  // Create a vector for velocity in world space
  const { velocity } = bot.entity
  const velocityVector = new THREE.Vector3(velocity.x, 0, velocity.z)

  // Get camera's forward direction
  const cameraQuat = new THREE.Quaternion()
  cameraQuat.setFromEuler(new THREE.Euler(0, -bot.entity.yaw, 0))

  // Transform velocity to camera space
  velocityVector.applyQuaternion(cameraQuat)

  // Calculate motion contribution
  const velocityContribution = {
    x: -velocityVector.x * 150,
    y: -velocityVector.z * 150
  }

  // Combine camera and velocity effects
  motionVelocity.x += (yawDiff * 300 + velocityContribution.x) * deltaTime
  motionVelocity.y += (pitchDiff * 300 + velocityContribution.y) * deltaTime

  // Apply damping
  motionVelocity.x *= MOTION_DAMPING
  motionVelocity.y *= MOTION_DAMPING

  // Clamp values
  motionVelocity.x = Math.max(-MAX_MOTION_OFFSET, Math.min(MAX_MOTION_OFFSET, motionVelocity.x))
  motionVelocity.y = Math.max(-MAX_MOTION_OFFSET, Math.min(MAX_MOTION_OFFSET, motionVelocity.y))

  // Update the motion state
  motionState.offset = {
    x: motionVelocity.x,
    y: motionVelocity.y
  }
}

let motionEnabled = false
export function initMotionTracking() {
  if (motionEnabled) return
  motionEnabled = true

  function animate() {
    updateMotion()
    requestAnimationFrame(animate)
  }
  animate()
}

export function useUiMotion(ref: React.RefObject<HTMLElement>, enabled = true) {
  useEffect(() => {
    if (!enabled || !ref.current) return

    const unsubscribe = subscribe(motionState, () => {
      const el = ref.current
      if (!el) return
      el.style.transform = `translate(${motionState.offset.x.toFixed(2)}px, ${motionState.offset.y.toFixed(2)}px)`
    })

    return () => unsubscribe()
  }, [enabled, ref])
}
