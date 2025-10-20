//@ts-check

import { Vec3 } from 'vec3'
import { proxy, subscribe } from 'valtio'

import { ControMax } from 'contro-max/build/controMax'
import { CommandEventArgument, SchemaCommandInput } from 'contro-max/build/types'
import { stringStartsWith } from 'contro-max/build/stringUtils'
import { GameMode } from 'mineflayer'
import { getThreeJsRendererMethods } from 'renderer/viewer/three/threeJsMethods'
import { isGameActive, showModal, gameAdditionalState, activeModalStack, hideCurrentModal, miscUiState, hideModal, hideAllModals } from './globalState'
import { goFullscreen, isInRealGameSession, pointerLock, reloadChunks } from './utils'
import { options } from './optionsStorage'
import { openPlayerInventory } from './inventoryWindows'
import { chatInputValueGlobal } from './react/Chat'
import { fsState } from './loadSave'
import { customCommandsConfig } from './customCommands'
import type { CustomCommand } from './react/KeybindingsCustom'
import { showOptionsModal } from './react/SelectOption'
import widgets from './react/widgets'
import { getItemFromBlock } from './chatUtils'
import { gamepadUiCursorState } from './react/GamepadUiCursor'
import { completeResourcepackPackInstall, copyServerResourcePackToRegular, resourcePackState } from './resourcePack'
import { showNotification } from './react/NotificationProvider'
import { lastConnectOptions } from './react/AppStatusProvider'
import { onCameraMove, onControInit } from './cameraRotationControls'
import { createNotificationProgressReporter } from './core/progressReporter'
import { appStorage } from './react/appStorageProvider'
import { switchGameMode } from './packetsReplay/replayPackets'
import { tabListState } from './react/PlayerListOverlayProvider'
import { type ActionType, type ActionHoldConfig, type CustomAction } from './appConfig'
import { playerState } from './mineflayer/playerState'
import { emulateMouseClick } from './app/gamepadCursor'

export const customKeymaps = proxy(appStorage.keybindings)
subscribe(customKeymaps, () => {
  appStorage.keybindings = customKeymaps
})

const controlOptions = {
  preventDefault: true
}

export const contro = new ControMax({
  commands: {
    general: {
      // movement
      jump: ['Space', 'A'],
      inventory: ['KeyE', 'X'],
      drop: ['KeyQ', 'B'],
      dropStack: [null],
      sneak: ['ShiftLeft', 'Down'],
      toggleSneakOrDown: [null, 'Right Stick'],
      sprint: ['ControlLeft', 'Left Stick'],
      // game interactions
      nextHotbarSlot: [null, 'Right Bumper'],
      prevHotbarSlot: [null, 'Left Bumper'],
      attackDestroy: [null, 'Right Trigger'],
      interactPlace: [null, 'Left Trigger'],
      swapHands: ['KeyF'],
      selectItem: ['KeyH'],
      rotateCameraLeft: [null],
      rotateCameraRight: [null],
      rotateCameraUp: [null],
      rotateCameraDown: [null],
      // ui?
      chat: [['KeyT', 'Enter'], 'Right'],
      command: ['Slash'],
      playersList: ['Tab', 'Left'],
      debugOverlay: ['F3'],
      debugOverlayHelpMenu: [null],
      // client side
      zoom: ['KeyC'],
      viewerConsole: ['Backquote'],
      togglePerspective: ['F5', 'Up'],
    },
    ui: {
      toggleFullscreen: ['F11'],
      back: [null/* 'Escape' */, 'B'],
      toggleMap: ['KeyJ'],
      leftClick: [null, 'A'],
      rightClick: [null, 'X'],
      speedupCursor: [null, 'Left Stick'],
      pauseMenu: [null, 'Start']
    },
    communication: {
      toggleMicrophone: ['KeyM'],
    },
    advanced: {
      lockUrl: ['KeyY'],
    },
    custom: {} as Record<string, SchemaCommandInput & { type: string, input: any[] }>,
    // waila: {
    //   showLookingBlockRecipe: ['Numpad3'],
    //   showLookingBlockUsages: ['Numpad4']
    // }
  } satisfies Record<string, Record<string, SchemaCommandInput>>,
  movementKeymap: 'WASD',
  movementVector: '2d',
  groupedCommands: {
    general: {
      switchSlot: ['Digits', []]
    }
  },
}, {
  defaultControlOptions: controlOptions,
  target: document,
  captureEvents () {
    return true
  },
  storeProvider: {
    load: () => customKeymaps,
    save () { },
  },
  gamepadPollingInterval: 10
})
window.controMax = contro
export type Command = CommandEventArgument<typeof contro['_commandsRaw']>['command']

