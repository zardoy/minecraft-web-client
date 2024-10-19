export function createWorkerProxy<T extends Record<string, (...args: any[]) => void>> (handlers: T, channel?: MessagePort): { __workerProxy: T } {
  const target = channel ?? globalThis
  target.addEventListener('message', (event: any) => {
    const { type, args } = event.data
    if (handlers[type]) {
      handlers[type](...args)
    }
  })
  return null as any
}

/**
 * in main thread
 * ```ts
 * // either:
 * import type { importedTypeWorkerProxy } from './worker'
 * // or:
 * type importedTypeWorkerProxy = import('./worker').importedTypeWorkerProxy
 *
 * const workerChannel = useWorkerProxy<typeof importedTypeWorkerProxy>(worker)
 * ```
 */
export const useWorkerProxy = <T extends { __workerProxy: Record<string, (...args: any[]) => void> }> (worker: Worker | MessagePort, autoTransfer = true): T['__workerProxy'] & {
  transfer: (...args: Transferable[]) => T['__workerProxy']
} => {
  // in main thread
  return new Proxy({} as any, {
    get (target, prop) {
      if (prop === 'transfer') {
        return (...transferable: Transferable[]) => {
          return new Proxy({}, {
            get (target, prop) {
              return (...args: any[]) => {
                worker.postMessage({
                  type: prop,
                  args,
                }, transferable)
              }
            }
          })
        }
      }
      return (...args: any[]) => {
        const transfer = autoTransfer ? args.filter(arg => arg instanceof ArrayBuffer || arg instanceof MessagePort || arg instanceof ImageBitmap || arg instanceof OffscreenCanvas || arg instanceof ImageData) : []
        worker.postMessage({
          type: prop,
          args,
        }, transfer as any[])
      }
    }
  })
}

// const workerProxy = createWorkerProxy({
//     startRender (canvas: HTMLCanvasElement) {
//     },
// })

// const worker = useWorkerProxy(null, workerProxy)

// worker.
