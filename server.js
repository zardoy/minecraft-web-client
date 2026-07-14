#!/usr/bin/env node

const express = require('express')
const netApi = require('net-browserify')
const compression = require('compression')
const path = require('path')
const cors = require('cors')
const https = require('https')
const fs = require('fs')
let siModule
try {
  siModule = require('systeminformation')
} catch (err) { }

// Create our app
const app = express()

const isProd = process.argv.includes('--prod') || process.env.NODE_ENV === 'production'
const timeoutIndex = process.argv.indexOf('--timeout')
let timeout = timeoutIndex > -1 && timeoutIndex + 1 < process.argv.length
    ? parseInt(process.argv[timeoutIndex + 1])
    : process.env.TIMEOUT
        ? parseInt(process.env.TIMEOUT)
        : 10000
if (isNaN(timeout) || timeout < 0) {
  console.warn('Invalid timeout value provided, using default of 10000ms')
  timeout = 10000
}
app.use(compression())
app.use(cors())
app.use(netApi({
  allowOrigin: '*',
  log: process.argv.includes('--log') || process.env.LOG === 'true',
  timeout
}))
if (!isProd) {
  app.use('/sounds', express.static(path.join(__dirname, './generated/sounds/')))
}
// patch config
app.get('/config.json', (req, res, next) => {
  // read original file config
  let config = {}
  let publicConfig = {}
  try {
    config = require('./config.json')
  } catch {
    try {
      config = require('./dist/config.json')
    } catch { }
  }
  try {
    publicConfig = require('./public/config.json')
  } catch { }
  res.json({
    ...config,
    'defaultProxy': '', // use current url (this server)
    ...publicConfig,
  })
})
if (isProd) {
  // add headers to enable shared array buffer
  app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp')
    // wasm-pack/instantiateStreaming requires the correct mime type
    if (req.path.endsWith('.wasm')) {
      res.setHeader('Content-Type', 'application/wasm')
    }
    next()
  })

  // Serve minecraft-renderer wasm mesher artifacts from the installed package.
  // (Needed when using file: dependency, where these assets may not be in the web-client dist root)
  try {
    const rendererPkg = require.resolve('minecraft-renderer/package.json')
    const rendererDir = path.dirname(rendererPkg)
    app.get('/wasm_mesher.js', (req, res) => res.sendFile(path.join(rendererDir, 'public/wasm_mesher.js')))
    app.get('/wasm_mesher_bg.wasm', (req, res) => res.sendFile(path.join(rendererDir, 'public/wasm_mesher_bg.wasm')))
  } catch (err) {
    console.warn('Failed to locate minecraft-renderer package for wasm mesher assets', err)
  }

  // First serve from the override directory (volume mount)
  app.use(express.static(path.join(__dirname, './public')))

  // Then fallback to the original dist directory
  app.use(express.static(path.join(__dirname, './dist')))
}

const numArg = process.argv.find(x => x.match(/^\d+$/))
const port = (require.main === module ? numArg : undefined) || 8080

// Start the server
const server =
  app.listen(port, async function () {
    console.log('Proxy server listening on port ' + server.address().port)
    if (siModule && isProd) {
      const _interfaces = await siModule.networkInterfaces()
      const interfaces = Array.isArray(_interfaces) ? _interfaces : [_interfaces]
      let netInterface = interfaces.find(int => int.default)
      if (!netInterface) {
        netInterface = interfaces.find(int => !int.virtual) ?? interfaces[0]
        console.warn('Failed to get the default network interface, searching for fallback')
      }
      if (netInterface) {
        const address = netInterface.ip4
        console.log(`You can access the server on http://localhost:${port} or http://${address}:${port}`)
      }
    }
  })

module.exports = { app }
