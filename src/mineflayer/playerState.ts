import { getInitialPlayerState, getPlayerStateUtils, PlayerStateReactive, PlayerStateRenderer, PlayerStateUtils } from 'minecraft-renderer/src/playerState/playerState'
import { states } from 'minecraft-protocol'
import { subscribe } from 'valtio'
import { subscribeKey } from 'valtio/utils'
import { HandItemBlock, UseItemAction, UseItemParticleEffect, UseItemSession, UseItemSnapshot } from 'minecraft-renderer/src/playerState/types'
import { beforeRenderFrame } from '../beforeRenderFrame'
import { gameAdditionalState } from '../globalState'
import { options } from '../optionsStorage'
import { getCameraMovementMode } from '../cameraMovementMode'
import { updateMountedBobState, updateMountedMovementState } from '../mountedPlayerState'

import { getThreeJsRendererMethods } from 'minecraft-renderer/src/three/threeJsMethods'
import { buildUseEffectBoundaries, getCrossedUseEffectBoundaries, getUseEffectDescriptor, type UseEffectPhase } from './useItemEffects'
import { canUseItemAtHunger } from './useHungerGate'

type UseEffectRecord = {
  boundaries: Set<number>
  fired: Set<number>
}

const FAST_FOOD_ITEM_NAMES: Record<string, true> = {
  dried_kelp: true,
}

type UseItemHand = 0 | 1
type UseItemEventItem = { name?: string | null } | null | undefined

const DRINK_ITEM_NAMES: Record<string, true> = {
  honey_bottle: true,
  milk_bucket: true,
  potion: true,
}

const getUseItemSnapshot = (name: string): UseItemSnapshot => {
  let action: UseItemAction = 'NONE'
  let durationTicks = 0
  let particleEffect: UseItemParticleEffect = 'none'

  if (name === 'bow') {
    action = 'BOW'
    durationTicks = 20
  } else if (name === 'crossbow') {
    action = 'CROSSBOW'
    durationTicks = 20
  } else if (name === 'shield') {
    action = 'SHIELD'
  } else if (DRINK_ITEM_NAMES[name]) {
    action = 'DRINK'
    durationTicks = name === 'honey_bottle' ? 40 : 32
    particleEffect = 'drink'
  } else if (typeof loadedData !== 'undefined' && loadedData?.foodsArray?.some(food => food.name === name)) {
    action = 'EAT'
    durationTicks = name === 'dried_kelp' ? 16 : 32
    particleEffect = 'food'
  }

  return {
    name,
    durationTicks,
    action,
    particleEffect,
  }
}

const BASE_MOVEMENT_SPEED = 0.1
const FOV_EFFECT_SCALE = 1
const ZOOM_FOV = 30
const STANDING_EYE_HEIGHT = 1.62
const SNEAK_EYE_HEIGHT = 1.27

const updateFovMultiplier = () => {
  if (!playerState.ready || !playerState.reactive) return

  let fovModifier = 1

  if (playerState.reactive.flying) {
    fovModifier *= 1.05
  }

  const movementSpeedAttr = (
    bot.entity?.attributes?.['generic.movement_speed']
    ?? bot.entity?.attributes?.['minecraft:movement_speed']
    ?? bot.entity?.attributes?.['movement_speed']
    ?? bot.entity?.attributes?.['minecraft:movementSpeed']
  )?.value ?? BASE_MOVEMENT_SPEED

  let currentSpeed = BASE_MOVEMENT_SPEED
  if (bot.controlState?.sprint && !bot.controlState?.sneak) {
    currentSpeed *= 1.3
  }
  fovModifier *= (currentSpeed / movementSpeedAttr + 1) / 2

  if (Math.abs(BASE_MOVEMENT_SPEED) < Number.EPSILON || !Number.isFinite(fovModifier)) {
    fovModifier = 1
  }

  const heldItem = playerState.reactive.heldItemMain
  const usingBow = playerState.reactive.itemUseSession?.action === 'BOW'
    || (heldItem?.name === 'bow' && playerState.reactive.itemUsageTicks > 0)
  if (usingBow && playerState.reactive.itemUsageTicks > 0) {
    let usageProgress = playerState.reactive.itemUsageTicks / 20
    if (usageProgress > 1) {
      usageProgress = 1
    } else {
      usageProgress *= usageProgress
    }
    fovModifier *= 1 - usageProgress * 0.15
  }

  fovModifier = 1 + (fovModifier - 1) * FOV_EFFECT_SCALE

  const baseFov = gameAdditionalState.isZooming ? ZOOM_FOV : options.fov
  playerState.reactive.fovMultiplier = (baseFov / options.fov) * fovModifier
}

