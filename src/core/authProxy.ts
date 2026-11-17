export interface AuthProxySources {
  /** proxy of this connection; a direct WebSocket server (wss://...) has none */
  proxy: string | undefined
  /** proxies from the proxy settings (the selected one, or the known list when auto-selecting) */
  selected: string | undefined
  proxies: string[]
  isAutoSelect: boolean | undefined
}

/**
 * Microsoft sign-in always goes through a proxy (its auth and session endpoints), also when the server itself is reached directly over a WebSocket
 * and the connection has no proxy. Use the connection's proxy, else the one from the proxy settings, else the best of the known proxies.
 */
export const resolveAuthProxy = async (sources: AuthProxySources, selectBest: (proxies: string[]) => Promise<string | null>): Promise<string> => {
  if (sources.proxy) return sources.proxy
  if (!sources.isAutoSelect && sources.selected) return sources.selected
  const best = sources.proxies.length > 0 ? await selectBest(sources.proxies) : null
  if (best) return best
  if (sources.selected) return sources.selected
  throw new Error('Microsoft sign-in needs a proxy server, but none is configured or reachable. Add one in the server list proxy settings.')
}
