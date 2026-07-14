import { lastConnectOptions } from '../../appStatus'
import mouse from './mouse'
import packetsPatcher from './packetsPatcher'
import mapChunkListener from './mapChunkListener'
import { localRelayServerPlugin } from './packetsRecording'
import ping from './ping'
import webFeatures from './webFeatures'

// register
webFeatures()
packetsPatcher()
mapChunkListener()


customEvents.on('mineflayerBotCreated', () => {
  if (lastConnectOptions.value!.server) {
    bot.loadPlugin(ping)
  }
  bot.loadPlugin(mouse)
  if (!lastConnectOptions.value!.worldStateFileContents) {
    bot.loadPlugin(localRelayServerPlugin)
  }
})
