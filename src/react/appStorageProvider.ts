import { proxy, ref, subscribe } from 'valtio'
import { UserOverridesConfig } from 'contro-max/build/types/store'
import { subscribeKey } from 'valtio/utils'
import { AppConfig } from '../appConfig'
import { CustomCommand } from './KeybindingsCustom'
import { AuthenticatedAccount } from './serversStorage'
import type { BaseServerInfo } from './AddServerOrConnect'

// when opening html file locally in browser, localStorage is shared between all ever opened html files, so we try to avoid conflicts
const localStoragePrefix = process.env?.SINGLE_FILE_BUILD ? 'minecraft-web-client:' : ''
const cookiePrefix = process.env.COOKIE_STORAGE_PREFIX || ''
const { localStorage } = window
const migrateRemoveLocalStorage = false

export interface SavedProxiesData {
  proxies: string[]
  selected: string
}

export interface ServerHistoryEntry {
  ip: string
  version?: string
  numConnects: number
  lastConnected: number
}

export interface StoreServerItem extends BaseServerInfo {
  lastJoined?: number
  description?: string
  optionsOverride?: Record<string, any>
  autoLogin?: Record<string, string>
  numConnects?: number // Track number of connections
  isRecommended?: boolean
}

interface StorageConflict {
  key: string
  localStorageValue: any
  localStorageTimestamp?: number
  cookieValue: any
  cookieTimestamp?: number
}

type StorageData = {
  cookieStorage: boolean | { ignoreKeys: Array<keyof StorageData> }
  customCommands: Record<string, CustomCommand> | undefined
  username: string | undefined
  keybindings: UserOverridesConfig | undefined
  changedSettings: any
  proxiesData: SavedProxiesData | undefined
  serversHistory: ServerHistoryEntry[]
  authenticatedAccounts: AuthenticatedAccount[]
  serversList: StoreServerItem[] | undefined
  modsAutoUpdateLastCheck: number | undefined
  firstModsPageVisit: boolean
  iframeConsents: string[] | undefined
}

const cookieStoreKeys: Array<keyof StorageData> = [
  'customCommands',
  'username',
  'keybindings',
  'changedSettings',
  'serversList',
]

const oldKeysAliases: Partial<Record<keyof StorageData, string>> = {
  serversHistory: 'serverConnectionHistory',
}

// Cookie storage functions
const getCookieValue = (key: string): string | null => {
  const cookie = document.cookie.split(';').find(c => c.trimStart().startsWith(`${cookiePrefix}${key}=`))
  if (cookie) {
    return decodeURIComponent(cookie.split('=')[1])
  }
  return null
}

const topLevelDomain = window.location.hostname.split('.').slice(-2).join('.')
const cookieBase = `; Domain=.${topLevelDomain}; Path=/; SameSite=Strict; Secure`

const setCookieValue = (key: string, value: string): boolean => {
  try {
    const cookieKey = `${cookiePrefix}${key}`
    let cookie = `${cookieKey}=${encodeURIComponent(value)}`
    cookie += `${cookieBase}; Max-Age=2147483647`

    // Test if cookie exceeds size limit
    if (cookie.length > 4096) {
      throw new Error(`Cookie size limit exceeded for key '${key}'. Cookie size: ${cookie.length} bytes, limit: 4096 bytes.`)
    }

    document.cookie = cookie

    // Verify the cookie was actually saved by reading it back
    const savedValue = getCookieValue(key)
    if (savedValue !== value) {
      console.warn(`Cookie verification failed for key '${key}'. Expected: ${value}, Got: ${savedValue}`)
      return false
    }

    return true
  } catch (error) {
    console.error(`Failed to set cookie for key '${key}':`, error)
    window.showNotification(`Failed to save data to cookies: ${error.message}`, 'Consider switching to localStorage in advanced settings.', true)
    return false
  }
}

const deleteCookie = (key: string) => {
  const cookieKey = `${cookiePrefix}${key}`
  document.cookie = `${cookieKey}=; ${cookieBase}; expires=Thu, 01 Jan 1970 00:00:00 UTC;`
}

// Storage conflict detection and resolution
let storageConflicts: StorageConflict[] = []

