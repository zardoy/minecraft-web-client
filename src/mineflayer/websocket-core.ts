import { Duplex } from 'stream'
import { UserError } from './userError'

class CustomDuplex extends Duplex {
  constructor (options, public writeAction) {
    super(options)
  }

  override _read () {}

  override _write (chunk, encoding, callback) {
    this.writeAction(chunk)
    callback()
  }
}

export const getWebsocketStream = async (host: string) => {
  const baseProtocol = host.startsWith('ws://') ? 'ws' : 'wss'
  const hostClean = host.replace('ws://', '').replace('wss://', '')
  const hostURL = new URL(`${baseProtocol}://${hostClean}`)
  const hostParams = hostURL.searchParams
  hostParams.append('client_mcraft', '')
  const ws = new WebSocket(`${baseProtocol}://${hostURL.host}${hostURL.pathname}?${hostParams.toString()}`)
  // ArrayBuffer messages: with the default Blob type every packet went through an async `blob.arrayBuffer()` copy, about 13 % of the
  // main thread on a Mali-G57 phone in a busy area of play.mcraft.fun
  ws.binaryType = 'arraybuffer'
  const clientDuplex = new CustomDuplex(undefined, data => {
    ws.send(data)
  })

  clientDuplex.on('error', () => {})

  ws.addEventListener('message', message => {
    clientDuplex.push(Buffer.from(message.data))
  })

  ws.addEventListener('close', () => {
    console.log('ws closed')
    clientDuplex.end()
    setTimeout(() => {
      clientDuplex.emit('end', 'Connection lost')
    }, 500)
  })

  ws.addEventListener('error', err => {
    console.log('ws error', err)
    clientDuplex.emit('error', err)
  })

  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve)
    ws.addEventListener('error', err => {
      console.log('ws error', err)
      reject(new UserError('Failed to open websocket connection'))
    })
  })

  return {
    mineflayerStream: clientDuplex,
    ws,
  }
}
