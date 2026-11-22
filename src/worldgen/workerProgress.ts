// What the worldgen workers report while they start (see WorkerProgress in minecraft-worldgen worker/core), combined over all workers of the pool.
// The client only listens (addEventListener) to the workers it creates, so nothing in flying-squid / the pool has to know. An older minecraft-worldgen that
// sends no progress messages still works: the workers just stay in `download` until they are ready and the loading bar falls back to its time estimate.

export type WorkerStartStage = 'download' | 'registry' | 'generator' | 'warmup' | 'ready'
const ORDER: WorkerStartStage[] = ['download', 'registry', 'generator', 'warmup', 'ready']

export interface WorkerStartState {
  stage: WorkerStartStage
  loaded?: number
  total?: number
}

export interface WorldgenStartupSummary {
  /** the stage of the slowest worker: the pool is only as ready as its last worker */
  stage: WorkerStartStage
  /** only for `download` when every worker knows its total */
  downloadFraction?: number
  downloadedBytes?: number
  totalBytes?: number
}

export const summarizeWorkers = (states: WorkerStartState[]): WorldgenStartupSummary => {
  if (states.length === 0) return { stage: 'download' }
  const stage = ORDER[Math.min(...states.map(s => ORDER.indexOf(s.stage)))]
  if (stage !== 'download') return { stage }
  const known = states.every(s => s.total !== undefined && s.total > 0)
  const downloadedBytes = states.reduce((sum, s) => sum + (s.loaded ?? 0), 0)
  if (!known) return { stage, downloadedBytes }
  const totalBytes = states.reduce((sum, s) => sum + s.total!, 0)
  return { stage, downloadedBytes, totalBytes, downloadFraction: downloadedBytes / totalBytes }
}

/** applies one message of a worker to its state; once a worker is `ready` (its generator exists) later progress of other generators is ignored */
export const applyWorkerMessage = (state: WorkerStartState, message: any): WorkerStartState => {
  if (state.stage === 'ready' || !message || typeof message !== 'object') return state
  if (message.type === 'gen-ready') return { stage: 'ready' }
  if (message.type === 'progress' && ORDER.includes(message.stage)) {
    // never go back, `ready` of the registry (`type: 'ready'`) is not the generator being ready
    if (ORDER.indexOf(message.stage) < ORDER.indexOf(state.stage)) return state
    return { stage: message.stage, loaded: message.loaded ?? state.loaded, total: message.total ?? state.total }
  }
  return state
}

const states: WorkerStartState[] = []
const listeners = new Set<(summary: WorldgenStartupSummary) => void>()

export const subscribeWorldgenStartup = (listener: (summary: WorldgenStartupSummary) => void) => {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

const emit = () => {
  const summary = summarizeWorkers(states)
  for (const listener of listeners) listener(summary)
}

/** call for every worker the factory creates */
export const observeWorldgenWorker = (worker: Pick<Worker, 'addEventListener'>) => {
  const index = states.push({ stage: 'download' }) - 1
  emit()
  worker.addEventListener('message', event => {
    const next = applyWorkerMessage(states[index], (event).data)
    if (next === states[index]) return
    states[index] = next
    emit()
  })
}
