import PItem from 'prismarine-item'
import * as THREE from 'three'
import { getThreeJsRendererMethods } from 'renderer/viewer/three/threeJsMethods'
import { options, serverChangedSettings } from './optionsStorage'
import { jeiCustomCategories } from './inventoryWindows'
import { registerIdeChannels } from './core/ideChannels'
import { registerIframeChannels } from './core/iframeChannels'
import { serverSafeSettings } from './defaultOptions'
import { lastConnectOptions } from './appStatus'
import { gameAdditionalState } from './globalState'
import { chunkGeometryCache } from './chunkGeometryCache'
import { chunkPacketCache, CachedChunkInfo } from './chunkPacketCache'

const isWebSocketServer = (server: string | undefined) => {
  if (!server) return false
  return server.startsWith('ws://') || server.startsWith('wss://')
}

const getIsCustomChannelsEnabled = () => {
  if (options.customChannels === 'websocket') return isWebSocketServer(lastConnectOptions.value?.server)
  return options.customChannels
}

export default () => {
  customEvents.on('mineflayerBotCreated', async () => {
    if (!getIsCustomChannelsEnabled()) return
    bot.once('login', () => {
      registerConnectMetadataChannel()
      registerBlockModelsChannel()
      registerMediaChannels()
      registerSectionAnimationChannels()
      registeredJeiChannel()
      registerBlockInteractionsCustomizationChannel()
      registerWaypointChannels()
      registerFireworksChannels()
      registerIdeChannels()
      registerIframeChannels()
      registerServerSettingsChannel()
      registerTypingIndicatorChannel()
      registerChunkCacheChannel()
    })
  })
}

const registerChannel = (channelName: string, packetStructure: any[], handler: (data: any) => void, waitForWorld = true) => {
  bot._client.registerChannel(channelName, packetStructure, true)
  bot._client.on(channelName as any, async (data) => {
    if (waitForWorld) {
      await appViewer.worldReady
      handler(data)
    } else {
      handler(data)
    }
  })

  console.debug(`registered custom channel ${channelName} channel`)
}

const registerConnectMetadataChannel = () => {
  const CHANNEL_NAME = 'minecraft-web-client:connect-metadata'
  const packetStructure = [
    'container',
    [
      { name: 'metadata', type: ['pstring', { countType: 'i16' }] }
    ]
  ]

  bot._client.registerChannel(CHANNEL_NAME, packetStructure, true)

  // Send client metadata to server
  bot._client.writeChannel(CHANNEL_NAME, {
    metadata: JSON.stringify({
      version: process.env.RELEASE_TAG,
      build: process.env.BUILD_VERSION,
      ...window.serverMetadataConnect,
    })
  })

  // Listen for server metadata
  bot._client.on(CHANNEL_NAME as any, (data) => {
    try {
      const metadata = JSON.parse(data.metadata)
      window.serverMetadata = metadata
      console.debug('Received server metadata:', metadata)
    } catch (error) {
      console.warn('Failed to parse server metadata:', error)
    }
  })
}

const registerBlockInteractionsCustomizationChannel = () => {
  const CHANNEL_NAME = 'minecraft-web-client:block-interactions-customization'
  const packetStructure = [
    'container',
    [
      {
        name: 'newConfiguration',
        type: ['pstring', { countType: 'i16' }]
      },
    ]
  ]

  registerChannel(CHANNEL_NAME, packetStructure, (data) => {
    const config = JSON.parse(data.newConfiguration)
    bot.mouse.setConfigFromPacket(config)
  }, true)
}

const registerFireworksChannels = () => {
  const packetStructure = [
    'container',
    [
      {
        name: 'x',
        type: 'f32'
      },
      {
        name: 'y',
        type: 'f32'
      },
      {
        name: 'z',
        type: 'f32'
      },
      {
        name: 'optionsJson',
        type: ['pstring', { countType: 'i16' }]
      }
    ]
  ]

  registerChannel('minecraft-web-client:firework-explode', packetStructure, (data) => {
    // Parse options if provided
    let options: any = {}
    if (data.optionsJson && data.optionsJson.trim() !== '') {
      try {
        options = JSON.parse(data.optionsJson)
      } catch (error) {
        console.warn('Failed to parse firework optionsJson:', error)
      }
    }

    // Set position from coords
    options.position = new THREE.Vector3(data.x, data.y, data.z)

    getThreeJsRendererMethods()?.launchFirework(options)
  })
}

