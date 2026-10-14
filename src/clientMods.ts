/* eslint-disable no-await-in-loop */
import { openDB } from 'idb'
import * as React from 'react'
import * as ReactJsxRuntime from 'react/jsx-runtime'
import * as ReactDOM from 'react-dom'
import * as valtio from 'valtio'
import * as valtioUtils from 'valtio/utils'
import * as framerMotion from 'framer-motion'
import * as fileSize from 'filesize'
import classNames from 'classnames'
import { gt } from 'semver'
import { proxy } from 'valtio'
import { options } from './optionsStorage'
import { appStorage } from './react/appStorageProvider'
import { showInputsModal, showOptionsModal } from './react/SelectOption'
import { ProgressReporter } from './core/progressReporter'
import { showNotification } from './react/NotificationProvider'
import { InjectUiPlace } from './react/extendableSystem'
import { appQueryParams } from './appParams'

let sillyProtection = false
const protectRuntime = () => {
  if (sillyProtection) return
  sillyProtection = true
  const sensetiveKeys = new Set(['authenticatedAccounts', 'serversList', 'username'])
  const proxy = new Proxy(window.localStorage, {
    get (target, prop) {
      if (typeof prop === 'string') {
        if (sensetiveKeys.has(prop)) {
          console.warn(`Access to sensitive key "${prop}" was blocked`)
          return null
        }
        if (prop === 'getItem') {
          return (key: string) => {
            if (sensetiveKeys.has(key)) {
              console.warn(`Access to sensitive key "${key}" via getItem was blocked`)
              return null
            }
            return target.getItem(key)
          }
        }
        if (prop === 'setItem') {
          return (key: string, value: string) => {
            if (sensetiveKeys.has(key)) {
              console.warn(`Attempt to set sensitive key "${key}" via setItem was blocked`)
              return
            }
            target.setItem(key, value)
          }
        }
        if (prop === 'removeItem') {
          return (key: string) => {
            if (sensetiveKeys.has(key)) {
              console.warn(`Attempt to delete sensitive key "${key}" via removeItem was blocked`)
              return
            }
            target.removeItem(key)
          }
        }
        if (prop === 'clear') {
          console.warn('Attempt to clear localStorage was blocked')
          return () => {}
        }
      }
      return Reflect.get(target, prop)
    },
    set (target, prop, value) {
      if (typeof prop === 'string' && sensetiveKeys.has(prop)) {
        console.warn(`Attempt to set sensitive key "${prop}" was blocked`)
        return false
      }
      return Reflect.set(target, prop, value)
    },
    deleteProperty (target, prop) {
      if (typeof prop === 'string' && sensetiveKeys.has(prop)) {
        console.warn(`Attempt to delete sensitive key "${prop}" was blocked`)
        return false
      }
      return Reflect.deleteProperty(target, prop)
    }
  })
  Object.defineProperty(window, 'localStorage', {
    value: proxy,
    writable: false,
    configurable: false,
  })
}

// #region Database
const dbPromise = openDB('mods-db', 1, {
  upgrade (db) {
    db.createObjectStore('mods', {
      keyPath: 'name',
    })
    db.createObjectStore('repositories', {
      keyPath: 'url',
    })
  },
})

export interface ModSetting {
  label?: string
  type: 'toggle' | 'choice' | 'input' | 'slider'
  hidden?: boolean
  values?: string[]
  inputType?: string
  hint?: string
  default?: any
}

export interface ModSettingsDict {
  [settingId: string]: ModSetting
}

export interface ModAction {
  method?: string
  label?: string
  /** @default false */
  gameGlobal?: boolean
  /** @default false */
  onlyForeground?: boolean
}

// mcraft-repo.json
export interface McraftRepoFile {
  packages: ClientModDefinition[]
  /** @default true */
  prefix?: string | boolean
  name?: string // display name
  description?: string
  mirrorUrls?: string[]
  autoUpdateOverride?: boolean
  lastUpdated?: number
}
export interface Repository extends McraftRepoFile {
  url: string
}

export interface ClientMod {
  name: string; // unique identifier like owner.name
  version: string
  enabled?: boolean

