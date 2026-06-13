import { useRef, useEffect } from 'react'
import { subscribe, useSnapshot } from 'valtio'
import { useUtilsEffect } from '@zardoy/react-util'
import { getThreeJsRendererMethods } from 'minecraft-renderer/src/three/threeJsMethods'
import { isItemActivatableMobile } from 'mineflayer-mouse/dist/activatableItemsMobile'
import { options } from '../optionsStorage'
import { activeModalStack, isGameActive, miscUiState } from '../globalState'
import { onCameraMove, CameraMoveEvent } from '../cameraRotationControls'
import { pointerLock, isInRealGameSession } from '../utils'
import { videoCursorInteraction } from '../customChannels'
import { handleMovementStickDelta, joystickPointer } from './TouchAreasControls'

/** after what time of holding the finger start breaking the block */
const touchStartBreakingBlockMs = 500

function GameInteractionOverlayInner ({
  zIndex,
  setJoystickOrigin,
  updateJoystick
}: {
  zIndex: number,
  setJoystickOrigin: (e: PointerEvent | null) => void
  updateJoystick: (e: PointerEvent) => void
}) {
  const overlayRef = useRef<HTMLDivElement>(null)


  useUtilsEffect(({ signal }) => {
    if (!overlayRef.current) return

    const cameraControlEl = overlayRef.current
    let virtualClickActive = false
    let virtualClickTimeout: NodeJS.Timeout | undefined
    let screenTouches = 0
    const capturedPointer = {
      active: null as {
        id: number;
        x: number;
        y: number;
        sourceX: number;
        sourceY: number;
        activateCameraMove: boolean;
        time: number
      } | null
    }

    const pointerDownHandler = (e: PointerEvent) => {
      const clickedEl = e.composedPath()[0]
      if (!isGameActive(true) || clickedEl !== cameraControlEl || e.pointerId === undefined) {
        return
      }
      getThreeJsRendererMethods()?.onPageInteraction()
      screenTouches++
      if (screenTouches === 3) {
        // todo maybe mouse wheel click?
      }
      const usingModernMovement = options.touchMovementType === 'modern'
      if (usingModernMovement) {
        if (!joystickPointer.pointer && e.clientX < window.innerWidth / 2) {
          cameraControlEl.setPointerCapture(e.pointerId)
          setJoystickOrigin(e)
          return
        }
      }
      if (capturedPointer.active) {
        return
      }
      cameraControlEl.setPointerCapture(e.pointerId)
      capturedPointer.active = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        sourceX: e.clientX,
        sourceY: e.clientY,
        activateCameraMove: false,
        time: Date.now()
      }
      if (options.touchInteractionType === 'classic') {
        virtualClickTimeout ??= setTimeout(() => {
          virtualClickActive = true
          // If held item is activatable, use right click instead of left
          const heldItemName = bot?.heldItem?.name
          const isOnlyActivatable = heldItemName && isItemActivatableMobile(heldItemName, loadedData)
          document.dispatchEvent(new MouseEvent('mousedown', { button: isOnlyActivatable ? 2 : 0 }))
        }, touchStartBreakingBlockMs)
      }
    }

    const pointerMoveHandler = (e: PointerEvent) => {
      if (e.pointerId === undefined) return
      const scale = window.visualViewport?.scale || 1

      const supportsPressure = (e as any).pressure !== undefined &&
        (e as any).pressure !== 0 &&
        (e as any).pressure !== 0.5 &&
        (e as any).pressure !== 1 &&
        (e.pointerType === 'touch' || e.pointerType === 'pen')

      if (e.pointerId === joystickPointer.pointer?.pointerId) {
        updateJoystick(e)
        if (supportsPressure && (e as any).pressure > 0.5) {
          bot.setControlState('sprint', true)
        }
        return
      }
      if (e.pointerId !== capturedPointer.active?.id) return
      // window.scrollTo(0, 0)
      e.preventDefault()
      e.stopPropagation()

      const allowedJitter = 1.1
      if (supportsPressure) {
        bot.setControlState('jump', (e as any).pressure > 0.5)
      }

      // Adjust coordinates for scale
      const currentX = e.clientX / scale
      const currentY = e.clientY / scale
      const sourceX = capturedPointer.active.sourceX / scale
      const sourceY = capturedPointer.active.sourceY / scale
      const lastX = capturedPointer.active.x / scale
      const lastY = capturedPointer.active.y / scale

      const xDiff = Math.abs(currentX - sourceX) > allowedJitter
      const yDiff = Math.abs(currentY - sourceY) > allowedJitter

      if (!capturedPointer.active.activateCameraMove && (xDiff || yDiff)) {
        capturedPointer.active.activateCameraMove = true
      }
      if (capturedPointer.active.activateCameraMove) {
        clearTimeout(virtualClickTimeout)
      }

      onCameraMove({
        movementX: (currentX - lastX),
        movementY: (currentY - lastY),
        type: 'touchmove',
        stopPropagation: () => e.stopPropagation()
      } as CameraMoveEvent)

      capturedPointer.active.x = e.clientX
      capturedPointer.active.y = e.clientY
    }

    const pointerUpHandler = (e: PointerEvent) => {
      if (e.pointerId === undefined) return
      if (e.pointerId === joystickPointer.pointer?.pointerId) {
        setJoystickOrigin(null)
        return
      }
      if (e.pointerId !== capturedPointer.active?.id) return
      clearTimeout(virtualClickTimeout)
      virtualClickTimeout = undefined

      if (virtualClickActive) {
        // button 0 is left click
        // If held item is activatable, use right click instead of left
        const heldItemName = bot?.heldItem?.name
        const isOnlyActivatable = heldItemName && isItemActivatableMobile(heldItemName, loadedData)
        document.dispatchEvent(new MouseEvent('mouseup', { button: isOnlyActivatable ? 2 : 0 }))
        virtualClickActive = false
      } else if (!capturedPointer.active.activateCameraMove && (Date.now() - capturedPointer.active.time < touchStartBreakingBlockMs)) {
        // single click action
        const MOUSE_BUTTON_RIGHT = 2
        const MOUSE_BUTTON_LEFT = 0
        const heldItemName = bot?.heldItem?.name
        const isOnlyActivatable = heldItemName && isItemActivatableMobile(heldItemName, loadedData)
        const gonnaAttack = !!bot.mouse.getCursorState().entity || !!videoCursorInteraction()
        // If not attacking entity and item is activatable, use right click for breaking
        const useButton = !gonnaAttack && isOnlyActivatable ? MOUSE_BUTTON_RIGHT : (gonnaAttack ? MOUSE_BUTTON_LEFT : MOUSE_BUTTON_RIGHT)
        document.dispatchEvent(new MouseEvent('mousedown', { button: useButton }))
        bot.mouse.update()
        document.dispatchEvent(new MouseEvent('mouseup', { button: useButton }))
      }

      if (screenTouches > 0) {
        screenTouches--
      }
      capturedPointer.active = null
    }

    const contextMenuHandler = (e: Event) => {
      e.preventDefault()
    }

    const blurHandler = () => {
      bot.clearControlStates()
    }

    cameraControlEl.addEventListener('pointerdown', pointerDownHandler, { signal })
    cameraControlEl.addEventListener('pointermove', pointerMoveHandler, { signal })
    cameraControlEl.addEventListener('pointerup', pointerUpHandler, { signal })
    cameraControlEl.addEventListener('pointercancel', pointerUpHandler, { signal })
    cameraControlEl.addEventListener('lostpointercapture', pointerUpHandler, { signal })
    cameraControlEl.addEventListener('contextmenu', contextMenuHandler, { signal })
    window.addEventListener('blur', blurHandler, { signal })

    // Add zoom detection and reset
    const detectAndResetZoom = () => {
      const { visualViewport } = window
      if (!visualViewport) return

      if (visualViewport.scale !== 1) {
        // Reset zoom by updating viewport meta tag
        const viewport = document.querySelector('meta[name=viewport]')
        if (viewport) {
          viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
          // Force re-layout
          setTimeout(() => {
            viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
          }, 300)
        }
      }
    }

    // Listen for zoom changes
    window.visualViewport?.addEventListener('resize', detectAndResetZoom, { signal })
    detectAndResetZoom()

    // Prevent zoom gestures
    document.addEventListener('gesturestart', (e) => e.preventDefault(), { signal })
    document.addEventListener('gesturechange', (e) => e.preventDefault(), { signal })
    document.addEventListener('gestureend', (e) => e.preventDefault(), { signal })


    // Debug method to simulate zoom
    window.debugSimulateZoom = (scale = 1.1, x = 0, y = 0) => {
      const viewport = document.querySelector('meta[name=viewport]')
      if (viewport) {
        viewport.setAttribute('content', `width=device-width, initial-scale=${scale}, user-scalable=no, viewport-fit=cover, transform-origin: ${x}px ${y}px`)
      }
      // This will trigger the visualViewport resize event
      setTimeout(() => {
        window.visualViewport?.dispatchEvent(new Event('resize'))
      }, 100)
    }

    // Debug method to reset zoom
    window.debugResetZoom = () => {
      const viewport = document.querySelector('meta[name=viewport]')
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
      }
      setTimeout(() => {
        window.visualViewport?.dispatchEvent(new Event('resize'))
      }, 100)
    }

    signal.addEventListener('abort', () => {
      setJoystickOrigin(null)
    })
  }, [setJoystickOrigin])

  return (
    <OverlayElement divRef={overlayRef} zIndex={zIndex} />
  )


}

