//@ts-check

import { getVersionList, DEFAULT_RESOURCE_ROOT_URL } from '@xmcl/installer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { exec } from 'child_process'
import { promisify } from 'util'
import { build } from 'esbuild'
import supportedVersions from '../src/supportedVersions.mjs'

const __dirname = path.dirname(fileURLToPath(new URL(import.meta.url)))

export const versionToNumber = (ver) => {
  const [x, y = '0', z = '0'] = ver.split('.')
  return +`${x.padStart(2, '0')}${y.padStart(2, '0')}${z.padStart(2, '0')}`
}

const targetedVersions = [...supportedVersions].sort((a, b) => versionToNumber(b) - versionToNumber(a))

/** @type {{name, size, hash}[]} */
let prevSounds = null

const burgerDataUrl = (version) => `https://raw.githubusercontent.com/Pokechu22/Burger/gh-pages/${version}.json`
const burgerDataPath = './generated/burger.json'
const EXISTING_CACHE_PATH = './generated/existing-sounds-cache.json'

// const perVersionData: Record<string, { removed: string[],

const soundsPathVersionsRemap = {}

const downloadAllSoundsAndCreateMap = async () => {
  let existingSoundsCache = {}
  try {
    existingSoundsCache = JSON.parse(await fs.promises.readFile(EXISTING_CACHE_PATH, 'utf8'))
  } catch (err) {}
  const { versions } = await getVersionList()
  const lastVersion = versions.filter(version => !version.id.includes('w'))[0]
  // if (lastVersion.id !== targetedVersions[0]) throw new Error('last version is not the same as targetedVersions[0], update')
  for (const version of targetedVersions) {
    const versionData = versions.find(x => x.id === version)
    if (!versionData) throw new Error('no version data for ' + version)
    console.log('Getting assets for version', version)
    const { assetIndex } = await fetch(versionData.url).then((r) => r.json())
    /** @type {{objects: {[a: string]: { size, hash }}}} */
    const index = await fetch(assetIndex.url).then((r) => r.json())
    const soundAssets = Object.entries(index.objects).filter(([name]) => /* name.endsWith('.ogg') || */ name.startsWith('minecraft/sounds/')).map(([name, { size, hash }]) => ({ name, size, hash }))
    soundAssets.sort((a, b) => a.name.localeCompare(b.name))
    if (prevSounds) {
      const prevSoundNames = new Set(prevSounds.map(x => x.name))
      const addedSounds = prevSounds.filter(x => !soundAssets.some(y => y.name === x.name))
      // todo implement removed
      const removedSounds = soundAssets.filter(x => !prevSoundNames.has(x.name))
      // console.log('+', addedSounds.map(x => x.name))
      // console.log('-', removedSounds.map(x => x.name))
      const changedSize = soundAssets.filter(x => prevSoundNames.has(x.name) && prevSounds.find(y => y.name === x.name).size !== x.size)
      console.log('changed size', changedSize.map(x => ({ name: x.name, prev: prevSounds.find(y => y.name === x.name).size, curr: x.size })))
      if (addedSounds.length || changedSize.length) {
        soundsPathVersionsRemap[version] = [...addedSounds, ...changedSize].map(x => x.name.replace('minecraft/sounds/', '').replace('.ogg', ''))
      }
      if (addedSounds.length) {
        console.log('downloading new sounds for version', version)
        downloadSounds(version, addedSounds, version + '/')
      }
      if (changedSize.length) {
        console.log('downloading changed sounds for version', version)
        downloadSounds(version, changedSize, version + '/')
      }
    } else {
      console.log('downloading sounds for version', version)
      downloadSounds(version, soundAssets)
    }
    prevSounds = soundAssets
  }
  async function downloadSound({ name, hash, size }, namePath, log) {
    const cached =
      !!namePath.replace('.ogg', '.mp3').split('/').reduce((acc, cur) => acc?.[cur], existingSoundsCache.sounds) ||
      !!namePath.replace('.ogg', '.ogg').split('/').reduce((acc, cur) => acc?.[cur], existingSoundsCache.sounds)
    const savePath = path.resolve(`generated/sounds/${namePath}`)
    if (cached || fs.existsSync(savePath)) {
      // console.log('skipped', name)
      existingSoundsCache.sounds[namePath] = true
      return
    }
    log()
    const r = await fetch(DEFAULT_RESOURCE_ROOT_URL + '/' + hash.slice(0, 2) + '/' + hash, /* {headers: {range: `bytes=0-${size-1}`}} */)
    // save file
    const file = await r.blob()
    fs.mkdirSync(path.dirname(savePath), { recursive: true })
    await fs.promises.writeFile(savePath, Buffer.from(await file.arrayBuffer()))

    const reader = file.stream().getReader()

    const writer = fs.createWriteStream(savePath)
    let offset = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      writer.write(Buffer.from(value))
      offset += value.byteLength
    }
    writer.close()
  }
  async function downloadSounds(version, assets, addPath = '') {
    if (addPath && existingSoundsCache.sounds[version]) {
      console.log('using existing sounds for version', version)
      return
    }
    console.log(version, 'have to download', assets.length, 'sounds')
    for (let i = 0; i < assets.length; i += 5) {
      await Promise.all(assets.slice(i, i + 5).map((asset, j) => downloadSound(asset, `${addPath}${asset.name}`, () => {
        console.log('downloading', addPath, asset.name, i + j, '/', assets.length)
      })))
    }
  }

  fs.writeFileSync('./generated/soundsPathVersionsRemap.json', JSON.stringify(soundsPathVersionsRemap), 'utf8')
  fs.writeFileSync(EXISTING_CACHE_PATH, JSON.stringify(existingSoundsCache), 'utf8')
}

