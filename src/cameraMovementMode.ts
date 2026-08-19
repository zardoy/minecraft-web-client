import type { CameraMovementMode } from 'minecraft-renderer/src/graphicsBackend/types'
import { isBoatEntityName } from 'minecraft-renderer/src/three/entity/boatModelRotation'
import { isRideableMinecartEntityName } from './boatRenderHints'

export function getCameraMovementMode (bot: { vehicle?: { name?: string } | null }): CameraMovementMode {
  if (bot.vehicle && isRideableMinecartEntityName(bot.vehicle.name)) {
    return 'server-vehicle'
  }
  return 'local-player'
}

/** Instant camera on mount only where mineflayer snaps the seat position. */
export function shouldSnapCameraOnMount (vehicleName: string | undefined): boolean {
  return isBoatEntityName(vehicleName) || isRideableMinecartEntityName(vehicleName)
}