const detectStorageConflicts = (): StorageConflict[] => {
  const conflicts: StorageConflict[] = []

  for (const key of cookieStoreKeys) {
    const localStorageKey = `${localStoragePrefix}${key}`
    const localStorageValue = localStorage.getItem(localStorageKey)
    const cookieValue = getCookieValue(key)

    if (localStorageValue && cookieValue) {
      try {
        const localParsed = JSON.parse(localStorageValue)
        const cookieParsed = JSON.parse(cookieValue)

        if (localStorage.getItem(`${localStorageKey}:migrated`)) {
          continue
        }

        // Extract timestamps if they exist
        const localTimestamp = localParsed?.timestamp
        const cookieTimestamp = cookieParsed?.timestamp

        // Compare the actual data (excluding timestamp)
        const localData = localTimestamp ? { ...localParsed } : localParsed
        const cookieData = cookieTimestamp ? { ...cookieParsed } : cookieParsed
        delete localData.timestamp
        delete cookieData.timestamp

        const isDataEmpty = (data: any) => {
          if (typeof data === 'object' && data !== null) {
            return Object.keys(data).length === 0
          }
          return !data && data !== 0 && data !== false
        }

        if (JSON.stringify(localData) !== JSON.stringify(cookieData) && !isDataEmpty(localData) && !isDataEmpty(cookieData)) {
          conflicts.push({
            key,
            localStorageValue: localData,
            localStorageTimestamp: localTimestamp,
            cookieValue: (typeof cookieData === 'object' && cookieData !== null && 'data' in cookieData) ? cookieData.data : cookieData,
            cookieTimestamp
          })
        }
      } catch (e) {
        console.error(`Failed to parse storage values for conflict detection on key '${key}':`, e, localStorageValue, cookieValue)
      }
    }
  }

  return conflicts
}

const showStorageConflictModal = () => {
  // Import showModal dynamically to avoid circular dependency
  const showModal = (window as any).showModal || ((modal: any) => {
    console.error('Modal system not available:', modal)
    console.warn('Storage conflicts detected but modal system not available:', storageConflicts)
  })

  setTimeout(() => {
    showModal({ reactType: 'storage-conflict', conflicts: storageConflicts })
  }, 100)
}

const migrateLegacyData = () => {
  const proxies = localStorage.getItem('proxies')
  const selectedProxy = localStorage.getItem('selectedProxy')
  if (proxies && selectedProxy) {
    appStorage.proxiesData = {
      proxies: JSON.parse(proxies),
      selected: selectedProxy,
    }
  }

  const username = localStorage.getItem('username')
  if (username && !username.startsWith('"')) {
    appStorage.username = username
  }

  const serversHistoryLegacy = localStorage.getItem('serverConnectionHistory')
  if (serversHistoryLegacy) {
    appStorage.serversHistory = JSON.parse(serversHistoryLegacy)
  }
  localStorage.removeItem('proxies')
  localStorage.removeItem('selectedProxy')
  localStorage.removeItem('serverConnectionHistory')
}

const defaultStorageData: StorageData = {
  cookieStorage: !!process.env.ENABLE_COOKIE_STORAGE && !process.env?.SINGLE_FILE_BUILD,
  customCommands: undefined,
  username: undefined,
  keybindings: undefined,
  changedSettings: {},
  proxiesData: undefined,
  serversHistory: [],
  authenticatedAccounts: [],
  serversList: undefined,
  modsAutoUpdateLastCheck: undefined,
  firstModsPageVisit: true,
  iframeConsents: undefined,
}

export const setStorageDataOnAppConfigLoad = (appConfig: AppConfig) => {
  appStorage.username ??= getRandomUsername(appConfig)
}

export const getRandomUsername = (appConfig: AppConfig) => {
  if (!appConfig.defaultUsername) return ''

  const username = appConfig.defaultUsername
    .replaceAll(/{(\d+)-(\d+)}/g, (_, start, end) => {
      const min = Number(start)
      const max = Number(end)
      return Math.floor(Math.random() * (max - min + 1) + min).toString()
    })
    .replaceAll('{num}', () => Math.floor(Math.random() * 10).toString())

  return username
}

export const appStorage = proxy({ ...defaultStorageData })

// Track if cookies failed in this session
let cookiesFailedThisSession = false

// Check if cookie storage should be used (will be set by options)
const shouldUseCookieStorage = () => {
  // If cookies failed this session, don't try again
  if (cookiesFailedThisSession) {
    return false
  }

  const isSecureCookiesAvailable = () => {
    // either https or localhost
    return window.location.protocol === 'https:' || (window.location.hostname === 'localhost')
  }
  if (!isSecureCookiesAvailable()) {
    return false
  }

  const localStorageValue = localStorage.getItem(`${localStoragePrefix}cookieStorage`)
  if (localStorageValue === null) {
    return appStorage.cookieStorage === true
  }
  return localStorageValue === 'true'
}

