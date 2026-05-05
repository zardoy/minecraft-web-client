/// <reference types="./src/env" />
import { defineConfig, mergeRsbuildConfig, RsbuildPluginAPI } from '@rsbuild/core'
import { pluginReact } from '@rsbuild/plugin-react'
import { pluginTypedCSSModules } from '@rsbuild/plugin-typed-css-modules'
import { pluginNodePolyfill } from '@rsbuild/plugin-node-polyfill'
import { pluginTypeCheck } from '@rsbuild/plugin-type-check'
import path from 'path'
import childProcess from 'child_process'
import fs from 'fs'
import fsExtra from 'fs-extra'
import { promisify } from 'util'
import { generateSW } from 'workbox-build'
import { getSwAdditionalEntries } from './scripts/build'
import { appAndRendererSharedConfig } from './renderer/rsbuildSharedConfig'
import { genLargeDataAliases } from './scripts/genLargeDataAliases'
import sharp from 'sharp'
import supportedVersions from './src/supportedVersions.mjs'
import { startWsServer } from './scripts/wsServer'
import { applyWatermarkPackagesToConfig } from './scripts/watermarkLockfilePins'

const SINGLE_FILE_BUILD = process.env.SINGLE_FILE_BUILD === 'true'

if (SINGLE_FILE_BUILD) {
    const patchCssFile = 'node_modules/pixelarticons/fonts/pixelart-icons-font.css'
    const text = fs.readFileSync(patchCssFile, 'utf8')
    fs.writeFileSync(patchCssFile, text.replaceAll("url('pixelart-icons-font.ttf?t=1711815892278') format('truetype'),", ""), 'utf8')
}

//@ts-ignore
try { require('./localSettings.js') } catch { }

const execAsync = promisify(childProcess.exec)

const buildingVersion = new Date().toISOString().split(':')[0]

const buildTime = new Date()
const buildDisplayDate = `${String(buildTime.getDate()).padStart(2, '0')}.${String(buildTime.getMonth() + 1).padStart(2, '0')}.${String(buildTime.getFullYear()).slice(-2)}`

const dev = process.env.NODE_ENV === 'development'
const disableServiceWorker = process.env.DISABLE_SERVICE_WORKER === 'true'

let releaseTag
let releaseLink
let releaseChangelog
let githubRepositoryFallback

if (fs.existsSync('./assets/release.json')) {
    const releaseJson = JSON.parse(fs.readFileSync('./assets/release.json', 'utf8'))
    releaseTag = releaseJson.latestTag
    releaseLink = releaseJson.isCommit ? `/commit/${releaseJson.latestTag}` : `/releases/${releaseJson.latestTag}`
    releaseChangelog = releaseJson.changelog?.replace(/<!-- bump-type:[\w]+ -->/, '')
    githubRepositoryFallback = releaseJson.repository
}

const configJson = JSON.parse(fs.readFileSync('./config.json', 'utf8'))

// Precedence (last write wins): base config.json → LOCAL_CONFIG_FILE → CONFIG_JSON (CI / PR)
try {
    const localConfigFile = process.env.LOCAL_CONFIG_FILE || './config.local.json'
    if (fs.existsSync(localConfigFile)) {
        const localConfig = JSON.parse(fs.readFileSync(localConfigFile, 'utf8'))
        Object.assign(configJson, localConfig)
    }
} catch (err) {
    console.warn('Failed to parse LOCAL_CONFIG_FILE:', err)
}

if (process.env.CONFIG_JSON) {
    try {
        const prConfig = JSON.parse(process.env.CONFIG_JSON)
        Object.assign(configJson, prConfig)
        console.log('Applied config from CONFIG_JSON env var:', Object.keys(prConfig).join(', '))
    } catch (err) {
        console.warn('Failed to parse CONFIG_JSON env var:', err)
    }
}

if (dev) {
    configJson.defaultProxy = ':8080'
}

applyWatermarkPackagesToConfig(configJson as Record<string, unknown>, path.resolve('pnpm-lock.yaml'))

const configSource = (SINGLE_FILE_BUILD ? 'BUNDLED' : (process.env.CONFIG_JSON_SOURCE || 'REMOTE')) as 'BUNDLED' | 'REMOTE'

const faviconPath = 'favicon.png'

const enableMetrics = process.env.ENABLE_METRICS === 'true'

