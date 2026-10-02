import type { UseItemAction, UseItemSession } from 'minecraft-renderer/src/playerState/types'

/**
 * These are the use actions represented by the local item-use session. `NONE`
 * is used for activatable inventory items that do not have a vanilla use
 * animation; it is not a LocalPlayer.isUsingItem() state and must not apply
 * the movement restriction.
 */
const MOVEMENT_RESTRICTED_USE_ACTIONS: Record<UseItemAction, true | undefined> = {
  EAT: true,
  DRINK: true,
  BOW: true,
  CROSSBOW: true,
  SHIELD: true,
  NONE: undefined,
}

const isActiveUseSession = (session: UseItemSession | null | undefined): boolean => {
  if (!session || (session.status !== 'active' && session.status !== 'awaitingCompletion')) {
    return false
  }
  return MOVEMENT_RESTRICTED_USE_ACTIONS[session.action] === true
}

/** Vanilla's input slow applies to unmounted players while an item is used. */
export const shouldSlowWhileUsing = (
  session: UseItemSession | null | undefined,
  hasVehicle: boolean
): boolean => !hasVehicle && isActiveUseSession(session)

/** Vanilla sprint eligibility is blocked for every active represented use. */
export const shouldBlockSprint = (session: UseItemSession | null | undefined): boolean => {
  return isActiveUseSession(session)
}
