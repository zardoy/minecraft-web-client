import { Vec3 } from 'vec3'
import { versionToNumber } from 'renderer/viewer/common/utils'
import { loadScript } from 'renderer/viewer/lib/utils'
import type { Block } from 'prismarine-block'
import { subscribeKey } from 'valtio/utils'
import { miscUiState } from '../globalState'
import { options } from '../optionsStorage'
import { loadOrPlaySound } from '../basicSounds'
import { getActiveResourcepackBasePath, resourcePackState } from '../resourcePack'
import { showNotification } from '../react/NotificationProvider'
import { pixelartIcons } from '../react/PixelartIcon'
import { createSoundMap, SoundMap } from './soundsMap'
import { musicSystem } from './musicSystem'
import './customSoundSystem'

let soundMap: SoundMap | undefined

const updateResourcePack = async () => {
  if (!soundMap) return
  // todo, rework to await
  void soundMap.updateActiveResourcePackBasePath(await getActiveResourcepackBasePath() ?? undefined)
}

let musicInterval: ReturnType<typeof setInterval> | null = null

subscribeKey(miscUiState, 'gameLoaded', async () => {
  if (!miscUiState.gameLoaded) {
    stopMusicSystem()
    soundMap?.quit()
    return
  }

  console.log(`Loading sounds for version ${bot.version}. Resourcepack state: ${JSON.stringify(resourcePackState)}`)
  soundMap = createSoundMap(bot.version) ?? undefined
  globalThis.soundMap = soundMap
  if (!soundMap) return
  if (soundMap.noVersionIdMapping) {
    showNotification('No exact sound ID mappings for this version', undefined, false, pixelartIcons['warning-box'])
  }
  void updateResourcePack()
  startMusicSystem()

  const playGeneralSound = async (soundKey: string, position?: Vec3, volume = 1, pitch?: number) => {
    if (!options.volume || !soundMap) return
    const soundData = await soundMap.getSoundUrl(soundKey, volume)
    if (!soundData) return

    const isMuted = options.mutedSounds.includes(soundKey) || options.volume === 0
    if (position) {
      if (!isMuted) {
        appViewer.backend?.soundSystem?.playSound(
          position,
          soundData.url,
          soundData.volume,
          Math.max(Math.min(pitch ?? 1, 2), 0.5),
          soundData.timeout ?? options.remoteSoundsLoadTimeout
        )
      }
      if (getDistance(bot.entity.position, position) < 4 * 16) {
        lastPlayedSounds.lastServerPlayed[soundKey] ??= { count: 0, last: 0 }
        lastPlayedSounds.lastServerPlayed[soundKey].count++
        lastPlayedSounds.lastServerPlayed[soundKey].last = Date.now()
      }
    } else {
      if (!isMuted) {
        await loadOrPlaySound(soundData.url, volume)
      }
      lastPlayedSounds.lastClientPlayed.push(soundKey)
      if (lastPlayedSounds.lastClientPlayed.length > 10) {
        lastPlayedSounds.lastClientPlayed.shift()
      }
    }
  }

  const musicStartCheck = async (force = false) => {
    if (!soundMap || !bot) return
    if (!options.enableMusic && !force) return
    // 30% chance to start music
    if (Math.random() > 0.3 && !force) return

    const musicKeys = ['music.game']
    if (bot.game.gameMode === 'creative') {
      musicKeys.push('music.creative')
    }
    const randomMusicKey = musicKeys[Math.floor(Math.random() * musicKeys.length)]
    const soundData = await soundMap.getSoundUrl(randomMusicKey)
    if (!soundData || !soundMap) return
    await musicSystem.playMusic(soundData.url, soundData.volume)
  }

  function startMusicSystem () {
    if (musicInterval) return
    musicInterval = setInterval(() => {
      void musicStartCheck()
    }, 10_000)
  }

  window.forceStartMusic = () => {
    void musicStartCheck(true)
  }


  function stopMusicSystem () {
    if (musicInterval) {
      clearInterval(musicInterval)
      musicInterval = null
    }
  }

  const playHardcodedSound = async (soundKey: string, position?: Vec3, volume = 1, pitch?: number) => {
    await playGeneralSound(soundKey, position, volume, pitch)
  }

  bot.on('soundEffectHeard', async (soundId, position, volume, pitch) => {
    if (/^https?:/.test(soundId.replace('minecraft:', ''))) {
      return
    }
    await playHardcodedSound(soundId, position, volume, pitch)
  })

  bot._client.on('sound_effect', async (packet) => {
    const hasNamedSoundEffect = versionToNumber(bot.version) < versionToNumber('1.19.3')

    const soundResource = packet['soundEvent']?.resource as string | undefined
    const pos = new Vec3(packet.x / 8, packet.y / 8, packet.z / 8)
    if (packet.soundId !== 0 || !soundResource) {
      const soundKey = soundMap!.soundsIdToName[packet.soundId - (hasNamedSoundEffect ? 0 : 1)]
      if (soundKey === undefined) return
      await playGeneralSound(soundKey, pos, packet.volume, packet.pitch)
      return
    }

    await playHardcodedSound(soundResource.replace('minecraft:', ''), pos, packet.volume, packet.pitch)
  })

  bot.on('entityHurt', async (entity) => {
    if (entity.id === bot.entity.id) {
      await playHardcodedSound('entity.player.hurt')
    }
  })

  let lastStepSound = 0
  const movementHappening = async () => {
    if (!bot.entity || !soundMap) return // no info yet
    if (appViewer.playerState.reactive.gameMode === 'spectator') return // Don't play step sounds in spectator mode
    const VELOCITY_THRESHOLD = 0.1
    const RUN_THRESHOLD = 0.15
    const { x, z, y } = bot.entity.velocity
    if (bot.entity.onGround && (Math.abs(x) > VELOCITY_THRESHOLD || Math.abs(z) > VELOCITY_THRESHOLD)) {
      const isRunning = (Math.abs(x) > RUN_THRESHOLD || Math.abs(z) > RUN_THRESHOLD)
      // movement happening
      if (Date.now() - lastStepSound > (isRunning ? 100 : 300)) {
        const blockUnder = bot.world.getBlock(bot.entity.position.offset(0, -1, 0))
        if (blockUnder) {
          const stepSound = soundMap.getStepSound(blockUnder.name)
          if (stepSound) {
            await playHardcodedSound(stepSound, undefined, 0.6)
            lastStepSound = Date.now()
          }
        }
      }
    }
  }

  const playBlockBreak = async (blockName: string, position?: Vec3) => {
    if (!soundMap) return
    const sound = soundMap.getBreakSound(blockName)
    await playHardcodedSound(sound, position, 0.6, 1)
  }

  const registerEvents = () => {
    bot.on('move', () => {
      void movementHappening()
    })
    bot._client.on('world_event', async ({ effectId, location, data, global: disablePosVolume }) => {
      const position = disablePosVolume ? undefined : new Vec3(location.x, location.y, location.z)
      if (effectId === 2001) {
        // break event
        const block = loadedData.blocksByStateId[data]
        await playBlockBreak(block.name, position)
      }
      // these produce glass break sound
      if (effectId === 2002 || effectId === 2003 || effectId === 2007) {
        await playHardcodedSound('block.glass.break', position, 1, 1)
      }
      if (effectId === 1004) {
        // firework shoot
        await playHardcodedSound('entity.firework_rocket.launch', position, 1, 1)
      }
      if (effectId === 1006 || effectId === 1007 || effectId === 1014) {
        // wooden door open/close
        await playHardcodedSound('block.wooden_door.open', position, 1, 1)
      }
      if (effectId === 1002) {
        // dispenser shoot
        await playHardcodedSound('block.dispenser.dispense', position, 1, 1)
      }
      if (effectId === 1024) {
        // wither shoot
        await playHardcodedSound('entity.wither.shoot', position, 1, 1)
      }
      if (effectId === 1031) {
        // anvil land
        await playHardcodedSound('block.anvil.land', position, 1, 1)
      }
      if (effectId === 1010) {
        console.log('play record', data)
      }
    })

    let diggingBlock: Block | null = null
    customEvents.on('digStart', () => {
      diggingBlock = bot.blockAtCursor(5)
    })
    bot.on('diggingCompleted', async () => {
      if (diggingBlock) {
        await playBlockBreak(diggingBlock.name, diggingBlock.position)
      }
    })
  }

  registerEvents()
})

subscribeKey(resourcePackState, 'resourcePackInstalled', async () => {
  await updateResourcePack()
})

export const downloadSoundsIfNeeded = async () => {
  if (!window.allSoundsMap) {
    try {
      await loadScript('./sounds.js')
    } catch (err) {
      console.warn('Sounds map was not generated. Sounds will not be played.')
    }
  }
}

export const lastPlayedSounds = {
  lastClientPlayed: [] as string[],
  lastServerPlayed: {} as Record<string, { count: number, last: number }>,
}

const getDistance = (pos1: Vec3, pos2: Vec3) => {
  return Math.hypot((pos1.x - pos2.x), (pos1.y - pos2.y), (pos1.z - pos2.z))
}