  scriptMainUnstable?: string;
  serverPlugin?: string
  // serverPlugins?: string[]
  // mesherThread?: string
  stylesGlobal?: string
  threeJsBackend?: string // three.js
  // stylesLocal?: string

  requiresNetwork?: boolean
  fullyOffline?: boolean
  description?: string
  author?: string
  section?: string
  autoUpdateOverride?: boolean
  lastUpdated?: number
  wasModifiedLocally?: boolean
  // todo depends, hashsum

  settings?: ModSettingsDict
  actionsMain?: Record<string, ModAction>
}

const cleanupFetchedModData = (mod: ClientModDefinition | Record<string, any>) => {
  delete mod['enabled']
  delete mod['repo']
  delete mod['autoUpdateOverride']
  delete mod['lastUpdated']
  delete mod['wasModifiedLocally']
  return mod
}

export type ClientModDefinition = Omit<ClientMod, 'enabled' | 'wasModifiedLocally'> & {
  scriptMainUnstable?: boolean
  stylesGlobal?: boolean
  serverPlugin?: boolean
  threeJsBackend?: boolean
}

export async function saveClientModData (data: ClientMod) {
  const db = await dbPromise
  data.lastUpdated = Date.now()
  await db.put('mods', data)
  modsReactiveUpdater.counter++
}

async function getPlugin (name: string) {
  const db = await dbPromise
  return db.get('mods', name) as Promise<ClientMod | undefined>
}

export async function getAllMods () {
  const db = await dbPromise
  return db.getAll('mods') as Promise<ClientMod[]>
}

async function deletePlugin (name) {
  const db = await dbPromise
  await db.delete('mods', name)
  modsReactiveUpdater.counter++
}

async function removeAllMods () {
  const db = await dbPromise
  await db.clear('mods')
  modsReactiveUpdater.counter++
}

// ---

async function saveRepository (data: Repository) {
  const db = await dbPromise
  data.lastUpdated = Date.now()
  await db.put('repositories', data)
}

async function getRepository (url: string) {
  const db = await dbPromise
  return db.get('repositories', url) as Promise<Repository | undefined>
}

async function getAllRepositories () {
  const db = await dbPromise
  return db.getAll('repositories') as Promise<Repository[]>
}
window.getAllRepositories = getAllRepositories

async function deleteRepository (url) {
  const db = await dbPromise
  await db.delete('repositories', url)
}

// ---

// #endregion

export interface ClientModUiApi {
  registeredReactWrappers: Record<InjectUiPlace, Record<string, React.FC>>
  registerReactWrapper(place: 'root', id: string, component: React.FC)
}

window.mcraft = {
  version: process.env.RELEASE_TAG,
  build: process.env.BUILD_VERSION,
  ui: {
    registeredReactWrappers: {},
    registerReactWrapper (place: InjectUiPlace, id: string, component: React.FC) {
      window.mcraft.ui.registeredReactWrappers[place] ??= {}
      window.mcraft.ui.registeredReactWrappers[place][id] = component
    },
  },
  React,
  ReactJsxRuntime,
  ReactDOM,
  framerMotion,
  fileSize,
  classNames,
  valtio: {
    ...valtio,
    ...valtioUtils,
  },
  // openDB
}

const activateMod = async (mod: ClientMod, reason: string) => {
  if (mod.enabled === false) return false
  protectRuntime()
  console.debug(`Activating mod ${mod.name} (${reason})...`)
  window.loadedMods ??= {}
  if (window.loadedMods[mod.name]) {
    console.warn(`Mod is ${mod.name} already loaded, skipping activation...`)
    return false
  }
  if (mod.stylesGlobal) {
    const style = document.createElement('style')
    style.textContent = mod.stylesGlobal
    style.id = `mod-${mod.name}`
    document.head.appendChild(style)
  }
  if (mod.scriptMainUnstable) {
    const blob = new Blob([mod.scriptMainUnstable], { type: 'text/javascript' })
    const url = URL.createObjectURL(blob)
    // eslint-disable-next-line no-useless-catch
    try {
      const module = await import(/* webpackIgnore: true */ url)
      module.default?.(structuredClone(mod), { settings: getModSettingsProxy(mod) })
      window.loadedMods[mod.name] ??= {}
      window.loadedMods[mod.name].mainUnstableModule = module
    } catch (e) {
      throw e
    }
    URL.revokeObjectURL(url)
  }
  if (mod.threeJsBackend) {
    const blob = new Blob([mod.threeJsBackend], { type: 'text/javascript' })
    const url = URL.createObjectURL(blob)
    // eslint-disable-next-line no-useless-catch
    try {
      const module = await import(/* webpackIgnore: true */ url)
      // todo
      window.loadedMods[mod.name] ??= {}
      // for accessing global world var
      window.loadedMods[mod.name].threeJsBackendModule = module
    } catch (e) {
      throw e
    }
    URL.revokeObjectURL(url)
  }
  mod.enabled = true
  return true
}

