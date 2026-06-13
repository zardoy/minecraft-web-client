/* eslint-disable no-await-in-loop */
import { createServer, ServerClient } from 'minecraft-protocol'
import { ParsedReplayPacket, parseReplayContents } from 'mcraft-fun-mineflayer/build/packetsLogger'
import { PACKETS_REPLAY_FILE_EXTENSION, WORLD_STATE_FILE_EXTENSION } from 'mcraft-fun-mineflayer/build/worldState'
import MinecraftData from 'minecraft-data'
import { GameMode } from 'mineflayer'
import { UserError } from '../mineflayer/userError'
import { packetsReplayState } from '../react/state/packetsReplayState'
import { appQueryParams } from '../appParams'
import { LocalServer } from '../customServer'
import { getFixedFilesize } from '../react/simpleUtils'

const SUPPORTED_FORMAT_VERSION = 1

type ReplayDefinition = {
  minecraftVersion: string
  replayAgainst?: 'client' | 'server'
  serverIp?: string
}

interface OpenFileOptions {
  contents: string
  filename?: string
  filesize?: number
}

export function openFile ({ contents, filename = 'unnamed', filesize }: OpenFileOptions) {
  packetsReplayState.replayName = `${filename} (${getFixedFilesize(filesize ?? contents.length)})`
  packetsReplayState.isPlaying = false

  const connectOptions = {
    worldStateFileContents: contents,
    username: 'replay'
  }
  dispatchEvent(new CustomEvent('connect', { detail: connectOptions }))
}

export const startLocalReplayServer = (contents: string) => {
  const { packets, header } = parseReplayContents(contents)

  packetsReplayState.packetsPlayback = []
  packetsReplayState.isOpen = true
  packetsReplayState.isPlaying = true
  packetsReplayState.progress = {
    current: 0,
    total: packets.filter(packet => packet.isFromServer).length
  }
  packetsReplayState.speed = 1
  packetsReplayState.replayName ||= `local ${getFixedFilesize(contents.length)}`
  packetsReplayState.replayName = `${header.minecraftVersion} ${packetsReplayState.replayName}`

  if ('formatVersion' in header && header.formatVersion !== SUPPORTED_FORMAT_VERSION) {
    throw new UserError(`Unsupported format version: ${header.formatVersion}`)
  }
  if ('replayAgainst' in header && header.replayAgainst === 'server') {
    throw new Error('not supported')
  }

  const server = createServer({
    Server: LocalServer as any,
    version: header.minecraftVersion,
    keepAlive: false,
    'online-mode': false
  })

  const data = MinecraftData(header.minecraftVersion)
  server.on(data.supportFeature('hasConfigurationState') ? 'playerJoin' : 'login' as any, async client => {
    await mainPacketsReplayer(
      client,
      packets,
      packetsReplayState.customButtons.validateClientPackets.state ? undefined : true
    )
  })

  return {
    server,
    version: header.minecraftVersion
  }
}

// time based packets
// const FLATTEN_CLIENT_PACKETS = new Set(['position', 'position_look'])
const FLATTEN_CLIENT_PACKETS = new Set([] as string[])

const positions = {
  client: 0,
  server: 0
}
const addPacketToReplayer = (name: string, data, isFromClient: boolean, wasUpcoming = false) => {
  const side = isFromClient ? 'client' : 'server'

  if (wasUpcoming) {
    const lastUpcoming = packetsReplayState.packetsPlayback.find(p => p.isUpcoming && p.name === name)
    if (lastUpcoming) {
      lastUpcoming.isUpcoming = false
    }
  } else {
    packetsReplayState.packetsPlayback.push({
      name,
      data,
      isFromClient,
      position: ++positions[side]!,
      isUpcoming: false,
      timestamp: Date.now()
    })
  }

  if (!isFromClient && !wasUpcoming) {
    packetsReplayState.progress.current++
  }
}

const IGNORE_SERVER_PACKETS = new Set([
  'kick_disconnect',
])

