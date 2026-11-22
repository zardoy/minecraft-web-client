import { expect, test } from 'vitest'
import {
  applyEntityMovementAnimation,
  clearLocalPlayerAnimationCache,
  isLocalPlayerMounted,
  processMovementAnimations,
  sanitizeHorizontalVelocity,
  shouldProcessRemoteTrackingEntry,
  shouldTrackPlayerEntity,
} from './entityMovementAnimationPipeline'

const walkingVelocity = { x: 0.05, z: 0 }
const localPlayer = { id: 1, velocity: walkingVelocity, vehicle: null, type: 'player', username: 'local' }
const remotePlayer = { id: 2, velocity: { x: 0, z: 0 }, vehicle: null, type: 'player', username: 'remote' }

function makePlaySpy () {
  const calls: Array<{ id: number | 'player_entity'; animation: string }> = []
  return {
    calls,
    playEntityAnimation (id: number | 'player_entity', animation: string) {
      calls.push({ id, animation })
    },
  }
}

test('local player gets walking from bot.entity.velocity with empty trackingData', () => {
  const playerPerAnimation = {}
  const { calls, playEntityAnimation } = makePlaySpy()

  processMovementAnimations({
    localPlayerEntity: localPlayer,
    isLocalPlayerSneaking: false,
    trackingData: {},
    getEntityById: () => undefined,
    playerPerAnimation,
    playEntityAnimation,
    rendererAvailable: true,
  })

  expect(calls).toEqual([{ id: 'player_entity', animation: 'walking' }])
})

test('local player gets riding when only bot.vehicle is set', () => {
  const vehicle = { id: 99, name: 'boat' }
  const playerPerAnimation = {}
  const { calls, playEntityAnimation } = makePlaySpy()

  processMovementAnimations({
    localPlayerEntity: { ...localPlayer, velocity: { x: 0, z: 0 }, vehicle: null },
    localPlayerVehicle: vehicle,
    isLocalPlayerSneaking: false,
    trackingData: {},
    getEntityById: () => undefined,
    playerPerAnimation,
    playEntityAnimation,
    rendererAvailable: true,
  })

  expect(calls).toEqual([{ id: 'player_entity', animation: 'riding' }])
})

test('local player gets riding when only bot.entity.vehicle is set', () => {
  const vehicle = { id: 99, name: 'boat' }
  const playerPerAnimation = {}
  const { calls, playEntityAnimation } = makePlaySpy()

  processMovementAnimations({
    localPlayerEntity: { ...localPlayer, velocity: { x: 0, z: 0 }, vehicle },
    localPlayerVehicle: null,
    isLocalPlayerSneaking: false,
    trackingData: {},
    getEntityById: () => undefined,
    playerPerAnimation,
    playEntityAnimation,
    rendererAvailable: true,
  })

  expect(calls).toEqual([{ id: 'player_entity', animation: 'riding' }])
})

test('local animation does not depend on bot.entities presence', () => {
  const playerPerAnimation = {}
  const { calls, playEntityAnimation } = makePlaySpy()

  processMovementAnimations({
    localPlayerEntity: localPlayer,
    isLocalPlayerSneaking: false,
    trackingData: {},
    getEntityById: () => undefined,
    playerPerAnimation,
    playEntityAnimation,
    rendererAvailable: true,
  })

  expect(calls).toHaveLength(1)
  expect(isLocalPlayerMounted(localPlayer, null)).toBe(false)
})

test('local player is not processed again in remote loop', () => {
  const playerPerAnimation = {}
  const { calls, playEntityAnimation } = makePlaySpy()

  processMovementAnimations({
    localPlayerEntity: localPlayer,
    isLocalPlayerSneaking: false,
    trackingData: {
      '1': { tracking: true, info: { avgVel: { x: 0, z: 0 } } },
      '2': { tracking: true, info: { avgVel: walkingVelocity } },
    },
    getEntityById (id) {
      if (id === '1') return localPlayer
      if (id === '2') return remotePlayer
      return undefined
    },
    playerPerAnimation,
    playEntityAnimation,
    rendererAvailable: true,
  })

  expect(calls.filter(c => c.id === 'player_entity')).toHaveLength(1)
  expect(calls.some(c => c.id === 2 && c.animation === 'walking')).toBe(true)
})

test('invalid remote avgVel becomes zero velocity', () => {
  expect(sanitizeHorizontalVelocity({ x: Number.NaN, z: null as unknown as number })).toEqual({ x: 0, z: 0 })
})

