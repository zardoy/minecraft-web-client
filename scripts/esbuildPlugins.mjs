//@ts-check

import { join, dirname } from 'path'
import * as fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(new URL(import.meta.url)))

/** @type {import('esbuild').Plugin[]} */
const mesherSharedPlugins = [
  {
    name: 'minecraft-data',
    setup(build) {
      build.onLoad(
        {
          filter: /data[\/\\]pc[\/\\]common[\/\\]legacy.json$/
        },
        async args => {
          const data = fs.readFileSync(join(__dirname, '../src/preflatMap.json'), 'utf8')
          return {
            contents: `module.exports = ${data}`,
            loader: 'js'
          }
        }
      )
    }
  }
]

export { mesherSharedPlugins }