const startFovMultiplierUpdates = () => {
  if (!beforeRenderFrame.includes(updateFovMultiplier)) {
    beforeRenderFrame.push(updateFovMultiplier)
  }
  customEvents.on('gameLoaded', () => {
    updateFovMultiplier()
  })
}

/**
 * can be used only in main thread. Mainly for more convenient reactive state updates.
 * In renderer/ directory, use PlayerStateControllerRenderer type or worldRenderer.playerState.
 */
export class PlayerStateControllerMain {
  disableStateUpdates = false

  private timeOffGround = 0
  private lastUpdateTime = performance.now()

  // Held item state
  private nextUseSessionId = 0
  private activeUseSlot: number | null = null
  private useEffectRecords = new Map<number, UseEffectRecord>()
  private eyeHeightWatchInstalled = false

  /** Vanilla isUsingItem: still using until cancel or event-9, including remaining=0. */
  private get isUsingItem (): boolean {
    const status = this.reactive?.itemUseSession?.status
    return status === 'active' || status === 'awaitingCompletion'
  }
  ready = false

  reactive: PlayerStateReactive
  utils: PlayerStateUtils

  constructor () {
    customEvents.on('mineflayerBotCreated', () => {
      this.attachBotSession()
    })
  }

  /**
   * Register inject_allowed before any async connect work so a slow validate/connect
   * cannot fire inject before listeners exist (eyeHeight / botCreated race).
   */
  private attachBotSession () {
    this.ready = false
    if (this.reactive) this.resetUseSession()
    this.timeOffGround = 0
    this.lastUpdateTime = performance.now()

    const onInjectAllowed = () => {
      if (this.ready) return
      this.ready = true
      const clientState = bot._client?.state
      console.log('[playerState] inject_allowed', {
        t: performance.now(),
        clientState,
      })
      this.botCreated()
    }

    bot.once('inject_allowed', onInjectAllowed)
    bot.once('end', () => {
      this.resetUseSession()
      this.ready = false
    })

    const clientState = bot._client?.state
    if (clientState && clientState !== states.HANDSHAKING) {
      console.log('[playerState] inject_allowed already fired before attach', {
        clientState,
        eyeHeight: this.reactive?.eyeHeight,
      })
      onInjectAllowed()
    }
  }

  private onBotCreatedOrGameJoined () {
    this.reactive.username = bot.username ?? ''
  }