const registerWaypointChannels = () => {
  const packetStructure = [
    'container',
    [
      {
        name: 'id',
        type: ['pstring', { countType: 'i16' }]
      },
      {
        name: 'x',
        type: 'f32'
      },
      {
        name: 'y',
        type: 'f32'
      },
      {
        name: 'z',
        type: 'f32'
      },
      {
        name: 'minDistance',
        type: 'i32'
      },
      {
        name: 'label',
        type: ['pstring', { countType: 'i16' }]
      },
      {
        name: 'color',
        type: 'i32'
      },
      {
        name: 'metadataJson',
        type: ['pstring', { countType: 'i16' }]
      }
    ]
  ]

  registerChannel('minecraft-web-client:waypoint-add', packetStructure, (data) => {
    // Parse metadata if provided
    let metadata: any = {}
    if (data.metadataJson && data.metadataJson.trim() !== '') {
      try {
        metadata = JSON.parse(data.metadataJson)
      } catch (error) {
        console.warn('Failed to parse waypoint metadataJson:', error)
      }
    }

    getThreeJsRendererMethods()?.addWaypoint(data.id, data.x, data.y, data.z, {
      minDistance: data.minDistance,
      maxDistance: metadata.maxDistance,
      label: data.label || undefined,
      color: data.color || undefined,
      metadata
    })
  })

  registerChannel('minecraft-web-client:waypoint-delete', [
    'container',
    [
      {
        name: 'id',
        type: ['pstring', { countType: 'i16' }]
      }
    ]
  ], (data) => {
    getThreeJsRendererMethods()?.removeWaypoint(data.id)
  })
}

const registerBlockModelsChannel = () => {
  const CHANNEL_NAME = 'minecraft-web-client:blockmodels'

  const packetStructure = [
    'container',
    [
      {
        name: 'worldName', // currently not used
        type: ['pstring', { countType: 'i16' }]
      },
      {
        name: 'x',
        type: 'i32'
      },
      {
        name: 'y',
        type: 'i32'
      },
      {
        name: 'z',
        type: 'i32'
      },
      {
        name: 'model',
        type: ['pstring', { countType: 'i16' }]
      }
    ]
  ]

  registerChannel(CHANNEL_NAME, packetStructure, (data) => {
    const { worldName, x, y, z, model } = data

    const chunkX = Math.floor(x / 16) * 16
    const chunkZ = Math.floor(z / 16) * 16
    const chunkKey = `${chunkX},${chunkZ}`
    const blockPosKey = `${x},${y},${z}`

    getThreeJsRendererMethods()?.updateCustomBlock(chunkKey, blockPosKey, model)
  }, true)
}

const registerSectionAnimationChannels = () => {
  const ADD_CHANNEL = 'minecraft-web-client:section-animation-add'
  const REMOVE_CHANNEL = 'minecraft-web-client:section-animation-remove'

  /**
   * Add a section animation
   * @param id - Section position for animation like `16,32,16`
   * @param offset - Initial offset in blocks
   * @param speedX - Movement speed in blocks per second on X axis
   * @param speedY - Movement speed in blocks per second on Y axis
   * @param speedZ - Movement speed in blocks per second on Z axis
   * @param limitX - Maximum offset in blocks on X axis (0 means no limit)
   * @param limitY - Maximum offset in blocks on Y axis (0 means no limit)
   * @param limitZ - Maximum offset in blocks on Z axis (0 means no limit)
   */
  const addPacketStructure = [
    'container',
    [
      { name: 'id', type: ['pstring', { countType: 'i16' }] },
      { name: 'offset', type: 'f32' },
      { name: 'speedX', type: 'f32' },
      { name: 'speedY', type: 'f32' },
      { name: 'speedZ', type: 'f32' },
      { name: 'limitX', type: 'f32' },
      { name: 'limitY', type: 'f32' },
      { name: 'limitZ', type: 'f32' }
    ]
  ]

  /**
   * Remove a section animation
   * @param id - Identifier of the animation to remove
   */
  const removePacketStructure = [
    'container',
    [
      { name: 'id', type: ['pstring', { countType: 'i16' }] }
    ]
  ]

  registerChannel(ADD_CHANNEL, addPacketStructure, (data) => {
    const { id, offset, speedX, speedY, speedZ, limitX, limitY, limitZ } = data
    getThreeJsRendererMethods()?.addSectionAnimation(id, {
      time: performance.now(),
      speedX,
      speedY,
      speedZ,
      currentOffsetX: offset,
      currentOffsetY: offset,
      currentOffsetZ: offset,
      limitX: limitX === 0 ? undefined : limitX,
      limitY: limitY === 0 ? undefined : limitY,
      limitZ: limitZ === 0 ? undefined : limitZ
    })
  }, true)

  registerChannel(REMOVE_CHANNEL, removePacketStructure, (data) => {
    const { id } = data
    getThreeJsRendererMethods()?.removeSectionAnimation(id)
  }, true)

  console.debug('Registered section animation channels')
}

