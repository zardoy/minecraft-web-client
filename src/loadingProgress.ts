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
  { id: 'viewer', label: 'Starting renderer', weight: 18, expectedMs: 6000 },
  { id: 'chunks', label: 'Loading chunks', weight: 50, expectedMs: 15_000 }
]

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

/** @param waitForChunks the loading screen stays until the chunks around the player are loaded (otherwise it ends right after the renderer started) */
export const startSingleplayerLoadingProgress = ({ waitForChunks }: { waitForChunks: boolean }) => {
  endLoadingProgress()
  loadingProgressTimeline.length = 0
  startedAt = performance.now()
  model = new LoadingProgressModel(SINGLEPLAYER_STAGES.filter(stage => waitForChunks || stage.id !== 'chunks'))
  loadingProgressState.active = true
  beginLoadingStage('server')
  unsubscribeWorldgen = subscribeWorldgenStartup(onWorldgenStartup)
  // the estimate of a running stage moves with time even when nothing reports
  ticker = setInterval(refresh, 100)
}
