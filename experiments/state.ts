import { SmoothSwitcher } from 'minecraft-renderer/src/lib/smoothSwitcher'

const div = document.createElement('div')
div.style.width = '100px'
div.style.height = '100px'
div.style.backgroundColor = 'red'
document.body.appendChild(div)

const pos = {x: 0, y: 0}

const positionSwitcher = new SmoothSwitcher(() => pos, (key, value) => {
  pos[key] = value
})
globalThis.positionSwitcher = positionSwitcher

document.body.addEventListener('keydown', e => {
  if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
    const to = {
      x: e.code === 'ArrowLeft' ? -100 : 100
    }
    console.log(pos, to)
    positionSwitcher.transitionTo(to, e.code === 'ArrowLeft' ? 'Left' : 'Right', () => {
      console.log('Switched to ', e.code === 'ArrowLeft' ? 'Left' : 'Right')
    })
  }
  if (e.code === 'Space') {
    pos.x = 200
  }
})

const render = () => {
  positionSwitcher.update()
    div.style.transform = `translate(${pos.x}px, ${pos.y}px)`
    requestAnimationFrame(render)
}

render()