window.testSectionAnimation = (speedY = 1) => {
  const pos = bot.entity.position
  const id = `${Math.floor(pos.x / 16) * 16},${Math.floor(pos.y / 16) * 16},${Math.floor(pos.z / 16) * 16}`
  getThreeJsRendererMethods()?.addSectionAnimation(id, {
    time: performance.now(),
    speedX: 0,
    speedY,
    speedZ: 0,
    currentOffsetX: 0,
    currentOffsetY: 0,
    currentOffsetZ: 0,
    // limitX: 10,
    // limitY: 10,
  })
}

const registeredJeiChannel = () => {
  const CHANNEL_NAME = 'minecraft-web-client:jei'
  // id - string, categoryTitle - string, items - string (json array)
  const packetStructure = [
    'container',
    [
      {
        name: 'id',
        type: ['pstring', { countType: 'i16' }]
      },
      {
        name: '_categoryTitle',
        type: ['pstring', { countType: 'i16' }]
      },
      {
        name: 'items',
        type: ['pstring', { countType: 'i16' }]
      },
    ]
  ]

  bot._client.registerChannel(CHANNEL_NAME, packetStructure, true)

  bot._client.on(CHANNEL_NAME as any, (data) => {
    const { id, categoryTitle, items } = data
    if (items === '') {
      // remove category
      jeiCustomCategories.value = jeiCustomCategories.value.filter(x => x.id !== id)
      return
    }
    const PrismarineItem = PItem(bot.version)
    jeiCustomCategories.value.push({
      id,
      categoryTitle,
      items: JSON.parse(items).map(x => {
        const itemString = x.itemName || x.item_name || x.item || x.itemId
        const itemId = loadedData.itemsByName[itemString.replace('minecraft:', '')]
        if (!itemId) {
          console.warn(`Could not add item ${itemString} to JEI category ${categoryTitle} because it was not found`)
          return null
        }
        // const item = new PrismarineItem(itemId.id, x.itemCount || x.item_count || x.count || 1, x.itemDamage || x.item_damage || x.damage || 0, x.itemNbt || x.item_nbt || x.nbt || null)
        return PrismarineItem.fromNotch({
          ...x,
          itemId: itemId.id,
        })
      })
    })
  })

  console.debug(`registered custom channel ${CHANNEL_NAME} channel`)
}