const lightpackOverrideSounds = {
  'Block breaking': 'step/stone1',
  'Block broken': 'dig/stone1',
  'Block placed': 'dig/stone1'
}

// this is not done yet, will be used to select only sounds for bundle (most important ones)
const isSoundWhitelisted = (name) => name.startsWith('random/') || name.startsWith('note/') || name.endsWith('/say1') || name.endsWith('/death') || (name.startsWith('mob/') && name.endsWith('/step1')) || name.endsWith('/swoop1') || /* name.endsWith('/break1') || */ name.endsWith('dig/stone1')

// const ffmpeg = 'C:/Users/Vitaly/Documents/LosslessCut-win-x64/resources/ffmpeg.exe' // can be ffmpeg-static
const ffmpegExec = 'ffmpeg'
const maintainBitrate = true

const scanFilesDeep = async (root, onOggFile) => {
  const files = await fs.promises.readdir(root, { withFileTypes: true })
  for (const file of files) {
    if (file.isDirectory()) {
      await scanFilesDeep(path.join(root, file.name), onOggFile)
    } else if (file.name.endsWith('.ogg') && !files.some(x => x.name === file.name.replace('.ogg', '.mp3'))) {
      await onOggFile(path.join(root, file.name))
    }
  }
}

const convertSounds = async () => {
  const toConvert = []
  await scanFilesDeep('generated/sounds', (oggPath) => {
    toConvert.push(oggPath)
  })

  const convertSound = async (i) => {
    const proc = promisify(exec)(`${ffmpegExec} -i "${toConvert[i]}" -y -codec:a libmp3lame ${maintainBitrate ? '-qscale:a 2' : ''} "${toConvert[i].replace('.ogg', '.mp3')}"`)
    // pipe stdout to the console
    //@ts-ignore
    proc.child.stdout.pipe(process.stdout)
    await proc
    console.log('converted to mp3', i, '/', toConvert.length, toConvert[i])
  }

  const CONCURRENCY = 5
  for (let i = 0; i < toConvert.length; i += CONCURRENCY) {
    await Promise.all(toConvert.slice(i, i + CONCURRENCY).map((oggPath, j) => convertSound(i + j)))
  }
}

const getSoundsMap = (burgerData) => {
  /** @type {Record<string, {id, name, sounds?: {name, weight?,volume?}[], subtitle?: string }>} */
  return burgerData[0].sounds
  // const map = JSON.parse(fs.readFileSync(burgerDataPath, 'utf8'))[0].sounds
}

