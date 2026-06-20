import EventEmitter from 'events'
import clientAutoVersion from 'minecraft-protocol/src/client/autoVersion'

export const pingServerVersion = async (ip: string, port?: number, mergeOptions: Record<string, any> = {}) => {
  const fakeClient = new EventEmitter() as any
  const options = {
    host: ip,
    port,
    noPongTimeout: 10_000,
    closeTimeout: 20_000,
    ...mergeOptions
  }
  let latency = 0
  let fullInfo: any = null
  fakeClient.autoVersionHooks = [
    res => {
      latency = res.latency
      fullInfo = res
    }
  ]

  // TODO use client.socket.destroy() instead of client.end() for faster cleanup
  clientAutoVersion(fakeClient, options)
  await Promise.race([
    new Promise<void>((resolve, reject) => {
      fakeClient.once('connect_allowed', () => {
        resolve()
      })
    }),
    new Promise<void>((resolve, reject) => {
      fakeClient.on('error', err => {
        reject(new Error(err.message ?? err))
      })
      if (mergeOptions.stream) {
        mergeOptions.stream.on('end', err => {
          setTimeout(() => {
            reject(new Error('Connection closed. Please report if you see this but the server is actually fine.'))
          })
        })
      }
    })
  ])

  return {
    version: fakeClient.version,
    latency,
    fullInfo
  }
}

const MAX_PACKET_SIZE = 2_097_152 // 2mb
const CHAT_MAX_PACKET_DEPTH = 200 // todo improve perf

const CHAT_VALIDATE_PACKETS = new Set([
  'chat',
  'system_chat',
  'player_chat',
  'profileless_chat',
  'kick_disconnect',
  'resource_pack_send',
  'action_bar',
  'set_title_text',
  'set_title_subtitle',
  'title',
  'death_combat_event',
  'server_data',
  'scoreboard_objective',
  'scoreboard_team',
  'playerlist_header',
  'boss_bar'
])

export const validatePacket = (name: string, data: any, fullBuffer: Buffer, isFromServer: boolean) => {
  // todo find out why chat is so slow with react
  if (!isFromServer) return

  if (fullBuffer.length > MAX_PACKET_SIZE) {
    console.groupCollapsed(`Packet ${name} is too large: ${fullBuffer.length} bytes`)
    console.log(data)
    console.groupEnd()
    throw new Error(`Packet ${name} is too large: ${fullBuffer.length} bytes`)
  }

  if (CHAT_VALIDATE_PACKETS.has(name)) {
    // todo count total number of objects instead of max depth
    const maxDepth = getObjectMaxDepth(data)
    if (maxDepth > CHAT_MAX_PACKET_DEPTH) {
      console.groupCollapsed(`Packet ${name} have too many nested objects: ${maxDepth}`)
      console.log(data)
      console.groupEnd()
      throw new Error(`Packet ${name} have too many nested objects: ${maxDepth}`)
    }
  }
}

function getObjectMaxDepth(obj: unknown, currentDepth = 0): number {
  // Base case: null or primitive types have depth 0
  if (obj === null || typeof obj !== 'object' || obj instanceof Buffer) {
    return currentDepth
  }

  // Handle arrays and objects
  let maxDepth = currentDepth

  if (Array.isArray(obj)) {
    // For arrays, check each element
    for (const item of obj) {
      const depth = getObjectMaxDepth(item, currentDepth + 1)
      maxDepth = Math.max(maxDepth, depth)
    }
  } else {
    // For objects, check each value
    // eslint-disable-next-line guard-for-in
    for (const key in obj) {
      const depth = getObjectMaxDepth(obj[key], currentDepth + 1)
      maxDepth = Math.max(maxDepth, depth)
    }
  }

  return maxDepth
}
