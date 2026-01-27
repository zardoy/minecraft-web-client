// not all options are watched here

import { subscribeKey } from 'valtio/utils'
import { isMobile } from 'renderer/viewer/lib/simpleUtils'
import { WorldDataEmitter } from 'renderer/viewer/lib/worldDataEmitter'
import { setSkinsConfig } from 'renderer/viewer/lib/utils/skins'
import { options, watchValue } from './optionsStorage'
import { reloadChunks } from './utils'
import { miscUiState } from './globalState'
import { isCypress } from './standaloneUtils'

subscribeKey(options, 'renderDistance', reloadChunks)
subscribeKey(options, 'multiplayerRenderDistance', reloadChunks)

watchValue(options, o => {
  document.documentElement.style.setProperty('--chatScale', `${o.chatScale / 100}`)
  document.documentElement.style.setProperty('--chatWidth', `${o.chatWidth}px`)
  document.documentElement.style.setProperty('--chatHeight', `${o.chatHeight}px`)
  // gui scale is set in scaleInterface.ts
})
const updateTouch = (o) => {
  miscUiState.currentTouch = o.alwaysShowMobileControls || isMobile()
}
watchValue(options, updateTouch)
window.matchMedia('(pointer: coarse)').addEventListener('change', (e) => {
  updateTouch(options)
})

/** happens once */
export const watchOptionsAfterViewerInit = () => {
  watchValue(options, o => {
    appViewer.inWorldRenderingConfig.showChunkBorders = o.showChunkBorders
  })

  watchValue(options, o => {
    appViewer.inWorldRenderingConfig.mesherWorkers = o.lowMemoryMode ? 1 : o.numWorkers
  })

  watchValue(options, o => {
    appViewer.inWorldRenderingConfig.renderEntities = o.renderEntities
  })

  watchValue(options, o => {
    const { renderDebug } = o
    if (renderDebug === 'none' || isCypress()) {
      appViewer.config.statsVisible = 0
    } else if (o.renderDebug === 'basic') {
      appViewer.config.statsVisible = 1
    } else if (o.renderDebug === 'advanced') {
      appViewer.config.statsVisible = 2
    }
  })

  // Track window focus state and update FPS limit accordingly
  let windowFocused = true
  const updateFpsLimit = (o: typeof options) => {
    const backgroundFpsLimit = o.backgroundRendering
    const normalFpsLimit = o.frameLimit

    if (windowFocused) {
      appViewer.config.fpsLimit = normalFpsLimit || undefined
    } else if (backgroundFpsLimit === '5fps') {
      appViewer.config.fpsLimit = 5
    } else if (backgroundFpsLimit === '20fps') {
      appViewer.config.fpsLimit = 20
    } else {
      appViewer.config.fpsLimit = undefined
    }
  }

  window.addEventListener('focus', () => {
    windowFocused = true
    updateFpsLimit(options)
  })
  window.addEventListener('blur', () => {
    windowFocused = false
    updateFpsLimit(options)
  })

  watchValue(options, o => {
    updateFpsLimit(o)
  })

  watchValue(options, o => {
    appViewer.inWorldRenderingConfig.volume = Math.max(o.volume / 100, 0)
  })

  watchValue(options, o => {
    appViewer.inWorldRenderingConfig.vrSupport = o.vrSupport
    appViewer.inWorldRenderingConfig.vrPageGameRendering = o.vrPageGameRendering
    appViewer.inWorldRenderingConfig.enableDebugOverlay = o.rendererPerfDebugOverlay
  })

  watchValue(options, (o, isChanged) => {
    appViewer.inWorldRenderingConfig.clipWorldBelowY = o.clipWorldBelowY
    appViewer.inWorldRenderingConfig.extraBlockRenderers = !o.disableBlockEntityTextures
    appViewer.inWorldRenderingConfig.fetchPlayerSkins = o.loadPlayerSkins
    appViewer.inWorldRenderingConfig.highlightBlockColor = o.highlightBlockColor
    appViewer.inWorldRenderingConfig._experimentalSmoothChunkLoading = o.rendererSharedOptions._experimentalSmoothChunkLoading
    appViewer.inWorldRenderingConfig._renderByChunks = o.rendererSharedOptions._renderByChunks

    setSkinsConfig({ apiEnabled: o.loadPlayerSkins })
  })

  appViewer.inWorldRenderingConfig.smoothLighting = options.smoothLighting
  subscribeKey(options, 'smoothLighting', () => {
    appViewer.inWorldRenderingConfig.smoothLighting = options.smoothLighting
  })

  subscribeKey(options, 'newVersionsLighting', () => {
    appViewer.inWorldRenderingConfig.enableLighting = !bot.supportFeature('blockStateId') || options.newVersionsLighting
  })

  customEvents.on('mineflayerBotCreated', () => {
    appViewer.inWorldRenderingConfig.enableLighting = !bot.supportFeature('blockStateId') || options.newVersionsLighting
  })

  watchValue(options, o => {
    appViewer.inWorldRenderingConfig.starfield = o.starfieldRendering
  })

  watchValue(options, o => {
    appViewer.inWorldRenderingConfig.defaultSkybox = o.defaultSkybox
  })

  watchValue(options, o => {
    // appViewer.inWorldRenderingConfig.neighborChunkUpdates = o.neighborChunkUpdates
  })
}

export const watchOptionsAfterWorldViewInit = (worldView: WorldDataEmitter) => {
  watchValue(options, o => {
    if (!worldView) return
    worldView.keepChunksDistance = o.keepChunksDistance
    appViewer.inWorldRenderingConfig.renderEars = o.renderEars
    appViewer.inWorldRenderingConfig.showHand = o.showHand
    appViewer.inWorldRenderingConfig.viewBobbing = o.viewBobbing
    appViewer.inWorldRenderingConfig.dayCycle = o.dayCycleAndLighting
  })
}