export const isCommandDisabled = (command: Command) => {
  return miscUiState.appConfig?.disabledCommands?.includes(command)
}

onControInit()

updateBinds(customKeymaps)

const updateDoPreventDefault = () => {
  controlOptions.preventDefault = miscUiState.gameLoaded && !activeModalStack.length
}

subscribe(miscUiState, updateDoPreventDefault)
subscribe(activeModalStack, updateDoPreventDefault)
updateDoPreventDefault()

const setSprinting = (state: boolean) => {
  bot.setControlState('sprint', state)
  gameAdditionalState.isSprinting = state
}

const isSpectatingEntity = () => {
  return appViewer.playerState.utils.isSpectatingEntity()
}

contro.on('movementUpdate', ({ vector, soleVector, gamepadIndex }) => {
  miscUiState.usingGamepadInput = gamepadIndex !== undefined
  if (!bot || !isGameActive(false) || isSpectatingEntity()) return

  // if (viewer.world.freeFlyMode) {
  //   // Create movement vector from input
  //   const direction = new THREE.Vector3(0, 0, 0)
  //   if (vector.z !== undefined) direction.z = vector.z
  //   if (vector.x !== undefined) direction.x = vector.x

  //   // Apply camera rotation to movement direction
  //   direction.applyQuaternion(viewer.camera.quaternion)

  //   // Update freeFlyState position with normalized direction
  //   const moveSpeed = 1
  //   direction.multiplyScalar(moveSpeed)
  //   viewer.world.freeFlyState.position.add(new Vec3(direction.x, direction.y, direction.z))
  //   return
  // }

  // gamepadIndex will be used for splitscreen in future
  const coordToAction = [
    ['z', -1, 'forward'],
    ['z', 1, 'back'],
    ['x', -1, 'left'],
    ['x', 1, 'right'],
  ] as const

  const newState: Partial<typeof bot.controlState> = {}
  for (const [coord, v] of Object.entries(vector)) {
    if (v === undefined || Math.abs(v) < 0.3) continue
    // todo use raw values eg for slow movement
    const mappedValue = v < 0 ? -1 : 1
    // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
    const foundAction = coordToAction.find(([c, mapV]) => c === coord && mapV === mappedValue)?.[2]!
    newState[foundAction] = true
  }

  for (const key of ['forward', 'back', 'left', 'right'] as const) {
    if (newState[key] === bot.controlState[key]) continue
    const action = !!newState[key]
    if (action && !isGameActive(true)) continue
    bot.setControlState(key, action)

    if (key === 'forward') {
      // todo workaround: need to refactor
      if (action) {
        void contro.emit('trigger', { command: 'general.forward' } as any)
      } else {
        void contro.emit('release', { command: 'general.forward' } as any)
        setSprinting(false)
      }
    }
  }
})

let lastCommandTrigger = null as { command: string, time: number } | null

const secondActionActivationTimeout = 300
const secondActionCommands = {
  'general.jump' () {
    // if (bot.game.gameMode === 'spectator') return
    toggleFly()
  },
  'general.forward' () {
    setSprinting(true)
  }
}

// detect pause open, as ANY keyup event is not fired when you exit pointer lock (esc)
subscribe(activeModalStack, () => {
  if (activeModalStack.length) {
    // iterate over pressedKeys
    for (const key of contro.pressedKeys) {
      contro.pressedKeyOrButtonChanged({ code: key }, false)
    }
  }
})

