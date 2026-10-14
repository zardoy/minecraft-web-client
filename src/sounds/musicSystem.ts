import { loadOrPlaySound } from '../basicSounds'
import { options } from '../optionsStorage'

class MusicSystem {
  private currentMusic: string | null = null

  async playMusic (url: string, musicVolume = 1) {
    if (!options.enableMusic || this.currentMusic || options.musicVolume === 0) return

    try {
      const { onEnded } = await loadOrPlaySound(url, musicVolume, 5000, undefined, true) ?? {}

      if (!onEnded) return

      this.currentMusic = url

      onEnded(() => {
        this.currentMusic = null
      })
    } catch (err) {
      console.warn('Failed to play music:', err)
      this.currentMusic = null
    }
  }

  stopMusic () {
    if (this.currentMusic) {
      this.currentMusic = null
    }
  }
}

export const musicSystem = new MusicSystem()
