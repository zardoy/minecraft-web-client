import { createContext, useContext, useEffect, useState } from 'react'
import { useMedia } from 'react-use'

export const ScaleContext = createContext<number>(1)

export const useScale = () => useContext(ScaleContext)

export const UIProvider = ({ children, scale = 1 }) => {
  return <ScaleContext.Provider value={scale}>{children}</ScaleContext.Provider>
}

export const usePassesScaledDimensions = (minWidth: number | null = null, minHeight: number | null = null) => {
  const scale = useScale()
  const conditions: string[] = []

  if (minWidth !== null) {
    conditions.push(`(min-width: ${minWidth * scale}px)`)
  }
  if (minHeight !== null) {
    conditions.push(`(min-height: ${minHeight * scale}px)`)
  }

  const media = conditions.join(' and ') || 'all'
  return useMedia(media)
}
