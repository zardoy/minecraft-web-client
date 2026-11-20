import { describe, expect, it } from 'vitest'
import { applyWorkerMessage, summarizeWorkers, WorkerStartState } from './workerProgress'

describe('worldgen startup progress', () => {
  it('the pool is in the stage of its slowest worker', () => {
    expect(summarizeWorkers([{ stage: 'warmup' }, { stage: 'registry' }, { stage: 'ready' }]).stage).toBe('registry')
    expect(summarizeWorkers([{ stage: 'ready' }, { stage: 'ready' }]).stage).toBe('ready')
    expect(summarizeWorkers([]).stage).toBe('download')
  })

  it('sums the download over workers and only gives a fraction when every worker knows its size', () => {
    const summary = summarizeWorkers([{ stage: 'download', loaded: 1_000_000, total: 4_000_000 }, { stage: 'download', loaded: 3_000_000, total: 4_000_000 }])
    expect(summary).toMatchObject({ downloadedBytes: 4_000_000, totalBytes: 8_000_000, downloadFraction: 0.5 })
    expect(summarizeWorkers([{ stage: 'download', loaded: 1000, total: 4000 }, { stage: 'download', loaded: 10 }]).downloadFraction).toBeUndefined()
  })

  it('follows the messages of a worker and does not mistake the registry being ready for the generator being ready', () => {
    let state: WorkerStartState = { stage: 'download' }
    state = applyWorkerMessage(state, { type: 'progress', stage: 'download', loaded: 10, total: 100 })
    expect(state).toEqual({ stage: 'download', loaded: 10, total: 100 })
    state = applyWorkerMessage(state, { type: 'progress', stage: 'registry' })
    state = applyWorkerMessage(state, { type: 'ready' })
    expect(state.stage).toBe('registry')
    state = applyWorkerMessage(state, { type: 'progress', stage: 'download', loaded: 20, total: 100 })
    expect(state.stage).toBe('registry')
    state = applyWorkerMessage(state, { type: 'progress', stage: 'warmup' })
    expect(state.stage).toBe('warmup')
    state = applyWorkerMessage(state, { type: 'gen-ready' })
    expect(state.stage).toBe('ready')
    // another generator (the Nether) warming up later does not take a ready worker back
    expect(applyWorkerMessage(state, { type: 'progress', stage: 'generator' }).stage).toBe('ready')
  })
})