test('same animation command is not sent again without force', () => {
  const playerPerAnimation = {}
  const { calls, playEntityAnimation } = makePlaySpy()

  const params = {
    entity: localPlayer,
    horizontalVelocity: walkingVelocity,
    rendererEntityId: 'player_entity' as const,
    isLocalPlayer: true,
    isLocalPlayerSneaking: false,
    playerPerAnimation,
    playEntityAnimation,
    rendererAvailable: true,
  }

  expect(applyEntityMovementAnimation(params)).toBe(true)
  expect(applyEntityMovementAnimation(params)).toBe(false)
  expect(calls).toHaveLength(1)
})

test('animation is not cached when renderer is unavailable', () => {
  const playerPerAnimation = {}
  const { calls, playEntityAnimation } = makePlaySpy()

  expect(applyEntityMovementAnimation({
    entity: localPlayer,
    horizontalVelocity: walkingVelocity,
    rendererEntityId: 'player_entity',
    isLocalPlayer: true,
    isLocalPlayerSneaking: false,
    playerPerAnimation,
    playEntityAnimation,
    rendererAvailable: false,
  })).toBe(false)

  expect(playerPerAnimation['player_entity']).toBeUndefined()
  expect(calls).toHaveLength(0)
})

test('after cache clear the animation command is sent again', () => {
  const playerPerAnimation = {}
  const { calls, playEntityAnimation } = makePlaySpy()

  const params = {
    entity: { ...localPlayer, velocity: { x: 0, z: 0 } },
    horizontalVelocity: { x: 0, z: 0 },
    rendererEntityId: 'player_entity' as const,
    isLocalPlayer: true,
    isLocalPlayerSneaking: false,
    playerPerAnimation,
    playEntityAnimation,
    rendererAvailable: true,
  }

  applyEntityMovementAnimation(params)
  applyEntityMovementAnimation(params)
  clearLocalPlayerAnimationCache(playerPerAnimation)
  applyEntityMovementAnimation({ ...params, force: true })

  expect(calls).toHaveLength(2)
})

test('mount immediately sends riding', () => {
  const vehicle = { id: 99, name: 'horse' }
  const playerPerAnimation = {}
  const { calls, playEntityAnimation } = makePlaySpy()

  applyEntityMovementAnimation({
    entity: localPlayer,
    horizontalVelocity: walkingVelocity,
    rendererEntityId: 'player_entity',
    mountedVehicle: vehicle,
    isLocalPlayer: true,
    isLocalPlayerSneaking: false,
    playerPerAnimation,
    playEntityAnimation,
    rendererAvailable: true,
  })

  expect(calls).toEqual([{ id: 'player_entity', animation: 'riding' }])
})

test('dismount immediately sends current movement animation', () => {
  const playerPerAnimation = { player_entity: 'riding' }
  const { calls, playEntityAnimation } = makePlaySpy()

  applyEntityMovementAnimation({
    entity: { ...localPlayer, vehicle: null },
    horizontalVelocity: walkingVelocity,
    rendererEntityId: 'player_entity',
    mountedVehicle: null,
    isLocalPlayer: true,
    isLocalPlayerSneaking: false,
    playerPerAnimation,
    playEntityAnimation,
    rendererAvailable: true,
  })

  expect(calls).toEqual([{ id: 'player_entity', animation: 'walking' }])
})

test('remote entityGone then entitySpawn becomes eligible for tracking loop again', () => {
  expect(shouldTrackPlayerEntity(remotePlayer)).toBe(true)
  expect(shouldProcessRemoteTrackingEntry({
    tracking: true,
    entity: undefined,
    localPlayerEntity: localPlayer,
  })).toBe(false)
  expect(shouldProcessRemoteTrackingEntry({
    tracking: true,
    entity: remotePlayer,
    localPlayerEntity: localPlayer,
  })).toBe(true)
})

test('local entityGone does not stop local animation updates', () => {
  const playerPerAnimation = {}
  const { calls, playEntityAnimation } = makePlaySpy()

  processMovementAnimations({
    localPlayerEntity: localPlayer,
    isLocalPlayerSneaking: false,
    trackingData: {},
    getEntityById: () => undefined,
    playerPerAnimation,
    playEntityAnimation,
    rendererAvailable: true,
  })

  expect(calls).toEqual([{ id: 'player_entity', animation: 'walking' }])
})
