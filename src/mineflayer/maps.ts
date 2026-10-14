import { mapDownloader } from 'mineflayer-item-map-downloader'
import { setImageConverter } from 'mineflayer-item-map-downloader/lib/util'
import { getThreeJsRendererMethods } from 'minecraft-renderer/src/three/threeJsMethods'

setImageConverter((buf: Uint8Array) => {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  canvas.width = 128
  canvas.height = 128
  const imageData = ctx.createImageData(canvas.width, canvas.height)
  imageData.data.set(buf)
  ctx.putImageData(imageData, 0, 0)
  // data url
  return canvas.toDataURL('image/png')
})

customEvents.on('mineflayerBotCreated', () => {
  bot.on('login', () => {
    bot.loadPlugin(mapDownloader)
    bot.mapDownloader.on('new_map', ({ png, id }) => {
      getThreeJsRendererMethods()?.updateMap(id, png)
    })
  })
})