  private botCreated () {
    console.log('bot created & plugins injected')

    this.reactive = appViewer.playerState.reactive
    this.utils = getPlayerStateUtils(this.reactive)

    const fresh = getInitialPlayerState()
    Object.assign(this.reactive, fresh)
    this.reactive.perspective = options.defaultPerspective
    this.onBotCreatedOrGameJoined()
    bot.on('death', () => this.resetUseSession())
    bot.on('respawn', () => this.resetUseSession())
    bot.on('kicked', () => this.resetUseSession())

    const handleDimensionData = (data) => {
      let hasSkyLight = 1
      try {
        hasSkyLight = data.dimension.value.has_skylight.value
      } catch {}
      this.reactive.lightingDisabled = bot.game.dimension === 'the_nether' || bot.game.dimension === 'the_end' || !hasSkyLight
      let cardinalLight = 'default'
      try {
        cardinalLight = data.dimension.value.effects.value === 'minecraft:the_nether' ? 'nether' : 'default'
      } catch {}
      try {
        cardinalLight = data.dimension.value.cardinal_light.value //servers after 1.21.11, untested
      } catch {}
      this.reactive.cardinalLight = cardinalLight
    }

    bot._client.on('login', (packet) => {
      handleDimensionData(packet)
    })
    bot._client.on('respawn', (packet) => {
      handleDimensionData(packet)
    })

    // Movement tracking
    // Item tracking
    bot.on('heldItemChanged', (item) => {
      this.updateHeldItem(false)
      this.cancelUseForHeldItem(0, item?.name)
    })
    bot.inventory.on('updateSlot', (index) => {
      if (index === 45) {
        this.updateHeldItem(true)
        this.cancelUseForHeldItem(1, bot.inventory.slots[45]?.name)
      }
    })
    const updateSneakingOrFlying = () => {
      this.updateMovementState()
      this.reactive.sneaking = bot.controlState.sneak
      this.reactive.flying = gameAdditionalState.isFlying
      this.reactive.eyeHeight = bot.controlState.sneak && !gameAdditionalState.isFlying ? SNEAK_EYE_HEIGHT : STANDING_EYE_HEIGHT
    }
    updateSneakingOrFlying()
    bot.on('physicsTick', () => {
      this.advanceUse()
      updateSneakingOrFlying()
      this.updateWalkDistAndBob()
    })
    // todo move from gameAdditionalState to reactive directly
    subscribeKey(gameAdditionalState, 'isSneaking', () => {
      updateSneakingOrFlying()
    })
    subscribeKey(gameAdditionalState, 'isFlying', () => {
      updateSneakingOrFlying()
    })

    // Initial held items setup
    this.updateHeldItem(false)
    this.updateHeldItem(true)

    bot.on('game', () => {
      this.resetUseSession()
      this.reactive.gameMode = bot.game.gameMode
    })
    this.reactive.gameMode = bot.game?.gameMode

    customEvents.on('gameLoaded', () => {
      this.resetUseSession()
      this.reactive.team = bot.teamMap[bot.username] as any
    })

    this.watchReactive()

    // do not attach on app load since we are not connected yet
    window.hello = () => {
      console.log(`Hey, ${bot.username}! This game client is built on top of minecraft-web-client. Join us and let's make the open-source Minecraft client even better!`)
    }
  }

  // #region Movement and Physics State
  private updateMovementState () {
    if (!bot?.entity || this.disableStateUpdates) return

    const { velocity } = bot.entity
    const isOnGround = bot.entity.onGround

    const now = performance.now()
    const deltaTime = now - this.lastUpdateTime
    this.lastUpdateTime = now

    const next = updateMountedMovementState({
      mounted: Boolean(bot.vehicle),
      velocity,
      onGround: isOnGround,
      isSneaking: gameAdditionalState.isSneaking,
      isFlying: gameAdditionalState.isFlying,
      timeOffGround: this.timeOffGround,
      deltaTime,
    })
    this.timeOffGround = next.timeOffGround
    this.reactive.movementState = next.movementState
  }

  private updateWalkDistAndBob () {
    if (!bot?.entity || this.disableStateUpdates) return

    const { velocity } = bot.entity
    const horizontalDist = Math.hypot(velocity.x, velocity.z)
    const next = updateMountedBobState({
      mounted: Boolean(bot.vehicle),
      walkDist: this.reactive.walkDist,
      bob: this.reactive.bob,
      horizontalDist,
      onGround: bot.entity.onGround,
      isDeadOrDying: (bot.entity.health ?? 20) <= 0,
      isSwimming: bot.controlState.sprint && this.reactive.inWater,
    })
    this.reactive.prevWalkDist = next.prevWalkDist
    this.reactive.prevBob = next.prevBob
    this.reactive.walkDist = next.walkDist
    this.reactive.bob = next.bob
  }

  // #region Held Item State
  private updateHeldItem (isLeftHand: boolean) {
    const newItem = isLeftHand ? bot.inventory.slots[45] : bot.heldItem
    if (!newItem) {
      if (isLeftHand) {
        this.reactive.heldItemOff = undefined
      } else {
        this.reactive.heldItemMain = undefined
      }
      return
    }

    const block = loadedData.blocksByName[newItem.name]
    const blockProperties = block ? new window.PrismarineBlock(block.id, 'void', newItem.metadata).getProperties() : {}
    const item: HandItemBlock = {
      name: newItem.name,
      properties: blockProperties,
      id: newItem.type,
      type: block ? 'block' : 'item',
      fullItem: newItem,
    }

    if (isLeftHand) {
      this.reactive.heldItemOff = item
    } else {
      this.reactive.heldItemMain = item
    }
    // this.events.emit('heldItemChanged', item, isLeftHand)
  }

