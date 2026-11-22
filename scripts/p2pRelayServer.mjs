// Trystero signaling relay for P2P ("Open to WAN"), serves wss://p2p.mcraft.fun
// Only used to let peers find each other; game traffic goes directly between browsers (WebRTC).
// Also serves GET /turn-credentials (short-lived coturn REST credentials) when TURN_SHARED_SECRET is set,
// so peers behind VPNs / strict NATs can fall back to a TURN relay. See scripts/p2pCoturn.conf.
// Usage: node scripts/p2pRelayServer.mjs   (PORT=8788 HOST=127.0.0.1 by default), put it behind a TLS reverse proxy
import { createServer } from 'node:http'
import { createHmac } from 'node:crypto'
import { createWsRelayServer } from '@trystero-p2p/ws-relay/server'

const port = Number(process.env.PORT) || 8788
const host = process.env.HOST || '127.0.0.1'
const turnSecret = process.env.TURN_SHARED_SECRET
const TURN_TTL_SECONDS = 60 * 60

const stats = { active: 0, connections: 0, turnRequests: 0 }
const SUMMARY_INTERVAL_MS = 5 * 60_000

const log = (event, data = {}) => {
  console.log(`${new Date().toISOString()} ${event} ${Object.entries(data).map(([k, v]) => `${k}=${v}`).join(' ')}`)
}

// behind Caddy the socket address is always localhost, the real one is passed in X-Real-IP
const getClientIp = (req) => String(req.headers['x-real-ip'] || req.socket.remoteAddress || 'unknown')

const sendJson = (res, status, payload) => {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
  })
  res.end(JSON.stringify(payload))
}

// coturn "REST API" scheme: username is an expiry timestamp, credential is base64 HMAC-SHA1(secret, username).
// coturn verifies it itself with the same static-auth-secret, no credential store needed.
const getIceServers = (hostHeader) => {
  const turnHost = (process.env.TURN_HOST || hostHeader || '').split(':')[0]
  if (!turnSecret || !turnHost) return []
  const username = String(Math.floor(Date.now() / 1000) + TURN_TTL_SECONDS)
  const credential = createHmac('sha1', turnSecret).update(username).digest('base64')
  return [
    { urls: `turn:${turnHost}:3478?transport=udp`, username, credential },
    { urls: `turn:${turnHost}:3478?transport=tcp`, username, credential },
  ]
}

const httpServer = createServer((req, res) => {
  const path = (req.url || '/').split('?')[0]
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET' })
    return res.end()
  }
  if (path === '/turn-credentials' && req.method === 'GET') {
    stats.turnRequests++
    log('turn-credentials', { ip: getClientIp(req), origin: req.headers.origin || '-' })
    return sendJson(res, 200, { iceServers: getIceServers(req.headers.host) })
  }
  if (path === '/health') return sendJson(res, 200, { ok: true })
  // plain HTTP hits to the root: this is a WebSocket-only endpoint
  res.writeHead(426, { 'Content-Type': 'text/plain' })
  res.end('Upgrade Required')
})

const relay = createWsRelayServer({
  server: httpServer,
  onError: (err) => console.error('p2p relay error:', err),
})
relay.wss.on('connection', (ws, req) => {
  const ip = getClientIp(req)
  const startedAt = Date.now()
  stats.active++
  stats.connections++
  log('ws-connect', { ip, active: stats.active, origin: req.headers.origin || '-' })
  ws.on('close', () => {
    stats.active--
    log('ws-disconnect', { ip, active: stats.active, seconds: Math.round((Date.now() - startedAt) / 1000) })
  })
})

setInterval(() => {
  log('summary', { ...stats, intervalMin: SUMMARY_INTERVAL_MS / 60_000 })
  stats.connections = 0
  stats.turnRequests = 0
}, SUMMARY_INTERVAL_MS).unref()

await new Promise(resolve => {
  httpServer.listen(port, host, resolve)
})
console.log(`P2P relay listening on ${host}:${port} (TURN credentials ${turnSecret ? 'enabled' : 'disabled'})`)

const shutdown = async () => {
  await relay.close()
  httpServer.close()
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
