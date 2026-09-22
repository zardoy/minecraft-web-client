// not all options are watched here

import { subscribeKey } from 'valtio/utils'
import { isMobile } from 'minecraft-renderer/src/lib/simpleUtils'
import {
  applyRendererEnableLighting,
  applyRendererWorldViewOptions,
  subscribeRendererOptions
} from 'minecraft-renderer/src/graphicsBackend/rendererOptionsSync'
import { WorldView } from 'minecraft-renderer/src/worldView/worldView'
import { options, watchValue } from './optionsStorage'
import { reloadChunks } from './utils'
import { miscUiState } from './globalState'
import { isCypress } from './standaloneUtils'
import { isSafari } from './react/utils'

subscribeKey(options, 'renderDistance', reloadChunks)

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
  subscribeRendererOptions(appViewer, options, {
    isSafari,
    isCypress: isCypress(),
    onRegisterFocusHandlers ({ onFocus, onBlur }) {
      window.addEventListener('focus', onFocus)
      window.addEventListener('blur', onBlur)
    },
  })

  // Volume — app-only (not in renderer sync)
  watchValue(options, o => {
    appViewer.inWorldRenderingConfig.volume = Math.max(o.volume / 100, 0)
  })

  subscribeKey(options, 'newVersionsLighting', () => {
    applyRendererEnableLighting(
      appViewer,
      options.newVersionsLighting,
      bot.supportFeature('blockStateId')
    )
  })

  customEvents.on('mineflayerBotCreated', () => {
    applyRendererEnableLighting(
      appViewer,
      options.newVersionsLighting,
      bot.supportFeature('blockStateId')
    )

    const updateRaining = () => {
      if (bot.isRaining !== undefined) {
        appViewer.inWorldRenderingConfig.isRaining = bot.isRaining
      }
    }

    updateRaining()

    //@ts-expect-error - weatherUpdate is not in the type definition yet
    bot.on('weatherUpdate', () => {
      updateRaining()
    })
    bot.on('rain', () => {
      updateRaining()
    })
  })
}

export const watchOptionsAfterWorldViewInit = (worldView: WorldView) => {
  watchValue(options, o => {
    if (!worldView) return
    applyRendererWorldViewOptions(appViewer, worldView, o)
  })
}
