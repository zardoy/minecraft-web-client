import { Duplex } from 'stream'
import { joinRoom, getRelaySockets } from '@trystero-p2p/ws-relay'
import type { Room, TurnServerConfig } from '@trystero-p2p/ws-relay'
import Client from 'minecraft-protocol/src/client'
import { setLoadingScreenStatus } from './appStatus'
import { miscUiState } from './globalState'

/** Trystero app id, rooms are namespaced by it so we never clash with other apps using the same relay */
const TRYSTERO_APP_ID = 'prismarine-web-client'
const DEFAULT_RELAY = 'wss://p2p.mcraft.fun'
const GUEST_CONNECT_TIMEOUT = 20_000

class CustomDuplex extends Duplex {
  constructor (options, public writeAction: (chunk: Buffer) => Promise<void> | void) {
    super(options)
  }

  _read () { }

  _write (chunk, encoding, callback) {
    // wait for the send to finish so chunks can't be reordered and backpressure works
    Promise.resolve(this.writeAction(chunk)).then(() => callback(), (err) => callback(err))
  }
}

type RolePayload = { host: boolean }

type HostSession = {
  room: Room
  roomId: string
  /** relay override that is baked into the join link */
  relayOverride?: string
}

let hostSession: HostSession | undefined

const normalizeRelayUrl = (url: string) => {
  url = url.trim()
  if (/^https?:\/\//.test(url)) return url.replace(/^http/, 'ws')
  if (!/^wss?:\/\//.test(url)) return `${location.protocol === 'http:' ? 'ws' : 'wss'}://${url}`
  return url
}

const getRelayUrls = (override?: string) => {
  if (override) return [normalizeRelayUrl(override)]
  const { p2pRelayServer, p2pRelayServerFallback } = miscUiState.appConfig ?? {}
  const urls = [p2pRelayServer || DEFAULT_RELAY, p2pRelayServerFallback]
    .filter(Boolean)
    .map(url => normalizeRelayUrl(url!))
  return [...new Set(urls)]
}

let turnCache: { servers: TurnServerConfig[], expiresAt: number } | undefined

/**
 * TURN fallback for peers that can't connect directly (restrictive NATs, VPNs doing their own NAT: STUN works
 * but the connection hangs). Config list wins, otherwise short-lived credentials are fetched from the relay.
 * Never blocks or fails the connection: without TURN we just fall back to Trystero's default STUN-only setup.
 */
const getTurnConfig = async (relayUrls: string[]): Promise<TurnServerConfig[] | undefined> => {
  const configured = miscUiState.appConfig?.p2pTurnServers
  if (configured?.length) return configured
  if (turnCache && turnCache.expiresAt > Date.now()) return turnCache.servers
  try {
    const url = new URL(relayUrls[0].replace(/^ws/, 'http'))
    url.pathname = `${url.pathname.replace(/\/$/, '')}/turn-credentials`
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) })
    if (!res.ok) return undefined
    const { iceServers } = await res.json() as { iceServers?: TurnServerConfig[] }
    if (!iceServers?.length) return undefined
    // credentials are valid for 1h, refresh a bit earlier
    turnCache = { servers: iceServers, expiresAt: Date.now() + 45 * 60_000 }
    return iceServers
  } catch (err) {
    console.warn('Failed to get TURN credentials, using STUN only', err)
    return undefined
  }
}

const joinP2pRoom = async (roomId: string, relayOverride?: string, onJoinError?: (error: string) => void) => {
  const urls = getRelayUrls(relayOverride)
  const room = joinRoom({
    appId: TRYSTERO_APP_ID,
    relayConfig: { urls },
    turnConfig: await getTurnConfig(urls),
  }, roomId, {
    onJoinError (info) {
      console.error('p2p handshake error', info)
      onJoinError?.(info.error)
    }
  })
  return room
}

/** Trystero doesn't expose relay connection failures, so we check sockets by hand */
const isRelayConnected = () => {
  const sockets = getRelaySockets() as Record<string, WebSocket | undefined>
  return Object.values(sockets).some(socket => socket?.readyState === WebSocket.OPEN)
}

const waitForRelay = async (timeout: number) => {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (isRelayConnected()) return true
    // eslint-disable-next-line no-await-in-loop
    await new Promise(resolve => {
      setTimeout(resolve, 200)
    })
  }
  return false
}

const makeRoomId = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  return `mc-${[...bytes].map(b => b.toString(36).padStart(2, '0')).join('')}`
}

const toBuffer = (data: unknown) => Buffer.from(data as ArrayBuffer)
// copy: Buffers are views into a shared pool and trystero expects a standalone buffer
const toWire = (chunk: Uint8Array) => new Uint8Array(chunk)

export const getJoinLink = () => {
  if (!hostSession) return
  const url = new URL(window.location.href)
  url.search = ''
  url.searchParams.set('connectPeer', hostSession.roomId)
  url.searchParams.set('peerVersion', localServer!.options.version)
  if (hostSession.relayOverride) {
    url.searchParams.set('server', hostSession.relayOverride)
  }
  return url.toString()
}

const copyJoinLink = async () => {
  miscUiState.wanOpened = true
  const joinLink = getJoinLink()!
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(joinLink)
  } else {
    window.prompt('Copy to clipboard: Ctrl+C, Enter', joinLink)
  }
}

