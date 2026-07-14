/**
 * Canonical map_chunk serialization shared with play-mcraft-proxy-server.
 * Keep the shape and FNV-1a digest byte-for-byte compatible across repos.
 */

export function serializeBinaryValue (value: any, seen = new WeakSet<object>()): any {
  if (value === undefined) return { __type: 'undefined' }
  if (value === null || typeof value !== 'object') return value

  if (Buffer.isBuffer(value)) {
    return { __type: 'buffer', data: [...value] }
  }

  if (value instanceof ArrayBuffer) {
    return { __type: 'buffer', data: [...new Uint8Array(value)] }
  }

  if (ArrayBuffer.isView(value)) {
    if (value instanceof DataView) {
      return { __type: 'buffer', data: [...new Uint8Array(value.buffer, value.byteOffset, value.byteLength)] }
    }

    return {
      __type: 'typedArray',
      arrayType: value.constructor.name,
      data: [...value as any]
    }
  }

  if (seen.has(value)) {
    throw new Error('Cannot serialize cyclic map_chunk packet data')
  }

  seen.add(value)
  try {
    if (Array.isArray(value)) {
      return value.map(entry => serializeBinaryValue(entry, seen))
    }

    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, serializeBinaryValue(entry, seen)])
    )
  } finally {
    seen.delete(value)
  }
}

export function deserializeBinaryValue (value: any): any {
  if (value === null || typeof value !== 'object') return value

  if (value.__type === 'undefined') return undefined
  if (value.__type === 'buffer') return Buffer.from(value.data)
  if (value.__type === 'typedArray') {
    const TypedArrayConstructor = getTypedArrayConstructor(value.arrayType)
    return new TypedArrayConstructor(value.data)
  }

  if (Array.isArray(value)) {
    return value.map(entry => deserializeBinaryValue(entry))
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, deserializeBinaryValue(entry)])
  )
}

export function serializeMapChunkPacket (packet: any): ArrayBuffer {
  const json = JSON.stringify(serializeBinaryValue(packet))
  const encoded = new TextEncoder().encode(json)
  return encoded.buffer.slice(encoded.byteOffset, encoded.byteOffset + encoded.byteLength)
}

export function deserializeMapChunkPacket (buffer: Buffer): any {
  const json = new TextDecoder().decode(buffer)
  return deserializeBinaryValue(JSON.parse(json))
}

export function computeSerializedPacketHash (packetData: ArrayBuffer): string {
  const data = new Uint8Array(packetData)
  let hash = 2_166_136_261

  for (const byte of data) {
    hash ^= byte
    hash = Math.imul(hash, 16_777_619)
  }

  return (hash >>> 0).toString(16).padStart(8, '0')
}

export function computeMapChunkPacketHash (packet: any): string {
  return computeSerializedPacketHash(serializeMapChunkPacket(packet))
}

function getTypedArrayConstructor (name: string): any {
  const constructors: Record<string, any> = {
    Int8Array,
    Uint8Array,
    Uint8ClampedArray,
    Int16Array,
    Uint16Array,
    Int32Array,
    Uint32Array,
    Float32Array,
    Float64Array,
    BigInt64Array,
    BigUint64Array
  }
  return constructors[name] || Uint8Array
}
