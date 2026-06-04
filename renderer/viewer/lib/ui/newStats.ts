/* eslint-disable unicorn/prefer-dom-node-text-content */
const rightOffset = 0

const stats = {}

let lastY = 40

/** Host app should style z-index (see prismarine-web-client `styles.css`). */
export const MC_RENDERER_DEBUG_OVERLAY_CLASS = 'mc-renderer-debug-overlay'

export const addNewStat = (
  id: string,
  width = 80,
  x = rightOffset,
  y = lastY,
  opts?: { className?: string },
) => {
  const pane = document.createElement('div')
  pane.style.position = 'fixed'
  pane.style.top = `${y ?? lastY}px`
  pane.style.right = `${x}px`
  // gray bg
  pane.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'
  pane.style.color = 'white'
  pane.style.padding = '2px'
  pane.style.fontFamily = 'monospace'
  pane.style.fontSize = '12px'
  if (opts?.className) {
    pane.className = opts.className
  } else {
    pane.style.zIndex = '100'
  }
  pane.style.pointerEvents = 'none'
  document.body.appendChild(pane)
  stats[id] = pane
  if (y === undefined && x === rightOffset) { // otherwise it's a custom position
    // rightOffset += width
    lastY += 20
  }

  return {
    updateText (text: string) {
      if (pane.innerText === text) return
      pane.innerText = text
    },
    setVisibility (visible: boolean) {
      pane.style.display = visible ? 'block' : 'none'
    }
  }
}

export const addNewStat2 = (id: string, { top, bottom, right, left, displayOnlyWhenWider }: { top?: number, bottom?: number, right?: number, left?: number, displayOnlyWhenWider?: number }) => {
  if (top === undefined && bottom === undefined) top = 0
  const pane = document.createElement('div')
  pane.style.position = 'fixed'
  if (top !== undefined) {
    pane.style.top = `${top}px`
  }
  if (bottom !== undefined) {
    pane.style.bottom = `${bottom}px`
  }
  if (left !== undefined) {
    pane.style.left = `${left}px`
  }
  if (right !== undefined) {
    pane.style.right = `${right}px`
  }
  // gray bg
  pane.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'
  pane.style.color = 'white'
  pane.style.padding = '2px'
  pane.style.fontFamily = 'monospace'
  pane.style.fontSize = '12px'
  pane.style.zIndex = '10000'
  pane.style.pointerEvents = 'none'
  document.body.appendChild(pane)
  stats[id] = pane

  const resizeCheck = () => {
    if (!displayOnlyWhenWider) return
    pane.style.display = window.innerWidth > displayOnlyWhenWider ? 'block' : 'none'
  }
  window.addEventListener('resize', resizeCheck)
  resizeCheck()

  return {
    updateText (text: string) {
      pane.innerText = text
    },
    setVisibility (visible: boolean) {
      pane.style.display = visible ? 'block' : 'none'
    }
  }
}

export const updateStatText = (id, text) => {
  if (!stats[id]) return
  stats[id].innerText = text
}

export const updatePanesVisibility = (visible: boolean) => {
  // eslint-disable-next-line guard-for-in
  for (const id in stats) {
    stats[id].style.display = visible ? 'block' : 'none'
  }
}

export const removeAllStats = () => {
  // eslint-disable-next-line guard-for-in
  for (const id in stats) {
    removeStat(id)
  }
}

export const removeStat = (id) => {
  if (!stats[id]) return
  stats[id].remove()
  delete stats[id]
}

if (typeof customEvents !== 'undefined') {
  customEvents.on('gameLoaded', () => {
    const chunksLoaded = addNewStat('chunks-loaded', 80, 0, 0)
    const chunksTotal = addNewStat('chunks-read', 80, 0, 0)
  })
}