  private publishItemUsageTicks (session = this.reactive?.itemUseSession) {
    const usageContinues = session?.status === 'active' || session?.status === 'awaitingCompletion'
    this.reactive.itemUsageTicks = usageContinues && session
      ? Math.min(session.elapsedTicks, session.durationTicks)
      : 0
  }
  private dropUseEffectRecord (sessionId: number) {
    this.useEffectRecords.delete(sessionId)
  }

  private emitUseEffect (session: UseItemSession, phase: UseEffectPhase) {
    const descriptor = getUseEffectDescriptor(session.action, session.itemSnapshot.name, phase)
    if (descriptor.particleCount > 0) {
      const position = bot.entity?.position
      if (position) {
        const renderer = getThreeJsRendererMethods()
        if (renderer?.spawnItemParticles) {
          // LivingEntity.spawnItemParticles uses eye-relative item particles;
          // pass the same eye-height anchor while keeping the session snapshot
          // as the texture identity after depletion/replacement.
          void renderer.spawnItemParticles(
            position.x,
            position.y + (this.reactive?.eyeHeight ?? STANDING_EYE_HEIGHT),
            position.z,
            session.itemSnapshot.name,
            descriptor.particleCount
          )
        }
      }
    }

    // Player.playSound (1.17.1) calls level.playSound(this, ...). On the server that
    // argument is the except-player, so sound_effect is not sent to the eater.
    // On the client it is the local player, so ClientLevel plays it locally.
    // Re-enter botSoundSystem via soundEffectHeard; particles stay client-only.
    const position = bot.entity?.position
    if (descriptor.sound && position) {
      bot.emit('soundEffectHeard', descriptor.sound, position, 0.5, 1)
    }
    if (descriptor.burp && position) {
      bot.emit('soundEffectHeard', 'entity.player.burp', position, 0.5, 1)
    }
  }

  private fireCrossedUseEffects (session: UseItemSession, previousElapsedTicks: number, nextElapsedTicks: number) {
    const record = this.useEffectRecords.get(session.id)
    if (!record) return

    // Catch up every missed boundary in descending remaining-tick order;
    // repeated calls with the same elapsed value return no new boundaries.
    for (const remaining of getCrossedUseEffectBoundaries(
      previousElapsedTicks,
      nextElapsedTicks,
      session.durationTicks,
      record.boundaries,
      record.fired
    )) {
      record.fired.add(remaining)
      this.emitUseEffect(session, 'periodic')
    }
  }


  private cancelUseForHeldItem (hand: UseItemHand, name?: string) {
    const session = this.reactive?.itemUseSession
    if (!session || (session.status !== 'active' && session.status !== 'awaitingCompletion') || session.hand !== hand) return
    const slot = hand === 1 ? 45 : bot.quickBarSlot
    if (this.activeUseSlot !== null && slot !== this.activeUseSlot) {
      this.cancelUse(undefined, hand)
      return
    }
    if (name && name !== session.itemSnapshot.name) this.cancelUse(undefined, hand)
  }

  private matchesUseEvent (session: UseItemSession, item: UseItemEventItem, hand?: UseItemHand) {
    return (hand === undefined || session.hand === hand)
      && (!item?.name || item.name === session.itemSnapshot.name)
  }

  beginUse (item?: UseItemEventItem, hand: UseItemHand = 0): UseItemSession | undefined {
    if (!this.reactive) return undefined

    const current = this.reactive.itemUseSession
    // Vanilla startUsingItem requires !isUsingItem(); awaitingCompletion is still using.
    if (this.isUsingItem) return current

    const heldItem = hand === 1 ? bot.inventory.slots[45] : bot.heldItem
    const name = item?.name ?? heldItem?.name
    if (!name) return undefined

    const itemSnapshot = getUseItemSnapshot(name)
    // Mineflayer's game plugin exposes gameMode but does not populate a bot
    // abilities.invulnerable field, so creative is the available vanilla equivalent.
    if (!canUseItemAtHunger(itemSnapshot.action, name, bot.food ?? undefined, {
      isCreative: bot.game?.gameMode === 'creative',
    })) return undefined

    this.activeUseSlot = hand === 1 ? 45 : bot.quickBarSlot

    const session: UseItemSession = {
      id: ++this.nextUseSessionId,
      itemSnapshot,
      hand,
      action: itemSnapshot.action,
      durationTicks: itemSnapshot.durationTicks,
      elapsedTicks: 0,
      status: 'active',
    }
    this.useEffectRecords.set(session.id, {
      boundaries: buildUseEffectBoundaries(session.durationTicks, FAST_FOOD_ITEM_NAMES[name] === true),
      fired: new Set<number>(),
    })
    this.reactive.itemUseSession = session
    this.publishItemUsageTicks(session)
    return session
  }

