import {
  EntityMovementAnimation,
  getEntityMovementAnimation,
} from './entityMovementAnimation'

export const LOCAL_PLAYER_RENDERER_ID = 'player_entity' as const
export const LOCAL_PLAYER_CACHE_KEY = 'player_entity'

export type HorizontalVelocity = { x: number; z: number }
export type RendererEntityId = number | typeof LOCAL_PLAYER_RENDERER_ID
export type AnimationCache = Record<string, string>

export type EntityLike = {
  id?: number
  vehicle?: EntityLike | null
  crouching?: boolean
  username?: string
  type?: string
}

export type TrackingDataEntry = {
  tracking: boolean
  info: { avgVel: Partial<HorizontalVelocity> }
}

export function sanitizeHorizontalVelocity (
  velocity: Partial<HorizontalVelocity> | null | undefined,
): HorizontalVelocity {
  const x = velocity?.x
  const z = velocity?.z
  return {
    x: Number.isFinite(x) ? x! : 0,
    z: Number.isFinite(z) ? z! : 0,
  }
}

export function isLocalPlayerMounted (
  entity: EntityLike,
  mountedVehicle?: EntityLike | null,
): boolean {
  return Boolean(entity.vehicle ?? mountedVehicle)
}

export function getIsCrouched (
  entity: EntityLike,
  isLocalPlayer: boolean,
  isLocalPlayerSneaking: boolean,
): boolean {
  return isLocalPlayer ? isLocalPlayerSneaking : Boolean(entity.crouching)
}

export function resolveCacheKey (rendererEntityId: RendererEntityId): string {
  return String(rendererEntityId)
}

export function shouldTrackPlayerEntity (entity: EntityLike): boolean {
  return Boolean(entity.username) && entity.type === 'player'
}

export function shouldProcessRemoteTrackingEntry (params: {
  tracking: boolean
  entity: EntityLike | null | undefined
  localPlayerEntity: EntityLike | null | undefined
}): boolean {
  const { tracking, entity, localPlayerEntity } = params
  if (!tracking) return false
  if (!entity) return false
  if (entity === localPlayerEntity) return false
  return true
}

export type ApplyEntityMovementAnimationParams = {
  entity: EntityLike
  horizontalVelocity: Partial<HorizontalVelocity>
  rendererEntityId: RendererEntityId
  mountedVehicle?: EntityLike | null
  force?: boolean
  isLocalPlayer: boolean
  isLocalPlayerSneaking: boolean
  playerPerAnimation: AnimationCache
  playEntityAnimation: (rendererEntityId: RendererEntityId, animation: EntityMovementAnimation) => void | Promise<void> | undefined
  rendererAvailable: boolean
}

export function applyEntityMovementAnimation (params: ApplyEntityMovementAnimationParams): boolean {
  const {
    entity,
    horizontalVelocity,
    rendererEntityId,
    mountedVehicle,
    force = false,
    isLocalPlayer,
    isLocalPlayerSneaking,
    playerPerAnimation,
    playEntityAnimation,
    rendererAvailable,
  } = params

  const sanitizedVelocity = sanitizeHorizontalVelocity(horizontalVelocity)
  const animation = getEntityMovementAnimation({
    isMounted: isLocalPlayer
      ? isLocalPlayerMounted(entity, mountedVehicle)
      : Boolean(entity.vehicle ?? mountedVehicle),
    isCrouched: getIsCrouched(entity, isLocalPlayer, isLocalPlayerSneaking),
    horizontalVelocity: sanitizedVelocity,
  })

  const cacheKey = resolveCacheKey(rendererEntityId)
  if (!force && playerPerAnimation[cacheKey] === animation) return false
  if (!rendererAvailable) return false

  void playEntityAnimation(rendererEntityId, animation)
  playerPerAnimation[cacheKey] = animation
  return true
}

export type ProcessMovementAnimationsParams = {
  localPlayerEntity: (EntityLike & { velocity: Partial<HorizontalVelocity> }) | null
  localPlayerVehicle?: EntityLike | null
  isLocalPlayerSneaking: boolean
  trackingData: Record<string, TrackingDataEntry>
  getEntityById: (id: string) => (EntityLike & { id: number }) | undefined
  playerPerAnimation: AnimationCache
  playEntityAnimation: (rendererEntityId: RendererEntityId, animation: EntityMovementAnimation) => void | Promise<void> | undefined
  rendererAvailable: boolean
}

export function processMovementAnimations (params: ProcessMovementAnimationsParams): void {
  const {
    localPlayerEntity,
    localPlayerVehicle,
    isLocalPlayerSneaking,
    trackingData,
    getEntityById,
    playerPerAnimation,
    playEntityAnimation,
    rendererAvailable,
  } = params

  if (localPlayerEntity) {
    applyEntityMovementAnimation({
      entity: localPlayerEntity,
      horizontalVelocity: localPlayerEntity.velocity,
      rendererEntityId: LOCAL_PLAYER_RENDERER_ID,
      mountedVehicle: localPlayerVehicle,
      isLocalPlayer: true,
      isLocalPlayerSneaking,
      playerPerAnimation,
      playEntityAnimation,
      rendererAvailable,
    })
  }

  for (const [id, trackerData] of Object.entries(trackingData)) {
    const entity = getEntityById(id)
    if (!shouldProcessRemoteTrackingEntry({
      tracking: trackerData.tracking,
      entity,
      localPlayerEntity,
    }) || !entity) continue

    applyEntityMovementAnimation({
      entity,
      horizontalVelocity: trackerData.info.avgVel,
      rendererEntityId: entity.id,
      mountedVehicle: entity.vehicle,
      isLocalPlayer: false,
      isLocalPlayerSneaking: false,
      playerPerAnimation,
      playEntityAnimation,
      rendererAvailable,
    })
  }
}

export function clearLocalPlayerAnimationCache (playerPerAnimation: AnimationCache): void {
  delete playerPerAnimation[LOCAL_PLAYER_CACHE_KEY]
}
