import { Command, contro } from '../controls'
import { hideAllModals, hideCurrentModal, miscUiState } from '../globalState'
import { gamepadUiCursorState, moveGamepadCursorByPx } from '../react/GamepadUiCursor'

let lastHoveredElement: HTMLElement | null = null

contro.on('movementUpdate', ({ vector, soleVector, gamepadIndex }) => {
  if (gamepadIndex !== undefined && gamepadUiCursorState.display) {
    const deadzone = 0.1 // TODO make deadzone configurable
    if (Math.abs(soleVector.x) < deadzone && Math.abs(soleVector.z) < deadzone) {
      return
    }
    moveGamepadCursorByPx(soleVector.x, true)
    moveGamepadCursorByPx(soleVector.z, false)
    emitMousemove()
    trackHoveredElement()
  }
})

const emitMousemove = () => {
  const { x, y } = gamepadUiCursorState
  const xAbs = x / 100 * window.innerWidth
  const yAbs = y / 100 * window.innerHeight
  const element = document.elementFromPoint(xAbs, yAbs) as HTMLElement | null
  if (!element) return
  element.dispatchEvent(new MouseEvent('mousemove', {
    clientX: xAbs,
    clientY: yAbs
  }))
}

const trackHoveredElement = () => {
  const { x, y } = gamepadUiCursorState
  const xAbs = x / 100 * window.innerWidth
  const yAbs = y / 100 * window.innerHeight
  const element = document.elementFromPoint(xAbs, yAbs) as HTMLElement | null

  if (element !== lastHoveredElement) {
    // Emit mouseout for previous element
    if (lastHoveredElement) {
      const mouseoutEvent = new MouseEvent('mouseout', {
        bubbles: true,
        clientX: xAbs,
        clientY: yAbs
      }) as any
      mouseoutEvent.isGamepadCursor = true
      lastHoveredElement.dispatchEvent(mouseoutEvent)
    }

    // Emit mouseover for new element
    if (element) {
      const mouseoverEvent = new MouseEvent('mouseover', {
        bubbles: true,
        clientX: xAbs,
        clientY: yAbs
      }) as any
      mouseoverEvent.isGamepadCursor = true
      element.dispatchEvent(mouseoverEvent)
    }

    lastHoveredElement = element
  }
}

// Setup right stick scrolling and input value changing for UI mode
contro.on('stickMovement', ({ stick, vector }) => {
  if (stick !== 'right') return
  if (!gamepadUiCursorState.display) return

  let { x, z } = vector
  if (Math.abs(x) < 0.18) x = 0
  if (Math.abs(z) < 0.18) z = 0

  // Handle horizontal movement (for inputs)
  if (x !== 0) {
    emitGamepadInputChange(x, true)
  }

  // Handle vertical movement (for scrolling)
  if (z !== 0) {
    emulateGamepadScroll(z)
  }

  miscUiState.usingGamepadInput = true
})

// todo make also control with left/right

const emitGamepadInputChange = (x: number, isStickMovement: boolean) => {
  const cursorX = gamepadUiCursorState.x / 100 * window.innerWidth
  const cursorY = gamepadUiCursorState.y / 100 * window.innerHeight
  const element = document.elementFromPoint(cursorX, cursorY) as HTMLElement | null

  if (element) {
    // Emit custom event for input value change
    const customEvent = new CustomEvent('gamepadInputChange', {
      bubbles: true,
      detail: { direction: x > 0 ? 1 : -1, value: x, isStickMovement },
    })
    element.dispatchEvent(customEvent)
  }
}

const emulateGamepadScroll = (z: number) => {
  // Get element under cursor
  const cursorX = gamepadUiCursorState.x / 100 * window.innerWidth
  const cursorY = gamepadUiCursorState.y / 100 * window.innerHeight
  const element = document.elementFromPoint(cursorX, cursorY) as HTMLElement | null

  if (!element) return

  // Find the first scrollable parent
  const scrollableParent = findScrollableParent(element)

  if (scrollableParent) {
    // Scroll the container directly
    const scrollAmount = z * 30 // Adjust multiplier for scroll speed
    scrollableParent.scrollTop += scrollAmount
  }
}

const findScrollableParent = (element: HTMLElement | null): HTMLElement | null => {
  if (!element) return null

  // Check if current element is scrollable
  const isScrollable = (el: HTMLElement) => {
    const { overflowY } = window.getComputedStyle(el)
    const hasVerticalScroll = el.scrollHeight > el.clientHeight
    return hasVerticalScroll && (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay')
  }

  let current: HTMLElement | null = element

  // Traverse up the DOM tree to find scrollable parent
  while (current && current !== document.body) {
    if (isScrollable(current)) {
      return current
    }
    current = current.parentElement
  }

  // If no scrollable parent found, try scrolling the body/documentElement
  if (document.documentElement.scrollHeight > document.documentElement.clientHeight) {
    return document.documentElement
  }

  return null
}

globalThis.emulateGamepadScroll = emulateGamepadScroll

let lastClickedEl = null as HTMLElement | null
let lastClickedElTimeout: ReturnType<typeof setTimeout> | undefined

const inModalCommand = (command: Command, pressed: boolean) => {
  if (pressed && !gamepadUiCursorState.display) return

  if (pressed) {
    if (command === 'ui.back') {
      hideCurrentModal()
    }
    if (command === 'ui.pauseMenu') {
      // hide all modals
      hideAllModals()
    }
    if (command === 'ui.leftClick' || command === 'ui.rightClick') {
      emulateMouseClick(command === 'ui.rightClick')
    }
  }

  if (command === 'ui.speedupCursor') {
    gamepadUiCursorState.multiply = pressed ? 2 : 1
  }
}

contro.on('trigger', ({ command }) => {
  inModalCommand(command, true)
})

contro.on('release', ({ command }) => {
  inModalCommand(command, false)
})

export const emulateMouseClick = (isRightClick: boolean) => {
  // in percent
  const { x, y } = gamepadUiCursorState
  const xAbs = x / 100 * window.innerWidth
  const yAbs = y / 100 * window.innerHeight
  const el = document.elementFromPoint(xAbs, yAbs) as HTMLElement
  if (el) {
    if (el === lastClickedEl && !isRightClick) {
      el.dispatchEvent(new MouseEvent('dblclick', {
        bubbles: true,
        clientX: xAbs,
        clientY: yAbs
      }))
      return
    }
    el.dispatchEvent(new MouseEvent('mousedown', {
      button: isRightClick ? 2 : 0,
      bubbles: true,
      clientX: xAbs,
      clientY: yAbs
    }))
    el.dispatchEvent(new MouseEvent(isRightClick ? 'contextmenu' : 'click', {
      bubbles: true,
      clientX: xAbs,
      clientY: yAbs
    }))
    el.dispatchEvent(new MouseEvent('mouseup', {
      button: isRightClick ? 2 : 0,
      bubbles: true,
      clientX: xAbs,
      clientY: yAbs
    }))
    el.focus()
    lastClickedEl = el
    if (lastClickedElTimeout) clearTimeout(lastClickedElTimeout)
    lastClickedElTimeout = setTimeout(() => {
      lastClickedEl = null
    }, 500)
  }

}

globalThis.emulateMouseClick = emulateMouseClick
