import { expect, test } from 'vitest'
import { computeMapChunkPacketHash, deserializeMapChunkPacket, serializeMapChunkPacket } from './chunkPacketHash'

const samplePacket = () => ({
  x: 12,
  z: -4,
  groundUp: true,
  bitMap: 65_535,
  chunkData: Buffer.from([0, 1, 2, 255]),
  heightmaps: new Uint32Array([4, 8, 15, 16, 23, 42]),
  biomes: undefined
})

test('map_chunk hash matches the proxy protocol parity vector', () => {
  expect(computeMapChunkPacketHash(samplePacket())).toBe('826a82a5')
})

test('map_chunk serialization round-trips binary and undefined fields', () => {
  const packet = samplePacket()
  const roundTripped = deserializeMapChunkPacket(Buffer.from(serializeMapChunkPacket(packet)))

  expect(roundTripped.x).toBe(packet.x)
  expect(roundTripped.chunkData).toEqual(packet.chunkData)
  expect(roundTripped.heightmaps).toEqual(packet.heightmaps)
  expect(roundTripped.biomes).toBeUndefined()
})