// base options are in ./renderer/rsbuildSharedConfig.ts
const appConfig = defineConfig({
    html: {
        template: './index.html',
        inject: 'body',
        tags: [
            ...SINGLE_FILE_BUILD ? [] : [
                {
                    tag: 'link',
                    attrs: {
                        rel: 'manifest',
                        crossorigin: 'anonymous',
                        href: 'manifest.json'
                    },
                }
            ],
            // <link rel="favicon" href="favicon.png">
            // <link rel="icon" type="image/png" href="favicon.png" />
            // <meta property="og:image" content="favicon.png" />
            {
                tag: 'link',
                attrs: {
                    rel: 'favicon',
                    href: faviconPath
                }
            },
            ...SINGLE_FILE_BUILD ? [] : [
                {
                    tag: 'link',
                    attrs: {
                        rel: 'icon',
                        type: 'image/png',
                        href: faviconPath
                    }
                },
                {
                    tag: 'meta',
                    attrs: {
                        property: 'og:image',
                        content: faviconPath
                    }
                }
            ]
        ]
    },
    output: {
        externals: [
            'sharp'
        ],
        sourceMap: {
            js: 'source-map',
            css: true,
        },
        minify: {
            // js: false,
            jsOptions: {
                minimizerOptions: {
                    mangle: {
                        safari10: true,
                        keep_classnames: true,
                        keep_fnames: true,
                        keep_private_props: true,
                    },
                    compress: {
                        unused: true,
                    },
                },
            },
        },
        distPath: SINGLE_FILE_BUILD ? {
            html: './single',
        } : undefined,
        inlineScripts: SINGLE_FILE_BUILD,
        inlineStyles: SINGLE_FILE_BUILD,
        // 50kb limit for data uri
        dataUriLimit: SINGLE_FILE_BUILD ? 1 * 1024 * 1024 * 1024 : 50 * 1024
    },
    performance: {
        // prefetch: {
        //     include(filename) {
        //         return filename.includes('mc-data') || filename.includes('mc-assets')
        //     },
        // },
    },
    source: {
        entry: {
            index: './src/index.ts',
        },
        // exclude: [
        //     /.woff$/
        // ],
        define: {
            'process.env.BUILD_VERSION': JSON.stringify(!dev ? buildingVersion : 'undefined'),
            'process.env.BUILD_DISPLAY_DATE': JSON.stringify(buildDisplayDate),
            'process.env.MAIN_MENU_LINKS': JSON.stringify(process.env.MAIN_MENU_LINKS),
            'process.env.SINGLE_FILE_BUILD': JSON.stringify(process.env.SINGLE_FILE_BUILD),
            'process.env.SINGLE_FILE_BUILD_MODE': JSON.stringify(process.env.SINGLE_FILE_BUILD),
            'process.platform': '"browser"',
            'process.env.GITHUB_URL':
                JSON.stringify(`https://github.com/${process.env.GITHUB_REPOSITORY || `${process.env.VERCEL_GIT_REPO_OWNER}/${process.env.VERCEL_GIT_REPO_SLUG}` || githubRepositoryFallback}`),
            'process.env.ALWAYS_MINIMAL_SERVER_UI': JSON.stringify(process.env.ALWAYS_MINIMAL_SERVER_UI),
            'process.env.RELEASE_TAG': JSON.stringify(releaseTag),
            'process.env.RELEASE_LINK': JSON.stringify(releaseLink),
            'process.env.RELEASE_CHANGELOG': JSON.stringify(releaseChangelog),
            'process.env.DISABLE_SERVICE_WORKER': JSON.stringify(disableServiceWorker),
            'process.env.INLINED_APP_CONFIG': JSON.stringify(configSource === 'BUNDLED' ? configJson : null),
            'process.env.ENABLE_COOKIE_STORAGE': JSON.stringify(process.env.ENABLE_COOKIE_STORAGE || true),
            'process.env.COOKIE_STORAGE_PREFIX': JSON.stringify(process.env.COOKIE_STORAGE_PREFIX || ''),
            'process.env.WS_PORT': JSON.stringify(enableMetrics ? 8081 : false),
        },
    },
    server: {
        // strictPort: true,
        // publicDir: {
        //     name: 'assets',
        // },
        proxy: {
            '/api': 'http://localhost:8080',
        },
    },
    plugins: [
        pluginTypedCSSModules(),
        {
            name: 'test',
            setup(build: RsbuildPluginAPI) {
                const prep = async () => {
                    console.time('total-prep')
                    fs.mkdirSync('./generated', { recursive: true })
                    if (!fs.existsSync('./generated/minecraft-data-optimized.json') || !fs.existsSync('./generated/mc-assets-compressed.js') || require('./generated/minecraft-data-optimized.json').versionKey !== require('minecraft-data/package.json').version) {
                        childProcess.execSync('tsx ./scripts/makeOptimizedMcData.mjs', { stdio: 'inherit' })
                    }
                    childProcess.execSync('tsx ./scripts/genShims.ts', { stdio: 'inherit' })
                    if (!fs.existsSync('./generated/latestBlockCollisionsShapes.json') || require('./generated/latestBlockCollisionsShapes.json').versionKey !== require('minecraft-data/package.json').version) {
                        childProcess.execSync('tsx ./scripts/optimizeBlockCollisions.ts', { stdio: 'inherit' })
                    }
                    // childProcess.execSync(['tsx', './scripts/genLargeDataAliases.ts', ...(SINGLE_FILE_BUILD ? ['--compressed'] : [])].join(' '), { stdio: 'inherit' })
                    genLargeDataAliases(SINGLE_FILE_BUILD || process.env.ALWAYS_COMPRESS_LARGE_DATA === 'true')
                    fsExtra.copySync('./node_modules/mc-assets/dist/other-textures/latest/entity', './dist/textures/entity')
                    fsExtra.copySync('./assets/background', './dist/background')
                    fs.copyFileSync('./assets/favicon.png', './dist/favicon.png')
                    fs.copyFileSync('./assets/playground.html', './dist/playground.html')
                    fs.copyFileSync('./assets/manifest.json', './dist/manifest.json')
                    fs.copyFileSync('./assets/config.html', './dist/config.html')
                    fs.copyFileSync('./assets/debug-inputs.html', './dist/debug-inputs.html')
                    fs.copyFileSync('./assets/loading-bg.jpg', './dist/loading-bg.jpg')
                    if (fs.existsSync('./assets/release.json')) {
                        fs.copyFileSync('./assets/release.json', './dist/release.json')
                    }

                    if (configSource === 'REMOTE') {
                        fs.writeFileSync('./dist/config.json', JSON.stringify(configJson, undefined, 2), 'utf8')
                    }
                    if (fs.existsSync('./generated/sounds.js')) {
                        fs.copyFileSync('./generated/sounds.js', './dist/sounds.js')
                    }
                    // childProcess.execSync('./scripts/prepareSounds.mjs', { stdio: 'inherit' })
                    // childProcess.execSync('tsx ./scripts/genMcDataTypes.ts', { stdio: 'inherit' })
                    // childProcess.execSync('tsx ./scripts/genPixelartTypes.ts', { stdio: 'inherit' })
                    if (fs.existsSync('./renderer/dist/mesher.js') && dev) {
                        // copy mesher
                        fs.copyFileSync('./renderer/dist/mesher.js', './dist/mesher.js')
                        fs.copyFileSync('./renderer/dist/mesher.js.map', './dist/mesher.js.map')
                    } else if (!dev) {
                        await execAsync('pnpm run build-mesher')
                    }
                    fs.writeFileSync('./dist/version.txt', buildingVersion, 'utf-8')

                    // Start WebSocket server in development
                    if (dev && enableMetrics) {
                        await startWsServer(8081, false)
                    }

                    console.timeEnd('total-prep')
                }
                if (!dev) {
                    build.onBeforeBuild(async () => {
                        prep()
                    })
                    build.onAfterBuild(async () => {
                        if (fs.readdirSync('./assets/customTextures').length > 0) {
                            childProcess.execSync('tsx ./scripts/patchAssets.ts', { stdio: 'inherit' })
                        }

                        if (SINGLE_FILE_BUILD) {
                            // check that only index.html is in the dist/single folder
                            const singleBuildFiles = fs.readdirSync('./dist/single')
                            if (singleBuildFiles.length !== 1 || singleBuildFiles[0] !== 'index.html') {
                                throw new Error('Single file build must only have index.html in the dist/single folder. Ensure workers are imported & built correctly.')
                            }

                            // process index.html
                            const singleBuildHtml = './dist/single/index.html'
                            let html = fs.readFileSync(singleBuildHtml, 'utf8')
                            const verToMajor = (ver: string) => ver.split('.').slice(0, 2).join('.')
                            const supportedMajorVersions = [...new Set(supportedVersions.map(a => verToMajor(a)))].join(', ')
                            html = `<!DOCTYPE html><!-- MINECRAFT WEB CLIENT ${releaseTag ?? ''} -->\n<!-- A true SINGLE FILE BUILD with built-in server -->\n<!-- All textures, assets and Minecraft data for ${supportedMajorVersions} inlined into one file. -->\n${html}`

                            const resizedImage = (await (sharp('./assets/favicon.png') as any).resize(64).toBuffer()).toString('base64')
                            html = html.replace('favicon.png', `data:image/png;base64,${resizedImage}`)
                            html = html.replace('src="./loading-bg.jpg"', `src="data:image/png;base64,${fs.readFileSync('./assets/loading-bg.jpg', 'base64')}"`)
                            html += '<script id="mesher-worker-code">' + fs.readFileSync('./dist/mesher.js', 'utf8') + '</script>'
                            fs.writeFileSync(singleBuildHtml, html, 'utf8')
                            // write output file size
                            console.log('single file size', (fs.statSync(singleBuildHtml).size / 1024 / 1024).toFixed(2), 'mb')
                        } else {
                            if (!disableServiceWorker) {
                            const { count, size, warnings } = await generateSW({
                                    // dontCacheBustURLsMatching: [new RegExp('...')],
                                    globDirectory: 'dist',
                                    skipWaiting: true,
                                    clientsClaim: true,
                                    additionalManifestEntries: getSwAdditionalEntries(),
                                    globPatterns: [],
                                    swDest: './dist/service-worker.js',
                                })
                            }
                        }
                    })
                }
                build.onBeforeStartDevServer(() => prep())
            },
        },
    ],
    // performance: {
    //     bundleAnalyze: {
    //         analyzerMode: 'json',
    //         reportFilename: 'report.json',
    //     },
    // },
})

export default mergeRsbuildConfig(
    appAndRendererSharedConfig(),
    appConfig
)
