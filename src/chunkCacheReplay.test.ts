import { describe, expect, it, vi } from 'vitest'

import {
  consumeReplayedChunkPacket,
  createReplayedChunkPacketTracker,
  emitReplayedMapChunk,
} from './chunkCacheReplay'

describe('chunk cache replay helpers', () => {
  it('emits both packet and map_chunk events with the packet state', () => {
    const emit = vi.fn()
    const client = { state: 'play', emit }
    const tracker = createReplayedChunkPacketTracker()
    const packetData = { x: 1, z: 2 }
    const packetBuffer = Buffer.from('cached-packet')

    const packetMeta = emitReplayedMapChunk(client, tracker, packetData, packetBuffer)

    expect(packetMeta).toEqual({ name: 'map_chunk', state: 'play' })
    expect(emit).toHaveBeenNthCalledWith(1, 'packet', packetData, packetMeta, packetBuffer, packetBuffer)
    expect(emit).toHaveBeenNthCalledWith(2, 'map_chunk', packetData, packetMeta)
  })

  it('marks replayed packets so they can be skipped once by the cache writer', () => {
    const tracker = createReplayedChunkPacketTracker()
    const packetData = { x: 4, z: -3 }

    emitReplayedMapChunk({ emit: vi.fn() }, tracker, packetData, Buffer.alloc(0))

    expect(consumeReplayedChunkPacket(tracker, packetData)).toBe(true)
    expect(consumeReplayedChunkPacket(tracker, packetData)).toBe(false)
  })

  it('does not skip unrelated packets', () => {
    const tracker = createReplayedChunkPacketTracker()

    expect(consumeReplayedChunkPacket(tracker, { x: 0, z: 0 })).toBe(false)
    expect(consumeReplayedChunkPacket(tracker, null)).toBe(false)
    expect(consumeReplayedChunkPacket(tracker, 'map_chunk')).toBe(false)
  })
})