const registerMediaChannels = () => {
  // Media Add Channel
  const ADD_CHANNEL = 'minecraft-web-client:media-add'
  const addPacketStructure = [
    'container',
    [
      { name: 'id', type: ['pstring', { countType: 'i16' }] },
      { name: 'x', type: 'f32' },
      { name: 'y', type: 'f32' },
      { name: 'z', type: 'f32' },
      { name: 'width', type: 'f32' },
      { name: 'height', type: 'f32' },
      { name: 'rotation', type: 'i16' }, // 0: 0° - towards positive z, 1: 90° - positive x, 2: 180° - negative z, 3: 270° - negative x (3-6 is same but double side)
      { name: 'source', type: ['pstring', { countType: 'i16' }] },
      { name: 'loop', type: 'bool' },
      { name: 'volume', type: 'f32' }, // 0
      { name: '_aspectRatioMode', type: 'i16' }, // 0
      { name: '_background', type: 'i16' }, // 0
      { name: '_opacity', type: 'i16' }, // 1
      { name: '_cropXStart', type: 'f32' }, // 0
      { name: '_cropYStart', type: 'f32' }, // 0
      { name: '_cropXEnd', type: 'f32' }, // 0
      { name: '_cropYEnd', type: 'f32' }, // 0
    ]
  ]

  // Media Control Channels
  const PLAY_CHANNEL = 'minecraft-web-client:media-play'
  const PAUSE_CHANNEL = 'minecraft-web-client:media-pause'
  const SEEK_CHANNEL = 'minecraft-web-client:media-seek'
  const VOLUME_CHANNEL = 'minecraft-web-client:media-volume'
  const SPEED_CHANNEL = 'minecraft-web-client:media-speed'
  const DESTROY_CHANNEL = 'minecraft-web-client:media-destroy'

  const noDataPacketStructure = [
    'container',
    [
      { name: 'id', type: ['pstring', { countType: 'i16' }] }
    ]
  ]

  const setNumberPacketStructure = [
    'container',
    [
      { name: 'id', type: ['pstring', { countType: 'i16' }] },
      { name: 'seconds', type: 'f32' }
    ]
  ]

  // Register channels
  registerChannel(PLAY_CHANNEL, noDataPacketStructure, (data) => {
    const { id } = data
    getThreeJsRendererMethods()?.setVideoPlaying(id, true)
  }, true)
  registerChannel(PAUSE_CHANNEL, noDataPacketStructure, (data) => {
    const { id } = data
    getThreeJsRendererMethods()?.setVideoPlaying(id, false)
  }, true)
  registerChannel(SEEK_CHANNEL, setNumberPacketStructure, (data) => {
    const { id, seconds } = data
    getThreeJsRendererMethods()?.setVideoSeeking(id, seconds)
  }, true)
  registerChannel(VOLUME_CHANNEL, setNumberPacketStructure, (data) => {
    const { id, volume } = data
    getThreeJsRendererMethods()?.setVideoVolume(id, volume)
  }, true)
  registerChannel(SPEED_CHANNEL, setNumberPacketStructure, (data) => {
    const { id, speed } = data
    getThreeJsRendererMethods()?.setVideoSpeed(id, speed)
  }, true)
  registerChannel(DESTROY_CHANNEL, noDataPacketStructure, (data) => {
    const { id } = data
    getThreeJsRendererMethods()?.destroyMedia(id)
  }, true)

  // Handle media add
  registerChannel(ADD_CHANNEL, addPacketStructure, (data) => {
    const { id, x, y, z, width, height, rotation, source, loop, volume, background, opacity } = data

    // Add new video
    getThreeJsRendererMethods()?.addMedia(id, {
      position: { x, y, z },
      size: { width, height },
      // side: 'towards',
      src: source,
      rotation: rotation as 0 | 1 | 2 | 3,
      doubleSide: false,
      background,
      opacity: opacity / 100,
      allowOrigins: options.remoteContentNotSameOrigin === false ? [getCurrentTopDomain()] : options.remoteContentNotSameOrigin,
      loop,
      volume
    })
  })

  // ---

  // Video interaction channel
  const interactionPacketStructure = [
    'container',
    [
      { name: 'id', type: ['pstring', { countType: 'i16' }] },
      { name: 'x', type: 'f32' },
      { name: 'y', type: 'f32' },
      { name: 'isRightClick', type: 'bool' }
    ]
  ]

  bot._client.registerChannel(MEDIA_INTERACTION_CHANNEL, interactionPacketStructure, true)

  // Media play channel
  bot._client.registerChannel(MEDIA_PLAY_CHANNEL_CLIENTBOUND, noDataPacketStructure, true)
  const mediaStopPacketStructure = [
    'container',
    [
      { name: 'id', type: ['pstring', { countType: 'i16' }] },
      // ended - emitted even when loop is true (will continue playing)
      // error: ...
      // stalled - connection drops, server stops sending data
      // waiting - connection is slow, server is sending data, but not fast enough (buffering)
      // control
      { name: 'reason', type: ['pstring', { countType: 'i16' }] },
      { name: 'time', type: 'f32' }
    ]
  ]
  bot._client.registerChannel(MEDIA_STOP_CHANNEL_CLIENTBOUND, mediaStopPacketStructure, true)

  console.debug('Registered media channels')
}

