import { miscUiState } from '../globalState'
import { options } from '../optionsStorage'
import { progressNotificationsProxy, setNotificationProgress } from '../react/NotificationProvider'

const loadingChunksProgress = () => {
  let gameStopped = false

  const checkStartProgress = () => {
    if (!bot.entity || !options.displayLoadingMessages) return

    let lastChunksLoaded = {
      count: 0,
      time: 0,
    }
    const update = () => {
      if (!appViewer) return
      const chunksTotal = appViewer.nonReactiveState.world.chunksTotalNumber
      if (chunksTotal === 0) return

      const currentChunksLoaded = appViewer.rendererState.world.chunksLoaded.size

      const deleteProgress = () => {
        setNotificationProgress('loadingChunks', {
          delete: true,
        })
        clearInterval(intervalId)
      }

      if (appViewer.rendererState.world.allChunksLoaded || gameStopped) {
        deleteProgress()
        return
      }

      if (currentChunksLoaded === lastChunksLoaded.count && lastChunksLoaded.count) {
        if (Date.now() - lastChunksLoaded.time > 1000 * 5) {
          deleteProgress()
          return
        }
      } else {
        lastChunksLoaded = {
          count: currentChunksLoaded,
          time: Date.now(),
        }
      }

      setNotificationProgress('loadingChunks', {
        message: 'Loading world chunks',
        current: currentChunksLoaded,
        total: chunksTotal,
        priority: 1,
      })
    }

    const intervalId = setInterval(update, 500)
    update()
  }

  const startInventoryTexturesProgress = () => {
    if (!miscUiState.gameLoaded) return
    setNotificationProgress('inventoryTextures', {
      message: 'Processing GUI textures',
    })
  }

  customEvents.on('gameLoaded', () => {
    checkStartProgress()
    if (!appViewer.resourcesManager.currentResources?.guiAtlas) {
      startInventoryTexturesProgress()
    }

    bot._client.on('login', () => {
      checkStartProgress()
    })
    bot._client.on('respawn', () => {
      checkStartProgress()
    })

    bot.on('end', () => {
      gameStopped = true
      // remove all progress notifications
      progressNotificationsProxy.loaders = []
    })
  })

  appViewer.resourcesManager.on('assetsInventoryStarted', () => {
    startInventoryTexturesProgress()
  })
  appViewer.resourcesManager.on('assetsInventoryReady', () => {
    setNotificationProgress('inventoryTextures', {
      delete: true,
    })
  })
}

setTimeout(() => {
  loadingChunksProgress()
})
