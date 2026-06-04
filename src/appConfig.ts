import { defaultsDeep } from 'lodash'
import { disabledSettings, options, qsOptions } from './optionsStorage'
import { miscUiState } from './globalState'
import { setLoadingScreenStatus } from './appStatus'
import { setStorageDataOnAppConfigLoad } from './react/appStorageProvider'
import { customKeymaps, updateBinds } from './controls'

export type CustomAction = {
  readonly type: string
  readonly input: readonly any[]
}

export type ActionType = string | CustomAction

export type ActionHoldConfig = {
  readonly command: ActionType
  readonly longPressAction?: ActionType
  readonly duration?: number
  readonly threshold?: number
}

export type MobileButtonConfig = {
  readonly label?: string
  readonly icon?: string
  readonly action?: ActionType
  readonly actionHold?: ActionType | ActionHoldConfig
  readonly iconStyle?: React.CSSProperties
}

export type AppConfig = {
  // defaultHost?: string
  // defaultHostSave?: string
  defaultProxy?: string
  // defaultProxySave?: string
  // defaultVersion?: string
  peerJsServer?: string
  peerJsServerFallback?: string
  promoteServers?: Array<{ ip, description, name?, version?, }>
  mapsProvider?: string

  appParams?: Record<string, any> // query string params
  rightSideText?: string

  defaultSettings?: Record<string, any>
  forceSettings?: Record<string, boolean>
  // hideSettings?: Record<string, boolean>
  allowAutoConnect?: boolean
  splashText?: string
  splashTextFallback?: string
  pauseLinks?: Array<Array<Record<string, any>>>
  mobileButtons?: MobileButtonConfig[]
  keybindings?: Record<string, any>
  defaultLanguage?: string
  displayLanguageSelector?: boolean
  supportedLanguages?: string[]
  showModsButton?: boolean
  defaultUsername?: string
  skinTexturesProxy?: string
  alwaysReconnectButton?: boolean
  reportBugButtonWithReconnect?: boolean
  disabledCommands?: string[] // Array of command IDs to disable (e.g. ['movement.jump', 'general.chat'])
  /** Shown as a small fixed label (e.g. preview / branch id). Set via bundled or remote config. */
  watermark?: string
  /** If true, append a second line `BUILD DD.MM.YY` from compile time. */
  watermarkDate?: boolean
  /**
   * Build-time only: dependency names to resolve from pnpm-lock.yaml into extra `watermark` lines
   * (npm → locked version; GitHub tarball → short SHA). Stripped from the shipped config after compose.
   */
  watermarkPackages?: string[]
}

let watermarkEl: HTMLDivElement | null = null

function dismissWatermark () {
  watermarkEl?.remove()
  watermarkEl = null
}

function watermarkTextFromConfig (cfg: AppConfig | undefined) {
  const parts: string[] = []
  const w = cfg?.watermark?.trim()
  if (w) parts.push(w)
  if (cfg?.watermarkDate && process.env.BUILD_DISPLAY_DATE) {
    parts.push(`BUILD ${process.env.BUILD_DISPLAY_DATE}`)
  }
  return parts.length ? parts.join('\n') : ''
}

function setWatermarkFromConfig (cfg: AppConfig | undefined) {
  const text = watermarkTextFromConfig(cfg)
  if (!text) {
    watermarkEl?.remove()
    watermarkEl = null
    return
  }
  if (!watermarkEl) {
    watermarkEl = document.createElement('div')
    watermarkEl.className = 'app-watermark'
    watermarkEl.dataset.appWatermark = ''
    watermarkEl.title = 'Click to dismiss'
    watermarkEl.addEventListener('click', dismissWatermark)
    document.body.appendChild(watermarkEl)
  }
  watermarkEl.textContent = text
}

export const loadAppConfig = (appConfig: AppConfig) => {

  if (miscUiState.appConfig) {
    Object.assign(miscUiState.appConfig, appConfig)
  } else {
    miscUiState.appConfig = appConfig
  }

  if (appConfig.forceSettings) {
    for (const [key, value] of Object.entries(appConfig.forceSettings)) {
      if (value) {
        disabledSettings.value.add(key)
        // since the setting is forced, we need to set it to that value
        if (appConfig.defaultSettings && key in appConfig.defaultSettings && !qsOptions[key]) {
          options[key] = appConfig.defaultSettings[key]
        }
      } else {
        disabledSettings.value.delete(key)
      }
    }
  }
  // todo apply defaultSettings to defaults even if not forced in case of remote config

  if (appConfig.keybindings) {
    Object.assign(customKeymaps, defaultsDeep(appConfig.keybindings, customKeymaps))
    updateBinds(customKeymaps)
  }

  appViewer?.appConfigUdpate()

  setStorageDataOnAppConfigLoad(appConfig)
  setWatermarkFromConfig(miscUiState.appConfig)
}

export const isBundledConfigUsed = !!process.env.INLINED_APP_CONFIG

if (isBundledConfigUsed) {
  loadAppConfig(process.env.INLINED_APP_CONFIG as AppConfig ?? {})
} else {
  void window.fetch('config.json').then(async res => res.json()).then(c => c, (error) => {
  // console.warn('Failed to load optional app config.json', error)
  // return {}
    setLoadingScreenStatus('Failed to load app config.json', true)
  }).then((config: AppConfig) => {
    loadAppConfig(config)
  })
}