// Restore data from storage with conflict detection
const restoreStorageData = () => {
  const useCookieStorage = shouldUseCookieStorage()

  if (useCookieStorage) {
    // Detect conflicts first
    storageConflicts = detectStorageConflicts()

    if (storageConflicts.length > 0) {
      // Show conflict resolution modal
      showStorageConflictModal()
      return // Don't restore data until conflict is resolved
    }
  }

  for (const key of Object.keys(defaultStorageData)) {
    const typedKey = key
    const prefixedKey = `${localStoragePrefix}${key}`
    const aliasedKey = oldKeysAliases[typedKey]

    let storedValue: string | null = null
    let cookieValueCanBeUsed = false
    let usingLocalStorageValue = false

    // Try cookie storage first if enabled and key is in cookieStoreKeys
    if (useCookieStorage && cookieStoreKeys.includes(typedKey)) {
      storedValue = getCookieValue(key)
      cookieValueCanBeUsed = true
    }

    // Fallback to localStorage if no cookie value found
    if (storedValue === null) {
      storedValue = localStorage.getItem(prefixedKey) ?? (aliasedKey ? localStorage.getItem(aliasedKey) : null)
      usingLocalStorageValue = true
    }

    if (storedValue) {
      try {
        let parsed = JSON.parse(storedValue)

        // Handle timestamped data
        if (parsed && typeof parsed === 'object' && parsed.timestamp) {
          delete parsed.timestamp
          // If it was a wrapped primitive, unwrap it
          if ('data' in parsed && Object.keys(parsed).length === 1) {
            parsed = parsed.data
          }
        }

        appStorage[typedKey] = parsed

        if (usingLocalStorageValue && cookieValueCanBeUsed) {
          // migrate localStorage to cookie
          saveKey(key)
          markLocalStorageAsMigrated(key)
        }
      } catch (e) {
        console.error(`Failed to parse stored value for ${key}:`, e)
      }
    }
  }
}

const markLocalStorageAsMigrated = (key: keyof StorageData) => {
  const localStorageKey = `${localStoragePrefix}${key}`
  if (migrateRemoveLocalStorage) {
    localStorage.removeItem(localStorageKey)
    return
  }

  localStorage.setItem(`${localStorageKey}:migrated`, 'true')
}

const saveKey = (key: keyof StorageData) => {
  const useCookieStorage = shouldUseCookieStorage()
  const prefixedKey = `${localStoragePrefix}${key}`
  const value = appStorage[key]

  const dataToSave = value === undefined ? undefined : (
    value && typeof value === 'object' && !Array.isArray(value)
      ? { ...value, timestamp: Date.now() }
      : { data: value, timestamp: Date.now() }
  )

  const serialized = dataToSave === undefined ? undefined : JSON.stringify(dataToSave)

  let useLocalStorage = true
  // Save to cookie if enabled and key is in cookieStoreKeys
  if (useCookieStorage && cookieStoreKeys.includes(key)) {
    useLocalStorage = false
    if (serialized === undefined) {
      deleteCookie(key)
    } else {
      const success = setCookieValue(key, serialized)
      if (success) {
        // Remove from localStorage if cookie save was successful
        markLocalStorageAsMigrated(key)
      } else {
        // Cookie save failed, disable cookies for this session and fallback to localStorage
        console.warn(`Cookie save failed for key '${key}', disabling cookies for this session`)
        cookiesFailedThisSession = true
        useLocalStorage = true
      }
    }
  }

  if (useLocalStorage) {
    // Save to localStorage
    if (value === undefined) {
      localStorage.removeItem(prefixedKey)
    } else {
      localStorage.setItem(prefixedKey, JSON.stringify(value))
    }
  }
}

subscribe(appStorage, (ops) => {
  for (const op of ops) {
    const [type, path, value] = op
    const key = path[0]
    saveKey(key as keyof StorageData)
  }
})

export const resetAppStorage = () => {
  for (const key of Object.keys(appStorage)) {
    appStorage[key as keyof StorageData] = defaultStorageData[key as keyof StorageData]
  }

  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(localStoragePrefix)) {
      localStorage.removeItem(key)
    }
  }

  if (!shouldUseCookieStorage()) return
  const shouldContinue = window.confirm(`Removing all synced cookies will remove all data from all ${topLevelDomain} subdomains websites. Continue?`)
  if (!shouldContinue) return

  // Clear cookies
  for (const key of cookieStoreKeys) {
    deleteCookie(key)
  }
}

// Export functions for conflict resolution
export const resolveStorageConflicts = (useLocalStorage: boolean) => {
  if (useLocalStorage) {
    // Disable cookie storage and use localStorage data
    appStorage.cookieStorage = false
  } else {
    // Remove localStorage data and continue using cookie storage
    for (const conflict of storageConflicts) {
      const prefixedKey = `${localStoragePrefix}${conflict.key}`
      localStorage.removeItem(prefixedKey)
    }
  }

  // forcefully set data again
  for (const conflict of storageConflicts) {
    appStorage[conflict.key] = useLocalStorage ? conflict.localStorageValue : conflict.cookieValue
    saveKey(conflict.key as keyof StorageData)
  }

  // Clear conflicts and restore data
  storageConflicts = []
  restoreStorageData()
}

export const getStorageConflicts = () => storageConflicts

migrateLegacyData()

// Restore data after checking for conflicts
restoreStorageData()
