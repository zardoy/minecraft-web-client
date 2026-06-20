import EventEmitter from 'events'

window.reportError = window.reportError ?? console.error
window.bot = undefined
window.THREE = undefined
window.localServer = undefined
window.worldView = undefined
window.viewer = undefined // legacy
window.appViewer = undefined
window.loadedData = undefined
window.customEvents = new EventEmitter()
window.customEvents.setMaxListeners(10_000)
window.translate = key => {
  if (typeof key !== 'string') return key
  return window.translateText?.(key) ?? key
}
