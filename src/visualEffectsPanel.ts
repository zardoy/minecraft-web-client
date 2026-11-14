import { appViewer } from './appViewer'
import { miscUiState } from './globalState'
import { pointerLock } from './utils'

/** The panel needs a free mouse. Losing pointer lock normally opens the pause screen, so it is suppressed meanwhile. */
let suppressedEscapeMenu = false

export const openVisualEffectsPanel = () => {
  miscUiState.showVisualEffectsPanel = true
  if (!appViewer.rendererState.preventEscapeMenu) {
    appViewer.rendererState.preventEscapeMenu = true
    suppressedEscapeMenu = true
  }
  document.exitPointerLock?.()
}

export const closeVisualEffectsPanel = () => {
  miscUiState.showVisualEffectsPanel = false
  if (suppressedEscapeMenu) {
    appViewer.rendererState.preventEscapeMenu = false
    suppressedEscapeMenu = false
  }
  void pointerLock.requestPointerLock()
}

/**
 * One key does it all: show the panel and free the mouse; when the mouse is captured again (clicked the world to look
 * around with the changes live) free it once more; when it is already free hide the panel.
 */
export const toggleVisualEffectsPanel = () => {
  if (!miscUiState.showVisualEffectsPanel) {
    openVisualEffectsPanel()
  } else if (pointerLock.hasPointerLock) {
    document.exitPointerLock?.()
  } else {
    closeVisualEffectsPanel()
  }
}