export const openToWanAndCopyJoinLink = async (writeText: (text) => void, doCopy = true) => {
  if (!localServer) return
  if (hostSession) {
    if (doCopy) await copyJoinLink()
    return 'Already opened to wan. Join link copied'
  }
  if (miscUiState.wanOpening) return 'Already opening, wait...'
  miscUiState.wanOpening = true
  const roomId = makeRoomId()
  let handshakeError: string | undefined
  const room = await joinP2pRoom(roomId, undefined, (error) => {
    handshakeError = error
  })
  const session: HostSession = { room, roomId }
  hostSession = session

  const roleAction = room.makeAction<RolePayload>('role')
  const dataAction = room.makeAction<Uint8Array>('mc')
  const connections = new Map<string, { serverDuplex: CustomDuplex, client: Client }>()

  const acceptGuest = (peerId: string) => {
    if (connections.has(peerId)) return
    console.log('p2p guest connected', peerId)
    const serverDuplex = new CustomDuplex({}, async (data) => dataAction.send(toWire(data), { target: peerId }))
    const client = new Client(true, localServer.options.version, undefined)
    client.setSocket(serverDuplex)
    connections.set(peerId, { serverDuplex, client })
    localServer._server.emit('connection', client)

    // our side disconnect
    const endConnection = () => {
      serverDuplex.end()
    }
    serverDuplex.on('end', endConnection)
    serverDuplex.on('force-close', endConnection)
    client.on('end', () => {
      connections.delete(peerId)
      endConnection()
    })
  }

  roleAction.onMessage = (role, { peerId }) => {
    if (!role.host) acceptGuest(peerId)
  }
  dataAction.onMessage = (data, { peerId }) => {
    connections.get(peerId)?.serverDuplex.push(toBuffer(data))
  }
  room.onPeerJoin = (peerId) => {
    // let the peer know who is the host (guests also see each other, they must not mix us up)
    void roleAction.send({ host: true }, { target: peerId })
  }
  room.onPeerLeave = (peerId) => {
    console.log('p2p guest left', peerId)
    const connection = connections.get(peerId)
    if (!connection) return
    connections.delete(peerId)
    connection.serverDuplex.end()
    connection.client.end()
  }

  const relayConnected = await waitForRelay(6000)
  if (!relayConnected) {
    writeText(handshakeError ?? `Can't reach signaling server (${getRelayUrls().join(', ')})`)
    closeWan()
    miscUiState.wanOpening = false
    return 'Failed to open to wan (timeout)'
  }
  await copyJoinLink()
  miscUiState.wanOpening = false
  return 'Copied join link to clipboard'
}

export const closeWan = () => {
  if (hostSession) {
    void hostSession.room.leave()
    hostSession = undefined
  }
  miscUiState.wanOpened = false
  return 'Closed WAN'
}

export type ConnectPeerOptions = {
  /** override signaling (relay) server */
  server?: string
}

export const connectToPeer = async (roomId: string, options: ConnectPeerOptions = {}) => {
  setLoadingScreenStatus('Connecting to signaling server')
  let handshakeError: string | undefined
  const room = await joinP2pRoom(roomId, options.server, (error) => {
    handshakeError = error
  })
  const roleAction = room.makeAction<RolePayload>('role')
  const dataAction = room.makeAction<Uint8Array>('mc')

  let hostId: string | undefined
  const hostFound = new Promise<string>(resolve => {
    roleAction.onMessage = (role, { peerId }) => {
      if (role.host && !hostId) {
        hostId = peerId
        resolve(peerId)
      }
    }
  })
  room.onPeerJoin = (peerId) => {
    // announce ourselves as a guest, the host will accept us
    void roleAction.send({ host: false }, { target: peerId })
  }

  const fail = async (message: string): Promise<never> => {
    await room.leave()
    throw new Error(message)
  }

  if (!await waitForRelay(10_000)) {
    return fail(`Can't reach signaling server (${getRelayUrls(options.server).join(', ')})`)
  }
  setLoadingScreenStatus('Looking for the host')
  let timeoutId
  const timedOut = new Promise<undefined>(resolve => {
    timeoutId = setTimeout(resolve, GUEST_CONNECT_TIMEOUT)
  })
  const foundHost = await Promise.race([hostFound, timedOut])
  clearTimeout(timeoutId)
  if (!foundHost) {
    return fail(handshakeError
      ? `Failed to connect to the host: ${handshakeError}`
      : 'Host not found. Make sure the join link is valid and the game is still open (or connection is blocked by network, try disabling VPN)')
  }

  const clientDuplex = new CustomDuplex({}, async (data) => dataAction.send(toWire(data), { target: foundHost }))
  dataAction.onMessage = (data, { peerId }) => {
    if (peerId !== foundHost) return
    clientDuplex.push(toBuffer(data))
  }
  room.onPeerLeave = (peerId) => {
    if (peerId !== foundHost) return
    console.log('connection closed')
    clientDuplex.end()
    void room.leave()
    bot.emit('end', 'Disconnected.')
  }
  clientDuplex.on('end', () => {
    void room.leave()
  })

  return clientDuplex
}