// Camera rotation controls
const cameraRotationControls = {
  activeDirections: new Set<'left' | 'right' | 'up' | 'down'>(),
  interval: null as ReturnType<typeof setInterval> | null,
  config: {
    speed: 1, // movement per interval
    interval: 5 // ms between movements
  },
  movements: {
    left: { movementX: -0.5, movementY: 0 },
    right: { movementX: 0.5, movementY: 0 },
    up: { movementX: 0, movementY: -0.5 },
    down: { movementX: 0, movementY: 0.5 }
  },
  updateMovement () {
    if (cameraRotationControls.activeDirections.size === 0) {
      if (cameraRotationControls.interval) {
        clearInterval(cameraRotationControls.interval)
        cameraRotationControls.interval = null
      }
      return
    }

    if (!cameraRotationControls.interval) {
      cameraRotationControls.interval = setInterval(() => {
        // Combine all active movements
        const movement = { movementX: 0, movementY: 0 }
        for (const direction of cameraRotationControls.activeDirections) {
          movement.movementX += cameraRotationControls.movements[direction].movementX
          movement.movementY += cameraRotationControls.movements[direction].movementY
        }

        onCameraMove({
          ...movement,
          type: 'keyboardRotation',
          stopPropagation () {}
        })
      }, cameraRotationControls.config.interval)
    }
  },
  start (direction: 'left' | 'right' | 'up' | 'down') {
    cameraRotationControls.activeDirections.add(direction)
    cameraRotationControls.updateMovement()
  },
  stop (direction: 'left' | 'right' | 'up' | 'down') {
    cameraRotationControls.activeDirections.delete(direction)
    cameraRotationControls.updateMovement()
  },
  handleCommand (command: string, pressed: boolean) {
    // Don't allow movement while spectating an entity
    if (isSpectatingEntity()) return

    const directionMap = {
      'general.rotateCameraLeft': 'left',
      'general.rotateCameraRight': 'right',
      'general.rotateCameraUp': 'up',
      'general.rotateCameraDown': 'down'
    } as const

    const direction = directionMap[command]
    if (direction) {
      if (pressed) cameraRotationControls.start(direction)
      else cameraRotationControls.stop(direction)
      return true
    }
    return false
  }
}
window.cameraRotationControls = cameraRotationControls

const setSneaking = (state: boolean) => {
  gameAdditionalState.isSneaking = state
  bot.setControlState('sneak', state)

}

const onTriggerOrReleased = (command: Command, pressed: boolean) => {
  // always allow release!
  if (!bot || !isGameActive(false)) return
  if (stringStartsWith(command, 'general')) {
    // handle general commands
    // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
    switch (command) {
      case 'general.jump':
        if (isSpectatingEntity()) break
        // if (viewer.world.freeFlyMode) {
        //   const moveSpeed = 0.5
        //   viewer.world.freeFlyState.position.add(new Vec3(0, pressed ? moveSpeed : 0, 0))
        // } else {
        bot.setControlState('jump', pressed)
        // }
        break
      case 'general.sneak':
        // if (viewer.world.freeFlyMode) {
        //   const moveSpeed = 0.5
        //   viewer.world.freeFlyState.position.add(new Vec3(0, pressed ? -moveSpeed : 0, 0))
        // } else {
        setSneaking(pressed)
        // }
        break
      case 'general.sprint':
        // todo add setting to change behavior
        if (pressed) {
          setSprinting(pressed)
        }
        break
      case 'general.toggleSneakOrDown':
        if (gameAdditionalState.isFlying) {
          setSneaking(pressed)
        } else if (pressed) {
          setSneaking(!gameAdditionalState.isSneaking)
        }
        break
      case 'general.attackDestroy':
        document.dispatchEvent(new MouseEvent(pressed ? 'mousedown' : 'mouseup', { button: 0 }))
        break
      case 'general.interactPlace':
        document.dispatchEvent(new MouseEvent(pressed ? 'mousedown' : 'mouseup', { button: 2 }))
        break
      case 'general.zoom':
        gameAdditionalState.isZooming = pressed
        break
      case 'general.debugOverlay':
        if (pressed) {
          miscUiState.showDebugHud = !miscUiState.showDebugHud
        }
        break
      case 'general.debugOverlayHelpMenu':
        if (pressed) {
          void onF3LongPress()
        }
        break
      case 'general.rotateCameraLeft':
      case 'general.rotateCameraRight':
      case 'general.rotateCameraUp':
      case 'general.rotateCameraDown':
        cameraRotationControls.handleCommand(command, pressed)
        break
      case 'general.playersList':
        tabListState.isOpen = pressed
        break
      case 'general.viewerConsole':
        if (lastConnectOptions.value?.viewerWsConnect) {
          showModal({ reactType: 'console' })
        }
        break
      case 'general.togglePerspective':
        if (pressed) {
          const currentPerspective = playerState.reactive.perspective
          // eslint-disable-next-line sonarjs/no-nested-switch
          switch (currentPerspective) {
            case 'first_person':
              playerState.reactive.perspective = 'third_person_back'
              break
            case 'third_person_back':
              playerState.reactive.perspective = 'third_person_front'
              break
            case 'third_person_front':
              playerState.reactive.perspective = 'first_person'
              break
          }
        }
        break
    }
  } else if (stringStartsWith(command, 'ui')) {
    switch (command) {
      case 'ui.pauseMenu':
        if (pressed) {
          if (activeModalStack.length) {
            hideCurrentModal()
          } else {
            showModal({ reactType: 'pause-screen' })
          }
        }
        break
      case 'ui.back':
      case 'ui.toggleFullscreen':
      case 'ui.toggleMap':
      case 'ui.leftClick':
      case 'ui.rightClick':
      case 'ui.speedupCursor':
        // These are handled elsewhere
        break
    }
  }
}

