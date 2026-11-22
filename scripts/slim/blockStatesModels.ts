// Replaces the direct `mc-assets/dist/blockStatesModels.json` import (a 3.6 MB JSON that the single file build already carries a second time as generated/mc-assets-compressed.js)
// with the same data decoded from that compressed copy.
import pako from 'pako'
import compressed from '../../generated/mc-assets-compressed.js'

const binary = atob(compressed as unknown as string)
const bytes = new Uint8Array(binary.length)
for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
export default JSON.parse(pako.inflate(bytes, { to: 'string' }))
