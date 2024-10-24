import { defineConfig, ModifyRspackConfigUtils } from '@rsbuild/core';
import { pluginNodePolyfill } from '@rsbuild/plugin-node-polyfill';
import { pluginReact } from '@rsbuild/plugin-react';
import path from 'path'

export const appAndRendererSharedConfig = () => defineConfig({
    dev: {
        progressBar: true,
        writeToDisk: true,
        watchFiles: {
            paths: [
                path.join(__dirname, './dist/webgpuRendererWorker.js'),
                path.join(__dirname, './dist/mesher.js'),
            ]
        },
    },
    output: {
        polyfill: 'usage',
        // 50kb limit for data uri
        dataUriLimit: 50 * 1024,
        assetPrefix: './',
    },
    source: {
        alias: {
            fs: path.join(__dirname, `../src/shims/fs.js`),
            http: 'http-browserify',
            stream: 'stream-browserify',
            net: 'net-browserify',
            'minecraft-protocol$': 'minecraft-protocol/src/index.js',
            'buffer$': 'buffer',
            // avoid bundling, not used on client side
            'prismarine-auth': path.join(__dirname, `../src/shims/prismarineAuthReplacement.ts`),
            perf_hooks: path.join(__dirname, `../src/shims/perf_hooks_replacement.js`),
            crypto: path.join(__dirname, `../src/shims/crypto.js`),
            dns: path.join(__dirname, `../src/shims/dns.js`),
            yggdrasil: path.join(__dirname, `../src/shims/yggdrasilReplacement.ts`),
            'three$': 'three/src/Three.js',
            'stats.js$': 'stats.js/src/Stats.js',
        },
        define: {
            'process.platform': '"browser"',
        },
        decorators: {
            version: 'legacy', // default is a lie
        },
    },
    server: {
        htmlFallback: false,
        // publicDir: false,
        headers: {
            // enable shared array buffer
            'Cross-Origin-Opener-Policy': 'same-origin',
            'Cross-Origin-Embedder-Policy': 'require-corp',
        },
        open: process.env.OPEN_BROWSER === 'true',
    },
    plugins: [
        pluginReact(),
        pluginNodePolyfill()
    ],
    tools: {
        rspack (config, helpers) {
            rspackViewerConfig(config, helpers)
        }
    },
})

export const rspackViewerConfig = (config, { appendPlugins, addRules, rspack }: ModifyRspackConfigUtils) => {
    appendPlugins(new rspack.NormalModuleReplacementPlugin(/data/, (resource) => {
        let absolute: string
        const request = resource.request.replaceAll('\\', '/')
        absolute = path.join(resource.context, request).replaceAll('\\', '/')
        if (request.includes('minecraft-data/data/pc/1.')) {
            console.log('Error: incompatible resource', request, resource.contextInfo.issuer)
            process.exit(1)
            // throw new Error(`${resource.request} was requested by ${resource.contextInfo.issuer}`)
        }
        if (absolute.endsWith('/minecraft-data/data.js')) {
            resource.request = path.join(__dirname, `../src/shims/minecraftData.ts`)
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
        }
    ])
    config.ignoreWarnings = [
        /the request of a dependency is an expression/,
        /Unsupported pseudo class or element: xr-overlay/
    ]

}
