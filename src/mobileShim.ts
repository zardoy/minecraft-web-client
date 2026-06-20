// fix double tap on mobile

let lastElement = null as {
  clickTime: number
  element: HTMLElement
} | null
document.addEventListener(
  'touchstart',
  e => {
    if (e.touches.length > 1) {
      lastElement = null
      return
    }
    if (lastElement && Date.now() - lastElement.clickTime < 500 && lastElement.element === e.target) {
      lastElement.element.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
      lastElement = null
    }
    lastElement = {
      clickTime: Date.now(),
      element: e.target as HTMLElement
    }
  },
  { passive: false }
)
