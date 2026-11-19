import { proxy } from 'valtio'
import { LoadingProgressModel, LoadingStageDef } from './loadingProgressModel'
import { subscribeWorldgenStartup, WorldgenStartupSummary } from './worldgen/workerProgress'

// Shown by the loading screen (AppStatus): one bar over everything singleplayer has to do before the world is playable.
// Weights follow the time the stages take on a slow phone (iPhone XR, dev build, one worldgen worker): ~2 s server, ~2 s download, ~0.5 s generator,
// ~7 s warm-up, 3-7 s spawn terrain, ~10 s renderer, ~30 s chunks. `expectedMs` is about half of the typical duration (a stage without a signal is at 63 % after it,
// ~86 % after the typical duration), so the stage rarely ends with a big jump. Stages end on real events, a faster device just passes them quicker.
const SINGLEPLAYER_STAGES: LoadingStageDef[] = [
  { id: 'server', label: 'Starting local server', weight: 3, expectedMs: 1200 },
  { id: 'download', label: 'Downloading world generator', weight: 4, expectedMs: 800 },
  { id: 'generator', label: 'Preparing world generator', weight: 2, expectedMs: 400 },
  { id: 'warmup', label: 'Warming up world generator', weight: 13, expectedMs: 3500 },
  { id: 'spawn', label: 'Generating spawn terrain', weight: 10, expectedMs: 3000 },
  { id: 'join', label: 'Joining the world', weight: 2, expectedMs: 600 },
  { id: 'viewer', label: 'Starting renderer', weight: 18, expectedMs: 6000 },
  { id: 'chunks', label: 'Loading chunks', weight: 50, expectedMs: 15_000 }
]

// Joining a server. Weights follow one join of wss://play.mcraft.fun (1.17.1) in desktop Chrome with the CPU 6x slower: game data 1.7 s, server ping 2.4 s,
// textures 1.3 s, connect + login + join 0.6 s together. Stages that cannot happen for a connection (no proxy for wss:// servers, a fixed version, no Microsoft account) are left out
// when the bar starts, so they do not make it jump; the others that do not happen (no configuration phase before 1.20.2, no server resource pack)
// are passed over when a later stage begins.
const SERVER_STAGES: Array<LoadingStageDef & { when?: keyof ServerLoadingOptions }> = [
  { id: 'data', label: 'Loading game data', weight: 12, expectedMs: 1200 },
  { id: 'proxy', label: 'Finding the best proxy', weight: 6, expectedMs: 1200, when: 'autoProxy' },
  { id: 'version', label: 'Checking the server', weight: 16, expectedMs: 1500, when: 'autoVersion' },
  { id: 'textures', label: 'Preparing textures', weight: 10, expectedMs: 900 },
  { id: 'auth', label: 'Signing in', weight: 10, expectedMs: 2500, when: 'microsoftAuth' },
  { id: 'connect', label: 'Connecting to the server', weight: 4, expectedMs: 300 },
  { id: 'login', label: 'Logging in', weight: 3, expectedMs: 300 },
  { id: 'config', label: 'Receiving server data', weight: 3, expectedMs: 400 },
  { id: 'join', label: 'Joining the world', weight: 3, expectedMs: 400 },
  { id: 'resourcePack', label: 'Downloading server resource pack', weight: 12, expectedMs: 4000 },
  { id: 'viewer', label: 'Starting renderer', weight: 10, expectedMs: 1500 },
  { id: 'chunks', label: 'Loading chunks', weight: 30, expectedMs: 8000, when: 'waitForChunks' }
]

export interface ServerLoadingOptions {
  /** a proxy is picked by pinging the known ones */
  autoProxy: boolean
  /** the server is pinged for its version first */
  autoVersion: boolean
  microsoftAuth: boolean
  waitForChunks: boolean
}

export const loadingProgressState = proxy({
  active: false,
  /** 0..1 */
  value: 0,
  label: '',
  detail: ''
})

/** when each stage began (ms since the load started), to calibrate the stage durations on a real device: `loadingProgressTimeline` in the console */
export const loadingProgressTimeline: Array<{ stage: string, at: number }> = []
globalThis.loadingProgressTimeline = loadingProgressTimeline

let model: LoadingProgressModel | undefined
let ticker: ReturnType<typeof setInterval> | undefined
let unsubscribeWorldgen: (() => void) | undefined
let startedAt = 0

const refresh = () => {
  if (!model) return
  loadingProgressState.value = model.value()
  loadingProgressState.label = model.currentStage?.label ?? ''
  loadingProgressState.detail = model.detail
}

export const beginLoadingStage = (id: string) => {
  if (!model) return
  const before = model.currentStage?.id
  model.begin(id)
  if (model.currentStage?.id !== before) loadingProgressTimeline.push({ stage: id, at: Math.round(performance.now() - startedAt) })
  refresh()
}

export const reportLoadingStage = (id: string, fraction: number, detail?: string) => {
  model?.report(id, fraction, detail)
  refresh()
}

export const endLoadingProgress = () => {
  if (!model) return
  model.finishAll()
  refresh()
  model = undefined
  unsubscribeWorldgen?.()
  unsubscribeWorldgen = undefined
  clearInterval(ticker)
  ticker = undefined
  loadingProgressState.active = false
}

const formatMb = (bytes: number) => `${(bytes / 1_048_576).toFixed(1)} MB`

const onWorldgenStartup = (summary: WorldgenStartupSummary) => {
  switch (summary.stage) {
    case 'download': {
      beginLoadingStage('download')
      if (summary.downloadFraction !== undefined) {
        reportLoadingStage('download', summary.downloadFraction, `${formatMb(summary.downloadedBytes!)} / ${formatMb(summary.totalBytes!)}`)
      }
      break
    }
    case 'registry':
    case 'generator': {
      beginLoadingStage('generator')
      break
    }
    case 'warmup': {
      beginLoadingStage('warmup')
      break
    }
    case 'ready': {
      beginLoadingStage('spawn')
      break
    }
  }
}

const start = (stages: LoadingStageDef[], firstStage: string) => {
  endLoadingProgress()
  loadingProgressTimeline.length = 0
  startedAt = performance.now()
  model = new LoadingProgressModel(stages)
  loadingProgressState.active = true
  beginLoadingStage(firstStage)
  // the estimate of a running stage moves with time even when nothing reports
  ticker = setInterval(refresh, 100)
}

/** @param waitForChunks the loading screen stays until the chunks around the player are loaded (otherwise it ends right after the renderer started) */
export const startSingleplayerLoadingProgress = ({ waitForChunks }: { waitForChunks: boolean }) => {
  start(SINGLEPLAYER_STAGES.filter(stage => waitForChunks || stage.id !== 'chunks'), 'server')
  unsubscribeWorldgen = subscribeWorldgenStartup(onWorldgenStartup)
}

export const startServerLoadingProgress = (options: ServerLoadingOptions) => {
  start(SERVER_STAGES.filter(stage => !stage.when || options[stage.when]), 'data')
}

/** protocol state of the connection (minecraft-protocol `state` event) */
export const onConnectionStateChanged = (state: string) => {
  switch (state) {
    case 'login': {
      beginLoadingStage('login')
      break
    }
    case 'configuration': {
      beginLoadingStage('config')
      break
    }
    case 'play': {
      beginLoadingStage('join')
      break
    }
  }
}

export const reportResourcePackDownload = (loaded: number, total: number) => {
  beginLoadingStage('resourcePack')
  if (total > 0) reportLoadingStage('resourcePack', loaded / total, `${formatMb(loaded)} / ${formatMb(total)}`)
}