// im still not sure, maybe need to refactor to handle in inventory instead
const alwaysPressedHandledCommand = (command: Command) => {
  // triggered even outside of the game
  if (command === 'general.inventory') {
    if (activeModalStack.at(-1)?.reactType?.startsWith?.('player_win:')) { // todo?
      hideCurrentModal()
    }
  }
  if (command === 'advanced.lockUrl') {
    lockUrl()
  }
  if (command === 'communication.toggleMicrophone') {
    toggleMicrophoneMuted?.()
  }
}

export function lockUrl () {
  let newQs = ''
  if (fsState.saveLoaded && fsState.inMemorySave) {
    const worldFolder = fsState.inMemorySavePath
    const save = worldFolder.split('/').at(-1)
    newQs = `loadSave=${save}`
  } else if (process.env.NODE_ENV === 'development') {
    newQs = `reconnect=1`
  } else if (lastConnectOptions.value?.server) {
    const qs = new URLSearchParams()
    const { server, botVersion, proxy, username } = lastConnectOptions.value
    qs.set('ip', server)
    if (botVersion) qs.set('version', botVersion)
    if (proxy) qs.set('proxy', proxy)
    if (username) qs.set('username', username)
    newQs = String(qs.toString())
  }

  if (newQs) {
    window.history.replaceState({}, '', `${window.location.pathname}?${newQs}`)
  }
}

function cycleHotbarSlot (dir: 1 | -1) {
  const newHotbarSlot = (bot.quickBarSlot + dir + 9) % 9
  bot.setQuickBarSlot(newHotbarSlot)
}

// custom commands handler
const customCommandsHandler = ({ command }) => {
  const [section, name] = command.split('.')
  if (!isGameActive(true) || section !== 'custom') return

  if (contro.userConfig?.custom) {
    customCommandsConfig[(contro.userConfig.custom[name] as CustomCommand).type].handler((contro.userConfig.custom[name] as CustomCommand).inputs)
  }
}
contro.on('trigger', customCommandsHandler)

contro.on('trigger', ({ command }) => {
  if (isCommandDisabled(command)) return

  const willContinue = !isGameActive(true)
  alwaysPressedHandledCommand(command)
  if (willContinue) return

  const secondActionCommand = secondActionCommands[command]
  if (secondActionCommand) {
    if (command === lastCommandTrigger?.command && Date.now() - lastCommandTrigger.time < secondActionActivationTimeout) {
      const commandToTrigger = secondActionCommands[lastCommandTrigger.command]
      commandToTrigger()
      lastCommandTrigger = null
    } else {
      lastCommandTrigger = {
        command,
        time: Date.now(),
      }
    }
  }

  onTriggerOrReleased(command, true)

  if (stringStartsWith(command, 'general')) {
    switch (command) {
      case 'general.jump':
      case 'general.sneak':
      case 'general.toggleSneakOrDown':
      case 'general.sprint':
      case 'general.attackDestroy':
      case 'general.rotateCameraLeft':
      case 'general.rotateCameraRight':
      case 'general.rotateCameraUp':
      case 'general.rotateCameraDown':
      case 'general.debugOverlay':
      case 'general.debugOverlayHelpMenu':
      case 'general.playersList':
      case 'general.togglePerspective':
        // no-op
        break
      case 'general.swapHands': {
        if (isSpectatingEntity()) break
        bot._client.write('block_dig', {
          'status': 6,
          'location': {
            'x': 0,
            'z': 0,
            'y': 0
          },
          'face': 0,
        })
        break
      }
      case 'general.interactPlace':
        // handled in onTriggerOrReleased
        break
      case 'general.inventory':
        if (isSpectatingEntity()) break
        document.exitPointerLock?.()
        openPlayerInventory()
        break
      case 'general.drop': {
        if (isSpectatingEntity()) break
        // protocol 1.9+
        bot._client.write('block_dig', {
          'status': 4,
          'location': {
            'x': 0,
            'z': 0,
            'y': 0
          },
          'face': 0,
          sequence: 0
        })
        const slot = bot.inventory.hotbarStart + bot.quickBarSlot
        const item = bot.inventory.slots[slot]
        if (item) {
          item.count--
          bot.inventory.updateSlot(slot, item.count > 0 ? item : null!)
        }
        break
      }
      case 'general.dropStack': {
        if (bot.heldItem) {
          void bot.tossStack(bot.heldItem)
        }
        break
      }
      case 'general.chat':
        showModal({ reactType: 'chat' })
        break
      case 'general.command':
        chatInputValueGlobal.value = '/'
        showModal({ reactType: 'chat' })
        break
      case 'general.selectItem':
        if (isSpectatingEntity()) break
        void selectItem()
        break
      case 'general.nextHotbarSlot':
        if (isSpectatingEntity()) break
        cycleHotbarSlot(1)
        break
      case 'general.prevHotbarSlot':
        if (isSpectatingEntity()) break
        cycleHotbarSlot(-1)
        break
      case 'general.zoom':
        break
      case 'general.viewerConsole':
        if (lastConnectOptions.value?.viewerWsConnect) {
          showModal({ reactType: 'console' })
        }
        break
    }
  }

  if (command === 'ui.toggleFullscreen') {
    void goFullscreen(true)
  }
})

