//@ts-check
import { context } from 'esbuild'
import { build } from 'esbuild'
import { polyfillNode } from 'esbuild-plugin-polyfill-node'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import { dynamicMcDataFiles } from './buildMesherConfig.mjs'
import { mesherSharedPlugins } from '../scripts/esbuildPlugins.mjs'

const allowedBundleFiles = ['legacy', 'versions', 'protocolVersions', 'features']

const __dirname = path.dirname(fileURLToPath(new URL(import.meta.url)))

const watch = process.argv.includes('-w')

/** @type {import('esbuild').BuildOptions} */
const buildOptions = {
  bundle: true,
  banner: {
    js: `globalThis.global = globalThis;process = {env: {}, versions: {} };`,
  },
  platform: 'browser',
  entryPoints: [path.join(__dirname, './viewer/lib/mesher/mesher.ts')],
  minify: !watch,
  logLevel: 'info',
  drop: !watch ? [
    'debugger'
  ] : [],
  sourcemap: 'linked',
  write: false,
  metafile: true,
  outdir: path.join(__dirname, './dist'),
  define: {
    'process.env.BROWSER': '"true"',
  },
  plugins: [
    ...mesherSharedPlugins,
    {
      name: 'external-json',
      setup(build) {
        build.onResolve({ filter: /\.json$/ }, args => {
          const fileName = args.path.split('/').pop().replace('.json', '')
          if (args.resolveDir.includes('minecraft-data')) {
            if (args.path.replaceAll('\\', '/').endsWith('bedrock/common/protocolVersions.json')) {
              return
            }
            if (args.path.includes('bedrock')) {
              return { path: args.path, namespace: 'empty-file', }
            }
            if (dynamicMcDataFiles.includes(fileName)) {
              return {
                path: args.path,
                namespace: 'mc-data',
              }
            }
            if (!allowedBundleFiles.includes(fileName)) {
              return { path: args.path, namespace: 'empty-file', }
            }
          }
        })
        build.onResolve({
          filter: /^zlib$/,
        }, ({ path }) => {
          return {
            path,
            namespace: 'empty-file',
          }
        })
        build.onLoad({
          filter: /.*/,
          namespace: 'empty-file',
        }, () => {
          return { contents: 'module.exports = undefined', loader: 'js' }
        })
        build.onLoad({
          namespace: 'mc-data',
          filter: /.*/,
        }, async ({ path }) => {
          const fileName = path.split(/[\\\/]/).pop().replace('.json', '')
          return {
            contents: `module.exports = globalThis.mcData["${fileName}"]`,
            loader: 'js',
            resolveDir: process.cwd(),
          }
        })
        build.onResolve({
          filter: /^esbuild-data$/,
        }, () => {
          return {
            path: 'esbuild-data',
            namespace: 'esbuild-data',
          }
        })
        build.onLoad({
          filter: /.*/,
          namespace: 'esbuild-data',
        }, () => {
          const data = {
            // todo always use latest
            tints: 'require("minecraft-data/minecraft-data/data/pc/1.16.2/tints.json")'
          }
          return {
            contents: `module.exports = {${Object.entries(data).map(([key, code]) => `${key}: ${code}`).join(', ')}}`,
            loader: 'js',
            resolveDir: process.cwd(),
          }
        })
        build.onEnd(({ metafile, outputFiles }) => {
          if (!metafile) return
          fs.mkdirSync(path.join(__dirname, './dist'), { recursive: true })
          fs.writeFileSync(path.join(__dirname, './dist/metafile.json'), JSON.stringify(metafile))
          for (const outDir of ['../dist/', './dist/']) {
            for (const outputFile of outputFiles) {
              if (outDir === '../dist/' && outputFile.path.endsWith('.map')) {
                // skip writing & browser loading sourcemap there, worker debugging should be done in playground
                // continue
              }
              const writePath = path.join(__dirname, outDir, path.basename(outputFile.path))
              fs.mkdirSync(path.dirname(writePath), { recursive: true })
              fs.writeFileSync(writePath, outputFile.text)
            }
          }
        })
      }
    },
    polyfillNode(),
  ],
}

if (watch) {
  const ctx = await context(buildOptions)
  await ctx.watch()
} else {
  await build(buildOptions)
}
