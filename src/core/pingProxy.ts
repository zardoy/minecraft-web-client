const CONNECT_TIMEOUT = 5000
const PING_TIMEOUT = 5000

class LatencyMonitor {
  private ws: WebSocket | null = null
  private isConnected = false

  constructor (public serverUrl: string) {
  }

  async connect () {
    return new Promise<void>((resolve, reject) => {
      // Convert http(s):// to ws(s)://
      let wsUrl = this.serverUrl.replace(/^http/, 'ws') + '/api/vm/net/ping'
      if (!wsUrl.startsWith('ws')) {
        wsUrl = 'wss://' + wsUrl
      }
      const ws = new WebSocket(wsUrl)
      this.ws = ws

      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'))
        this.disconnect()
      }, CONNECT_TIMEOUT)

      ws.onopen = () => {
        clearTimeout(timeout)
        this.isConnected = true
        resolve()
      }
      ws.onerror = (error) => {
        clearTimeout(timeout)
        reject(error)
      }
    })
  }

  async measureLatency (): Promise<{
    roundTripTime: number;
    serverProcessingTime: number;
    networkLatency: number;
  }> {
    return new Promise((resolve, reject) => {
      const { ws } = this
      if (!this.isConnected || !ws) {
        reject(new Error('Not connected'))
        return
      }

      const pingId = Date.now().toString()
      const startTime = performance.now()

      const cleanup = () => {
        clearTimeout(timeout)
        ws.removeEventListener('message', handler)
      }

      const handler = (event: MessageEvent) => {
        if (typeof event.data === 'string' && event.data.startsWith('pong:')) {
          const [_, receivedPingId, serverProcessingTime] = event.data.split(':')

          if (receivedPingId === pingId) {
            cleanup()
            const roundTripTime = performance.now() - startTime

            resolve({
              roundTripTime,
              serverProcessingTime: parseFloat(serverProcessingTime),
              networkLatency: roundTripTime - parseFloat(serverProcessingTime)
            })
          }
        }
      }

      const timeout = setTimeout(() => {
        cleanup()
        reject(new Error('Ping timeout'))
      }, PING_TIMEOUT)

      ws.addEventListener('message', handler)
      ws.send('ping:' + pingId)
    })
  }

  disconnect () {
    if (this.ws) {
      this.ws.close()
      this.ws = null
      this.isConnected = false
    }
  }
}

export async function pingProxyServer (serverUrl: string, abortSignal?: AbortSignal) {
  const monitor = new LatencyMonitor(serverUrl)
  const onAbort = () => monitor.disconnect()
  abortSignal?.addEventListener('abort', onAbort)
  try {
    await monitor.connect()
    const latency = await monitor.measureLatency()
    return {
      success: true,
      latency: Math.round(latency.networkLatency)
    }
  } catch (err) {
    let msg = String(err)
    if (err instanceof Event && err.type === 'error') {
      msg = 'Connection error'
    } else if (err instanceof Error) {
      msg = err.message
    }
    return {
      success: false,
      error: msg
    }
  } finally {
    abortSignal?.removeEventListener('abort', onAbort)
    monitor.disconnect()
  }
}