// show-hide Fullmap
contro.on('trigger', ({ command }) => {
  if (command !== 'ui.toggleMap') return
  const isActive = isGameActive(true)
  if (activeModalStack.at(-1)?.reactType === 'full-map') {
    miscUiState.displayFullmap = false
    hideModal({ reactType: 'full-map' })
  } else if (isActive && !activeModalStack.length) {
    miscUiState.displayFullmap = true
    showModal({ reactType: 'full-map' })
  }
})

contro.on('release', ({ command }) => {
  if (isCommandDisabled(command)) return

  onTriggerOrReleased(command, false)
})

// hard-coded keybindings

export const f3Keybinds: Array<{
  key?: string,
  action: () => void | Promise<void>,
  mobileTitle: string
  enabled?: () => boolean
}> = [
  {
    key: 'KeyA',
    action () {
      //@ts-expect-error
      const loadedChunks = Object.entries(worldView.loadedChunks).filter(([, v]) => v).map(([key]) => key.split(',').map(Number))
      for (const [x, z] of loadedChunks) {
        worldView!.unloadChunk({ x, z })
      }
      // for (const child of viewer.scene.children) {
      //   if (child.name === 'chunk') { // should not happen
      //     viewer.scene.remove(child)
      //     console.warn('forcefully removed chunk from scene')
      //   }
      // }
      if (localServer) {
        //@ts-expect-error not sure why it is private... maybe revisit api?
        localServer.players[0].world.columns = {}
      }
      void reloadChunks()
      if (appViewer.backend?.backendMethods && typeof appViewer.backend.backendMethods.reloadWorld === 'function') {
        appViewer.backend.backendMethods.reloadWorld()
      }
    },
    mobileTitle: 'Reload chunks',
  },
  {
    key: 'KeyG',
    action () {
      options.showChunkBorders = !options.showChunkBorders
    },
    mobileTitle: 'Toggle chunk borders',
  },
  {
    key: 'KeyH',
    action () {
      showModal({ reactType: 'chunks-debug' })
    },
    mobileTitle: 'Show Chunks Debug',
  },
  {
    action () {
      showModal({ reactType: 'renderer-debug' })
    },
    mobileTitle: 'Renderer Debug Menu',
  },
  {
    key: 'KeyY',
    async action () {
      // waypoints
      const widgetNames = widgets.map(widget => widget.name)
      const widget = await showOptionsModal('Open Widget', widgetNames)
      if (!widget) return
      showModal({ reactType: `widget-${widget}` })
    },
    mobileTitle: 'Open Widget'
  },
  {
    key: 'KeyT',
    async action () {
      // TODO!
      if (resourcePackState.resourcePackInstalled || gameAdditionalState.usingServerResourcePack) {
        showNotification('Reloading textures...')
        await completeResourcepackPackInstall('default', 'default', gameAdditionalState.usingServerResourcePack, createNotificationProgressReporter())
      }
    },
    mobileTitle: 'Reload Textures'
  },
  {
    key: 'F4',
    async action () {
      let nextGameMode: GameMode
      switch (bot.game.gameMode) {
        case 'creative': {
          nextGameMode = 'survival'

          break
        }
        case 'survival': {
          nextGameMode = 'adventure'

          break
        }
        case 'adventure': {
          nextGameMode = 'spectator'

          break
        }
        case 'spectator': {
          nextGameMode = 'creative'

          break
        }
      // No default
      }
      if (lastConnectOptions.value?.worldStateFileContents) {
        switchGameMode(nextGameMode)
      } else {
        bot.chat(`/gamemode ${nextGameMode}`)
      }
    },
    mobileTitle: 'Cycle Game Mode'
  },
  {
    key: 'KeyP',
    async action () {
      const { uuid, ping: playerPing, username } = bot.player
      const proxyPing = await bot['pingProxy']()
      void showOptionsModal(`${username}: last known total latency (ping): ${playerPing}. Connected to ${lastConnectOptions.value?.proxy} with current ping ${proxyPing}. Player UUID: ${uuid}`, [])
    },
    mobileTitle: 'Show Player & Ping Details',
    enabled: () => !lastConnectOptions.value?.singleplayer && !!bot.player
  },
  {
    action () {
      void copyServerResourcePackToRegular()
    },
    mobileTitle: 'Copy Server Resource Pack',
    enabled: () => !!gameAdditionalState.usingServerResourcePack
  }
]

