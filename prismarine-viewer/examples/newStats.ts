/* eslint-disable unicorn/prefer-dom-node-text-content */
let rightOffset = 0

const stats = {}

export const addNewStat = (id: string, width = 80, x = rightOffset, y = 0) => {
  const pane = document.createElement('div')
  pane.id = 'fps-counter'
  pane.style.position = 'fixed'
  pane.style.top = `${y}px`
  pane.style.right = `${x}px`
  // gray bg
  pane.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'
  pane.style.color = 'white'
  pane.style.padding = '2px'
  pane.style.fontFamily = 'monospace'
  pane.style.fontSize = '12px'
  pane.style.zIndex = '10000'
  pane.style.pointerEvents = 'none'
  document.body.appendChild(pane)
  stats[id] = pane
  if (y === 0) { // otherwise it's a custom position
    rightOffset += width
  }

  return {
    updateText (text: string) {
      pane.innerText = text
    }
  }
}

export const updateStatText = (id, text) => {
  if (!stats[id]) return
  stats[id].innerText = text
}
