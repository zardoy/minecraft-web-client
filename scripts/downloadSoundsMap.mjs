import fs from 'fs'

const url = 'https://github.com/zardoy/prismarine-web-client/raw/sounds-generated/sounds.js'
const savePath = 'dist/sounds.js'
fetch(url).then(res => res.text()).then(data => {
  // fs.writeFileSync(savePath, data, 'utf8')
  if (fs.existsSync('.vercel/output/static/')) {
    fs.writeFileSync('.vercel/output/static/sounds.js', data, 'utf8')
  }
})