export const reloadChunksAction = () => {
  const action = f3Keybinds.find(f3Keybind => f3Keybind.key === 'KeyA')
  void action!.action()
}

document.addEventListener('keydown', (e) => {
  if (!isGameActive(false)) return
  if (contro.pressedKeys.has('F3')) {
    const keybind = f3Keybinds.find((v) => v.key === e.code)
    if (keybind && (keybind.enabled?.() ?? true)) {
      void keybind.action()
      e.stopPropagation()
    }
  }
}, {
  capture: true,
})

const isFlying = () => (bot.entity as any).flying

const startFlying = (sendAbilities = true) => {
  if (sendAbilities) {
    bot._client.write('abilities', {
      flags: 2,
    })
  }
  (bot.entity as any).flying = true
}

const endFlying = (sendAbilities = true) => {
  if (!isFlying()) return
  if (sendAbilities) {
    bot._client.write('abilities', {
      flags: 0,
    })
  }
  (bot.entity as any).flying = false
}

export const onBotCreate = () => {
}

const toggleFly = (newState = !isFlying(), sendAbilities?: boolean) => {
  if (!bot.entity.canFly) return

  if (newState) {
    startFlying(sendAbilities)
  } else {
    endFlying(sendAbilities)
  }
  gameAdditionalState.isFlying = isFlying()
}

const selectItem = async () => {
  const block = bot.blockAtCursor(5)
  if (!block) return
  const itemId = getItemFromBlock(block)?.id
  if (!itemId) return
  const Item = require('prismarine-item')(bot.version)
  const item = new Item(itemId, 1, 0)
  await bot.creative.setInventorySlot(bot.inventory.hotbarStart + bot.quickBarSlot, item)
  bot.updateHeldItem()
}

addEventListener('mousedown', async (e) => {
  // always prevent default for side buttons (back / forward navigation)
  if (e.button === 3 || e.button === 4) {
    e.preventDefault()
  }

  if ((e.target as HTMLElement).matches?.('#VRButton')) return
  if (!isInRealGameSession() && !(e.target as HTMLElement).id.includes('ui-root')) return
  void pointerLock.requestPointerLock()
  if (!bot) return
  getThreeJsRendererMethods()?.onPageInteraction()
  // wheel click
  // todo support ctrl+wheel (+nbt)
  if (e.button === 1) {
    await selectItem()
  }
})

window.addEventListener('keydown', (e) => {
  if (e.code !== 'Escape') return
  if (!activeModalStack.length) {
    getThreeJsRendererMethods()?.onPageInteraction()
  }

  if (activeModalStack.length) {
    const hideAll = e.ctrlKey || e.metaKey
    if (hideAll) {
      hideAllModals()
    } else {
      hideCurrentModal()
    }
    if (activeModalStack.length === 0) {
      getThreeJsRendererMethods()?.onPageInteraction()
      pointerLock.justHitEscape = true
    }
  } else if (pointerLock.hasPointerLock) {
    document.exitPointerLock?.()
    if (options.autoExitFullscreen) {
      void document.exitFullscreen()
    }
  } else {
    document.dispatchEvent(new Event('pointerlockchange'))
  }
})