const OverlayElement = ({ divRef, zIndex }: { divRef: React.RefObject<HTMLDivElement>, zIndex: number }) => {
  return <div
    className='game-interaction-overlay'
    ref={divRef}
    style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex,
      touchAction: 'none',
      userSelect: 'none'
    }}
  />
}

export default function GameInteractionOverlay ({ zIndex }: { zIndex: number }) {
  const modalStack = useSnapshot(activeModalStack)
  const { currentTouch } = useSnapshot(miscUiState)

  const setJoystickOrigin = useRef((e: PointerEvent | null) => {
    if (!e) {
      handleMovementStickDelta()
      joystickPointer.pointer = null
      return
    }

    joystickPointer.pointer = {
      pointerId: e.pointerId,
      x: e.clientX,
      y: e.clientY
    }
  }).current

  const updateJoystick = useRef((e: PointerEvent) => {
    handleMovementStickDelta(e)
  }).current

  if (modalStack.length > 0 || !currentTouch) return null
  return <GameInteractionOverlayInner
    zIndex={zIndex}
    setJoystickOrigin={setJoystickOrigin}
    updateJoystick={updateJoystick}
  />

}

subscribe(activeModalStack, () => {
  if (activeModalStack.length === 0) {
    if (isInRealGameSession()) {
      void pointerLock.requestPointerLock()
    }
  } else {
    document.exitPointerLock?.()
  }
})
