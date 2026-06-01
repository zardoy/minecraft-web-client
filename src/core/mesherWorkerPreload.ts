import { UserError } from '../mineflayer/userError'

/** Structured reason so logs / support can tell fetch vs worker vs ping failures apart. */
export type MesherWorkerPreloadFailure =
  | { phase: 'fetch'; code: 'timeout' | 'network' | 'bad-status'; status?: number; detail?: string }
  | { phase: 'fetch'; code: 'invalid-body'; hint: 'empty' | 'html' }
  | { phase: 'worker'; code: 'construct-failed'; message: string }
  | { phase: 'worker'; code: 'script-error'; message: string }
  | { phase: 'ping'; code: 'timeout' | 'messageerror' | 'post-failed'; detail?: string }

export class MesherWorkerPreloadError extends UserError {
  readonly failure: MesherWorkerPreloadFailure

  constructor (message: string, failure: MesherWorkerPreloadFailure) {
    super(message)
    this.name = 'MesherWorkerPreloadError'
    this.failure = failure
    console.error('[mesher preload]', failure, message)
  }
}

function isMcWebPong (data: unknown): boolean {
  if (!data || typeof data !== 'object') return false
  if ((data as { type?: string }).type === 'mc-web-pong') return true
  if (Array.isArray(data)) {
    return data.some(d => d && typeof d === 'object' && (d as { type?: string }).type === 'mc-web-pong')
  }
  return false
}

const DEFAULT_FETCH_MS = 45_000
const DEFAULT_PING_MS = 10_000

/**
 * Validates `mesher.js` over HTTP (not HTML/error page), then instantiates a Worker and waits for `mc-web-pong`.
 * Single-file builds skip (blob worker).
 */
export async function preloadMesherWorkerScript (opts?: {
  fetchTimeoutMs?: number
  pingTimeoutMs?: number
}): Promise<void> {
  if (process.env.SINGLE_FILE_BUILD) return

  const fetchTimeoutMs = opts?.fetchTimeoutMs ?? DEFAULT_FETCH_MS
  const pingTimeoutMs = opts?.pingTimeoutMs ?? DEFAULT_PING_MS
  const scriptUrl = new URL('mesher.js', document.baseURI).href

  let res: Response
  try {
    const ctrl = new AbortController()
    const t = window.setTimeout(() => ctrl.abort(), fetchTimeoutMs)
    try {
      res = await fetch(scriptUrl, {
        credentials: 'same-origin',
        cache: 'force-cache',
        signal: ctrl.signal,
      })
    } finally {
      clearTimeout(t)
    }
  } catch (e: any) {
    const err = e
    if (err?.name === 'AbortError') {
      throw new MesherWorkerPreloadError(
        `Mesher script fetch timed out after ${fetchTimeoutMs}ms (${scriptUrl}).`,
        { phase: 'fetch', code: 'timeout' }
      )
    }
    throw new MesherWorkerPreloadError(
      `Mesher script fetch failed (network): ${err?.message ?? e ?? 'unknown error'}. URL: ${scriptUrl}`,
      { phase: 'fetch', code: 'network', detail: String(err?.message ?? e) }
    )
  }

  if (!res.ok) {
    throw new MesherWorkerPreloadError(
      `Mesher script HTTP ${res.status} ${res.statusText}: ${scriptUrl}`,
      { phase: 'fetch', code: 'bad-status', status: res.status }
    )
  }

  const contentType = res.headers.get('content-type') ?? ''
  const buf = await res.arrayBuffer()
  if (buf.byteLength === 0) {
    throw new MesherWorkerPreloadError(
      `Mesher script response was empty: ${scriptUrl}`,
      { phase: 'fetch', code: 'invalid-body', hint: 'empty' }
    )
  }

  const headSize = Math.min(1024, buf.byteLength)
  const head = new TextDecoder().decode(buf.slice(0, headSize)).trimStart()
  if (head.startsWith('<!DOCTYPE') || head.startsWith('<html') || head.startsWith('<HTML')) {
    throw new MesherWorkerPreloadError(
      `Mesher URL returned HTML (wrong path, redirect, or SPA fallback), not JavaScript: ${scriptUrl}`,
      { phase: 'fetch', code: 'invalid-body', hint: 'html' }
    )
  }

  if (contentType.length > 0 && !/javascript|ecmascript/i.test(contentType)) {
    console.warn('[mesher preload] Unexpected Content-Type for mesher.js:', contentType, scriptUrl)
  }

  let worker: Worker | undefined
  try {
    worker = new Worker(scriptUrl)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new MesherWorkerPreloadError(
      `Could not construct Worker for mesher (${scriptUrl}): ${msg}`,
      { phase: 'worker', code: 'construct-failed', message: msg }
    )
  }

  await new Promise<void>((resolve, reject) => {
    let settled = false
    const pingTimer = window.setTimeout(() => {
      if (settled) return
      settled = true
      cleanup()
      reject(new MesherWorkerPreloadError(
        `Mesher worker did not reply with mc-web-pong within ${pingTimeoutMs}ms (wrong script, SW stale cache, worker blocked, or COEP/CORP). URL: ${scriptUrl}`,
        { phase: 'ping', code: 'timeout' }
      ))
    }, pingTimeoutMs)

    const cleanup = () => {
      clearTimeout(pingTimer)
      const w = worker
      worker = undefined
      if (!w) return
      w.removeEventListener('message', onMessage)
      w.removeEventListener('error', onError)
      w.removeEventListener('messageerror', onMessageError)
      w.terminate()
    }

    const done = () => {
      if (settled) return
      settled = true
      cleanup()
      resolve()
    }

    const fail = (err: Error) => {
      if (settled) return
      settled = true
      cleanup()
      reject(err)
    }

    function onMessage (ev: MessageEvent) {
      if (isMcWebPong(ev.data)) done()
    }

    function onError (ev: ErrorEvent) {
      fail(new MesherWorkerPreloadError(
        `Mesher worker script failed to load or threw during startup: ${ev.message || 'unknown'} @ ${scriptUrl}`,
        { phase: 'worker', code: 'script-error', message: ev.message }
      ))
    }

    function onMessageError () {
      fail(new MesherWorkerPreloadError(
        `Mesher worker message channel error (structured clone / deserialization). URL: ${scriptUrl}`,
        { phase: 'ping', code: 'messageerror' }
      ))
    }

    worker!.addEventListener('message', onMessage)
    worker!.addEventListener('error', onError)
    worker!.addEventListener('messageerror', onMessageError)

    try {
      worker!.postMessage({ type: 'mc-web-ping', t: performance.now(), workerIndex: 0 })
    } catch (e: unknown) {
      const detail = e instanceof Error ? e.message : String(e)
      fail(new MesherWorkerPreloadError(
        `Failed to post mc-web-ping to mesher worker: ${detail}`,
        { phase: 'ping', code: 'post-failed', detail }
      ))
    }
  })
}
