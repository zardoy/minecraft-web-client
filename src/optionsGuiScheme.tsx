import { useEffect, useRef, useState } from 'react'
import { useSnapshot } from 'valtio'
import { openURL } from 'renderer/viewer/lib/simpleUtils'
import { noCase } from 'change-case'
import { versionToNumber } from 'mc-assets/dist/utils'
import { gameAdditionalState, miscUiState, openOptionsMenu, showModal } from './globalState'
import { AppOptions, getChangedSettings, options, resetOptions } from './optionsStorage'
import Button from './react/Button'
import { OptionMeta, OptionSlider } from './react/OptionsItems'
import Slider from './react/Slider'
import { getScreenRefreshRate } from './utils'
import { setLoadingScreenStatus } from './appStatus'
import { openFilePicker, resetLocalStorage } from './browserfs'
import { completeResourcepackPackInstall, getResourcePackNames, resourcepackReload, resourcePackState, uninstallResourcePack } from './resourcePack'
import { downloadPacketsReplay, packetsRecordingState } from './packetsReplay/packetsReplayLegacy'
import { showInputsModal, showOptionsModal } from './react/SelectOption'
import { ClientMod, getAllMods, modsUpdateStatus } from './clientMods'
import supportedVersions from './supportedVersions.mjs'
import { getVersionAutoSelect } from './connect'
import { createNotificationProgressReporter } from './core/progressReporter'
import { customKeymaps } from './controls'
import { appStorage } from './react/appStorageProvider'
import { exportData, importData } from './core/importExport'

