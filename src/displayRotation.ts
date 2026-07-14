import { subscribeKey } from 'valtio/utils'
import { miscUiState } from './globalState'
import { options } from './optionsStorage'

const STORAGE_KEY = 'displayRotationEnabled'

export const isPortraitViewport = () => window.innerWidth < window.innerHeight

export const isMobilePortraitViewport = () => miscUiState.currentTouch === true && isPortraitViewport()

const loadDisplayRotationPreference = () => {
  try {
    miscUiState.displayRotationEnabled = sessionStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    // ignore
  }
}

export const setDisplayRotationEnabled = (enabled: boolean) => {
  miscUiState.displayRotationEnabled = enabled
  try {
    sessionStorage.setItem(STORAGE_KEY, enabled ? '1' : '0')
  } catch {
    // ignore
  }
  syncBodyDisplayRotation()
}

/** `body.rotated` when user enabled rotation (or auto option) and viewport is portrait. */
export const syncBodyDisplayRotation = () => {
  const portrait = isPortraitViewport()
  miscUiState.viewportPortrait = portrait
  const active = portrait && (options.autoDisplayRotation || miscUiState.displayRotationEnabled)
  const wasActive = document.body.classList.contains('rotated')
  document.body.classList.toggle('rotated', active)
  if (active && (window.scrollX || window.scrollY)) {
    window.scrollTo(0, 0)
  }
  // Notify canvas/layout only when rotation state changes — avoid resize ↔ sync loop.
  if (wasActive !== active) {
    window.dispatchEvent(new Event('resize'))
  }
}

loadDisplayRotationPreference()
syncBodyDisplayRotation()
window.addEventListener('resize', syncBodyDisplayRotation)
subscribeKey(options, 'autoDisplayRotation', syncBodyDisplayRotation)
