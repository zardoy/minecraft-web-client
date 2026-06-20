import { useCallback, useRef, useState } from 'react'

interface LongPressOptions {
  shouldPreventDefault?: boolean
  delay?: number
}

const useLongPress = (onLongPress: () => void, onClick: () => void, { shouldPreventDefault = false, delay = 300 }: LongPressOptions = {}) => {
  const [longPressTriggered, setLongPressTriggered] = useState(false)
  const timeout = useRef<number | undefined>()
  const target = useRef<EventTarget | null>(null)

  const start = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      if (shouldPreventDefault && event.target) {
        event.target.addEventListener('touchend', preventDefault, {
          passive: false
        })
        target.current = event.target
      }
      timeout.current = window.setTimeout(() => {
        onLongPress()
        setLongPressTriggered(true)
      }, delay)
    },
    [onLongPress, delay, shouldPreventDefault]
  )

  const clear = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      if (timeout.current) {
        clearTimeout(timeout.current)
        timeout.current = undefined
      }

      setLongPressTriggered(false)

      if (shouldPreventDefault && target.current) {
        target.current.removeEventListener('touchend', preventDefault)
        target.current = null
      }
    },
    [shouldPreventDefault, onClick, longPressTriggered]
  )

  return {
    onMouseDown: (e: React.MouseEvent) => start(e),
    onTouchStart: (e: React.TouchEvent) => start(e),
    onMouseUp: (e: React.MouseEvent) => clear(e),
    onMouseLeave: (e: React.MouseEvent) => clear(e),
    onTouchEnd: (e: React.TouchEvent) => clear(e),
    onClick(e: React.MouseEvent) {
      onClick()
    }
  }
}

const preventDefault = (event: Event) => {
  if (!('touches' in event)) return

  const touchEvent = event as TouchEvent
  if (touchEvent.touches.length < 2 && event.preventDefault) {
    event.preventDefault()
  }
}

export default useLongPress
