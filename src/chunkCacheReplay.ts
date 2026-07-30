type ReplayPacketMeta = {
  name: 'map_chunk'
  state?: unknown
}

type ReplayClient = {
  state?: unknown
  emit: (event: string, ...args: any[]) => void
}

export const createReplayedChunkPacketTracker = () => new WeakSet<object>()

export const emitReplayedMapChunk = (
  client: ReplayClient,
  replayedChunkPackets: WeakSet<object>,
  packetData: object,
  packetBuffer: Buffer,
): ReplayPacketMeta => {
  replayedChunkPackets.add(packetData)
  const packetMeta: ReplayPacketMeta = {
    name: 'map_chunk',
    state: client.state
  }
  client.emit('packet', packetData, packetMeta, packetBuffer, packetBuffer)
  client.emit('map_chunk', packetData, packetMeta)
  return packetMeta
}

export const consumeReplayedChunkPacket = (
  replayedChunkPackets: WeakSet<object>,
  packetData: unknown,
): boolean => {
  if (!packetData || typeof packetData !== 'object' || !replayedChunkPackets.has(packetData)) {
    return false
  }

  replayedChunkPackets.delete(packetData)
  return true
}
