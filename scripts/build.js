//@ts-check
const fsExtra = require('fs-extra')
const defaultLocalServerOptions = require('../src/defaultLocalServerOptions')
const glob = require('glob')
const fs = require('fs')
const crypto = require('crypto')
const path = require('path')

const prismarineViewerBase = "./node_modules/renderer"

// these files could be copied at build time eg with copy plugin, but copy plugin slows down the config so we copy them there, alternative we could inline it in esbuild config
const filesToCopy = [
    { from: `${prismarineViewerBase}/public/mesher.js`, to: 'dist/mesher.js' },
    { from: './assets/', to: './dist/' },
    { from: './config.json', to: 'dist/config.json' },
    // { from: path.join(entityMcAssets.directory, 'entity'), to: 'dist/textures/1.16.4/entity' },
]
exports.filesToCopy = filesToCopy
exports.copyFiles = (dev = false) => {
    console.time('copy files')
    if (!dev) {
        // copy glob
        const cwd = `${prismarineViewerBase}/public/textures/`
        const files = glob.sync('*.png', { cwd: cwd, nodir: true, })
        for (const file of files) {
            const copyDest = path.join('dist/textures/', file)
            fs.mkdirSync(path.dirname(copyDest), { recursive: true, })
            fs.copyFileSync(path.join(cwd, file), copyDest)
        }
    }

    filesToCopy.forEach(file => {
        fsExtra.copySync(file.from, file.to)
    })

    console.timeEnd('copy files')
}

exports.copyFilesDev = () => {
    if (fsExtra.existsSync('dist/config.json')) return
    exports.copyFiles()
}

exports.getSwAdditionalEntries = () => {
    // need to be careful with this
    const filesToCachePatterns = [
        'index.html',
        // todo-low copy from assets
        '*.mp3',
        '*.ttf',
        '*.png',
        '*.woff',
        'mesher.js',
        'manifest.json',
        'worldSaveWorker.js',
        `textures/entity/squid/squid.png`,
        'sounds.js',
        // everything but not .map
        'static/**/!(*.map)',
    ]
    const filesNeedsCacheKey = [
        'index.html',
        'mesher.js',
        'worldSaveWorker.js',
    ]
    const output = []
    console.log('Generating sw additional entries...')
    for (const pattern of filesToCachePatterns) {
        const files = glob.sync(pattern, { cwd: 'dist' })
        for (const file of files) {
            const fullPath = path.join('dist', file)
            if (!fs.lstatSync(fullPath).isFile()) continue
            let revision = null
            const url = './' + file.replace(/\\/g, '/')
            if (filesNeedsCacheKey.includes(file)) {
                const fileContents = fs.readFileSync(fullPath, 'utf-8')
                const md5Hash = crypto.createHash('md5').update(fileContents).digest('hex')
                revision = md5Hash
            }
            output.push({ url, revision })
        }
    }
    if (output.length > 40) {
        throw new Error(`SW: Ios has a limit of 40 urls to cache (now ${output.length})`)
    }
    console.log(`Got ${output.length} additional sw entries to cache`)
    return output
}

exports.moveStorybookFiles = () => {
    fsExtra.moveSync('storybook-static', 'dist/storybook', { overwrite: true, })
    fsExtra.copySync('dist/storybook', '.vercel/output/static/storybook')
}

exports.getSwFilesSize = () => {
    const files = exports.getSwAdditionalEntries()
    let size = 0
    for (const { url } of files) {
        const file = path.join(__dirname, '../dist', url)
        size += fs.statSync(file).size
    }
    console.log('mb', size / 1024 / 1024)
}

const fn = require.main === module && exports[process.argv[2]]

if (fn) {
    const result = fn()
    if (result) console.log(result)
}
