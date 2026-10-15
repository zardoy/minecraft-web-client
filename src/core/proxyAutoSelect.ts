import { proxy } from 'valtio'
import { pingProxyServer } from './pingProxy'

export interface ProxyPingState {
  selectedProxy: string | null
  proxyStatus: Record<string, {
    status: 'checking' | 'success' | 'error'
    latency?: number
    error?: string
  }>
  checkStarted: boolean
}

export const proxyPingState = proxy<ProxyPingState>({
  selectedProxy: null,
  proxyStatus: {},
  checkStarted: false
})

let currentPingAbortController: AbortController | null = null

export const normalizeProxyUrl = (proxyUrl: string) => {
  return proxyUrl.startsWith(':') ? `${location.protocol}//${location.hostname}${proxyUrl}` : proxyUrl
}

/** Don't ping the same list again if it was pinged this recently (or is being pinged right now) */
const REUSE_RESULT_MS = 30_000

let lastRun: { key: string, startedAt: number, promise: Promise<string | null>, failed: boolean } | null = null

/**
 * Pings all proxies and resolves with the first one that responded (or null if all failed). Other pings keep running to fill `proxyPingState`.
 * Repeated calls for the same list reuse the ongoing / recent run so it can't be used to spam proxies.
 */
export async function selectBestProxy (proxies: string[]): Promise<string | null> {
  const key = proxies.join('\n')
  if (lastRun?.key === key && !lastRun.failed && Date.now() - lastRun.startedAt < REUSE_RESULT_MS) {
    return lastRun.promise
  }
  const run = { key, startedAt: Date.now(), promise: pingProxies(proxies), failed: false }
  lastRun = run
  void run.promise.then(best => {
    // allow retry right away when nothing worked
    if (!best) run.failed = true
  })
  return run.promise
}

async function pingProxies (proxies: string[]): Promise<string | null> {
  // Cancel any ongoing pings
  cancelProxyPinging()
  const abortController = new AbortController()
  currentPingAbortController = abortController
  proxyPingState.checkStarted = true
  proxyPingState.selectedProxy = null

  // Reset ping states
  for (const proxy of proxies) {
    proxyPingState.proxyStatus[proxy] = { status: 'checking' }
  }

  const pingPromises = proxies.map(async (proxy) => {
    const normalizedProxy = normalizeProxyUrl(proxy)
    const result = await pingProxyServer(normalizedProxy, abortController.signal)
    // superseded by a newer run, don't overwrite its state
    if (abortController.signal.aborted) throw new Error('Aborted')
    if (!result.success) {
      proxyPingState.proxyStatus[proxy] = { status: 'error', error: result.error }
      throw new Error(result.error)
    }
    proxyPingState.proxyStatus[proxy] = { status: 'success', latency: result.latency }
    // promises resolve in completion order, so the first one to get here is the fastest
    proxyPingState.selectedProxy ??= normalizedProxy
    return normalizedProxy
  })

  void Promise.allSettled(pingPromises).then(() => {
    if (currentPingAbortController === abortController) {
      currentPingAbortController = null
      proxyPingState.checkStarted = false
    }
  })

  try {
    return await Promise.any(pingPromises)
  } catch {
    // all pings failed
    return null
  }
}

export function cancelProxyPinging () {
  lastRun = null
  if (currentPingAbortController) {
    currentPingAbortController.abort()
    currentPingAbortController = null
    proxyPingState.checkStarted = false
  }
}