const writeSoundsMap = async () => {
  const burgerData = await fetch(burgerDataUrl(targetedVersions[0])).then((r) => r.json())
  fs.writeFileSync(burgerDataPath, JSON.stringify(burgerData[0].sounds), 'utf8')

  const allSoundsMapOutput = {}
  let prevMap

  // todo REMAP ONLY IDS. Do diffs, as mostly only ids are changed between versions
  // const localTargetedVersions = targetedVersions.slice(0, 2)
  let lastMappingsJson
  const localTargetedVersions = targetedVersions
  for (const targetedVersion of [...localTargetedVersions].reverse()) {
    console.log('Processing version', targetedVersion)

    const burgerData = await fetch(burgerDataUrl(targetedVersion)).then((r) => r.json()).catch((err) => {
      // console.error('error fetching burger data', targetedVersion, err)
      return null
    })
    /** @type {{sounds: string[]}} */
    const mappingJson = await fetch(`https://raw.githubusercontent.com/ViaVersion/Mappings/7a45c1f9dbc1f1fdadacfecdb205ba84e55766fc/mappings/mapping-${targetedVersion}.json`).then(async (r) => {
      return r.json()
      // lastMappingsJson = r.status === 404 ? lastMappingsJson : (await r.json())
      // if (r.status === 404) {
      //   console.warn('using prev mappings json for ' + targetedVersion)
      // }
      // return lastMappingsJson
    }).catch((err) => {
      // console.error('error fetching mapping json', targetedVersion, err)
      return null
    })
    // if (!mappingJson) throw new Error('no initial mapping json for ' + targetedVersion)
    if (burgerData && !mappingJson) {
      console.warn('has burger but no mapping json for ' + targetedVersion)
      continue
    }
    if (!mappingJson || !burgerData) {
      console.warn('no mapping json or burger data for ' + targetedVersion)
      continue
    }
    const allSoundsMap = getSoundsMap(burgerData)
    // console.log(Object.keys(sounds).length, 'ids')
    const outputIdMap = {}
    const outputFilesMap = {}

    const classes = {}
    let keysStats = {
      new: 0,
      same: 0
    }
    for (const { _id, subtitle, sounds, name } of Object.values(allSoundsMap)) {
      if (!sounds?.length /* && !subtitle */) continue
      const firstName = sounds[0].name
      // const includeSound = isSoundWhitelisted(firstName)
      // if (!includeSound) continue
      const mostUsedSound = sounds.sort((a, b) => b.weight - a.weight)[0]
      // outputMap[id] = { subtitle, sounds: mostUsedSound }
      // outputMap[id] = { subtitle, sounds }
      // const soundFilePath = `generated/sounds/minecraft/sounds/${targetSound.name}.mp3`
      // if (!fs.existsSync(soundFilePath)) {
      //   console.warn('no sound file', targetSound.name)
      //   continue
      // }
      let outputUseSoundLine = []
      const minWeight = sounds.reduce((acc, cur) => cur.weight ? Math.min(acc, cur.weight) : acc, sounds[0].weight ?? 1)
      if (isNaN(minWeight)) debugger
      for (const sound of sounds) {
        if (sound.weight && isNaN(sound.weight)) debugger
        outputUseSoundLine.push(`${sound.volume ?? 1};${sound.name};${sound.weight ?? minWeight};${sound.attenuation_distance ?? 16}`)
      }
      const id = mappingJson.sounds.findIndex(x => x === name)
      if (id === -1) {
        console.warn('no id for sound', name, targetedVersion)
        continue
      }
      const key = `${id};${name}`
      outputIdMap[key] = outputUseSoundLine.join(',')
      if (prevMap && prevMap[key]) {
        keysStats.same++
      } else {
        keysStats.new++
      }
      // for (const {name: soundName} of sounds ?? []) {
      //   let obj = classes
      //   for (const part of soundName.split('/')) {
      //     obj[part] ??= {}
      //     obj = obj[part]
      //   }
      // }
    }
    // console.log(classes)
    // console.log('to download', new Set(Object.values(outputIdMap).flatMap(x => x.sounds)).size)
    // console.log('json size', JSON.stringify(outputIdMap).length / 1024 / 1024)
    allSoundsMapOutput[targetedVersion] = outputIdMap
    prevMap = outputIdMap
    // const allSoundNames = new Set(Object.values(allSoundsMap).flatMap(({ name, sounds }) => {
    //   if (!sounds) {
    //     console.log(name)
    //     return []
    //   }
    //   return sounds.map(sound => sound.name)
    // }))
    // console.log(allSoundNames.size, 'sounds')
  }

  fs.writeFileSync('./generated/sounds.json', JSON.stringify(allSoundsMapOutput), 'utf8')
}

const makeSoundsBundle = async () => {
  const allSoundsMap = JSON.parse(fs.readFileSync('./generated/sounds.json', 'utf8'))
  const allSoundsVersionedMap = JSON.parse(fs.readFileSync('./generated/soundsPathVersionsRemap.json', 'utf8'))
  if (!process.env.REPO_SLUG) throw new Error('REPO_SLUG is not set')

  const allSoundsMeta = {
    format: 'mp3',
    baseUrl: `https://raw.githubusercontent.com/${process.env.REPO_SLUG}/sounds/sounds/`
  }

  await build({
    bundle: true,
    outfile: `dist/sounds.js`,
    stdin: {
      contents: `window.allSoundsMap = ${JSON.stringify(allSoundsMap)}\nwindow.allSoundsVersionedMap = ${JSON.stringify(allSoundsVersionedMap)}\nwindow.allSoundsMeta = ${JSON.stringify(allSoundsMeta)}`,
      resolveDir: __dirname,
      sourcefile: `sounds.js`,
      loader: 'js',
    },
    metafile: true,
  })
  // copy also to generated/sounds.js
  fs.copyFileSync('./dist/sounds.js', './generated/sounds.js')
}

const action = process.argv[2]
if (action) {
  const execFn = {
    download: downloadAllSoundsAndCreateMap,
    convert: convertSounds,
    write: writeSoundsMap,
    bundle: makeSoundsBundle,
  }[action]

  if (execFn) {
    execFn()
  }
} else {
  // downloadAllSoundsAndCreateMap()
  // convertSounds()
  writeSoundsMap()
  // makeSoundsBundle()
}
