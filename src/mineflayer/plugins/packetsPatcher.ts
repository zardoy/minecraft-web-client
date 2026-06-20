export default () => {
  // not plugin so its loaded earlier
  customEvents.on('mineflayerBotCreated', () => {
    botInit()
  })
}

const waitingPackets = {} as Record<string, Array<{ name: string; data: any }>>

const botInit = () => {
  // PATCH READING
  bot._client.on('packet', (data, meta) => {
    if (meta.name === 'map_chunk') {
      if (data.groundUp && data.bitMap === 1 && data.chunkData.every(x => x === 0)) {
        data.chunkData = Buffer.from(Array.from({ length: 12_544 }).fill(0) as any)
      }
    }
  })

  // PATCH WRITING

  const clientWrite = bot._client.write.bind(bot._client)
  const sendAllPackets = (name: string, data: any) => {
    for (const packet of waitingPackets[name]) {
      clientWrite(packet.name, packet.data)
    }
    delete waitingPackets[name]
  }

  //@ts-expect-error
  bot._client.write = (name: string, data: any) => {
    // if (name === 'position' || name === 'position_look' || name === 'look' || name === 'teleport_confirm') {
    //   const chunkX = Math.floor(bot.entity.position.x / 16)
    //   const chunkZ = Math.floor(bot.entity.position.z / 16)
    //   const loadedColumns = bot.world.getColumns()
    //   if (loadedColumns.some((c) => c.chunkX === chunkX && c.chunkZ === chunkZ)) {
    //     sendAllPackets('position', data)
    //   } else {
    //     waitingPackets['position'] = [...(waitingPackets['position'] || []), { name, data }]
    //     return
    //   }
    // }
    if (name === 'settings') {
      data['viewDistance'] = Math.max(data['viewDistance'], 3)
    }
    return clientWrite(name, data)
  }

  // PATCH INTERACTIONS
}
