import { getInitialPlayerState, getPlayerStateUtils, PlayerStateReactive, PlayerStateRenderer, PlayerStateUtils } from 'minecraft-renderer/src/playerState/playerState'
import { states } from 'minecraft-protocol'
import { subscribe } from 'valtio'
import { subscribeKey } from 'valtio/utils'
import { HandItemBlock } from 'minecraft-renderer/src/playerState/types'
import { beforeRenderFrame } from '../beforeRenderFrame'
import { gameAdditionalState } from '../globalState'
import { options } from '../optionsStorage'

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
  if (heldItem?.name === 'bow' && playerState.reactive.itemUsageTicks > 0) {
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
  private isUsingItem = false
  private eyeHeightWatchInstalled = false
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
    this.isUsingItem = false
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
    bot.on('move', () => {
      this.updateMovementState()
    })

    // Item tracking
    bot.on('heldItemChanged', () => {
      return this.updateHeldItem(false)
    })
    bot.inventory.on('updateSlot', (index) => {
      if (index === 45) this.updateHeldItem(true)
    })
    const updateSneakingOrFlying = () => {
      this.updateMovementState()
      this.reactive.sneaking = bot.controlState.sneak
      this.reactive.flying = gameAdditionalState.isFlying
      this.reactive.eyeHeight = bot.controlState.sneak && !gameAdditionalState.isFlying ? SNEAK_EYE_HEIGHT : STANDING_EYE_HEIGHT
    }
    updateSneakingOrFlying()
    bot.on('physicsTick', () => {
      if (this.isUsingItem) this.reactive.itemUsageTicks++
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
      this.reactive.gameMode = bot.game.gameMode
    })
    this.reactive.gameMode = bot.game?.gameMode

    customEvents.on('gameLoaded', () => {
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
    const VELOCITY_THRESHOLD = 0.01
    const SPRINTING_VELOCITY = 0.15
    const OFF_GROUND_THRESHOLD = 0 // ms before switching to SNEAKING when off ground

    const now = performance.now()
    const deltaTime = now - this.lastUpdateTime
    this.lastUpdateTime = now

    // this.lastVelocity = velocity

    // Update time off ground
    if (isOnGround) {
      this.timeOffGround = 0
    } else {
      this.timeOffGround += deltaTime
    }

    if (gameAdditionalState.isSneaking || gameAdditionalState.isFlying || (this.timeOffGround > OFF_GROUND_THRESHOLD)) {
      this.reactive.movementState = 'SNEAKING'
    } else if (Math.abs(velocity.x) > VELOCITY_THRESHOLD || Math.abs(velocity.z) > VELOCITY_THRESHOLD) {
      this.reactive.movementState = Math.abs(velocity.x) > SPRINTING_VELOCITY || Math.abs(velocity.z) > SPRINTING_VELOCITY
        ? 'SPRINTING'
        : 'WALKING'
    } else {
      this.reactive.movementState = 'NOT_MOVING'
    }
  }

  private updateWalkDistAndBob () {
    if (!bot?.entity || this.disableStateUpdates) return

    const { velocity } = bot.entity
    const horizontalDist = Math.hypot(velocity.x, velocity.z)

    // Save previous values for interpolation
    this.reactive.prevWalkDist = this.reactive.walkDist
    this.reactive.prevBob = this.reactive.bob

    // Accumulate walk distance with dampening factor
    this.reactive.walkDist += horizontalDist * 0.6

    // Smooth bob amplitude — vanilla: onGround && !isDeadOrDying && !isSwimming
    // isSwimming = sprinting + in water (not just touching water)
    const isSwimming = bot.controlState.sprint && this.reactive.inWater
    const isDeadOrDying = (bot.entity.health ?? 20) <= 0
    const bobTarget = (bot.entity.onGround && !isDeadOrDying && !isSwimming) ? Math.min(0.1, horizontalDist) : 0
    this.reactive.bob += (bobTarget - this.reactive.bob) * 0.4
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

  startUsingItem () {
    if (this.isUsingItem) return
    this.isUsingItem = true
    this.reactive.itemUsageTicks = 0
  }

  stopUsingItem () {
    this.isUsingItem = false
    this.reactive.itemUsageTicks = 0
  }

  getItemUsageTicks (): number {
    return this.reactive.itemUsageTicks
  }

  watchReactive () {
    if (this.eyeHeightWatchInstalled) return
    this.eyeHeightWatchInstalled = true
    subscribeKey(this.reactive, 'eyeHeight', () => {
      appViewer.backend?.updateCamera(bot.entity.position, bot.entity.yaw, bot.entity.pitch)
    })
  }

  // #endregion
}

export const playerState = new PlayerStateControllerMain()
window.playerState = playerState

startFovMultiplierUpdates()
