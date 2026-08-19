/**
 * Bundler entry for @nxg-org/mineflayer-physics-util when installed from GitHub (src only, no dist).
 * Lives outside src/ so tsc does not typecheck physics-util source via re-exports.
 */
import type { IndexedData } from 'minecraft-data'
import type { Bot } from 'mineflayer'

import { EPhysicsCtx } from '../node_modules/@nxg-org/mineflayer-physics-util/src/physics/settings'
import { PhysicsUtilWrapper } from '../node_modules/@nxg-org/mineflayer-physics-util/src/wrapper'

declare module 'mineflayer' {
  interface Bot {
    physicsUtil: PhysicsUtilWrapper
  }
}

export default function loader (bot: Bot): void {
  if (!bot.physicsUtil) {
    initSetup(bot.registry)
    bot.physicsUtil = new PhysicsUtilWrapper(bot)
  }
}

export function initSetup (data: IndexedData) {
  EPhysicsCtx.loadData(data)
}

export { PhysicsUtilWrapper } from '../node_modules/@nxg-org/mineflayer-physics-util/src/wrapper'
export { EPhysicsCtx, PhysicsWorldSettings } from '../node_modules/@nxg-org/mineflayer-physics-util/src/physics/settings'
export { BaseSimulator } from '../node_modules/@nxg-org/mineflayer-physics-util/src/simulators'
export { EntityPhysics, BotcraftPhysics, BoatPhysics, HorsePhysics } from '../node_modules/@nxg-org/mineflayer-physics-util/src/physics/engines'
export { EntityState, PlayerState, PlayerPoses, BoatState, BoatStatus, HorseState } from '../node_modules/@nxg-org/mineflayer-physics-util/src/physics/states'
export type { IEntityState } from '../node_modules/@nxg-org/mineflayer-physics-util/src/physics/states'
export { ControlStateHandler } from '../node_modules/@nxg-org/mineflayer-physics-util/src/physics/player'
export type { SimulationGoal, Controller, OnGoalReachFunction } from '../node_modules/@nxg-org/mineflayer-physics-util/src/simulators'
export { convertPlayerState, applyToPlayerState } from '../node_modules/@nxg-org/mineflayer-physics-util/src/util/physicsUtils'
