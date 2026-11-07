import fs from 'fs'

const extUrl = process.env.GENDATA_EXT_URL ?? 'https://raw.githubusercontent.com/dimaka-love/temp-mc-sounds/refs/heads/gamedata/gendata-ext.zip'
const extFile = './generated/gendata-ext.zip'

if (extUrl === 'off') {
  console.log('GENDATA_EXT_URL=off, skipping gendata-ext.zip')
  process.exit(0)
}

if (fs.existsSync(extFile)) {
  console.log(`${extFile} already exists`)
  process.exit(0)
}

fs.mkdirSync('./generated', { recursive: true })

const res = await fetch(extUrl)
if (!res.ok) {
  console.error(`Failed to download gendata-ext.zip from ${extUrl}: HTTP ${res.status}`)
  process.exit(1)
}

fs.writeFileSync(extFile, Buffer.from(await res.arrayBuffer()))
console.log(`Downloaded ${extFile}`)
