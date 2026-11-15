import { LocalServer } from './customServer'
import './worldgen/datapack'
import { createWorldgenWorker } from './worldgen/workerFactory'

const { createMCServer } = require('flying-squid/dist')

/**
 * Chunk generation of the noise generator runs in Web Workers (otherwise it blocks the main thread: ~100-600 ms per chunk).
 * Single file builds can't emit a separate worker script, so they keep generating in-process.
 * `generation.options.workers`: number of workers (default min(4, cores - 1)), 0 = in-process.
 */
const withWorldgenWorkers = (serverOptions) => {
  const gen = serverOptions.generation
  if (process.env.SINGLE_FILE_BUILD === 'true' || typeof Worker === 'undefined') return serverOptions
  // debugging override: ?worldgenWorkers=N (0 = generate on the main thread)
  const override = new URLSearchParams(globalThis.location?.search ?? '').get('worldgenWorkers')
  const workers: number | undefined = override === null ? gen?.options?.workers : Number(override)
  if (gen?.name !== 'noise' || workers === 0 || gen.options?.workerFactory) {
    return workers === 0 && gen?.name === 'noise' ? { ...serverOptions, generation: { ...gen, options: { ...gen.options, workers: 0 } } } : serverOptions
  }
  const workerFactory = createWorldgenWorker
  return { ...serverOptions, generation: { ...gen, options: { ...gen.options, workers, workerFactory } } }
}

export const startLocalServer = (serverOptions) => {
  const passOptions = { ...withWorldgenWorkers(serverOptions), Server: LocalServer }
  const server: NonNullable<typeof localServer> = createMCServer(passOptions)
  server.formatMessage = (message) => `[server] ${message}`
  server.options = passOptions
  //@ts-expect-error todo remove
  server.looseProtocolMode = true
  return server
}

// features that flying-squid doesn't support at all
// todo move & generate in flying-squid
export const unsupportedLocalServerFeatures = ['transactionPacketExists', 'teleportUsesOwnPacket']
