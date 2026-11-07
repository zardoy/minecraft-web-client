//@ts-check
export * from 'crypto-browserify'
export function createPublicKey() { }

// not in crypto-browserify, used by minecraft-protocol's server (login success sessionId).
// crypto.randomUUID is only available in secure contexts, getRandomValues is not
export function randomUUID() {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID()
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40 // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80 // variant 10
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

// CUSTOM SIGN ASYNC IMPLEMENTATION FOR BROWSERS

export async function sign(signatureAlgorithm, data, privateKeyPem) {
  if (signatureAlgorithm !== 'RSA-SHA256') throw new Error(`Unsupported signature algorithm ${signatureAlgorithm}`)
  if (typeof privateKeyPem !== 'string') throw new Error(`This implementation only supports strings as private keys`)
  const privateKeyBuffer = pemToArrayBuffer(privateKeyPem)
  const privateKey = await crypto.subtle.importKey(
    'pkcs8', // Chrome has difficulties with pkcs1 and the recommended format is pkcs8
    privateKeyBuffer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: { name: 'SHA-256' },
    },
    true,
    ['sign']
  )
  const signature = await crypto.subtle.sign(
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: { name: 'SHA-256' }, // SHA-256 hash function
    },
    privateKey,
    data
  )
  return signature
}

function pemToArrayBuffer(pem) {
  pem = pem.trim()
  const pemHeader = '-----BEGIN RSA PRIVATE KEY-----'
  const pemFooter = '-----END RSA PRIVATE KEY-----'
  const pemContents = pem.slice(pemHeader.length, pem.length - pemFooter.length).trim()
  const binaryDerString = atob(pemContents.replaceAll(/\s/g, ''))
  const binaryDer = new Uint8Array(binaryDerString.length)
  for (let i = 0; i < binaryDerString.length; i++) {
    //@ts-expect-error
    binaryDer[i] = binaryDerString.codePointAt(i)
  }
  return binaryDer.buffer
}
