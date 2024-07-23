// main worker file intended for computing world geometry is built using prismarine-viewer/buildWorker.mjs
import { build, context } from 'esbuild'
import fs from 'fs'
import path from 'path'

const watch = process.argv.includes('-w')

const workers = ['./prismarine-viewer/viewer/lib/threeJsWorker.ts']

const result = await (watch ? context : build)({
    bundle: true,
    platform: 'browser',
    entryPoints: workers,
    outdir: 'prismarine-viewer/public/',
    write: false,
    sourcemap: watch ? 'inline' : 'external',
    minify: !watch,
    treeShaking: true,
    logLevel: 'info',
    alias: {
        'three': './node_modules/three/src/Three.js',
        events: 'events', // make explicit
        buffer: 'buffer',
        'fs': 'browserfs/dist/shims/fs.js',
        http: 'http-browserify',
        perf_hooks: './src/perf_hooks_replacement.js',
        crypto: './src/crypto.js',
        stream: 'stream-browserify',
        net: 'net-browserify',
        assert: 'assert',
        dns: './src/dns.js'
    },
    inject: [
        './src/shims.js'
    ],
    plugins: [
        {
            name: 'writeOutput',
            setup(build) {
                build.onEnd(({ outputFiles }) => {
                    for (const file of outputFiles) {
                        for (const dir of ['prismarine-viewer/public', 'dist']) {
                            const baseName = path.basename(file.path)
                            fs.writeFileSync(path.join(dir, baseName), file.contents)
                        }
                    }
                })
            }
        }
    ],
    loader: {
        '.vert': 'text',
        '.frag': 'text',
        '.wgsl': 'text',
    },
    mainFields: [
        'browser', 'module', 'main'
    ],
    keepNames: true,
})

if (watch) {
    await result.watch()
}
