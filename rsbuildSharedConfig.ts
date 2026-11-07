import { defineConfig, ModifyRspackConfigUtils } from '@rsbuild/core';
import { pluginNodePolyfill } from '@rsbuild/plugin-node-polyfill';
import { pluginReact } from '@rsbuild/plugin-react';
import path from 'path'
import fs from 'fs'

const physicsUtilSrcRoot = path.join(__dirname, 'node_modules/@nxg-org/mineflayer-physics-util/src')

export const appAndRendererSharedConfig = () => defineConfig({
    dev: {
        progressBar: true,
        writeToDisk: true,
        watchFiles: {
            paths: [
                ...(fs.existsSync(physicsUtilSrcRoot) ? [physicsUtilSrcRoot] : []),
            ]
        },
    },
    output: {
        polyfill: process.env.SLIM_BUILD === 'true' ? 'off' : 'usage',
        // 50kb limit for data uri
        dataUriLimit: 50 * 1024,
        assetPrefix: './',
    },
    source: {
        alias: {
            // bundled vanilla worldgen datapack (slim build: without structures)
            'worldgen-bundled-pack.zip': path.join(__dirname, process.env.SLIM_BUILD === 'true' ? 'generated/mc-worldgen-data-slim.zip' : 'generated/mc-worldgen-data.zip'),
            // slim build: drop big optional dependencies (see scripts/slim)
            ...(process.env.SLIM_BUILD === 'true' ? {
                'mc-assets/dist/blockStatesModels.json$': path.join(__dirname, 'scripts/slim/blockStatesModels.ts'),
            } : {}),
            ...(fs.existsSync(physicsUtilSrcRoot) ? {
                '@nxg-org/mineflayer-physics-util': path.join(__dirname, './scripts/mineflayerPhysicsUtilEntry.ts'),
                // physics-util src lists these as devDeps; resolve from project root when bundling its src
                '@nxg-org/mineflayer-util-plugin': path.join(__dirname, 'node_modules/@nxg-org/mineflayer-util-plugin'),
                'prismarine-entity': path.join(__dirname, 'node_modules/prismarine-entity'),
                'prismarine-nbt': path.join(__dirname, 'node_modules/prismarine-nbt'),
                'vec3': path.join(__dirname, 'node_modules/vec3'),
            } : {}),
            fs: path.join(__dirname, `./src/shims/fs.js`),
            // absolute so they also resolve for files outside this repo (../space-squid/dist)
            http: path.join(__dirname, 'node_modules/http-browserify'),
            stream: path.join(__dirname, 'node_modules/stream-browserify'),
            net: path.join(__dirname, 'node_modules/net-browserify'),
            // worker_threads: not available in browser, noise generator runs in-process (workers: 0)
            worker_threads: false,
            'minecraft-protocol$': 'minecraft-protocol/src/index.js',
            'buffer$': 'buffer',
            // avoid bundling, not used on client side
            'prismarine-auth': path.join(__dirname, `./src/shims/prismarineAuthReplacement.ts`),
            perf_hooks: path.join(__dirname, `./src/shims/perf_hooks_replacement.js`),
            crypto: path.join(__dirname, `./src/shims/crypto.js`),
            dns: path.join(__dirname, `./src/shims/dns.js`),
            yggdrasil: path.join(__dirname, `./src/shims/yggdrasilReplacement.ts`),
            'three$': 'three/src/Three.js',
            'stats.js$': 'stats.js/src/Stats.js',
        },
        define: {
            'process.platform': '"browser"',
        },
        decorators: {
            version: 'legacy',
        },
    },
    server: {
        htmlFallback: false,
        // publicDir: false,
        headers: {
            // enable shared array buffer
            'Cross-Origin-Opener-Policy': 'same-origin',
            'Cross-Origin-Embedder-Policy': 'require-corp',
            // Match prod static servers: subresources/workers under COEP need CORP in dev.
            'Cross-Origin-Resource-Policy': 'cross-origin',
        },
        open: process.env.OPEN_BROWSER === 'true',
    },
    plugins: [
        pluginReact(),
        pluginNodePolyfill()
    ],
    tools: {
        rspack (config, helpers) {
            const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, './package.json'), 'utf8'))
            const hasFileProtocol = Object.values(packageJson.pnpm.overrides).some((dep) => (dep as string).startsWith('file:'))
            if (hasFileProtocol) {
                // enable node_modules watching
                config.watchOptions.ignored = /\.git/
            }
            rspackViewerConfig(config, helpers)
            // Deepslate NbtChunk/NbtRegion use namespace `class Ref`; concatenating those modules
            // hoists two `let Ref` bindings into one scope and breaks runtime parse (Cypress/CI).
            config.optimization = {
                ...config.optimization,
                concatenateModules: false,
            }
        }
    },
})

