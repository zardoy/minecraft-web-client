import { getPlayerStateUtils } from 'minecraft-renderer/src'
import { contro } from './controls'
import { activeModalStack, isGameActive, miscUiState, showModal } from './globalState'
import { options } from './optionsStorage'
import { hideNotification, notificationProxy } from './react/NotificationProvider'
import { pointerLock } from './utils'
import { updateMotion, initMotionTracking } from './react/uiMotion'

let lastMouseMove: number

export type CameraMoveEvent = {
  movementX: number
  movementY: number
  type: string
  stopPropagation?: () => void
}

export function onCameraMove (e: MouseEvent | CameraMoveEvent) {
  if (!isGameActive(true)) return
  if (e.type === 'mousemove' && !document.pointerLockElement) return
  e.stopPropagation?.()
  if (getPlayerStateUtils(appViewer.playerState.reactive).isSpectatingEntity()) return
  const now = performance.now()
  // todo: limit camera movement for now to avoid unexpected jumps
  if (now - lastMouseMove < 4 && !options.preciseMouseInput) return
  lastMouseMove = now
  let { mouseSensX, mouseSensY } = options
  if (mouseSensY === -1) mouseSensY = mouseSensX
  moveCameraRawHandler({
    x: e.movementX * mouseSensX * 0.0001,
    y: e.movementY * mouseSensY * 0.0001
  })
  bot.mouse.update()
  updateMotion()
}

export const moveCameraRawHandler = ({ x, y }: { x: number; y: number }) => {
  const maxPitch = 0.5 * Math.PI
  const minPitch = -0.5 * Math.PI

  appViewer.lastCamUpdate = Date.now()

  // if (viewer.world.freeFlyMode) {
  //   // Update freeFlyState directly
  //   viewer.world.freeFlyState.yaw = (viewer.world.freeFlyState.yaw - x) % (2 * Math.PI)
  //   viewer.world.freeFlyState.pitch = Math.max(minPitch, Math.min(maxPitch, viewer.world.freeFlyState.pitch - y))
  //   return
  // }

  if (!bot?.entity) return
  const pitch = bot.entity.pitch - y
  void bot.look(bot.entity.yaw - x, Math.max(minPitch, Math.min(maxPitch, pitch)), true)
  appViewer.backend?.updateCamera(null, bot.entity.yaw, pitch)
}

window.addEventListener('mousemove', (e: MouseEvent) => {
  onCameraMove(e)
}, { capture: true })

export const onControInit = () => {
  contro.on('stickMovement', ({ stick, vector }) => {
    if (!isGameActive(true)) return
    if (stick !== 'right') return
    let { x, z } = vector
    if (Math.abs(x) < 0.18) x = 0
    if (Math.abs(z) < 0.18) z = 0
    onCameraMove({
      movementX: x * 10,
      movementY: z * 10,
      type: 'stickMovement',
      stopPropagation () {}
    } as CameraMoveEvent)
    miscUiState.usingGamepadInput = true
  })
}

function pointerLockChangeCallback () {
  if (appViewer.rendererState.preventEscapeMenu) return
  if (!pointerLock.hasPointerLock && activeModalStack.length === 0 && miscUiState.gameLoaded) {
    showModal({ reactType: 'pause-screen' })
  }
}

document.addEventListener('pointerlockchange', pointerLockChangeCallback, false)
