/**
 * BrowserFS hands NBT a Uint8Array. prismarine-nbt only accepts its own Buffer
 * or an ArrayBuffer, so `instanceof Buffer` fails when the view comes from another copy.
 */
module.exports = function (source) {
  const from = `async function parse (data, format, callback) {
  if (data instanceof ArrayBuffer) {
    data = Buffer.from(data)
  } else if (!(data instanceof Buffer)) {
    throw new Error('Invalid argument: \`data\` must be a Buffer or ArrayBuffer object')
  }`
  const to = `async function parse (data, format, callback) {
  if (ArrayBuffer.isView(data)) {
    data = Buffer.from(data.buffer, data.byteOffset, data.byteLength)
  } else if (data instanceof ArrayBuffer) {
    data = Buffer.from(data)
  } else if (!(data instanceof Buffer)) {
    throw new Error('Invalid argument: \`data\` must be a Buffer or ArrayBuffer object')
  }`
  if (!source.includes(from)) {
    throw new Error('prismarine-nbt parse() preamble changed; update prismarineNbtBufferLoader.cjs')
  }
  return source.replace(from, to)
}
