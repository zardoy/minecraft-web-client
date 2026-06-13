/**
 * Capture raw `map_chunk` packet bytes from mineflayer and forward them
 * to the WASM mesher worker (via worldView → worldrendererCommon →
 * worker.postMessage). The worker can then call `parseMapChunkV18Plus`
 * directly on those bytes and skip the JS hot loop `convertChunkToWasm`
 * for protocol >= 757 (1.18+).
 *
 * For protocol 756 (1.17/1.17.1) the wire format differs (separate
 * `update_light` packet, flat biomes, explicit section bit-mask), so we
 * subscribe to the parsed `map_chunk` event instead and forward the
 * already-extracted `chunkData` + `bitMap` to the worker, which calls
 * `parseChunkSectionsV17`.
 *
 * Mineflayer is left untouched: it keeps parsing the column for
 * `bot.blockAt`, physics, inventory, etc. We just piggy-back on the same
 * packet event.
 */

import { appViewer } from '../../appViewer'

// 1.17 max bits per block (long-array values use 15 bpv when bitsPerBlock
// exceeds the per-section palette threshold of 8). Matches
// `wasm-mesher/src/parser_v17.rs::MAX_BITS_PER_BLOCK_V17`.
const MAX_BITS_PER_BLOCK_V17 = 15

const readVarInt = (buf: Buffer, offset: number): { value: number, bytesRead: number } | null => {
  let value = 0
  let shift = 0
  let pos = offset
  while (pos < buf.length) {
    const b = buf.readUInt8(pos++)
    value |= (b & 0x7F) << shift
    if ((b & 0x80) === 0) return { value, bytesRead: pos - offset }
    shift += 7
    if (shift > 35) return null
  }
  return null
}

// minecraft-protocol parses `i64` either as a `[hi, lo]` number pair or as
// a native bigint depending on the build. Normalise to flat
// `[lo0, hi0, lo1, hi1, ...]` u32 pairs the WASM parser expects.
const bitMapToLoHi = (bitMap: any[]): Uint32Array | null => {
  if (!Array.isArray(bitMap)) return null
  const out = new Uint32Array(bitMap.length * 2)
  for (const [i, entry] of bitMap.entries()) {
    if (typeof entry === 'bigint') {
      out[i * 2] = Number(entry & 0xff_ff_ff_ffn) >>> 0
      out[i * 2 + 1] = Number((entry >> 32n) & 0xff_ff_ff_ffn) >>> 0
    } else if (Array.isArray(entry) && entry.length === 2) {
      // protodef i64 → [hi, lo]
      const [hi, lo] = entry
      out[i * 2] = (lo as number) >>> 0
      out[i * 2 + 1] = (hi as number) >>> 0
    } else {
      return null
    }
  }
  return out
}

const resolveNumSections = (chunkX: number, chunkZ: number, fallback: number): number => {
  try {
    const column: any = (bot as any).world?.getColumn?.(chunkX, chunkZ)
    if (column) {
      const n = column.numSections
        ?? (column.worldHeight ? column.worldHeight >> 4 : undefined)
      if (typeof n === 'number') return n
    }
  } catch {}
  const worldHeight = (bot as any).game?.height
    ?? (bot as any).world?.worldHeight
  return typeof worldHeight === 'number' ? worldHeight >> 4 : fallback
}

export default () => {
  customEvents.on('mineflayerBotCreated', () => {
    botInit()
  })
}

