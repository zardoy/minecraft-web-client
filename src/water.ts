import { ref } from 'valtio'
import { watchUnloadForCleanup } from './gameUnload'
import { isWaterBlock } from './sounds/waterSounds'

let inWater = false

customEvents.on('gameLoaded', () => {
  const cleanup = () => {
    appViewer.playerState.reactive.inWater = false
  }
  watchUnloadForCleanup(cleanup)

  const updateInWater = () => {
    const waterBr = Object.keys(bot.entity.effects).find((effect: any) => loadedData.effects[effect.id]?.name === 'water_breathing')
    if (inWater) {
      appViewer.playerState.reactive.inWater = true
      appViewer.playerState.reactive.waterBreathing = waterBr !== undefined
    } else {
      cleanup()
    }
    updateBackground()
  }
  bot.on('physicsTick', () => {
    // Underwater effects (fog, ambience) follow the camera, so test the block at eye level.
    const eyeHeight = appViewer.playerState.reactive.eyeHeight ?? 1.62
    const _inWater = isWaterBlock(bot.world.getBlock(bot.entity.position.offset(0, eyeHeight, 0).floored()))
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
  appViewer.playerState.reactive.backgroundColor = ref(color)
}
