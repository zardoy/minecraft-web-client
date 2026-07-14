import { subscribeKey } from 'valtio/utils'
import { createGraphicsBackendSingleThread, createGraphicsBackendOffThread } from 'minecraft-renderer/src'
import { beforeRenderFrame } from './beforeRenderFrame'
import { options } from './optionsStorage'
import { appViewer, modalStackUpdateChecks } from './appViewer'
import { miscUiState } from './globalState'
import { watchOptionsAfterViewerInit } from './watchOptions'
import { showNotification } from './react/NotificationProvider'

export const appGraphicBackends = [
  createGraphicsBackendSingleThread,
  createGraphicsBackendOffThread,
]

export const getCurrentGraphicsBackend = () => {
  const id = options.activeRenderer === 'auto' ? appGraphicBackends[0].id : options.activeRenderer

  const backend = appGraphicBackends.find(backend => backend.id === id)
  return {
    id,
    name: backend?.displayName ?? id ?? '<not selected>',
    backend,
    noFallback: options.activeRenderer
  }
}

const loadBackend = async () => {
  let { backend, noFallback } = getCurrentGraphicsBackend()
  if (!backend && !noFallback) {
    showNotification(`No backend found for renderer ${options.activeRenderer}`, `Falling back to ${appGraphicBackends[0].id}`, true)
    backend = appGraphicBackends[0]
  }
  if (appViewer.backend) {
    appViewer.disconnectBackend()
  }
  if (backend) {
    await appViewer.loadBackend(backend)
  }
  modalStackUpdateChecks()
}
window.loadBackend = loadBackend

export const appLoadBackend = async () => {
  if (process.env.SINGLE_FILE_BUILD_MODE) {
    const unsub = subscribeKey(miscUiState, 'fsReady', () => {
      if (miscUiState.fsReady) {
        // don't do it earlier to load fs and display menu faster
        void loadBackend()
        unsub()
      }
    })
  } else {
    setTimeout(() => {
      void loadBackend()
    })
  }

  watchOptionsAfterViewerInit()

  // reset backend when renderer changes
  subscribeKey(options, 'activeRenderer', async () => {
    if (appViewer.currentDisplay === 'world' && bot) {
      appViewer.resetBackend(true)
      await loadBackend()
      const { renderDistance } = options
      void appViewer.startWithBot(bot, renderDistance)
    }
  })
}

const animLoop = () => {
  for (const fn of beforeRenderFrame) fn()
  requestAnimationFrame(animLoop)
}
requestAnimationFrame(animLoop)
