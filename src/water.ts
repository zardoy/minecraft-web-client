import * as THREE from 'three'
import { watchUnloadForCleanup } from './gameUnload'

let inWater = false

customEvents.on('gameLoaded', () => {
  const cleanup = () => {
    viewer.scene.fog = null
  }
  watchUnloadForCleanup(cleanup)

  const updateInWater = () => {
    const waterBr = Object.keys(bot.entity.effects).find((effect: any) => loadedData.effects[effect.id].name === 'water_breathing')
    if (inWater) {
      viewer.scene.fog = new THREE.Fog(0x00_00_ff, 0.1, waterBr ? 100 : 20) // Set the fog color to blue if the bot is in water.
    } else {
      cleanup()
    }
    updateBackground()
  }
  bot.on('physicsTick', () => {
    // todo
    const _inWater = bot.world.getBlock(bot.entity.position.offset(0, 1, 0))?.name === 'water'
    if (_inWater !== inWater) {
      inWater = _inWater
      updateInWater()
    }
  })
})

let sceneBg = { r: 0, g: 0, b: 0 }
export const updateBackground = (newSceneBg = sceneBg) => {
  sceneBg = newSceneBg
  const color: [number, number, number] = inWater ? [0, 0, 1] : [sceneBg.r, sceneBg.g, sceneBg.b]
  viewer.world.changeBackgroundColor(color)
}
