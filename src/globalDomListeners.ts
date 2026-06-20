import { saveServer } from './flyingSquidUtils'
import { isGameActive, activeModalStack } from './globalState'
import { options } from './optionsStorage'
import { isInRealGameSession } from './utils'

window.addEventListener('unload', e => {
  if (!window.justReloaded) {
    sessionStorage.justReloaded = false
  }
  void saveServer()
})

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') void saveServer()
})
document.addEventListener('blur', () => {
  void saveServer()
})

window.addEventListener('beforeunload', event => {
  if (!window.justReloaded) {
    sessionStorage.justReloaded = false
  }

  // todo-low maybe exclude chat?
  if (!isGameActive(true) && activeModalStack.at(-1)?.elem?.id !== 'chat') return
  if (sessionStorage.lastReload && !options.preventDevReloadWhilePlaying) return
  if (!options.closeConfirmation) return
  if (!isInRealGameSession()) return

  // For major browsers doning only this is enough
  event.preventDefault()

  // Display a confirmation prompt
  event.returnValue = '' // Required for some browsers
  return 'The game is running. Are you sure you want to close this page?'
})

window.addEventListener('contextmenu', e => {
  const ALLOW_TAGS = ['INPUT', 'TEXTAREA', 'A']
  // allow if target is in ALLOW_TAGS or has selection text
  if (ALLOW_TAGS.includes((e.target as HTMLElement)?.tagName) || window.getSelection()?.toString()) {
    return
  }
  e.preventDefault()
})