const botInit = () => {
  bot._client.on('raw.map_chunk', (rawBuffer: Buffer | Uint8Array) => {
    try {
      const buf = Buffer.isBuffer(rawBuffer) ? rawBuffer : Buffer.from(rawBuffer)
      // Skip the leading varint packet-id; the WASM parser expects the
      // body to start with chunkX (i32 BE) chunkZ (i32 BE).
      const pid = readVarInt(buf, 0)
      if (!pid || buf.length < pid.bytesRead + 8) return
      const chunkX = buf.readInt32BE(pid.bytesRead)
      const chunkZ = buf.readInt32BE(pid.bytesRead + 4)

      const protocol = (bot as any).protocolVersion as number | undefined
      // 1.18+ (protocol 757+): the raw bytes go straight to
      // `parseMapChunkV18Plus`. Earlier protocols use a different wire
      // format and are handled by the parsed-packet listener below.
      if (typeof protocol !== 'number' || protocol < 757) return

      // Block-coord origin used by the renderer's chunk pipeline.
      const x = chunkX * 16
      const z = chunkZ * 16

      const numSections = resolveNumSections(chunkX, chunkZ, 24)

      // Copy out of mineflayer's buffer so the WASM worker can keep the
      // bytes around (mineflayer may pool/reuse the underlying memory).
      const rawPacket = new Uint8Array(buf.byteLength)
      rawPacket.set(buf)

      appViewer.backend?.backendMethods?.feedChunkPacket?.({
        kind: 'setRawMapChunk',
        x, z, rawPacket, protocol, numSections,
      })
    } catch (err) {
      console.warn('[mapChunkListener] failed to forward raw map_chunk:', err)
    }
  })

  // 1.17 / 1.17.1 path. mineflayer's parsed packet already extracted the
  // bit-mask, biomes and the chunkData buffer; we hand them straight to
  // the worker so it can call `parseChunkSectionsV17`.
  bot._client.on('map_chunk' as any, (packet: any) => {
    try {
      const protocol = (bot as any).protocolVersion as number | undefined
      if (typeof protocol !== 'number' || protocol >= 757) return
      // We only support 1.17/1.17.1 (protocol 755/756) for now. Older
      // protocols have yet another packet shape and stay on the JS path.
      if (protocol < 755) return

      const chunkX = packet.x as number
      const chunkZ = packet.z as number
      if (typeof chunkX !== 'number' || typeof chunkZ !== 'number') return

      const bitMapLoHi = bitMapToLoHi(packet.bitMap)
      if (!bitMapLoHi) return

      const chunkDataBuf: Buffer | undefined = packet.chunkData
      if (!chunkDataBuf || chunkDataBuf.length === 0) return
      const chunkData = new Uint8Array(chunkDataBuf.byteLength)
      chunkData.set(chunkDataBuf)

      const numSections = resolveNumSections(chunkX, chunkZ, 16)

      let biomes: Int32Array | undefined
      if (Array.isArray(packet.biomes) && packet.biomes.length > 0) {
        biomes = Int32Array.from(packet.biomes as number[])
      }

      appViewer.backend?.backendMethods?.feedChunkPacket?.({
        kind: 'setParsedMapChunkV17',
        x: chunkX * 16,
        z: chunkZ * 16,
        protocol,
        numSections,
        maxBitsPerBlock: MAX_BITS_PER_BLOCK_V17,
        chunkData,
        bitMapLoHi,
        biomes,
      })
    } catch (err) {
      console.warn('[mapChunkListener] failed to forward parsed map_chunk (1.17):', err)
    }
  })

  // 1.17 light arrives in a separate `update_light` packet. We forward the
  // raw bytes (including the leading varint packet-id) to the worker — it
  // calls `parseUpdateLightV17` which extracts chunkX/Z and the per-block
  // sky/block-light arrays in one shot. The worker keys the cache by the
  // (x, z) it gets back from WASM, so JS doesn't need to peek at varints.
  bot._client.on('raw.update_light' as any, (rawBuffer: Buffer | Uint8Array) => {
    try {
      const protocol = (bot as any).protocolVersion as number | undefined
      if (typeof protocol !== 'number' || protocol >= 757 || protocol < 755) return

      const buf = Buffer.isBuffer(rawBuffer) ? rawBuffer : Buffer.from(rawBuffer)
      if (buf.length === 0) return

      const rawPacket = new Uint8Array(buf.byteLength)
      rawPacket.set(buf)

      // 1.17 always has worldHeight=256 → 16 sections; resolveNumSections
      // would need (chunkX, chunkZ) which we don't decode in JS. The
      // game-level fallback is exactly what we want here.
      const numSections = ((bot as any).game?.height
        ?? (bot as any).world?.worldHeight
        ?? 256) >> 4

      appViewer.backend?.backendMethods?.feedChunkPacket?.({
        kind: 'setUpdateLightV17',
        protocol,
        numSections,
        rawPacket,
      })
    } catch (err) {
      console.warn('[mapChunkListener] failed to forward raw update_light (1.17):', err)
    }
  })

  // 1.16.x (protocol 735..754) parsed map_chunk path. The 1.16 wire format
  // uses a varint bit-mask (single number, only 16 sections) and inline
  // biomes as a flat varint[1024]. Hand the parsed payload to the worker
  // so `parser_v16_v17` can decode the section blob.
  bot._client.on('map_chunk' as any, (packet: any) => {
    try {
      const protocol = (bot as any).protocolVersion as number | undefined
      if (typeof protocol !== 'number' || protocol < 735 || protocol > 754) return

      const chunkX = packet.x as number
      const chunkZ = packet.z as number
      if (typeof chunkX !== 'number' || typeof chunkZ !== 'number') return

      const chunkDataBuf: Buffer | undefined = packet.chunkData
      if (!chunkDataBuf || chunkDataBuf.length === 0) return
      const chunkData = new Uint8Array(chunkDataBuf.byteLength)
      chunkData.set(chunkDataBuf)

      const bitMap = typeof packet.bitMap === 'number' ? packet.bitMap : Number(packet.bitMap)
      if (!Number.isFinite(bitMap)) return

      const biomesSrc: number[] | undefined = Array.isArray(packet.biomes) ? packet.biomes : undefined
      const biomes = Int32Array.from(biomesSrc ?? [])

      appViewer.backend?.backendMethods?.feedChunkPacket?.({
        kind: 'setParsedMapChunkV16',
        x: chunkX,
        z: chunkZ,
        chunkData,
        bitMap,
        biomes,
        protocol,
      })
    } catch (err) {
      console.warn('[mapChunkListener] failed to forward parsed map_chunk (1.16):', err)
    }
  })

  // 1.16.x update_light. Same shape as the 1.17 raw forward, but we also
  // extract chunkX/Z in JS (skip the varint packet-id, then two varints).
  bot._client.on('raw.update_light' as any, (rawBuffer: Buffer | Uint8Array) => {
    try {
      const protocol = (bot as any).protocolVersion as number | undefined
      if (typeof protocol !== 'number' || protocol < 735 || protocol > 754) return

      const buf = Buffer.isBuffer(rawBuffer) ? rawBuffer : Buffer.from(rawBuffer)
      if (buf.length === 0) return

      const pid = readVarInt(buf, 0)
      if (!pid) return
      const xv = readVarInt(buf, pid.bytesRead)
      if (!xv) return
      const zv = readVarInt(buf, pid.bytesRead + xv.bytesRead)
      if (!zv) return
      // varints encode signed values via zig-zag in some packets, but
      // mineflayer-protocol's update_light uses plain varint for chunkX/Z
      // (which is what the WASM parser expects to receive verbatim).
      const x = Math.trunc(xv.value)
      const z = Math.trunc(zv.value)

      const rawPacket = new Uint8Array(buf.byteLength)
      rawPacket.set(buf)

      appViewer.backend?.backendMethods?.feedChunkPacket?.({
        kind: 'setUpdateLightV16',
        x,
        z,
        rawPacket,
        protocol,
      })
    } catch (err) {
      console.warn('[mapChunkListener] failed to forward raw update_light (1.16):', err)
    }
  })
}