const ADDITIONAL_DELAY = 500

const mainPacketsReplayer = async (client: ServerClient, packets: ParsedReplayPacket[], ignoreClientPacketsWait: string[] | true = []) => {
  const writePacket = (name: string, data: any) => {
    data = restoreData(data)
    client.write(name, data)
  }

  const playPackets = packets.filter(p => p.state === 'play')

  let clientPackets = [] as Array<{ name: string, params: any }>
  const clientsPacketsWaiter = createPacketsWaiter({
    unexpectedPacketReceived (name, params) {
      console.log('unexpectedPacketReceived', name, params)
      addPacketToReplayer(name, params, true)
    },
    expectedPacketReceived (name, params) {
      console.log('expectedPacketReceived', name, params)
      addPacketToReplayer(name, params, true, true)
    },
    unexpectedPacketsLimit: 15,
    onUnexpectedPacketsLimitReached () {
      addPacketToReplayer('...', {}, true)
    }
  })

  // Patch console.error to detect errors
  const originalConsoleError = console.error
  let lastSentPacket: { name: string, params: any } | null = null
  console.error = (...args) => {
    if (lastSentPacket) {
      console.log('Got error after packet', lastSentPacket.name, lastSentPacket.params)
    }
    originalConsoleError.apply(console, args)
    if (packetsReplayState.customButtons.stopOnError.state) {
      packetsReplayState.isPlaying = false
      throw new Error('Replay stopped due to error: ' + args.join(' '))
    }
  }

  const playServerPacket = (name: string, params: any) => {
    try {
      writePacket(name, params)
      addPacketToReplayer(name, params, false)
      lastSentPacket = { name, params }
    } catch (err) {
      console.error('Error processing packet:', err)
      if (packetsReplayState.customButtons.stopOnError.state) {
        packetsReplayState.isPlaying = false
      }
    }
  }

  try {
    bot.on('error', (err) => {
      console.error('Mineflayer error:', err)
    })

    bot._client.on('writePacket' as any, (name, params) => {
      clientsPacketsWaiter.addPacket(name, params)
    })

    console.log('start replaying!')
    for (const [i, packet] of playPackets.entries()) {
      if (!packetsReplayState.isPlaying) {
        await new Promise<void>(resolve => {
          const interval = setInterval(() => {
            if (packetsReplayState.isPlaying) {
              clearInterval(interval)
              resolve()
            }
          }, 100)
        })
      }

      if (packet.isFromServer) {
        if (packet.params === null) {
          console.warn('packet.params is null', packet)
          continue
        }
        playServerPacket(packet.name, packet.params)
        if (packet.diff) {
          await new Promise(resolve => {
            setTimeout(resolve, packet.diff * packetsReplayState.speed + ADDITIONAL_DELAY * (packetsReplayState.customButtons.packetsSenderDelay.state ? 1 : 0))
          })
        }
      } else if (ignoreClientPacketsWait !== true && !ignoreClientPacketsWait.includes(packet.name)) {
        clientPackets.push({ name: packet.name, params: packet.params })
        if (playPackets[i + 1]?.isFromServer) {
          // eslint-disable-next-line @typescript-eslint/no-loop-func
          clientPackets = clientPackets.filter((p, index) => {
            return !FLATTEN_CLIENT_PACKETS.has(p.name) || index === clientPackets.findIndex(clientPacket => clientPacket.name === p.name)
          })
          for (const packet of clientPackets) {
            packetsReplayState.packetsPlayback.push({
              name: packet.name,
              data: packet.params,
              isFromClient: true,
              position: positions.client++,
              timestamp: Date.now(),
              isUpcoming: true,
            })
          }

          await Promise.race([
            clientsPacketsWaiter.waitForPackets(clientPackets.map(p => p.name)),
            ...(packetsReplayState.customButtons.skipMissingOnTimeout.state ? [new Promise(resolve => {
              setTimeout(resolve, 1000)
            })] : [])
          ])
          clientsPacketsWaiter.stopWaiting()
          clientPackets = []
        }
      }
    }
  } finally {
    // Restore original console.error
    console.error = originalConsoleError
  }
}

