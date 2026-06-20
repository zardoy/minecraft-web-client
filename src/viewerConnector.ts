import { EventEmitter } from 'events'
import { Duplex } from 'stream'
import states from 'minecraft-protocol/src/states'
import { createClient } from 'minecraft-protocol'
import { proxy, subscribe } from 'valtio'
import * as Gui from 'lil-gui'
import { CustomChannelPacketFromClient, CustomChannelPacketFromServer, UIDefinition } from 'mcraft-fun-mineflayer/build/customChannel'
import { activeModalStack } from './globalState'
import { mineflayerPluginHudState } from './react/MineflayerPluginHud'
import { mineflayerConsoleState } from './react/MineflayerPluginConsole'
import { showNotification } from './react/NotificationProvider'

export const viewerVersionState = proxy({
  forwardChat: true,
  version: '',
  time: 0,
  replEnabled: false,
  consoleEnabled: false,
  requiresPass: false,
  clientIgnoredPackets: [] as string[]
})

class CustomDuplex extends Duplex {
  constructor(
    options,
    public writeAction
  ) {
    super(options)
  }

  override _read() {}

  override _write(chunk, encoding, callback) {
    this.writeAction(chunk)
    callback()
  }
}

export const getViewerVersionData = async (url: string) => {
  const ws = await openWebsocket(url)
  ws.send('version')
  const result = await new Promise<{
    version: string
    time: number
    replEnabled: boolean
    consoleEnabled: boolean
    requiresPass: boolean
    forwardChat: boolean
    clientIgnoredPackets?: string[]
    takeoverMode?: boolean
  }>((resolve, reject) => {
    ws.addEventListener('message', async message => {
      const { data } = message
      const parsed = JSON.parse(data.toString())
      resolve(parsed)
      ws.close()
      // Update viewer version state
      Object.assign(viewerVersionState, parsed)
      // todo
      customEvents.on('mineflayerBotCreated', () => {
        const client = bot._client as any
        const oldWrite = client.write.bind(client)
        client.write = (...args) => {
          const [name] = args
          if (parsed?.clientIgnoredPackets?.includes(name)) {
            return
          }
          oldWrite(...args)
        }
      })
    })
  })
  mineflayerConsoleState.consoleEnabled = result.consoleEnabled
  mineflayerConsoleState.replEnabled = result.replEnabled
  mineflayerConsoleState.takeoverMode = result.takeoverMode ?? false
  return result
}

const openWebsocket = async (url: string) => {
  if (url.startsWith(':')) url = `ws://localhost${url}`
  if (!url.startsWith('ws')) url = `ws://${url}`
  const ws = new WebSocket(url)
  await new Promise<void>((resolve, reject) => {
    ws.onopen = () => resolve()
    ws.onerror = err => reject(new Error(`[websocket] Failed to connect to ${url}`))
    ws.onclose = ev => reject(ev.reason)
  })
  return ws
}

export const getWsProtocolStream = async (url: string) => {
  const ws = await openWebsocket(url)
  const clientDuplex = new CustomDuplex(undefined, data => {
    // console.log('send', Buffer.from(data).toString('hex'))
    ws.send(data)
  })
  // todo use keep alive instead?
  let lastMessageTime = performance.now()
  ws.addEventListener('message', async message => {
    let { data } = message
    if (data instanceof Blob) {
      data = await data.arrayBuffer()
    }
    clientDuplex.push(Buffer.from(data))
    lastMessageTime = performance.now()
  })
  setInterval(() => {
    // if (clientDuplex.destroyed) return
    // if (performance.now() - lastMessageTime > 10_000) {
    //   console.log('no packats received in 10s!')
    //   clientDuplex.end()
    // }
  }, 5000)

  ws.addEventListener('close', () => {
    console.log('ws closed')
    clientDuplex.end()
    setTimeout(() => {
      bot?.emit('end', 'Connection lost')
    }, 500)
  })

  ws.addEventListener('error', err => {
    console.log('ws error', err)
  })

  return {
    clientDuplex
  }
}

const CHANNEL_NAME = 'minecraft-web-client:data'

