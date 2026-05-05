/**
 * Stage 3 of issue-15-wasm — capture raw `map_chunk` packet bytes from
 * mineflayer and forward them to the WASM mesher worker (via worldView →
 * worldrendererCommon → worker.postMessage). The worker can then call
 * `parseMapChunkV18Plus` directly on those bytes and skip the JS hot loop
 * `convertChunkToWasm` for protocol >= 757 (1.18+).
 *
 * Mineflayer is left untouched: it keeps parsing the column for
 * `bot.blockAt`, physics, inventory, etc. We just piggy-back on the same
 * packet event.
 */

import { appViewer } from '../../appViewer'

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
      if (typeof protocol !== 'number' || protocol < 757) return

      // Block-coord origin used by the renderer's chunk pipeline.
      const x = chunkX * 16
      const z = chunkZ * 16

      // Prefer mineflayer's freshly-loaded column for an authoritative
      // section count; if it isn't available yet (raw arrived before the
      // parsed event), derive it from worldHeight. 1.18+ defaults to 24.
      let numSections: number | undefined
      try {
        const column: any = (bot as any).world?.getColumn?.(chunkX, chunkZ)
        if (column) {
          numSections = column.numSections
            ?? (column.worldHeight ? column.worldHeight >> 4 : undefined)
        }
      } catch {}
      if (!numSections) {
        const worldHeight = (bot as any).game?.height
          ?? (bot as any).world?.worldHeight
        numSections = typeof worldHeight === 'number' ? worldHeight >> 4 : 24
      }

      // Copy out of mineflayer's buffer so the WASM worker can keep the
      // bytes around (mineflayer may pool/reuse the underlying memory).
      const rawPacket = new Uint8Array(buf.byteLength)
      rawPacket.set(buf)

      appViewer.worldView?.emit('setRawMapChunk', {
        x, z, rawPacket, protocol, numSections,
      })
    } catch (err) {
      console.warn('[mapChunkListener] failed to forward raw map_chunk:', err)
    }
  })
}
