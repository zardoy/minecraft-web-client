import { useUtilsEffect } from '@zardoy/react-util'
import { useEffect, useState } from 'react'

const SMALL_SCREEN_WIDTH = 440
export const useIsSmallWidth = () => {
  const [isSmall, setIsSmall] = useState(() => document.documentElement.clientWidth <= SMALL_SCREEN_WIDTH)

  useEffect(() => {
    const checkWidth = () => {
      setIsSmall(document.documentElement.clientWidth <= SMALL_SCREEN_WIDTH)
    }
    addEventListener('resize', checkWidth)
    return () => {
      removeEventListener('resize', checkWidth)
    }
  }, [])

  return isSmall
}

export const usePassesWindowDimensions = (minWidth: number | null = null, minHeight: number | null = null) => {
  const [passes, setPasses] = useState(() => {
    const width = document.documentElement.clientWidth
    const height = document.documentElement.clientHeight
    return (minWidth === null || width >= minWidth) && (minHeight === null || height >= minHeight)
  })

  useEffect(() => {
    const checkDimensions = () => {
      const width = document.documentElement.clientWidth
      const height = document.documentElement.clientHeight
      setPasses((minWidth === null || width >= minWidth) && (minHeight === null || height >= minHeight))
    }
    addEventListener('resize', checkDimensions)
    return () => {
      removeEventListener('resize', checkDimensions)
    }
  }, [minWidth, minHeight])

  return passes
}

export const useCopyKeybinding = (getCopyText: () => string | undefined) => {
  useUtilsEffect(({ signal }) => {
    addEventListener('keydown', (e) => {
      if (e.code === 'KeyC' && (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
        const { activeElement } = document
        if (activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement) {
          return
        }
        if (window.getSelection()?.toString()) {
          return
        }
        e.preventDefault()
        const copyText = getCopyText()
        if (!copyText) return
        void navigator.clipboard.writeText(copyText)
      }
    }, { signal })
  }, [getCopyText])
}

export const useIsHashActive = (hash: `#${string}`) => {
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    const checkHash = () => {
      setIsActive(location.hash === hash)
    }
    checkHash()
    addEventListener('hashchange', checkHash)
    return () => {
      removeEventListener('hashchange', checkHash)
    }
  }, [])
  return isActive
}