export const guiOptionsScheme: {
  [t in OptionsGroupType]: Array<{ [K in keyof AppOptions]?: Partial<OptionMeta<AppOptions[K]>> } & { custom? }>
} = {
  render: [
    {
      custom () {
        const frameLimitValue = useSnapshot(options).frameLimit
        const [frameLimitMax, setFrameLimitMax] = useState(null as number | null)

        return <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Slider
            style={{ width: 130 }}
            label='Frame Limit'
            disabledReason={frameLimitMax ? undefined : 'press lock button first'}
            unit={frameLimitValue ? 'fps' : ''}
            valueDisplay={frameLimitValue || 'VSync'}
            value={frameLimitValue || frameLimitMax! + 1} min={20}
            max={frameLimitMax! + 1} updateValue={(newVal) => {
              options.frameLimit = newVal > frameLimitMax! ? false : newVal
            }}
          />
          <Button
            style={{ width: 20 }} icon='pixelarticons:lock-open' onClick={async () => {
              const rate = await getScreenRefreshRate()
              setFrameLimitMax(rate)
            }}
          />
        </div>
      }
    },
    {
      gpuPreference: {
        text: 'GPU Preference',
        tooltip: 'You will need to reload the page for this to take effect.',
      },
    },
    {
      custom () {
        return <Button label='Guide: Disable VSync' onClick={() => openURL('https://gist.github.com/zardoy/6e5ce377d2b4c1e322e660973da069cd')} inScreen />
      },
      backgroundRendering: {
        text: 'Background FPS limit',
      },
      activeRenderer: {
        text: 'Renderer',
      },
    },
    {
      custom () {
        return <Category>Experimental</Category>
      },
      dayCycleAndLighting: {
        text: 'Day Cycle',
      },
      smoothLighting: {},
      newVersionsLighting: {
        text: 'Lighting in Newer Versions',
      },
      lowMemoryMode: {
        text: 'Low Memory Mode',
        enableWarning: 'Enabling it will make chunks load ~4x slower. When in the game, app needs to be reloaded to apply this setting.',
      },
      starfieldRendering: {},
      renderEntities: {},
      keepChunksDistance: {
        max: 5,
        unit: '',
        tooltip: 'Additional distance to keep the chunks loading before unloading them by marking them as too far',
      },
      renderEars: {
        tooltip: 'Enable rendering Deadmau5 ears for all players if their skin contains textures for it',
      },
      renderDebug: {
      },
      rendererPerfDebugOverlay: {
        text: 'Performance Debug',
      },
      disableBlockEntityTextures: {
        tooltip: 'Disables rendering of textures for block entities like signs, banners, heads, and maps',
      }
    },
    {
      custom () {
        const { _renderByChunks } = useSnapshot(options).rendererSharedOptions
        return <Button
          inScreen
          label={`Batch Chunks Display ${_renderByChunks ? 'ON' : 'OFF'}`}
          onClick={() => {
            options.rendererSharedOptions._renderByChunks = !_renderByChunks
          }}
        />
      }
    },
    {
      custom () {
        return <Category>Resource Packs</Category>
      },
      serverResourcePacks: {
        text: 'Download From Server',
      }
    }
  ],
  main: [
    {
      fov: {
        min: 30,
        max: 110,
        unit: '',
      }
    },
    {
      custom () {
        const sp = miscUiState.singleplayer || !miscUiState.gameLoaded
        const id = sp ? 'renderDistance' : 'multiplayerRenderDistance' // cant be changed when settings are open
        return <OptionSlider item={{
          type: 'slider',
          id,
          text: 'Render Distance',
          unit: '',
          max: sp ? 16 : 12,
          min: 1
        }}
        />
      },
    },
    {
      custom () {
        return <Button label='Render...' onClick={() => openOptionsMenu('render')} inScreen />
      },
    },
    {
      custom () {
        return <Button label='Interface...' onClick={() => openOptionsMenu('interface')} inScreen />
      },
    },
    {
      custom () {
        return <Button label='Controls...' onClick={() => openOptionsMenu('controls')} inScreen />
      },
    },
    {
      custom () {
        return <Button label='Sound...' onClick={() => openOptionsMenu('sound')} inScreen />
      },
    },
    {
      custom () {
        const { resourcePackInstalled } = useSnapshot(resourcePackState)
        const { usingServerResourcePack } = useSnapshot(gameAdditionalState)
        const { enabledResourcepack } = useSnapshot(options)
        return <Button
          label={`Resource Pack: ${usingServerResourcePack ? 'SERVER ON' : resourcePackInstalled ? enabledResourcepack ? 'ON' : 'OFF' : 'NO'}`} inScreen onClick={async () => {
            if (resourcePackState.resourcePackInstalled) {
              const names = Object.keys(await getResourcePackNames())
              const name = names[0]
              const choices = [
                options.enabledResourcepack ? 'Disable' : 'Enable',
                'Uninstall',
              ]
              const choice = await showOptionsModal(`Resource Pack ${name} action`, choices)
              if (!choice) return
              if (choice === 'Disable') {
                options.enabledResourcepack = null
                await resourcepackReload()
                return
              }
              if (choice === 'Enable') {
                options.enabledResourcepack = name
                await completeResourcepackPackInstall(name, name, false, createNotificationProgressReporter())
                return
              }
              if (choice === 'Uninstall') {
              // todo make hidable
                setLoadingScreenStatus('Uninstalling texturepack')
                await uninstallResourcePack()
                setLoadingScreenStatus(undefined)
              }
            } else {
            // if (!fsState.inMemorySave && isGameActive(false)) {
            //   alert('Unable to install resource pack in loaded save for now')
            //   return
            // }
              openFilePicker('resourcepack')
            }
          }}
        />
      },
    },
    {
      custom () {
        return <Button label='Advanced...' onClick={() => openOptionsMenu('advanced')} inScreen />
      },
    },
    {
      custom () {
        const { appConfig } = useSnapshot(miscUiState)
        const modsUpdateSnapshot = useSnapshot(modsUpdateStatus)
        const [clientMods, setClientMods] = useState<ClientMod[]>([])
        useEffect(() => {
          void getAllMods().then(setClientMods)
        }, [])

        if (appConfig?.showModsButton === false) return null
        const enabledModsCount = Object.keys(clientMods.filter(mod => mod.enabled)).length
        return <Button label={`Client Mods: ${enabledModsCount} (${Object.keys(modsUpdateSnapshot).length})`} onClick={() => showModal({ reactType: 'mods' })} inScreen />
      },
    },
    {
      custom () {
        return <Button label='VR...' onClick={() => openOptionsMenu('VR')} inScreen />
      },
    },
    {
      custom () {
        const { appConfig } = useSnapshot(miscUiState)
        if (!appConfig?.displayLanguageSelector) return null
        return <Button
          label='Language...' onClick={async () => {
            const newLang = await showOptionsModal('Set Language', (appConfig.supportedLanguages ?? []) as string[])
            if (!newLang) return
            options.language = newLang.split(' - ')[0]
          }} inScreen />
      },
    }
  ],
  interface: [
    {
      guiScale: {
        max: 4,
        min: 1,
        unit: '',
        delayApply: true,
      },
      custom () {
        return <Category>Chat</Category>
      },
      chatWidth: {
        max: 320,
        unit: 'px',
      },
      chatHeight: {
        max: 180,
        unit: 'px',
      },
      chatOpacity: {
      },
      chatOpacityOpened: {
      },
      chatSelect: {
        text: 'Text Select',
      },
      chatPingExtension: {
      }
    },
    {
      custom () {
        return <Category>Map</Category>
      },
      showMinimap: {
        text: 'Enable Minimap',
        enableWarning: 'App reload is required to apply this setting',
      },
    },
    {
      custom () {
        return <Category>World</Category>
      },
      highlightBlockColor: {
        text: 'Block Highlight Color',
      },
      showHand: {
        text: 'Show Hand',
      },
      viewBobbing: {
        text: 'View Bobbing',
      },
    },
    {
      custom () {
        return <Category>Sign Editor</Category>
      },
      autoSignEditor: {
        text: 'Enable Sign Editor',
      },
      wysiwygSignEditor: {
        text: 'WYSIWG Editor',
      },
    },
    {
      custom () {
        return <Category>Experimental</Category>
      },
      displayBossBars: {
        text: 'Boss Bars',
      },
    },
    {
      custom () {
        return <UiToggleButton name='title' addUiText />
      },
    },
    {
      custom () {
        return <UiToggleButton name='chat' addUiText />
      },
    },
    {
      custom () {
        return <UiToggleButton name='scoreboard' addUiText />
      },
    },
    {
      custom () {
        return <UiToggleButton name='effects' label='Effects' />
      },
    },
    {
      custom () {
        return <UiToggleButton name='indicators' label='Game Indicators' />
      },
    },
    {
      custom () {
        return <UiToggleButton name='hotbar' />
      },
    },
    {
      custom () {
        return <Category>Other</Category>
      },
      displayLoadingMessages: {}
    }
  ],
  controls: [
    {
      custom () {
        return <Category>Keyboard & Mouse</Category>
      },
    },
    {
      custom () {
        return <Button
          inScreen
          onClick={() => {
            showModal({ reactType: 'keybindings' })
          }}
        >Keybindings
        </Button>
      },
      mouseSensX: {},
      mouseSensY: {
        min: -1,
        valueText (value) {
          return value === -1 ? 'Same as X' : `${value}`
        },
      },
      mouseRawInput: {
        tooltip: 'Wether to disable any mouse acceleration (MC does it by default). Most probably it is still supported only by Chrome.',
        // eslint-disable-next-line no-extra-boolean-cast
        disabledReason: Boolean(document.documentElement.requestPointerLock) ? undefined : 'Your browser does not support pointer lock.',
      },
      autoFullScreen: {
        tooltip: 'Auto Fullscreen allows you to use Ctrl+W and Escape having to wait/click on screen again.',
        disabledReason: navigator['keyboard'] ? undefined : 'Your browser doesn\'t support keyboard lock API'
      },
      autoExitFullscreen: {
        tooltip: 'Exit fullscreen on escape (pause menu open). But note you can always do it with F11.',
      },
    },
    {
      custom () {
        return <Category>Touch Controls</Category>
      },
      alwaysShowMobileControls: {
        text: 'Always Mobile Controls',
      },
      touchButtonsSize: {
        min: 40,
        disableIf: [
          'touchMovementType',
          'modern'
        ],
      },
      touchButtonsOpacity: {
        min: 10,
        max: 90,
        disableIf: [
          'touchMovementType',
          'modern'
        ],
      },
      touchButtonsPosition: {
        max: 80,
        disableIf: [
          'touchMovementType',
          'modern'
        ],
      },
      touchMovementType: {
        text: 'Movement Controls',
      },
      touchInteractionType: {
        text: 'Interaction Controls',
      },
    },
    {
      custom () {
        const { touchInteractionType, touchMovementType } = useSnapshot(options)
        return <Button label='Setup Touch Buttons' onClick={() => showModal({ reactType: 'touch-buttons-setup' })} inScreen disabled={touchInteractionType === 'classic' && touchMovementType === 'classic'} />
      },
    },
    {
      custom () {
        return <Category>Auto Jump</Category>
      },
      autoJump: {
        disableIf: [
          'autoParkour',
          true
        ],
      },
      autoParkour: {},
    }
  ],
  sound: [
    { volume: {} },
    {
      custom () {
        return <OptionSlider
          valueOverride={options.enableMusic ? undefined : 0}
          onChange={(value) => {
            options.musicVolume = value
          }}
          item={{
            type: 'slider',
            id: 'musicVolume',
            text: 'Music Volume',
            min: 0,
            max: 100,
            unit: '%',
          }}
        />
      },
    },
    {
      custom () {
        return <Button label='Sound Muffler' onClick={() => showModal({ reactType: 'sound-muffler' })} inScreen />
      },
    }
    // { ignoreSilentSwitch: {} },
  ],

  VR: [
    {
      custom () {
        return (
          <>
            <span style={{ fontSize: 9, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              VR currently has basic support
            </span>
            <div />
          </>
        )
      },
      vrSupport: {},
      vrPageGameRendering: {
        text: 'Page Game Rendering',
        tooltip: 'Wether to continue rendering page even when vr is active.',
      }
    },
  ],
  advanced: [
    {
      custom () {
        return <Button
          inScreen
          onClick={() => {
            if (confirm('Are you sure you want to reset all settings?')) resetOptions()
          }}
        >Reset settings</Button>
      },
    },
    {
      custom () {
        return <Button
          inScreen
          onClick={() => {
            if (confirm('Are you sure you want to remove all data (settings, keybindings, servers, username, auth, proxies)?')) resetLocalStorage()
          }}
        >Remove all data</Button>
      },
    },
    {
      custom () {
        return <Button label='Export/Import...' onClick={() => openOptionsMenu('export-import')} inScreen />
      }
    },
    {
      custom () {
        const { cookieStorage } = useSnapshot(appStorage)
        return <Button
          label={`Storage: ${cookieStorage ? 'Synced Cookies' : 'Local Storage'}`} onClick={() => {
            appStorage.cookieStorage = !cookieStorage
            alert('Reload the page to apply this change')
          }}
          inScreen
        />
      }
    },
    {
      custom () {
        return <Category>Server Connection</Category>
      },
    },
    {
      saveLoginPassword: {
        tooltip: 'Controls whether to save login passwords for servers in this browser memory.',
      },
    },
    {
      custom () {
        const { serversAutoVersionSelect } = useSnapshot(options)
        const allVersions = [...[...supportedVersions].sort((a, b) => versionToNumber(a) - versionToNumber(b)), 'latest', 'auto']
        const currentIndex = allVersions.indexOf(serversAutoVersionSelect)

        const getDisplayValue = (version: string) => {
          const versionAutoSelect = getVersionAutoSelect(version)
          if (version === 'latest') return `latest (${versionAutoSelect})`
          if (version === 'auto') return `auto (${versionAutoSelect})`
          return version
        }

        return <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Slider
            style={{ width: 150 }}
            label='Default Version'
            title='First version to try to connect with'
            value={currentIndex}
            min={0}
            max={allVersions.length - 1}
            unit=''
            valueDisplay={getDisplayValue(serversAutoVersionSelect)}
            updateValue={(newVal) => {
              options.serversAutoVersionSelect = allVersions[newVal]
            }}
          />
        </div>
      },
    },
    {
      preventBackgroundTimeoutKick: {},
      preventSleep: {
        text: 'Prevent Device Sleep',
        disabledReason: navigator.wakeLock ? undefined : 'Your browser does not support wake lock API',
        enableWarning: 'When connected to a server, prevent PC from sleeping or screen dimming. Useful for purpusely staying AFK for long time. Some events might still prevent this like loosing tab focus or going low power mode.',
      },
    },
    {
      custom () {
        return <Category>Developer</Category>
      },
    },
    {
      custom () {
        const { active } = useSnapshot(packetsRecordingState)
        return <Button
          inScreen
          onClick={() => {
            packetsRecordingState.active = !active
          }}
        >{active ? 'Stop' : 'Start'} Packets Replay Logging</Button>
      },
    },
    {
      custom () {
        const { active, hasRecordedPackets } = useSnapshot(packetsRecordingState)
        return <Button
          disabled={!hasRecordedPackets}
          inScreen
          onClick={() => {
            void downloadPacketsReplay()
          }}
        >Download Packets Replay</Button>
      },
    },
    {
      packetsLoggerPreset: {
        text: 'Packets Logger Preset',
      },
    },
    {
      debugContro: {
        text: 'Debug Controls',
      },
    },
    {
      debugResponseTimeIndicator: {
        text: 'Debug Input Lag',
      },
    },
    {
      debugChatScroll: {
      },
    }
  ],
  'export-import': [
    {
      custom () {
        return <Category>Export/Import Data</Category>
      }
    },
    {
      custom () {
        return <Button
          inScreen
          onClick={importData}
        >Import Data</Button>
      }
    },
    {
      custom () {
        return <Button
          inScreen
          onClick={exportData}
        >Export Data</Button>
      }
    },
    {
      custom () {
        return <Button
          inScreen
          disabled
        >Export Worlds</Button>
      }
    },
    {
      custom () {
        return <Button
          inScreen
          disabled
        >Export Resource Pack</Button>
      }
    }
  ],
}
export type OptionsGroupType = 'main' | 'render' | 'interface' | 'controls' | 'sound' | 'advanced' | 'VR' | 'export-import'

const Category = ({ children }) => <div style={{
  fontSize: 9,
  textAlign: 'center',
  gridColumn: 'span 2'
}}>{children}</div>

const UiToggleButton = ({ name, addUiText = false, label = noCase(name) }: { name: string, addUiText?: boolean, label?: string }) => {
  const { disabledUiParts } = useSnapshot(options)

  const currentlyDisabled = disabledUiParts.includes(name)
  if (addUiText) label = `${label} UI`
  return <Button
    inScreen
    onClick={() => {
      const newDisabledUiParts = currentlyDisabled ? disabledUiParts.filter(x => x !== name) : [...disabledUiParts, name]
      options.disabledUiParts = newDisabledUiParts
    }}
  >{currentlyDisabled ? 'Enable' : 'Disable'} {label}</Button>
}

export const tryFindOptionConfig = (option: keyof AppOptions) => {
  for (const group of Object.values(guiOptionsScheme)) {
    for (const optionConfig of group) {
      if (option in optionConfig) {
        return optionConfig[option]
      }
    }
  }

  return null
}
