import { getThreeJsRendererMethods } from 'minecraft-renderer/src/three/threeJsMethods'

customEvents.on('mineflayerBotCreated', () => {
  customEvents.on('hurtAnimation', (yaw) => {
    getThreeJsRendererMethods()?.shakeFromDamage()
  })

  bot._client.on('hurt_animation', ({ entityId, yaw }) => {
    if (entityId === bot.entity.id) {
      customEvents.emit('hurtAnimation', yaw)
    }
  })
  bot.on('entityHurt', ({ id }) => {
    if (id === bot.entity.id) {
      customEvents.emit('hurtAnimation')
    }
  })
  let { health } = bot
  bot.on('health', () => {
    if (bot.health < health) {
      customEvents.emit('hurtAnimation')
    }
    health = bot.health
  })
})
