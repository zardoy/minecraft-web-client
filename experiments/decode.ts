// Include the pako library
import pako from 'pako'
import compressedJsRaw from './compressed.js?raw'

function decompressFromBase64(input) {
  // Decode the Base64 string
  const binaryString = atob(input)
  const len = binaryString.length
  const bytes = new Uint8Array(len)

  // Convert the binary string to a byte array
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }

  // Decompress the byte array
  const decompressedData = pako.inflate(bytes, { to: 'string' })

  return decompressedData
}

// Use the function
console.time('decompress')
const decompressedData = decompressFromBase64(compressedJsRaw)
console.timeEnd('decompress')
console.log(decompressedData)