export const switchGameMode = (gameMode: GameMode) => {
  const gamemodes = {
    survival: 0,
    creative: 1,
    adventure: 2,
    spectator: 3
  }
  if (gameMode === 'spectator') {
    bot._client.emit('abilities', {
    // can fly + is flying
      flags: 6
    })
  }
  bot._client.emit('game_state_change', {
    reason: 3,
    gameMode: gamemodes[gameMode]
  })
}

interface PacketsWaiterOptions {
  unexpectedPacketReceived?: (name: string, params: any) => void
  expectedPacketReceived?: (name: string, params: any) => void
  onUnexpectedPacketsLimitReached?: () => void
  unexpectedPacketsLimit?: number
}

interface PacketsWaiter {
  addPacket(name: string, params: any): void
  waitForPackets(packets: string[]): Promise<void>
  stopWaiting(): void
}

const createPacketsWaiter = (options: PacketsWaiterOptions = {}): PacketsWaiter => {
  let packetHandler: ((data: any, name: string) => void) | null = null
  const queuedPackets: Array<{ name: string, params: any }> = []
  let isWaiting = false
  let unexpectedPacketsCount = 0
  const handlePacket = (data: any, name: string, waitingPackets: string[], resolve: () => void) => {
    if (waitingPackets.includes(name)) {
      waitingPackets.splice(waitingPackets.indexOf(name), 1)
      options.expectedPacketReceived?.(name, data)
    } else {
      if (options.unexpectedPacketsLimit && unexpectedPacketsCount < options.unexpectedPacketsLimit) {
        options.unexpectedPacketReceived?.(name, data)
      }
      if (options.onUnexpectedPacketsLimitReached && unexpectedPacketsCount === options.unexpectedPacketsLimit) {
        options.onUnexpectedPacketsLimitReached?.()
      }
      unexpectedPacketsCount++
    }

    if (waitingPackets.length === 0) {
      resolve()
    }
  }

  return {
    addPacket (name: string, params: any) {
      if (packetHandler) {
        packetHandler(params, name)
      } else {
        queuedPackets.push({ name, params })
      }
    },

    async waitForPackets (packets: string[]) {
      if (isWaiting) {
        throw new Error('Already waiting for packets')
      }
      unexpectedPacketsCount = 0
      isWaiting = true

      try {
        await new Promise<void>(resolve => {
          const waitingPackets = [...packets]

          packetHandler = (data: any, name: string) => {
            handlePacket(data, name, waitingPackets, resolve)
          }

          // Process any queued packets
          for (const packet of queuedPackets) {
            handlePacket(packet.params, packet.name, waitingPackets, resolve)
          }
          queuedPackets.length = 0
        })
      } finally {
        isWaiting = false
        packetHandler = null
      }
    },
    stopWaiting () {
      isWaiting = false
      packetHandler = null
      queuedPackets.length = 0
    }
  }
}

const isArrayEqual = (a: any[], b: any[]) => {
  if (a.length !== b.length) return false
  for (const [i, element] of a.entries()) {
    if (element !== b[i]) return false
  }
  return true
}

const restoreData = (json: any) => {
  if (!json) return json
  const keys = Object.keys(json)

  if (isArrayEqual(keys.sort(), ['data', 'type'].sort())) {
    if (json.type === 'Buffer') {
      return Buffer.from(json.data)
    }
  }

  if (typeof json === 'object' && json) {
    for (const [key, value] of Object.entries(json)) {
      if (typeof value === 'object') {
        json[key] = restoreData(value)
      }
    }
  }

  return json
}

export const VALID_REPLAY_EXTENSIONS = [`.${PACKETS_REPLAY_FILE_EXTENSION}`, `.${WORLD_STATE_FILE_EXTENSION}`]
