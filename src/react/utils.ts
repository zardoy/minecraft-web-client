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

// Safari (desktop or iOS) — WebKit memory limits are strict, used to gate
// memory-heavy features such as the WASM mesher conversion cache.
export const isSafari = ua.getBrowser().name === 'Safari' || isIos

export const reactKeyForMessage = (message) => {
  return typeof message === 'string' ? message : JSON.stringify(message)
}

export const mapEventCoordinates = (e: { clientX: number, clientY: number }) => {
  const isRotated = document.body.classList.contains('rotated')
  const rect = document.body.getBoundingClientRect()

  return {
    clientX: isRotated ? e.clientY : e.clientX,
    clientY: isRotated ? rect.width - e.clientX : e.clientY,
    sizeX: isRotated ? rect.height : rect.width,
    sizeY: isRotated ? rect.width : rect.height
  }
}

export const getGameViewportSize = () => {
  const canvas = document.querySelector('canvas#viewer-canvas')
  if (!canvas) return { width: 0, height: 0 }
  return {
    width: canvas.clientWidth,
    height: canvas.clientHeight
  }
}
