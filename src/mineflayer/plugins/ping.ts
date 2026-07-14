import { versionToNumber } from 'minecraft-renderer/src/lib/utils'

export default () => {
  let i = 0
  bot.pingProxy = async () => {
    const curI = ++i
    return new Promise(resolve => {
      //@ts-expect-error
      bot._client.socket._ws.send(`ping:${curI}`)
      const date = Date.now()
      const onPong = (received) => {
        if (received !== curI.toString()) return
        bot._client.socket.off('pong' as any, onPong)
        resolve(Date.now() - date)
      }
      bot._client.socket.on('pong' as any, onPong)
    })
  }

  let pingId = 0
  bot.pingServer = async () => {
    if (versionToNumber(bot.version) < versionToNumber('1.20.2')) return bot.player?.ping ?? -1
    return new Promise<number>((resolve) => {
      const curId = pingId++
      bot._client.write('ping_request', { id: BigInt(curId) })
      const date = Date.now()
      const onPong = (data: { id: bigint }) => {
        if (BigInt(data.id) !== BigInt(curId)) return
        bot._client.off('ping_response' as any, onPong)
        resolve(Date.now() - date)
      }
      bot._client.on('ping_response' as any, onPong)
    })
  }
}

declare module 'mineflayer' {
  interface Bot {
    pingProxy: () => Promise<number>
    pingServer: () => Promise<number | undefined>
  }
}
