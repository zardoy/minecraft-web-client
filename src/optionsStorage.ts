import { proxy, subscribe } from 'valtio/vanilla'
import { subscribeKey } from 'valtio/utils'
import { omitObj } from '@zardoy/utils'
import { appQueryParams, appQueryParamsArray } from './appParams'
import type { AppConfig } from './appConfig'
import { appStorage } from './react/appStorageProvider'
import { miscUiState } from './globalState'
import { defaultOptions } from './defaultOptions'

const isDev = process.env.NODE_ENV === 'development'
const initialAppConfig = process.env?.INLINED_APP_CONFIG as AppConfig ?? {}

// const qsOptionsRaw = new URLSearchParams(location.search).getAll('setting')
const qsOptionsRaw = appQueryParamsArray.setting ?? []
export const qsOptions = Object.fromEntries(qsOptionsRaw.map(o => {
  const [key, value] = o.split(':')
  return [key, JSON.parse(value)]
}))

// Track which settings are disabled (controlled by QS or forced by config)
export const disabledSettings = proxy({
  value: new Set<string>(Object.keys(qsOptions))
})
export const serverChangedSettings = proxy({
  value: new Set<string>()
})

const migrateOptions = (options: Partial<AppOptions & Record<string, any>>) => {
  if (options.highPerformanceGpu) {
    options.gpuPreference = 'high-performance'
    delete options.highPerformanceGpu
  }
  if (Object.keys(options.touchControlsPositions ?? {}).length === 0) {
    options.touchControlsPositions = defaultOptions.touchControlsPositions
  }
  if (options.touchControlsPositions?.jump === undefined) {
    options.touchControlsPositions!.jump = defaultOptions.touchControlsPositions.jump
  }
  if (options.touchControlsType === 'joystick-buttons') {
    options.touchInteractionType = 'buttons'
  }

  return options
}
const migrateOptionsLocalStorage = () => {
  if (Object.keys(appStorage['options'] ?? {}).length) {
    for (const key of Object.keys(appStorage['options'])) {
      if (!(key in defaultOptions)) continue // drop unknown options
      const defaultValue = defaultOptions[key]
      if (JSON.stringify(defaultValue) !== JSON.stringify(appStorage['options'][key])) {
        appStorage.changedSettings[key] = appStorage['options'][key]
      }
    }
    delete appStorage['options']
  }
}

export type AppOptions = typeof defaultOptions

const isDeepEqual = (a: any, b: any): boolean => {
  if (a === b) return true
  if (typeof a !== typeof b) return false
  if (typeof a !== 'object') return false
  if (a === null || b === null) return a === b
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    return a.every((item, index) => isDeepEqual(item, b[index]))
  }
  const keysA = Object.keys(a)
  const keysB = Object.keys(b)
  if (keysA.length !== keysB.length) return false
  return keysA.every(key => isDeepEqual(a[key], b[key]))
}

export const getChangedSettings = () => {
  return Object.fromEntries(
    Object.entries(appStorage.changedSettings).filter(([key, value]) => !isDeepEqual(defaultOptions[key], value))
  )
}

migrateOptionsLocalStorage()
export const options: AppOptions = proxy({
  ...defaultOptions,
  ...initialAppConfig.defaultSettings,
  ...migrateOptions(appStorage.changedSettings),
  ...qsOptions
})

window.options = window.settings = options

export const resetOptions = () => {
  Object.assign(options, defaultOptions)
}

Object.defineProperty(window, 'debugChangedOptions', {
  get () {
    return getChangedSettings()
  },
})

subscribe(options, (ops) => {
  if (appQueryParams.freezeSettings === 'true') return
  for (const op of ops) {
    const [type, path, value] = op
    // let patch
    // let accessor = options
    // for (const part of path) {
    // }
    const key = path[0] as string
    if (disabledSettings.value.has(key) || serverChangedSettings.value.has(key)) continue
    appStorage.changedSettings[key] = options[key]
  }
})

type WatchValue = <T extends Record<string, any>>(proxy: T, callback: (p: T, isChanged: boolean) => void) => () => void

export const watchValue: WatchValue = (proxy, callback) => {
  const watchedProps = new Set<string>()
  callback(new Proxy(proxy, {
    get (target, p, receiver) {
      watchedProps.add(p.toString())
      return Reflect.get(target, p, receiver)
    },
  }), false)
  const unsubscribes = [] as Array<() => void>
  for (const prop of watchedProps) {
    unsubscribes.push(
      subscribeKey(proxy, prop, () => {
        callback(proxy, true)
      })
    )
  }

  return () => {
    for (const unsubscribe of unsubscribes) {
      unsubscribe()
    }
  }
}

watchValue(options, o => {
  globalThis.excludeCommunicationDebugEvents = o.excludeCommunicationDebugEvents
})

watchValue(options, o => {
  document.body.classList.toggle('disable-assets', o.disableAssets)
})
watchValue(options, o => {
  document.body.style.setProperty('--touch-movement-buttons-opacity', (o.touchButtonsOpacity / 100).toString())
})
watchValue(options, o => {
  document.body.style.setProperty('--touch-movement-buttons-position', (o.touchButtonsPosition * 2) + 'px')
})

export const useOptionValue = (setting, valueCallback) => {
  valueCallback(setting)
  subscribe(setting, valueCallback)
}

export const getAppLanguage = () => {
  if (options.language === 'auto') {
    return miscUiState.appConfig?.defaultLanguage ?? navigator.language
  }
  return options.language
}

export { defaultOptions } from './defaultOptions'
