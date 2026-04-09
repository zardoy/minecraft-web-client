import { HandItemBlock } from 'renderer/viewer/three/holdingBlock'
import { getInitialPlayerState, getPlayerStateUtils, PlayerStateReactive, PlayerStateRenderer, PlayerStateUtils } from 'renderer/viewer/lib/basePlayerState'
import { subscribe } from 'valtio'
import { subscribeKey } from 'valtio/utils'
import { gameAdditionalState } from '../globalState'
import { options } from '../optionsStorage'

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
  ready = false

  reactive: PlayerStateReactive
  utils: PlayerStateUtils

  constructor () {
    customEvents.on('mineflayerBotCreated', () => {
      this.ready = false
      bot.on('inject_allowed', () => {
        if (this.ready) return
        this.ready = true
        this.botCreated()
      })
      bot.on('end', () => {
        this.ready = false
      })
    })
  }

  private onBotCreatedOrGameJoined () {
    this.reactive.username = bot.username ?? ''
  }

  private botCreated () {
    console.log('bot created & plugins injected')
    this.reactive = getInitialPlayerState()
    this.reactive.perspective = options.defaultPerspective
    this.utils = getPlayerStateUtils(this.reactive)
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
      this.reactive.eyeHeight = bot.controlState.sneak && !gameAdditionalState.isFlying ? 1.27 : 1.62
    }
    bot.on('physicsTick', () => {
      if (this.isUsingItem) this.reactive.itemUsageTicks++
      updateSneakingOrFlying()
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
      this.reactive.team = bot.teamMap[bot.username]
    })

    this.watchReactive()
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
    subscribeKey(this.reactive, 'eyeHeight', () => {
      appViewer.backend?.updateCamera(bot.entity.position, bot.entity.yaw, bot.entity.pitch)
    })
  }

  // #endregion
}

export const playerState = new PlayerStateControllerMain()
window.playerState = playerState