window.addEventListener('keydown', (e) => {
  if (e.code !== 'F2' || e.repeat || !isGameActive(true)) return
  e.preventDefault()
  const canvas = document.getElementById('viewer-canvas') as HTMLCanvasElement
  if (!canvas) return
  const link = document.createElement('a')
  link.href = canvas.toDataURL('image/png')
  const date = new Date()
  link.download = `screenshot ${date.toLocaleString().replaceAll('.', '-').replace(',', '')}.png`
  link.click()
})

window.addEventListener('keydown', (e) => {
  if (e.code !== 'F1' || e.repeat || !isGameActive(true)) return
  e.preventDefault()
  miscUiState.showUI = !miscUiState.showUI
})

// #region experimental debug things
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyL' && e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
    console.clear()
  }
  if (e.code === 'KeyK' && e.altKey && e.shiftKey && !e.ctrlKey && !e.metaKey) {
    if (sessionStorage.delayLoadUntilFocus) {
      sessionStorage.removeItem('delayLoadUntilFocus')
    } else {
      sessionStorage.setItem('delayLoadUntilFocus', 'true')
    }
  }
  if (e.code === 'KeyK' && e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
    // eslint-disable-next-line no-debugger
    debugger
  }
})
// #endregion

export function updateBinds (commands: any) {
  contro.inputSchema.commands.custom = Object.fromEntries(Object.entries(commands?.custom ?? {}).map(([key, value]) => {
    return [key, {
      keys: [],
      gamepad: [],
      type: '',
      inputs: []
    }]
  }))

  for (const [group, actions] of Object.entries(commands)) {
    contro.userConfig![group] = Object.fromEntries(Object.entries(actions).map(([key, value]) => {
      const newValue = {
        keys: value?.keys ?? undefined,
        gamepad: value?.gamepad ?? undefined,
      }

      if (group === 'custom') {
        newValue['type'] = (value).type
        newValue['inputs'] = (value).inputs
      }

      return [key, newValue]
    }))
  }
}

export const onF3LongPress = async () => {
  const actions = f3Keybinds.filter(f3Keybind => {
    return f3Keybind.mobileTitle && (f3Keybind.enabled?.() ?? true)
  })
  const actionNames = actions.map(f3Keybind => {
    return `${f3Keybind.mobileTitle}${f3Keybind.key ? ` (F3+${f3Keybind.key})` : ''}`
  })
  const select = await showOptionsModal('', actionNames)
  if (!select) return
  const actionIndex = actionNames.indexOf(select)
  const f3Keybind = actions[actionIndex]!
  void f3Keybind.action()
}

export const handleMobileButtonCustomAction = (action: CustomAction) => {
  const handler = customCommandsConfig[action.type]?.handler
  if (handler) {
    handler([...action.input])
  }
}

export const triggerCommand = (command: Command, isDown: boolean) => {
  handleMobileButtonActionCommand(command, isDown)
}

export const handleMobileButtonActionCommand = (command: ActionType | ActionHoldConfig, isDown: boolean) => {
  const commandValue = typeof command === 'string' ? command : 'command' in command ? command.command : command

  // Check if command is disabled before proceeding
  if (typeof commandValue === 'string' && isCommandDisabled(commandValue as Command)) return

  if (typeof commandValue === 'string' && !stringStartsWith(commandValue, 'custom')) {
    const event: CommandEventArgument<typeof contro['_commandsRaw']> = {
      command: commandValue as Command,
      schema: {
        keys: [],
        gamepad: []
      }
    }
    if (isDown) {
      contro.emit('trigger', event)
    } else {
      contro.emit('release', event)
    }
  } else if (typeof commandValue === 'object') {
    if (isDown) {
      handleMobileButtonCustomAction(commandValue)
    }
  }
}

export const handleMobileButtonLongPress = (actionHold: ActionHoldConfig) => {
  if (typeof actionHold.longPressAction === 'string' && actionHold.longPressAction === 'general.debugOverlayHelpMenu') {
    void onF3LongPress()
  } else if (actionHold.longPressAction) {
    handleMobileButtonActionCommand(actionHold.longPressAction, true)
  }
}
