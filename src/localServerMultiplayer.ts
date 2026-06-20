import { Duplex } from 'stream'
import { Peer, DataConnection } from 'peerjs'
import Client from 'minecraft-protocol/src/client'
import { resolveTimeout } from './utils'
import { setLoadingScreenStatus } from './appStatus'
import { miscUiState } from './globalState'

class CustomDuplex extends Duplex {
  constructor(
    options,
    public writeAction
  ) {
    super(options)
  }

  _read() {}

  _write(chunk, encoding, callback) {
    this.writeAction(chunk)
    callback()
  }
}

let peerInstance: Peer | undefined

let overridePeerJsServer = null as string | null

export const getJoinLink = () => {
  if (!peerInstance) return
  const url = new URL(window.location.href)
  for (const key of url.searchParams.keys()) {
    url.searchParams.delete(key)
  }
  url.searchParams.set('connectPeer', peerInstance.id)
  url.searchParams.set('peerVersion', localServer!.options.version)
  const host = overridePeerJsServer ?? miscUiState.appConfig?.peerJsServer ?? undefined
  if (host) {
    // TODO! use miscUiState.appConfig.peerJsServer
    url.searchParams.set('server', host)
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
  if (peerInstance) {
    if (doCopy) await copyJoinLink()
    return 'Already opened to wan. Join link copied'
  }
  miscUiState.wanOpening = true
  const host = (overridePeerJsServer ?? miscUiState.appConfig?.peerJsServer) || undefined
  const params = host ? parseUrl(host) : undefined
  const peer = new Peer({
    debug: 3,
    secure: true,
    ...params
  })
  peerInstance = peer
  peer.on('connection', connection => {
    console.log('connection')
    const serverDuplex = new CustomDuplex({}, async data => connection.send(data))
    const client = new Client(true, localServer.options.version, undefined)
    client.setSocket(serverDuplex)
    localServer._server.emit('connection', client)

    connection.on('data', (data: any) => {
      serverDuplex.push(Buffer.from(data))
    })
    // our side disconnect
    const endConnection = () => {
      console.log('connection.close')
      serverDuplex.end()
      connection.close()
    }
    serverDuplex.on('end', endConnection)
    serverDuplex.on('force-close', endConnection)
    client.on('end', endConnection)

    const disconnected = () => {
      serverDuplex.end()
      client.end()
    }
    connection.on('iceStateChanged', state => {
      console.log('iceStateChanged', state)
      if (state === 'disconnected') {
        disconnected()
      }
    })
    connection.on('close', disconnected)
    connection.on('error', disconnected)
  })
  const fallbackServer = miscUiState.appConfig?.peerJsServerFallback
  const hasFallback = fallbackServer && peer.options.host !== fallbackServer
  let hadErrorReported = false
  peer.on('error', error => {
    console.error('peerJS error', error)
    if (error.type === 'server-error' && hasFallback) {
      return
    }
    hadErrorReported = true
    writeText(error.message || JSON.stringify(error))
  })
  let timeout
  const destroy = () => {
    clearTimeout(timeout)
    timeout = undefined
    peer.destroy()
    peerInstance = undefined
  }

  const result = await new Promise<string>(resolve => {
    peer.on('open', async () => {
      await copyJoinLink()
      resolve('Copied join link to clipboard')
    })
    timeout = setTimeout(async () => {
      if (!hadErrorReported && timeout !== undefined) {
        if (hasFallback && overridePeerJsServer === null) {
          destroy()
          overridePeerJsServer = fallbackServer
          console.log('Trying fallback server due to timeout', fallbackServer)
          resolve((await openToWanAndCopyJoinLink(writeText, doCopy))!)
        } else {
          writeText('timeout')
          resolve('Failed to open to wan (timeout)')
        }
      }
    }, 6000)

    // fallback
    peer.on('error', async error => {
      if (!peer.open) {
        if (hasFallback) {
          destroy()

          overridePeerJsServer = fallbackServer
          console.log('Trying fallback server', fallbackServer)
          resolve((await openToWanAndCopyJoinLink(writeText, doCopy))!)
        }
      }
    })
  })
  if (peerInstance && !peerInstance.open) {
    destroy()
  }
  miscUiState.wanOpening = false
  return result
}

const parseUrl = (url: string) => {
  // peerJS does this internally for some reason: const url = new URL(`${protocol}://${host}:${port}${path}${key}/${method}`)
  if (!url.startsWith('http')) url = `${location.protocol}//${url}`
  const urlObj = new URL(url)
  const key = urlObj.searchParams.get('key')
  return {
    host: urlObj.hostname,
    path: urlObj.pathname,
    protocol: urlObj.protocol.slice(0, -1),
    ...(urlObj.port ? { port: +urlObj.port } : {}),
    ...(key ? { key } : {})
  }
}

export const closeWan = () => {
  peerInstance?.destroy()
  peerInstance = undefined
  miscUiState.wanOpened = false
  return 'Closed WAN'
}

export type ConnectPeerOptions = {
  server?: string
}

export const connectToPeer = async (peerId: string, options: ConnectPeerOptions = {}) => {
  setLoadingScreenStatus('Connecting to peer server')
  // todo destroy connection on error
  // TODO! use miscUiState.appConfig.peerJsServer
  const host = options.server
  const params = host ? parseUrl(host) : undefined
  const peer = new Peer({
    debug: 3,
    ...params
  })
  await resolveTimeout(
    new Promise(resolve => {
      peer.once('open', resolve)
    })
  )
  setLoadingScreenStatus('Connecting to the peer')
  const connection = peer.connect(peerId, {
    serialization: 'raw'
  })
  await resolveTimeout(
    new Promise<void>((resolve, reject) => {
      connection.once('error', error => {
        console.log(error.type, error.name)
        console.log(error)
        reject(error.message)
      })
      connection.once('open', resolve)
    })
  )

  const clientDuplex = new CustomDuplex({}, data => {
    // todo debug until play state
    // console.debug('sending', data.toString())
    void connection.send(data)
  })
  connection.on('data', (data: any) => {
    console.debug('received', Buffer.from(data).toString())
    clientDuplex.push(Buffer.from(data))
  })
  connection.on('close', () => {
    console.log('connection closed')
    clientDuplex.end()
    // bot._client.end()
    // bot.end()
    bot.emit('end', 'Disconnected.')
  })
  connection.on('error', error => {
    console.error(error)
    clientDuplex.end()
  })

  return clientDuplex
}
