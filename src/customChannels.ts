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
