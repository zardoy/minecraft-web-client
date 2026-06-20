import { RefObject, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { pixelartIcons } from '../PixelartIcon'

export const useScrollBehavior = (
  elementRef: RefObject<HTMLElement>,
  {
    messages,
    opened
  }: {
    messages: readonly any[]
    opened?: boolean
  }
) => {
  const openedWasAtBottom = useRef(true) // before new messages
  const [currentlyAtBottom, setCurrentlyAtBottom] = useState(true)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const isAtBottom = () => {
    if (!elementRef.current) return true
    const { scrollTop, scrollHeight, clientHeight } = elementRef.current
    const distanceFromBottom = Math.abs(scrollHeight - clientHeight - scrollTop)
    return distanceFromBottom < 1
  }

  const scrollToBottom = (behavior: ScrollBehavior = 'instant') => {
    if (!elementRef.current) return

    // Clear any existing scroll timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }

    const el = elementRef.current

    // Immediate scroll
    el.scrollTop = el.scrollHeight

    // Double-check after a short delay to ensure we're really at the bottom
    scrollTimeoutRef.current = setTimeout(() => {
      if (!elementRef.current) return
      const el = elementRef.current
      el.scrollTo({
        top: el.scrollHeight,
        behavior
      })
      setCurrentlyAtBottom(true)
      openedWasAtBottom.current = true
    }, 5)
  }

  // Handle scroll position tracking
  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const handleScroll = () => {
      const atBottom = isAtBottom()
      openedWasAtBottom.current = atBottom
      setCurrentlyAtBottom(atBottom)
    }

    element.addEventListener('scroll', handleScroll)
    return () => {
      element.removeEventListener('scroll', handleScroll)
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])

  // Handle opened state changes
  useLayoutEffect(() => {
    if (opened) {
      // Wait a frame before scrolling to ensure DOM has updated
      requestAnimationFrame(() => {
        scrollToBottom()
      })
    } else if (elementRef.current) {
      scrollToBottom()
    }
  }, [opened])

  // Handle messages changes
  useLayoutEffect(() => {
    if ((!opened || (opened && openedWasAtBottom.current)) && elementRef.current) {
      scrollToBottom()
    }
  }, [messages])

  return {
    scrollToBottom,
    isAtBottom,
    wasAtBottom: () => openedWasAtBottom.current,
    currentlyAtBottom
  }
}