const handleCustomChannel = () => {
  bot._client.registerChannel(CHANNEL_NAME, ['string', []])
  const toCleanup = [] as Array<() => void>
  subscribe(activeModalStack, () => {
    if (activeModalStack.length === 1 && activeModalStack[0].reactType === 'main-menu') {
      for (const fn of toCleanup) fn()
      toCleanup.length = 0
      // Clear console state when disconnecting
      mineflayerConsoleState.messages = []
      mineflayerConsoleState.replEnabled = false
      mineflayerConsoleState.consoleEnabled = false
    }
  })

  const send = (data: CustomChannelPacketFromClient) => {
    bot._client.writeChannel(CHANNEL_NAME, JSON.stringify(data))
  }

  // Set up console execution handler
  mineflayerConsoleState.onExecute = code => {
    send({
      type: 'eval',
      code
    })
  }

  const on = (callback: (data: CustomChannelPacketFromServer) => void) => {
    bot._client.on(CHANNEL_NAME as any, data => {
      const parsed = JSON.parse(data.toString())
      callback(parsed)
    })
  }

  const lils = {} as Record<string, Gui.GUI>

  on(data => {
    switch (data.type) {
      case 'eval': {
        // Handle eval results
        mineflayerConsoleState.messages.push({
          id: Date.now(),
          text: data.isError ? `${data.result}` : JSON.stringify(data.result),
          isRepl: true,
          level: data.isError ? 'error' : undefined
        })
        // Limit to 500 messages by removing oldest ones
        if (mineflayerConsoleState.messages.length > 500) {
          mineflayerConsoleState.messages = mineflayerConsoleState.messages.slice(-500)
        }
        break
      }
      case 'console': {
        // Handle console messages
        mineflayerConsoleState.messages.push({
          id: Date.now(),
          text: data.message,
          level: data.level
        })
        // Limit to 500 messages by removing oldest ones
        if (mineflayerConsoleState.messages.length > 500) {
          mineflayerConsoleState.messages = mineflayerConsoleState.messages.slice(-500)
        }
        break
      }
      // todo
      case 'kick' as any: {
        bot.emit('end', (data as any).reason)
        break
      }
      case 'ui': {
        const { update } = data
        if (update.data === null) {
          // Remove UI element
          mineflayerPluginHudState.ui = mineflayerPluginHudState.ui.filter(ui => ui.id !== update.id)

          const gui = lils[update.id]
          if (gui) {
            gui.destroy()
            delete lils[update.id]
          }
        } else {
          // Add or update UI element
          const existingIndex = mineflayerPluginHudState.ui.findIndex(ui => ui.id === update.id)
          if (existingIndex === -1) {
            mineflayerPluginHudState.ui.push({ ...update.data, id: update.id })
          } else {
            mineflayerPluginHudState.ui[existingIndex] = { ...update.data, id: update.id }
          }

          if (update.data.type === 'lil') {
            let gui = lils[update.id]
            if (!gui) {
              gui = new Gui.GUI({
                title: update.data.title
              })
              lils[update.id] = gui
            }

            // Update or add controllers
            const { params, buttons } = update.data
            for (const button of buttons ?? []) {
              params[button] = (() => {
                send({
                  type: 'ui',
                  id: update.id,
                  param: button,
                  value: true
                })
              }) as any
            }
            // eslint-disable-next-line guard-for-in
            for (const paramName in params) {
              const value = params[paramName]
              const controller = gui.controllers.find(c => c.property === paramName)

              if (controller) {
                // Update existing controller value
                controller.object[paramName] = value
                controller.updateDisplay()
              } else {
                // Add new controller if doesn't exist
                const obj = { [paramName]: value }
                const controller = gui.add(obj, paramName)
                if (!buttons?.includes(paramName)) {
                  controller.onChange(value => {
                    send({
                      type: 'ui',
                      id: update.id,
                      param: paramName,
                      value
                    })
                  })
                }
              }
            }

            // Remove controllers that are no longer in params
            const paramNames = Object.keys(params)
            gui.controllers = gui.controllers.filter(c => {
              if (!paramNames.includes(c.property)) {
                c.destroy()
                return false
              }
              return true
            })
          }
        }

        break
      }

      case 'stats': {
        globalThis.botStats = data
        break
      }

      case 'method': {
        console.log('Method result', data.result)
        break
      }
      // No default
    }
  })

  return {
    send
  }
}

export const onBotCreatedViewerHandler = async () => {
  const { send } = handleCustomChannel()
  bot.physicsEnabled = false

  await new Promise<void>(resolve => {
    bot.once('inject_allowed', resolve)
  })

  const originalSetControlState = bot.setControlState.bind(bot)
  bot.setControlState = (control, state) => {
    if (bot.controlState[control] === state) {
      return
    }
    if (!mineflayerConsoleState.takeoverMode) {
      showNotification('Remote control is not enabled', 'Enable takeoverMode in bot plugin settings first')
      return
    }
    // send command to viewer
    send({
      type: 'setControlState',
      control,
      value: state
    })
    originalSetControlState(control, state)
  }
}