  advanceUse (): UseItemSession | undefined {
    const session = this.reactive?.itemUseSession
    if (!session || session.status !== 'active') return session

    if (session.durationTicks > 0) {
      const previousElapsedTicks = session.elapsedTicks
      const nextElapsedTicks = Math.min(session.durationTicks, previousElapsedTicks + 1)
      session.elapsedTicks = nextElapsedTicks
      this.fireCrossedUseEffects(session, previousElapsedTicks, nextElapsedTicks)
      if (session.elapsedTicks >= session.durationTicks && (session.action === 'EAT' || session.action === 'DRINK')) {
        session.status = 'awaitingCompletion'
      }
    }
    this.publishItemUsageTicks(session)
    return session
  }

  cancelUse (item?: UseItemEventItem, hand?: UseItemHand): UseItemSession | undefined {
    const session = this.reactive?.itemUseSession
    if (!session || !this.matchesUseEvent(session, item, hand)) return session
    if (session.status === 'completed' || session.status === 'cancelled') return session

    this.dropUseEffectRecord(session.id)
    session.status = 'cancelled'
    this.activeUseSlot = null
    this.publishItemUsageTicks(session)
    return session
  }

  completeUse (): UseItemSession | undefined {
    const session = this.reactive?.itemUseSession
    if (!session) return session
    if (session.status === 'cancelled' || session.status === 'completed') {
      this.dropUseEffectRecord(session.id)
      return session
    }
    if (session.status !== 'active' && session.status !== 'awaitingCompletion') return session
    if (session.action !== 'EAT' && session.action !== 'DRINK') return session

    session.status = 'completed'
    this.activeUseSlot = null
    this.publishItemUsageTicks(session)
    this.emitUseEffect(session, 'finish')
    this.dropUseEffectRecord(session.id)
    return session
  }

  resetUseSession () {
    this.activeUseSlot = null
    this.useEffectRecords.clear()
    if (this.reactive) {
      this.reactive.itemUseSession = undefined
      this.reactive.itemUsageTicks = 0
    }
  }

  startUsingItem (item?: UseItemEventItem, hand: UseItemHand = 0) {
    return this.beginUse(item, hand)
  }

  stopUsingItem (item?: UseItemEventItem, hand?: UseItemHand) {
    const session = this.reactive?.itemUseSession
    if (!session || !this.matchesUseEvent(session, item, hand)) return session
    if (session.status === 'active') {
      if ((session.action === 'EAT' || session.action === 'DRINK')
        && session.durationTicks > 0
        && session.elapsedTicks >= session.durationTicks) {
        session.status = 'awaitingCompletion'
      } else {
        session.status = 'cancelled'
      }
    } else if (session.status === 'awaitingCompletion' && session.action !== 'EAT' && session.action !== 'DRINK') {
      session.status = 'cancelled'
    }
    if (session.status === 'cancelled') this.dropUseEffectRecord(session.id)
    this.activeUseSlot = null
    this.publishItemUsageTicks(session)
    return session
  }

  getItemUsageTicks (): number {
    return this.reactive.itemUsageTicks
  }

  watchReactive () {
    if (this.eyeHeightWatchInstalled) return
    this.eyeHeightWatchInstalled = true
    subscribeKey(this.reactive, 'eyeHeight', () => {
      appViewer.backend?.updateCamera(bot.entity.position, bot.entity.yaw, bot.entity.pitch, {
        movementMode: getCameraMovementMode(bot),
      })
    })
  }

  // #endregion
}

export const playerState = new PlayerStateControllerMain()
window.playerState = playerState

startFovMultiplierUpdates()
