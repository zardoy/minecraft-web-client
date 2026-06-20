import { options } from '../optionsStorage'

interface Timer {
  id: number
  callback: () => void
  targetTime: number
  isInterval: boolean
  interval?: number
  cleanup?: () => void
}

let nextTimerId = 1
const timers: Timer[] = []

// TODO implementation breaks tps (something is wrong with intervals)
const fixBrowserTimers = () => {
  const originalSetTimeout = window.setTimeout
  //@ts-expect-error
  window.setTimeout = (callback: () => void, delay: number) => {
    if (!delay) {
      return originalSetTimeout(callback)
    }
    const id = nextTimerId++
    const targetTime = performance.now() + delay
    timers.push({ id, callback, targetTime, isInterval: false })
    originalSetTimeout(() => {
      checkTimers()
    }, delay)
    return id
  }

  const originalSetInterval = window.setInterval
  //@ts-expect-error
  window.setInterval = (callback: () => void, interval: number) => {
    if (!interval) {
      return originalSetInterval(callback, interval)
    }
    const id = nextTimerId++
    const targetTime = performance.now() + interval
    const originalInterval = originalSetInterval(() => {
      checkTimers()
    }, interval)
    timers.push({
      id,
      callback,
      targetTime,
      isInterval: true,
      interval,
      cleanup() {
        originalClearInterval(originalInterval)
      }
    })
    return id
  }

  const originalClearTimeout = window.clearTimeout
  //@ts-expect-error
  window.clearTimeout = (id: number) => {
    const index = timers.findIndex(t => t.id === id)
    if (index !== -1) {
      timers.splice(index, 1)
    }
    return originalClearTimeout(id)
  }

  const originalClearInterval = window.clearInterval
  //@ts-expect-error
  window.clearInterval = (id: number) => {
    const index = timers.findIndex(t => t.id === id)
    if (index !== -1) {
      const timer = timers[index]
      if (timer.cleanup) {
        timer.cleanup()
      }
      timers.splice(index, 1)
    }
    return originalClearInterval(id)
  }
}

export const checkTimers = () => {
  const now = performance.now()

  let triggered = false
  for (let i = timers.length - 1; i >= 0; i--) {
    const timer = timers[i]

    if (now >= timer.targetTime) {
      triggered = true
      timer.callback()

      if (timer.isInterval && timer.interval) {
        // Reschedule interval
        timer.targetTime = now + timer.interval
      } else {
        // Remove one-time timer
        timers.splice(i, 1)
      }
    }
  }

  if (!triggered) {
    console.log('No timers triggered!')
  }
}

// workaround for browser timers throttling after 5 minutes of tab inactivity
export const preventThrottlingWithSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    // Unfortunatelly cant use 0
    gainNode.gain.value = 0.001

    // Connect nodes
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    // Use a very low frequency
    oscillator.frequency.value = 1

    // Start playing
    oscillator.start()

    return async () => {
      try {
        oscillator.stop()
        await audioContext.close()
      } catch (err) {
        console.warn('Error stopping silent audio:', err)
      }
    }
  } catch (err) {
    console.error('Error creating silent audio:', err)
    return () => {}
  }
}