const MEDIA_INTERACTION_CHANNEL = 'minecraft-web-client:media-interaction'
const MEDIA_PLAY_CHANNEL_CLIENTBOUND = 'minecraft-web-client:media-play'
const MEDIA_STOP_CHANNEL_CLIENTBOUND = 'minecraft-web-client:media-stop'

export const sendVideoInteraction = (id: string, x: number, y: number, isRightClick: boolean) => {
  bot._client.writeChannel(MEDIA_INTERACTION_CHANNEL, { id, x, y, isRightClick })
}

export const sendVideoPlay = (id: string) => {
  bot._client.writeChannel(MEDIA_PLAY_CHANNEL_CLIENTBOUND, { id })
}

export const sendVideoStop = (id: string, reason: string, time: number) => {
  bot._client.writeChannel(MEDIA_STOP_CHANNEL_CLIENTBOUND, { id, reason, time })
}

export const videoCursorInteraction = () => {
  const { intersectMedia } = appViewer.rendererState.world
  if (!intersectMedia) return null
  return intersectMedia
}
window.videoCursorInteraction = videoCursorInteraction

const addTestVideo = (rotation = 0 as 0 | 1 | 2 | 3, scale = 1, isImage = false) => {
  const block = window.cursorBlockRel()
  if (!block) return
  const { position: startPosition } = block

  // Add video with proper positioning
  getThreeJsRendererMethods()?.addMedia('test-video', {
    position: {
      x: startPosition.x,
      y: startPosition.y + 1,
      z: startPosition.z
    },
    size: {
      width: scale,
      height: scale
    },
    src: isImage ? 'https://bucket.mcraft.fun/test_image.png' : 'https://bucket.mcraft.fun/test_video.mp4',
    rotation,
    // doubleSide: true,
    background: 0x00_00_00, // Black color
    // TODO broken
    // uvMapping: {
    //   startU: 0,
    //   endU: 1,
    //   startV: 0,
    //   endV: 1
    // },
    opacity: 1,
    allowOrigins: true,
  })
}
window.addTestVideo = addTestVideo

const registerServerSettingsChannel = () => {
  const CHANNEL_NAME = 'minecraft-web-client:server-settings'
  const packetStructure = [
    'container',
    [
      {
        name: 'settingsJson',
        type: ['pstring', { countType: 'i16' }]
      },
    ]
  ]

  registerChannel(CHANNEL_NAME, packetStructure, (data) => {
    try {
      const settings = JSON.parse(data.settingsJson)

      if (typeof settings !== 'object' || settings === null || Array.isArray(settings)) {
        console.warn('Invalid settings format: expected an object')
        return
      }

      let appliedCount = 0
      let skippedCount = 0

      for (const [key, value] of Object.entries(settings)) {
        // Only apply settings that are in the safe list
        if (!(key in serverSafeSettings)) {
          console.warn(`Skipping unsafe setting: ${key}`)
          skippedCount++
          continue
        }

        // Validate that the setting exists in options
        if (!(key in options)) {
          console.warn(`Setting does not exist: ${key}`)
          skippedCount++
          continue
        }

        // todo remove it later, let user take control back and make clear to user
        serverChangedSettings.value.add(key)
        options[key] = value
        appliedCount++
      }

      console.debug(`Applied ${appliedCount} server settings${skippedCount > 0 ? `, skipped ${skippedCount} unsafe/invalid settings` : ''}`)
    } catch (error) {
      console.error('Failed to parse or apply server settings:', error)
    }
  }, false) // Don't wait for world, settings can be applied before world loads
}

const registerTypingIndicatorChannel = () => {
  const CHANNEL_NAME = 'minecraft-web-client:typing-indicator'
  const packetStructure = [
    'container',
    [
      {
        name: 'username',
        type: ['pstring', { countType: 'i16' }]
      },
      {
        name: 'isTyping',
        type: 'bool'
      }
    ]
  ]

  registerChannel(CHANNEL_NAME, packetStructure, (data) => {
    const { username, isTyping } = data

    if (isTyping) {
      // Add user to typing list if not already there
      const existingIndex = gameAdditionalState.typingUsers.findIndex(user => user.username === username)
      if (existingIndex === -1) {
        gameAdditionalState.typingUsers.push({ username, timestamp: Date.now() })
      } else {
        // Update timestamp for existing user
        gameAdditionalState.typingUsers[existingIndex].timestamp = Date.now()
      }
    } else {
      // Remove user from typing list
      gameAdditionalState.typingUsers = gameAdditionalState.typingUsers.filter(user => user.username !== username)
    }
  })
}

