import { useEffect, useRef } from 'react'
import { UAParser } from 'ua-parser-js'

export function useDidUpdateEffect (fn, inputs) {
  const isMountingRef = useRef(false)

  useEffect(() => {
    isMountingRef.current = true
  }, [])

  useEffect(() => {
    if (isMountingRef.current) {
      isMountingRef.current = false
    } else {
      return fn()
    }
  }, inputs)
}

export const ua = new UAParser(navigator.userAgent)

export const isIos = ua.getOS().name === 'iOS'

// Safari (desktop or iOS) — WebKit memory limits are strict
export const isSafari = ua.getBrowser().name === 'Safari' || isIos

export const reactKeyForMessage = (message) => {
  return typeof message === 'string' ? message : JSON.stringify(message)
}
