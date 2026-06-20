import { subscribeKey } from 'valtio/utils'
import { preventThrottlingWithSound } from '../core/timers'
import { options } from '../optionsStorage'

customEvents.on('mineflayerBotCreated', () => {
  const abortController = new AbortController()

  const maybeGoBackgroundKickPrevention = () => {
    if (options.preventBackgroundTimeoutKick && !bot.backgroundKickPrevention) {
      const unsub = preventThrottlingWithSound()
      bot.on('end', unsub)
      bot.backgroundKickPrevention = true
    }
  }
  maybeGoBackgroundKickPrevention()
  subscribeKey(options, 'preventBackgroundTimeoutKick', value => {
    maybeGoBackgroundKickPrevention()
  })

  // wake lock
  const requestWakeLock = async () => {
    if (!('wakeLock' in navigator)) {
      console.warn('Wake Lock API is not supported in this browser')
      return
    }

    if (options.preventSleep && !bot.wakeLock && !bot.lockRequested) {
      bot.lockRequested = true
      bot.wakeLock = await navigator.wakeLock.request('screen').finally(() => {
        bot.lockRequested = false
      })

      bot.wakeLock.addEventListener(
        'release',
        () => {
          bot.wakeLock = undefined
        },
        {
          once: true
        }
      )
    }

    if (!options.preventSleep && bot.wakeLock) {
      void bot.wakeLock.release()
    }
  }
  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.visibilityState === 'visible') {
        // we are back to the tab, request wake lock again
        void requestWakeLock()
      }
    },
    {
      signal: abortController.signal
    }
  )
  void requestWakeLock()
  subscribeKey(options, 'preventSleep', value => {
    void requestWakeLock()
  })

  bot.on('end', () => {
    if (bot.wakeLock) {
      void bot.wakeLock.release()
    }
    abortController.abort()
  })
})

declare module 'mineflayer' {
  interface Bot {
    backgroundKickPrevention?: boolean
    wakeLock?: WakeLockSentinel
    lockRequested?: boolean
  }
}
