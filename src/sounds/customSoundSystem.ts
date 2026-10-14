import { loadOrPlaySound, stopAllSounds, stopSound } from '../basicSounds'
import { options } from '../optionsStorage'

const customSoundSystem = () => {
  bot._client.on('named_sound_effect', packet => {
    if (!options.remoteSoundsSupport) return
    let { soundName } = packet
    let metadata = {} as { loadTimeout?: number, loop?: boolean }

    // Extract JSON metadata from parentheses at the end
    const jsonMatch = /\(({.*})\)$/.exec(soundName)
    if (jsonMatch) {
      try {
        metadata = JSON.parse(jsonMatch[1])
        soundName = soundName.slice(0, -jsonMatch[0].length)
      } catch (e) {
        console.warn('Failed to parse sound metadata:', jsonMatch[1])
      }
    }

    if (/^https?:/.test(soundName.replace('minecraft:', ''))) {
      const { loadTimeout, loop } = metadata
      void loadOrPlaySound(soundName, packet.volume, loadTimeout, loop)
    }
  })

  bot._client.on('stop_sound', packet => {
    const { flags, source, sound } = packet

    if (flags === 0) {
      // Stop all sounds
      stopAllSounds()
    } else if (sound) {
      // Stop specific sound by name
      stopSound(sound)
    }
  })

  bot.on('end', () => {
    stopAllSounds()
  })
}

customEvents.on('mineflayerBotCreated', () => {
  customSoundSystem()
})
