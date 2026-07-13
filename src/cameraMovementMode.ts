import type { CameraMovementMode } from 'minecraft-renderer/src/graphicsBackend/types'
import { isRideableMinecartEntityName } from './boatRenderHints'

export function getCameraMovementMode (bot: { vehicle?: { name?: string } | null }): CameraMovementMode {
  if (bot.vehicle && isRideableMinecartEntityName(bot.vehicle.name)) {
    return 'server-vehicle'
  }
  return 'local-player'
}