/**
 * Register chunk-cache channel for server-side chunk caching protocol
 *
 * Protocol flow:
 * 1. On login, client sends all cached chunks {x, z, hash} to server via "cached-chunks" message
 * 2. For each chunk the client needs:
 *    - If server has same hash: sends {x, z, cacheHit: true} - client uses cached map_chunk data
 *    - If server has different/no hash: sends {x, z, hash: "..."} then the actual map_chunk packet
 * 3. Client caches new map_chunk packets with their hash for future sessions
 *
 * This saves network bandwidth by not re-sending unchanged chunk data.
 */
const registerChunkCacheChannel = () => {
  const CHANNEL_NAME = 'minecraft-web-client:chunk-cache'
  const CLIENT_CHANNEL = 'minecraft-web-client:chunk-cache-client'

  // Initialize both cache systems
  void chunkGeometryCache.init()
  void chunkPacketCache.init()

  // Get server address for cache scoping
  const serverAddress = lastConnectOptions.value?.server || 'unknown'

  // Packet structure for server -> client messages
  // Server sends either:
  // - {x, z, cacheHit: true, hash: ""} for cache hits
  // - {x, z, cacheHit: false, hash: "..."} before sending map_chunk
  const serverToClientStructure = [
    'container',
    [
      { name: 'x', type: 'i32' },
      { name: 'z', type: 'i32' },
      { name: 'cacheHit', type: 'bool' },
      { name: 'hash', type: ['pstring', { countType: 'i16' }] }
    ]
  ]

  // Packet structure for client -> server messages (cached chunks list)
  // Client sends: {chunksJson: "[{x, z, hash}, ...]"}
  const clientToServerStructure = [
    'container',
    [
      { name: 'chunksJson', type: ['pstring', { countType: 'i32' }] }
    ]
  ]

  // Track pending chunk hashes from server (for chunks we'll receive via map_chunk)
  // Stores {hash, timestamp} to enable TTL-based cleanup
  const pendingChunkHashes = new Map<string, { hash: string; timestamp: number }>()
  const PENDING_HASH_TTL = 30_000 // 30 seconds TTL for pending hashes

  // Track whether server supports the channel (detected via custom_payload)
  let serverSupportsChannel = false

  // Periodic cleanup of stale pending hashes
  const cleanupInterval = setInterval(() => {
    const now = Date.now()
    for (const [key, value] of pendingChunkHashes) {
      if (now - value.timestamp > PENDING_HASH_TTL) {
        pendingChunkHashes.delete(key)
        console.debug(`Expired pending hash for chunk ${key}`)
      }
    }
  }, 10_000) // Check every 10 seconds

  // Single cleanup handler on disconnect to prevent memory leaks
  // (combining interval cleanup and pending hashes clear)
  bot.once('end', () => {
    clearInterval(cleanupInterval)
    pendingChunkHashes.clear()
    void chunkGeometryCache.flush()
    void chunkPacketCache.flush()
  })

  // Initialize caches with server support = false by default
  void chunkPacketCache.setServerInfo(serverAddress, false)
  void chunkGeometryCache.setServerSupportsChannel(false, serverAddress)

  // Register the channel on client side
  bot._client.registerChannel(CHANNEL_NAME, serverToClientStructure, true)
  bot._client.registerChannel(CLIENT_CHANNEL, clientToServerStructure, true)

  // Listen for server channel registration via custom_payload
  // When server registers our channel, we know it supports chunk caching
  bot._client.on('custom_payload' as any, (packet: { channel: string; data: Buffer }) => {
    // Check for minecraft:register (1.13+) or REGISTER (pre-1.13) packets
    if (packet.channel === 'minecraft:register' || packet.channel === 'REGISTER') {
      // Parse null-separated channel names from the data
      const channelNames = packet.data.toString('utf8').split('\0').filter(Boolean)

      if (channelNames.includes(CHANNEL_NAME)) {
        // Server supports our channel!
        if (!serverSupportsChannel) {
          serverSupportsChannel = true
          console.debug(`Server registered ${CHANNEL_NAME} channel - enabling chunk caching`)

          // Update caches to enable persistent storage
          void chunkPacketCache.setServerInfo(serverAddress, true)
          void chunkGeometryCache.setServerSupportsChannel(true, serverAddress)

          // Send cached chunks list to server now that we know it supports caching
          void sendCachedChunksList()
        }
      }
    }
  })

  // Listen for server responses on our channel
  bot._client.on(CHANNEL_NAME as any, async (data: { x: number; z: number; cacheHit: boolean; hash: string }) => {
    // If we receive data on this channel, server definitely supports it
    if (!serverSupportsChannel) {
      serverSupportsChannel = true
      void chunkPacketCache.setServerInfo(serverAddress, true)
      void chunkGeometryCache.setServerSupportsChannel(true, serverAddress)
    }

    const chunkKey = `${data.x},${data.z}`

    if (data.cacheHit) {
      // Server confirmed cache hit - use our cached map_chunk data
      console.debug(`Cache hit for chunk ${chunkKey}`)

      const cached = await chunkPacketCache.get(data.x, data.z)
      if (cached) {
        // Emit the cached map_chunk packet as if we received it from server
        // This simulates receiving the packet without network transfer
        try {
          // The packet data needs to be deserialized and emitted
          // We emit it through the client's packet handling
          const packetBuffer = Buffer.from(cached.packetData)
          const deserialized = deserializeMapChunkPacket(packetBuffer)
          // Validate deserialized packet has required fields
          if (deserialized.x === undefined || deserialized.z === undefined) {
            throw new Error('Invalid deserialized packet: missing x or z coordinates')
          }
          bot._client.emit('packet', deserialized, { name: 'map_chunk' })
          console.debug(`Emitted cached map_chunk for ${chunkKey}`)
        } catch (error) {
          console.warn(`Cache corrupt for ${chunkKey}:`, error)
          // Invalidate and request fresh chunk from server
          await chunkPacketCache.invalidate(data.x, data.z)
          requestChunkResend(data.x, data.z)
        }
      } else {
        // Cache miss despite server thinking we have it - request resend
        console.warn(`Cache miss for ${chunkKey} - requesting resend`)
        await chunkPacketCache.invalidate(data.x, data.z)
        requestChunkResend(data.x, data.z)
      }
    } else if (data.hash) {
      // Server will send map_chunk next - store hash for caching with timestamp
      pendingChunkHashes.set(chunkKey, { hash: data.hash, timestamp: Date.now() })
      console.debug(`Expecting map_chunk for ${chunkKey} with hash ${data.hash}`)
    }
  })

  // Intercept map_chunk packets to cache them
  bot._client.on('packet', async (packetData: any, meta: { name: string }) => {
    if (meta.name !== 'map_chunk') return

    const chunkKey = `${packetData.x},${packetData.z}`
    const pending = pendingChunkHashes.get(chunkKey)

    if (pending) {
      // We have a hash from the server - cache this chunk
      pendingChunkHashes.delete(chunkKey)

      try {
        // Serialize the packet data for caching
        const serialized = serializeMapChunkPacket(packetData)
        await chunkPacketCache.set(packetData.x, packetData.z, serialized, pending.hash)
        console.debug(`Cached map_chunk for ${chunkKey} with hash ${pending.hash}`)
      } catch (error) {
        console.warn(`Failed to cache chunk ${chunkKey}:`, error)
      }
    } else {
      // No pending hash - server doesn't support caching for this chunk
      // or this is a chunk update, compute hash and cache anyway for next session
      try {
        const serialized = serializeMapChunkPacket(packetData)
        const hash = chunkPacketCache.computePacketHash(serialized)
        await chunkPacketCache.set(packetData.x, packetData.z, serialized, hash)
      } catch (error) {
        // Silently fail - caching is optional
      }
    }
  })

  console.debug(`Registered ${CHANNEL_NAME} channel - waiting for server registration`)

  /**
   * Request the server to resend a chunk when cache recovery fails
   * Sends an updated cache list without the failed chunk
   */
  function requestChunkResend (x: number, z: number): void {
    console.debug(`Requesting resend for chunk ${x},${z}`)
    // Send an empty cache entry for this chunk to force server to resend
    // The server will see we don't have this chunk and send it fresh
    try {
      const resendRequest = JSON.stringify([{ x, z, hash: '' }])
      bot._client.writeChannel(CLIENT_CHANNEL, { chunksJson: resendRequest })
    } catch (error) {
      console.warn(`Failed to request chunk resend for ${x},${z}:`, error)
    }
  }

  /**
   * Send list of all cached chunks to server on login
   */
  async function sendCachedChunksList (): Promise<void> {
    try {
      const cachedChunks = await chunkPacketCache.getCachedChunksInfo()

      if (cachedChunks.length === 0) {
        console.debug('No cached chunks to send to server')
        return
      }

      // Send as JSON array
      const chunksJson = JSON.stringify(cachedChunks)

      bot._client.writeChannel(CLIENT_CHANNEL, { chunksJson })
      console.debug(`Sent ${cachedChunks.length} cached chunk hashes to server`)
    } catch (error) {
      console.warn('Failed to send cached chunks list:', error)
    }
  }
}

