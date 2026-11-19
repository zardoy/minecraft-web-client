import { activeModalStack, hideModal, isGameActive, showModal } from './globalState'
import { pointerLock } from './utils'

export const VISUAL_EFFECTS_MODAL = 'visual-effects'

export const isVisualEffectsPanelOpen = () => activeModalStack.at(-1)?.reactType === VISUAL_EFFECTS_MODAL

export const openVisualEffectsPanel = () => {
  showModal({ reactType: VISUAL_EFFECTS_MODAL })
  // it is a modal now, so losing the pointer lock does not open the pause screen
  document.exitPointerLock?.()
}

export const closeVisualEffectsPanel = () => {
  hideModal({ reactType: VISUAL_EFFECTS_MODAL })
  if (activeModalStack.length === 0) void pointerLock.requestPointerLock()
}

/** F7: open it from the game, close it when it is open (Escape closes it too, like any modal). */
export const toggleVisualEffectsPanel = () => {
  if (isVisualEffectsPanelOpen()) closeVisualEffectsPanel()
  else if (isGameActive(true)) openVisualEffectsPanel()
}

// The controls library only prevents browser defaults outside of modals, and F7 is caret browsing in browsers.
// Capture phase, so it runs before anything else closes the panel in the same key press.
window.addEventListener(
  'keydown',
  e => {
    if (e.code === 'F7' && isVisualEffectsPanelOpen()) e.preventDefault()
  },
  true
)
