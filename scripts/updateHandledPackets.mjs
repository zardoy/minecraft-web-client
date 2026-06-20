import fs from 'fs'
import path from 'path'
import minecraftData from 'minecraft-data'

const lastVersion = minecraftData.versions.pc[0]
// console.log('last proto ver', lastVersion.minecraftVersion)
const allPackets = minecraftData(lastVersion.minecraftVersion).protocol
const getPackets = ({ types }) => {
  return Object.keys(types).map(type => type.replace('packet_', ''))
}
// todo test against all versions
const allFromServerPackets = getPackets(allPackets.play.toClient)
const allToServerPackets = getPackets(allPackets.play.toServer).filter(x => !['packet'].includes(x))

const buildFile = './dist/index.js'

const file = fs.readFileSync(buildFile, 'utf8')

const packetsReceiveRegex = /client\.on\("(\w+)"/g
const packetsReceiveSend = /client\.write\("(\w+)"/g

let allSupportedReceive = [...new Set([...file.matchAll(packetsReceiveRegex)].map(x => x[1]))]
let allSupportedSend = [...new Set([...file.matchAll(packetsReceiveSend)].map(x => x[1]))]

let md = '# Handled Packets\n'

md += '\n## Server -> Client\n\n'
let notSupportedRows = []
let supportedRows = []
for (const packet of allFromServerPackets) {
  const includes = allSupportedReceive.includes(packet)
  ;(includes ? supportedRows : notSupportedRows).push(packet)
}

for (const row of notSupportedRows) {
  md += `❌ ${row}\n`
}
for (const row of supportedRows) {
  md += `✅ ${row}\n`
}

md += '\n'

notSupportedRows = []
supportedRows = []

md += '## Client -> Server\n\n'
for (const packet of allToServerPackets) {
  const includes = allSupportedSend.includes(packet)
  ;(includes ? supportedRows : notSupportedRows).push(packet)
}

for (const row of notSupportedRows) {
  md += `❌ ${row}\n`
}
for (const row of supportedRows) {
  md += `✅ ${row}\n`
}

fs.writeFileSync('./docs-assets/handled-packets.md', md)