/**
 * Serialize a map_chunk packet to ArrayBuffer for caching
 * Handles all version-specific fields by serializing the entire packet
 */
function serializeMapChunkPacket (packet: any): ArrayBuffer {
  // Create a serializable copy that handles all buffer/typed array fields
  const serializable: Record<string, any> = {}

  for (const key of Object.keys(packet)) {
    const value = packet[key]
    if (value === undefined || value === null) {
      serializable[key] = value
    } else if (Buffer.isBuffer(value)) {
      // Mark as buffer for reconstruction
      serializable[key] = { __type: 'buffer', data: [...value] }
    } else if (ArrayBuffer.isView(value)) {
      // Handle typed arrays (Int32Array, Uint8Array, etc.)
      serializable[key] = {
        __type: 'typedArray',
        arrayType: value.constructor.name,
        data: [...value as any]
      }
    } else if (value instanceof ArrayBuffer) {
      serializable[key] = { __type: 'buffer', data: [...new Uint8Array(value)] }
    } else {
      serializable[key] = value
    }
  }

  const json = JSON.stringify(serializable)
  const encoder = new TextEncoder()
  const encoded = encoder.encode(json)
  // Ensure proper ArrayBuffer bounds (TextEncoder always returns offset 0, but be safe)
  return encoded.buffer.slice(encoded.byteOffset, encoded.byteOffset + encoded.byteLength)
}