const MODS_REQUEST_MESSAGE = 'mwc:modsRequest'
const MODS_RESPONSE_MESSAGE = 'mwc:modsResponse'
const MODS_REQUEST_TIMEOUT_MS = 50_000

const normalizeParentMod = (mod: Partial<ClientMod>): ClientMod => {
  const fallbackName = `parent-mod-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const name = typeof mod.name === 'string' && mod.name.length > 0 ? mod.name : fallbackName
  return {
    name,
    version: mod.version ?? '0.0.0',
    enabled: mod.enabled ?? true,
    description: mod.description,
    author: mod.author,
    section: mod.section,
    scriptMainUnstable: mod.scriptMainUnstable,
    serverPlugin: mod.serverPlugin,
    stylesGlobal: mod.stylesGlobal,
    threeJsBackend: mod.threeJsBackend,
    requiresNetwork: mod.requiresNetwork,
    fullyOffline: mod.fullyOffline,
    settings: mod.settings,
    actionsMain: mod.actionsMain,
    wasModifiedLocally: mod.wasModifiedLocally,
    autoUpdateOverride: mod.autoUpdateOverride,
    lastUpdated: mod.lastUpdated,
  }
}

const requestModsFromParentFrame = async (): Promise<ClientMod[]> => {
  if (window.parent === window) return []

  return new Promise<ClientMod[]>((resolve) => {
    let cleanedUp = false
    const cleanup = () => {
      if (cleanedUp) return
      cleanedUp = true
      window.removeEventListener('message', handleMessage)
      window.clearTimeout(timeout)
    }

    const handleMessage = (event: MessageEvent) => {
      const { data } = event
      if (!data || typeof data !== 'object' || data.type !== MODS_RESPONSE_MESSAGE) return
      cleanup()
      const modsPayload = Array.isArray(data.mods) ? data.mods : []
      resolve(modsPayload as ClientMod[])
    }

    const timeout = window.setTimeout(() => {
      cleanup()
      resolve([])
    }, MODS_REQUEST_TIMEOUT_MS)

    window.addEventListener('message', handleMessage)
    window.parent.postMessage({ type: MODS_REQUEST_MESSAGE }, '*')
  })
}

const loadParentFrameModsIfRequested = async (): Promise<Set<string>> => {
  const activatedModNames = new Set<string>()
  try {
    const params = new URLSearchParams(window.location.search)
    if (appQueryParams.parentFrameMods !== '1' && appQueryParams.parentFrameMods !== 'true') return activatedModNames
    if (window.parent === window) {
      console.warn('mods=parent query param detected but no parent frame is available')
      return activatedModNames
    }

    const modsFromParent = await requestModsFromParentFrame()
    if (!modsFromParent.length) return activatedModNames

    for (const rawMod of modsFromParent) {
      try {
        const normalizedMod = normalizeParentMod(rawMod)
        // Don't save parent frame mods - only activate for current session
        const activated = await activateMod(normalizedMod, 'parent-frame')
        if (activated) {
          activatedModNames.add(normalizedMod.name)
        }
      } catch (err) {
        const modName = rawMod?.name ?? 'parent-frame-mod'
        modsErrors[modName] ??= []
        modsErrors[modName].push(`parent-frame: ${String(err)}`)
        console.error(`Error activating parent-frame mod ${modName}:`, err)
      }
    }
  } catch (err) {
    console.error('Error loading mods from parent frame', err)
  }
  return activatedModNames
}

export const appStartup = async () => {
  void checkModsUpdates()
  const oldRegisteredReactWrappers = Object.entries(window.mcraft?.ui?.registeredReactWrappers).reduce((acc, [place, components]) => acc + Object.keys(components).length, 0)
  const parentFrameActivatedMods = await loadParentFrameModsIfRequested()

  const mods = await getAllMods()
  for (const mod of mods) {
    // Skip mods that were already activated from parent frame
    if (parentFrameActivatedMods.has(mod.name)) {
      continue
    }
    await activateMod(mod, 'autostart').catch(e => {
      modsErrors[mod.name] ??= []
      modsErrors[mod.name].push(`startup: ${String(e)}`)
      console.error(`Error activating mod on startup ${mod.name}:`, e)
    })
  }
  const newCount = Object.entries(window.mcraft?.ui?.registeredReactWrappers).reduce((acc, [place, components]) => acc + Object.keys(components).length, 0)
  hadReactUiRegistered.state = newCount !== oldRegisteredReactWrappers
  hadModsActivated.state = true
}

export const modsUpdateStatus = proxy({} as Record<string, [string, string]>)
export const modsWaitingReloadStatus = proxy({} as Record<string, boolean>)
export const modsErrors = proxy({} as Record<string, string[]>)
export const hadReactUiRegistered = proxy({ state: false })
export const hadModsActivated = proxy({ state: false })

const normalizeRepoUrl = (url: string) => {
  if (url.startsWith('https://')) return url
  if (url.startsWith('http://')) return url
  if (url.startsWith('//')) return `https:${url}`
  return `https://raw.githubusercontent.com/${url}/master`
}

