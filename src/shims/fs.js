const BrowserFS = require('browserfs')

globalThis.fs ??= BrowserFS.BFSRequire('fs')
globalThis.fs.promises = new Proxy(
  {},
  {
    get(target, p) {
      return (...args) => {
        return globalThis.promises[p](...args)
      }
    }
  }
)

module.exports = globalThis.fs