/**
 * Deserialize a cached map_chunk packet from ArrayBuffer
 * Reconstructs buffer and typed array fields
 */
function deserializeMapChunkPacket (buffer: Buffer): any {
  const decoder = new TextDecoder()
  const json = decoder.decode(buffer)
  const parsed = JSON.parse(json)

  // Reconstruct buffer and typed array fields
  for (const key of Object.keys(parsed)) {
    const value = parsed[key]
    if (value && typeof value === 'object' && value.__type) {
      if (value.__type === 'buffer') {
        parsed[key] = Buffer.from(value.data)
      } else if (value.__type === 'typedArray') {
        // Reconstruct the correct typed array type
        const TypedArrayConstructor = getTypedArrayConstructor(value.arrayType)
        parsed[key] = new TypedArrayConstructor(value.data)
      }
    }
  }

  return parsed
}

/**
 * Get the typed array constructor by name
 */
function getTypedArrayConstructor (name: string): any {
  const constructors: Record<string, any> = {
    Int8Array,
    Uint8Array,
    Uint8ClampedArray,
    Int16Array,
    Uint16Array,
    Int32Array,
    Uint32Array,
    Float32Array,
    Float64Array,
    BigInt64Array,
    BigUint64Array
  }
  return constructors[name] || Uint8Array
}

function getCurrentTopDomain (): string {
  const { hostname } = location
  // Split hostname into parts
  const parts = hostname.split('.')

  // Handle special cases like co.uk, com.br, etc.
  if (parts.length > 2) {
    // Check for common country codes with additional segments
    if (parts.at(-2) === 'co' ||
      parts.at(-2) === 'com' ||
      parts.at(-2) === 'org' ||
      parts.at(-2) === 'gov') {
      // Return last 3 parts (e.g., example.co.uk)
      return parts.slice(-3).join('.')
    }
  }

  // Return last 2 parts (e.g., example.com)
  return parts.slice(-2).join('.')
}
