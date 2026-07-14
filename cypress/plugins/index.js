//@ts-check
const { cypressEsbuildPreprocessor } = require('cypress-esbuild-preprocessor')
const { initPlugin } = require('cypress-plugin-snapshots/plugin')
const polyfill = require('esbuild-plugin-polyfill-node')
// const { startMinecraftServer } = require('./startServer')

module.exports = (on, config) => {
  initPlugin(on, config)
  on('file:preprocessor', cypressEsbuildPreprocessor({
    esbuildOptions: {
      sourcemap: true,
      plugins: [
        polyfill.polyfillNode({
          polyfills: {
            crypto: true,
          },
        })
      ],
    },
  }))
  on('task', {
    log(message) {
      console.log(message)
      return null
    },
  })
  // on('task', {
  //   async startServer([version, port]) {
  //     return startMinecraftServer(version, port)
  //   }
  // })
  return config
}