export const rspackViewerConfig = (config: any, { appendPlugins, addRules, rspack }: ModifyRspackConfigUtils) => {
    // WRITE_BUNDLE_STATS=true: dist/stats-<name>.json (module sizes), see scripts/bundleSizes.mjs
    if (process.env.WRITE_BUNDLE_STATS) {
        appendPlugins({
            apply (compiler: any) {
                compiler.hooks.done.tap('write-bundle-stats', (stats: any) => {
                    fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true })
                    fs.writeFileSync(path.join(__dirname, `dist/stats-${compiler.options.name ?? 'main'}.json`), JSON.stringify(stats.toJson({ all: false, assets: true, chunks: true, chunkModules: true, modules: true, nestedModules: true, modulesSpace: 1e9, chunkModulesSpace: 1e9, nestedModulesSpace: 1e9, ids: true, dependentModules: true, orphanModules: true, runtimeModules: false, excludeModules: false })))
                })
            }
        } as any)
    }
    appendPlugins(new rspack.NormalModuleReplacementPlugin(/data|prismarine-physics/, (resource) => {
        let absolute: string
        const request = resource.request.replaceAll('\\', '/')
        absolute = path.join(resource.context, request).replaceAll('\\', '/')
        if (request.includes('minecraft-data/data/pc/1.') || request.includes('prismarine-physics')) {
            console.log('Error: incompatible resource', request, 'from', resource.contextInfo.issuer)
            process.exit(1)
            // throw new Error(`${resource.request} was requested by ${resource.contextInfo.issuer}`)
        }
        if (absolute.endsWith('/minecraft-data/data.js')) {
            resource.request = path.join(__dirname, `./src/shims/minecraftData.ts`)
        }
        if (absolute.endsWith('/minecraft-data/data/bedrock/common/legacy.json')) {
            resource.request = path.join(__dirname, `./src/shims/empty.ts`)
        }
        if (absolute.endsWith('/minecraft-data/data/pc/common/legacy.json')) {
            resource.request = path.join(__dirname, `./src/preflatMap.json`)
        }
    }))
    addRules([
        {
            test: /\.obj$/,
            type: 'asset/source',
        },
        {
            test: /\.wgsl$/,
            type: 'asset/source',
        },
        {
            test: /\.mp3$/,
            type: 'asset/source',
        },
        {
            test: /\.txt$/,
            type: 'asset/source',
        },
        {
            test: /\.log$/,
            type: 'asset/source',
        },
        {
            test: /\.gltf$/,
            type: 'asset/resource',
        },
        {
            // worldgen datapack: fetched at runtime; has to be a data: url in the single file build (nothing else is served)
            test: /\.zip$/,
            type: process.env.SINGLE_FILE_BUILD === 'true' ? 'asset/inline' : 'asset/resource',
        }
    ])
    // Web Workers load their chunks with importScripts, and the page-relative assetPrefix './' resolves against the worker script URL.
    // The worldgen worker chunk is therefore emitted in the dist root, where './static/js/...' is correct for it too.
    config.output ??= {}
    const defaultChunkFilename = config.output.chunkFilename
    config.output.chunkFilename = ((pathData: any, assetInfo: any) => {
        if (pathData?.chunk?.name === 'worldgen-worker') return 'worldgen-worker.[contenthash:8].js'
        return typeof defaultChunkFilename === 'function' ? defaultChunkFilename(pathData, assetInfo) : (defaultChunkFilename ?? '[name].js')
    }) as any
    config.ignoreWarnings = [
        /the request of a dependency is an expression/,
        /Unsupported pseudo class or element: xr-overlay/
    ]
    if (process.env.SINGLE_FILE_BUILD === 'true') {
        config.module!.parser!.javascript!.dynamicImportMode = 'eager'
    }
}
