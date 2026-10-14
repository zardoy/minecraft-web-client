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

/** Pings all proxies and resolves with the first one that responded (or null if all failed). Other pings keep running to fill `proxyPingState` */
export async function selectBestProxy (proxies: string[]): Promise<string | null> {
  // Cancel any ongoing pings
  cancelProxyPinging()
  const abortController = new AbortController()
  currentPingAbortController = abortController
  proxyPingState.checkStarted = true

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
  if (currentPingAbortController) {
    currentPingAbortController.abort()
    currentPingAbortController = null
    proxyPingState.checkStarted = false
  }
}
