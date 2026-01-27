import type { AppConfig } from './appConfig'
import { miscUiState } from './globalState'

const qsParams = new URLSearchParams(window.location?.search ?? '')

export type AppQsParams = {
  // AddServerOrConnect.tsx params
  ip?: string
  name?: string
  version?: string
  proxy?: string
  username?: string
  lockConnect?: string
  autoConnect?: string
  alwaysReconnect?: string
  // googledrive.ts params
  state?: string
  // ServersListProvider.tsx params
  serversList?: string
  // Map and texture params
  texturepack?: string
  map?: string
  mapDirBaseUrl?: string
  mapDirGuess?: string
  // Singleplayer params
  singleplayer?: string
  sp?: string
  loadSave?: string
  // Server params
  reconnect?: string
  server?: string
  // Peer connection params
  connectPeer?: string
  peerVersion?: string
  // UI params
  modal?: string
  viewerConnect?: string
  playground?: string
  // Map version param
  mapVersion?: string
  // Command params
  command?: string
  // Misc params
  suggest_save?: string
  noPacketsValidation?: string
  testCrashApp?: string
  onlyConnect?: string
  connectText?: string
  freezeSettings?: string
  testIosCrash?: string
  addPing?: string
  parentFrameMods?: string

  // Replay params
  replayFilter?: string
  replaySpeed?: string
  replayFileUrl?: string
  replayValidateClient?: string
  replayStopOnError?: string
  replaySkipMissingOnTimeout?: string
  replayPacketsSenderDelay?: string

  // Benchmark params
  openBenchmark?: string
  renderDistance?: string
  downloadBenchmark?: string
  benchmarkMapZipUrl?: string
  benchmarkPosition?: string
}

export type AppQsParamsArray = {
  mapDir?: string[]
  setting?: string[]
  serverSetting?: string[]
  command?: string[]
}

type AppQsParamsArrayTransformed = {
  [k in keyof AppQsParamsArray]: string[]
}

globalThis.process ??= {} as any
const initialAppConfig = process?.env?.INLINED_APP_CONFIG as AppConfig ?? {}

export const appQueryParams = new Proxy<AppQsParams>({} as AppQsParams, {
  get (target, property) {
    if (typeof property !== 'string') {
      return undefined
    }
    const qsParam = qsParams.get(property)
    if (qsParam) return qsParam
    return miscUiState.appConfig?.appParams?.[property]
  },
})

export const appQueryParamsArray = new Proxy({} as AppQsParamsArrayTransformed, {
  get (target, property) {
    if (typeof property !== 'string') {
      return null
    }
    const qsParam = qsParams.getAll(property)
    if (qsParam.length) return qsParam
    return miscUiState.appConfig?.appParams?.[property] ?? []
  },
})

export function updateQsParam (name: keyof AppQsParams, value: string | undefined) {
  const url = new URL(window.location.href)
  if (value) {
    url.searchParams.set(name, value)
  } else {
    url.searchParams.delete(name)
  }
  window.history.replaceState({}, '', url.toString())
}

// Helper function to check if a specific query parameter exists
export const hasQueryParam = (param: keyof AppQsParams) => qsParams.has(param)

// Helper function to get all query parameters as a URLSearchParams object
export const getRawQueryParams = () => qsParams;

(globalThis as any).debugQueryParams = Object.fromEntries(qsParams.entries())
