import fs from 'fs'

const url = 'https://github.com/zardoy/minecraft-web-client/raw/sounds-generated/sounds-v2.js'
fetch(url)
  .then(res => res.text())
  .then(data => {
    if (fs.existsSync('./dist')) {
      fs.writeFileSync('./dist/sounds.js', data, 'utf8')
    }
    fs.mkdirSync('./generated', { recursive: true })
    fs.writeFileSync('./generated/sounds.js', data, 'utf8')
    if (fs.existsSync('.vercel/output/static/')) {
      fs.writeFileSync('.vercel/output/static/sounds.js', data, 'utf8')
    }
  })
