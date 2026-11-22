// Dev helper for real-device memory tests: https (mkcert) in front of the production server (`node server.js --prod 8767`), passing COOP/COEP headers and websockets
// through, and appending the page's `/__log?m=...` pings (see src/dev/memoryBallast.ts) to a file, so a crash shows up as "the heartbeats stopped".
//   mkcert -cert-file cert.pem -key-file key.pem <lan-ip> localhost     (next to this script)
//   TARGET_PORT=8767 PORT=8768 LOG_FILE=/tmp/ios-memory/ballast.log node scripts/ios-memory/https-proxy.js
const fs = require('fs'), https = require('https'), http = require('http'), net = require('net'), path = require('path')
const TARGET = Number(process.env.TARGET_PORT ?? 8767)
const PORT = Number(process.env.PORT ?? 8768)
const LOG_FILE = process.env.LOG_FILE ?? '/tmp/ios-memory/ballast.log'
fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true })
const server = https.createServer({ cert: fs.readFileSync(path.join(__dirname, 'cert.pem')), key: fs.readFileSync(path.join(__dirname, 'key.pem')) }, (req, res) => {
  if (req.url.startsWith('/__log')) {
    const q = new URL(req.url, 'https://x').searchParams
    fs.appendFileSync(LOG_FILE, `${new Date().toISOString()} ${q.get('m')} | ${q.get('p') ?? ''}\n`)
    res.writeHead(204); res.end(); return
  }
  const p = http.request({ host: '127.0.0.1', port: TARGET, path: req.url, method: req.method, headers: req.headers }, r => { res.writeHead(r.statusCode, r.headers); r.pipe(res) })
  p.on('error', e => { res.writeHead(502); res.end(String(e)) })
  req.pipe(p)
})
server.on('upgrade', (req, socket, head) => {
  const s = net.connect(TARGET, '127.0.0.1', () => {
    s.write(`${req.method} ${req.url} HTTP/1.1\r\n` + Object.entries(req.headers).map(([k, v]) => `${k}: ${v}`).join('\r\n') + '\r\n\r\n'); s.write(head); s.pipe(socket); socket.pipe(s)
  })
  s.on('error', () => socket.destroy()); socket.on('error', () => s.destroy())
})
server.listen(PORT, '0.0.0.0', () => console.log(`https on ${PORT} -> http ${TARGET}, log ${LOG_FILE}`))