const installOrUpdateMod = async (repo: Repository, mod: ClientModDefinition, activate = true, progress?: ProgressReporter) => {
  // eslint-disable-next-line no-useless-catch
  try {
    const fetchData = async (urls: string[]) => {
      const errored = [] as string[]
      // eslint-disable-next-line no-unreachable-loop
      for (const urlTemplate of urls) {
        const modNameOnly = mod.name.split('.').pop()
        const modFolder = repo.prefix === false ? modNameOnly : typeof repo.prefix === 'string' ? `${repo.prefix}/${modNameOnly}` : mod.name
        const url = new URL(`${modFolder}/${urlTemplate}`, normalizeRepoUrl(repo.url).replace(/\/$/, '') + '/').href
        // eslint-disable-next-line no-useless-catch
        try {
          const response = await fetch(url)
          if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`)
          return await response.text()
        } catch (e) {
          // errored.push(String(e))
          throw e
        }
      }
      console.warn(`[${mod.name}] Error installing component of ${urls[0]}: ${errored.join(', ')}`)
      return undefined
    }
    if (mod.stylesGlobal) {
      await progress?.executeWithMessage(
        `Downloading ${mod.name} styles`,
        async () => {
          mod.stylesGlobal = await fetchData(['global.css']) as any
        }
      )
    }
    if (mod.scriptMainUnstable) {
      await progress?.executeWithMessage(
        `Downloading ${mod.name} script`,
        async () => {
          mod.scriptMainUnstable = await fetchData(['mainUnstable.js']) as any
        }
      )
    }
    if (mod.threeJsBackend) {
      await progress?.executeWithMessage(
        `Downloading ${mod.name} three.js backend`,
        async () => {
          mod.threeJsBackend = await fetchData(['three.js']) as any
        }
      )
    }
    if (mod.serverPlugin) {
      if (mod.name.endsWith('.disabled')) throw new Error(`Mod name ${mod.name} can't end with .disabled`)
      await progress?.executeWithMessage(
        `Downloading ${mod.name} server plugin`,
        async () => {
          mod.serverPlugin = await fetchData(['serverPlugin.js']) as any
        }
      )
    }
    if (activate) {
      // todo try to de-activate mod if it's already loaded
      if (window.loadedMods?.[mod.name]) {
        modsWaitingReloadStatus[mod.name] = true
      } else {
        await activateMod(mod as ClientMod, 'install')
      }
    }
    await saveClientModData(mod as ClientMod)
    delete modsUpdateStatus[mod.name]
  } catch (e) {
    // console.error(`Error installing mod ${mod.name}:`, e)
    throw e
  }
}

const checkRepositoryUpdates = async (repo: Repository) => {
  for (const mod of repo.packages) {

    const modExisting = await getPlugin(mod.name)
    if (modExisting?.version && gt(mod.version, modExisting.version)) {
      modsUpdateStatus[mod.name] = [modExisting.version, mod.version]
      if (options.modsAutoUpdate === 'always' && (!repo.autoUpdateOverride && !modExisting.autoUpdateOverride)) {
        void installOrUpdateMod(repo, mod).catch(e => {
          console.error(`Error updating mod ${mod.name}:`, e)
        })
      }
    }
  }

}

export const fetchRepository = async (urlOriginal: string, url: string, hasMirrors = false) => {
  const fetchUrl = normalizeRepoUrl(url).replace(/\/$/, '') + '/mcraft-repo.json'
  try {
    const response = await fetch(fetchUrl).then(async res => res.json())
    if (!response.packages) throw new Error(`No packages field in the response json of the repository: ${fetchUrl}`)
    response.autoUpdateOverride = (await getRepository(urlOriginal))?.autoUpdateOverride
    response.url = urlOriginal
    void saveRepository(response)
    modsReactiveUpdater.counter++
    return true
  } catch (e) {
    console.warn(`Error fetching repository (trying other mirrors) ${url}:`, e)
    return false
  }
}

export const fetchAllRepositories = async () => {
  const repositories = await getAllRepositories()
  await Promise.all(repositories.map(async (repo) => {
    const allUrls = [repo.url, ...(repo.mirrorUrls || [])]
    for (const [i, url] of allUrls.entries()) {
      const isLast = i === allUrls.length - 1

      if (await fetchRepository(repo.url, url, !isLast)) break
    }
  }))
  appStorage.modsAutoUpdateLastCheck = Date.now()
}

const checkModsUpdates = async () => {
  await autoRefreshModRepositories()
  for (const repo of await getAllRepositories()) {

    await checkRepositoryUpdates(repo)
  }
}

const autoRefreshModRepositories = async () => {
  if (options.modsAutoUpdate === 'never') return
  const lastCheck = appStorage.modsAutoUpdateLastCheck
  if (lastCheck && Date.now() - lastCheck < 1000 * 60 * 60 * options.modsUpdatePeriodCheck) return
  await fetchAllRepositories()
  // todo think of not updating check timestamp on offline access
}

export const installModByName = async (repoUrl: string, name: string, progress?: ProgressReporter) => {
  progress?.beginStage('main', `Installing ${name}`)
  const repo = await getRepository(repoUrl)
  if (!repo) throw new Error(`Repository ${repoUrl} not found`)
  const mod = repo.packages.find(m => m.name === name)
  if (!mod) throw new Error(`Mod ${name} not found in repository ${repoUrl}`)
  await installOrUpdateMod(repo, mod, undefined, progress)
  progress?.endStage('main')
}

export const uninstallModAction = async (name: string) => {
  const choice = await showOptionsModal(`Uninstall mod ${name}?`, ['Yes'])
  if (!choice) return
  await deletePlugin(name)
  window.loadedMods ??= {}
  if (window.loadedMods[name]) {
    // window.loadedMods[name].default?.(null)
    delete window.loadedMods[name]
    modsWaitingReloadStatus[name] = true
  }
  // Clear any errors associated with the mod
  delete modsErrors[name]
}

export const setEnabledModAction = async (name: string, newEnabled: boolean) => {
  const mod = await getPlugin(name)
  if (!mod) throw new Error(`Mod ${name} not found`)
  if (newEnabled) {
    mod.enabled = true
    if (!window.loadedMods?.[mod.name]) {
      await activateMod(mod, 'manual')
    }
  } else {
    // todo deactivate mod
    mod.enabled = false
    if (window.loadedMods?.[mod.name]) {
      if (window.loadedMods[mod.name]?.threeJsBackendModule) {
        window.loadedMods[mod.name].threeJsBackendModule.deactivate()
        delete window.loadedMods[mod.name].threeJsBackendModule
      }
      if (window.loadedMods[mod.name]?.mainUnstableModule) {
        window.loadedMods[mod.name].mainUnstableModule.deactivate()
        delete window.loadedMods[mod.name].mainUnstableModule
      }

      if (Object.keys(window.loadedMods[mod.name]).length === 0) {
        delete window.loadedMods[mod.name]
      }
    }
  }
  await saveClientModData(mod)
}

export const modsReactiveUpdater = proxy({
  counter: 0
})

export const getAllModsDisplayList = async () => {
  const repos = await getAllRepositories()
  const installedMods = await getAllMods()
  const modsWithoutRepos = installedMods.filter(mod => !repos.some(repo => repo.packages.some(m => m.name === mod.name)))
  const mapMods = (mapMods: ClientMod[]) => mapMods.map(mod => ({
    ...mod,
    installed: installedMods.find(m => m.name === mod.name),
    activated: !!window.loadedMods?.[mod.name],
    installedVersion: installedMods.find(m => m.name === mod.name)?.version,
    canBeActivated: mod.scriptMainUnstable || mod.stylesGlobal,
  }))
  return {
    repos: repos.map(repo => ({
      ...repo,
      packages: mapMods(repo.packages as ClientMod[]),
    })),
    modsWithoutRepos: mapMods(modsWithoutRepos),
  }
}

export const removeRepositoryAction = async (url: string) => {
  // todo remove mods
  const choice = await showOptionsModal('Remove repository? Installed mods wont be automatically removed.', ['Yes'])
  if (!choice) return
  await deleteRepository(url)
  modsReactiveUpdater.counter++
}

export const selectAndRemoveRepository = async () => {
  const repos = await getAllRepositories()
  const choice = await showOptionsModal('Select repository to remove', repos.map(repo => repo.url))
  if (!choice) return
  await removeRepositoryAction(choice)
}

export const addRepositoryAction = async () => {
  const { url } = await showInputsModal('Add repository', {
    url: {
      type: 'text',
      label: 'Repository URL or slug',
      placeholder: 'github-owner/repo-name',
    },
  })
  if (!url) return
  await fetchRepository(url, url)
}

export const getServerPlugin = async (plugin: string) => {
  const mod = await getPlugin(plugin)
  if (!mod) return null
  if (mod.serverPlugin) {
    return {
      content: mod.serverPlugin,
      version: mod.version
    }
  }
  return null
}

export const getAvailableServerPlugins = async () => {
  const mods = await getAllMods()
  return mods.filter(mod => mod.serverPlugin)
}

window.inspectInstalledMods = getAllMods

type ModifiableField = {
  field: string
  label: string
  language: string
  getContent?: () => string
}

// ---

export const getAllModsModifiableFields = () => {
  const fields: ModifiableField[] = [
    {
      field: 'scriptMainUnstable',
      label: 'Main Thread Script (unstable)',
      language: 'js'
    },
    {
      field: 'stylesGlobal',
      label: 'Global CSS Styles',
      language: 'css'
    },
    {
      field: 'threeJsBackend',
      label: 'Three.js Renderer Backend Thread',
      language: 'js'
    },
    {
      field: 'serverPlugin',
      label: 'Built-in server plugin',
      language: 'js'
    }
  ]
  return fields
}

export const getModModifiableFields = (mod: ClientMod): ModifiableField[] => {
  return getAllModsModifiableFields().filter(field => mod[field.field])
}

export const getModSettingsProxy = (mod: ClientMod) => {
  if (!mod.settings) return valtio.proxy({})

  const proxy = valtio.proxy({})
  for (const [key, setting] of Object.entries(mod.settings)) {
    proxy[key] = options[`mod-${mod.name}-${key}`] ?? setting.default
  }

  valtio.subscribe(proxy, (ops) => {
    for (const op of ops) {
      const [type, path, value] = op
      const key = path[0] as string
      options[`mod-${mod.name}-${key}`] = value
    }
  })

  return proxy
}

export const callMethodAction = async (modName: string, type: 'main', method: string) => {
  try {
    const mod = window.loadedMods?.[modName]
    await mod[method]()
  } catch (err) {
    showNotification(`Failed to execute ${method}`, `Problem in ${type} js script of ${modName}`, true)
  }
}
