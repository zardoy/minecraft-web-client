import fs from 'fs'

const faviconUrl = process.argv[2]

// save to assets/favicon.png
fetch(faviconUrl)
  .then(res => res.arrayBuffer())
  .then(buffer => {
    fs.writeFileSync('assets/favicon.png', Buffer.from(buffer))
  })
