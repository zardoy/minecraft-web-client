import { proxy, useSnapshot } from 'valtio'
import { subscribeKey } from 'valtio/utils'
import { useMedia } from 'react-use'
import { options, watchValue } from './optionsStorage'
import { useScale } from './react/UIProvider'

export const currentScaling = proxy({
  scale: 1
})
window.currentScaling = currentScaling

const setScale = () => {
  const scaleValues = [
    { maxWidth: 980, maxHeight: null, scale: 2 },
    { maxWidth: null, maxHeight: 390, scale: 1.5 }, // todo allow to set the scaling at 360-400 (dynamic scaling setting)
    { maxWidth: 620, maxHeight: null, scale: 1 },

    { maxWidth: 620, minHeight: 240, scale: 1.4 }
  ]

  const { innerWidth, innerHeight } = window

  let result = options.guiScale
  for (const { maxWidth, maxHeight, scale, minHeight } of scaleValues) {
    if ((!maxWidth || innerWidth <= maxWidth) && (!maxHeight || innerHeight <= maxHeight) && (!minHeight || innerHeight >= minHeight)) {
      result = scale
    }
  }

  currentScaling.scale = result
}

setScale()
subscribeKey(options, 'guiScale', setScale)
watchValue(currentScaling, c => {
  document.documentElement.style.setProperty('--guiScale', String(c.scale))
  document.documentElement.style.setProperty('--scale', String(c.scale))
})
window.addEventListener('resize', setScale)

export const useAppScale = () => {
  return useSnapshot(currentScaling).scale
}
