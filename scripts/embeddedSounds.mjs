// Basic sounds for single file builds (they have no sounds.js / remote sounds): player hurt, footsteps, block place / break,
// a few UI and item sounds and one music track, re-encoded small (mono mp3) and inlined into the html as a JSON script.
// The client picks them up in src/sounds/embeddedSounds.ts. Needs ffmpeg; without it the build goes on without sounds.
// Sources: MC_SOUNDS_DIR (a local checkout of the sounds repo, <dir>/minecraft/sounds/<file>.mp3) or the remote baseUrl from sounds.js.
// usage: node scripts/embeddedSounds.mjs [out.json]   (also called by rsbuild.config.ts for single file builds)
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const SOUNDS_MAP_URL = 'https://github.com/zardoy/minecraft-web-client/raw/sounds-generated/sounds-v2.js'
const CACHE_DIR = './generated/embedded-sounds'

/** sound events to keep (all their variants) */
const EVENTS = [
  /^entity\.player\.(hurt|death|attack\.strong|levelup|burp)$/,
  /^entity\.generic\.(hurt|eat|drink)$/,
  /^entity\.item\.pickup$/,
  /^block\.(grass|stone|wood|gravel|sand|wool|snow)\.(step|place|break)$/,
  /^ui\.button\.click$/,
]
/** music is big: only these tracks are kept in music.game */
const MUSIC_FILES = new Set(['music/game/wet_hands'])

const SFX_ARGS = ['-ac', '1', '-ar', '22050', '-b:a', '32k']
const MUSIC_ARGS = ['-ac', '1', '-ar', '32000', '-b:a', '48k']

const versionToNumber = (ver) => {
  const [x, y = '0', z = '0'] = ver.split('.')
  return +`${x.padStart(2, '0')}${y.padStart(2, '0')}${z.padStart(2, '0')}`
}

const hasFfmpeg = () => {
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

const loadSoundsMap = async () => {
  const file = './generated/sounds.js'
  if (!fs.existsSync(file)) {
    const res = await fetch(SOUNDS_MAP_URL)
    if (!res.ok) throw new Error(`sounds map download failed: ${res.status}`)
    fs.mkdirSync('./generated', { recursive: true })
    fs.writeFileSync(file, await res.text(), 'utf8')
  }
  const sandbox = {}
  new Function('window', fs.readFileSync(file, 'utf8'))(sandbox)
  return { allSoundsMap: sandbox.allSoundsMap, meta: sandbox.allSoundsMeta }
}

const readSource = async (file, baseUrl) => {
  const localDir = process.env.MC_SOUNDS_DIR
  if (localDir) {
    const local = path.join(localDir, 'minecraft/sounds', `${file}.mp3`)
    if (fs.existsSync(local)) return fs.readFileSync(local)
  }
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/minecraft/sounds/${file}.mp3`)
  if (!res.ok) throw new Error(`sound ${file} download failed: ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

const encode = async (file, baseUrl) => {
  const isMusic = file.startsWith('music/')
  const out = path.join(CACHE_DIR, `${file}.${isMusic ? 'm' : 's'}.mp3`)
  if (!fs.existsSync(out)) {
    fs.mkdirSync(path.dirname(out), { recursive: true })
    const src = `${out}.src.mp3`
    fs.writeFileSync(src, await readSource(file, baseUrl))
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', src, ...(isMusic ? MUSIC_ARGS : SFX_ARGS), '-codec:a', 'libmp3lame', out])
    fs.rmSync(src)
  }
  return fs.readFileSync(out)
}

/** @returns {Promise<string | null>} JSON `{ map: { [version]: { "id;event": "volume;file;weight,..." } }, files: { [file]: base64 } }` */
export const buildEmbeddedSounds = async ({ minVersion = process.env.MIN_MC_VERSION, maxVersion = process.env.MAX_MC_VERSION } = {}) => {
  if (!hasFfmpeg()) {
    console.warn('[embedded sounds] ffmpeg not found, the single file build will have no sounds')
    return null
  }
  const { allSoundsMap, meta } = await loadSoundsMap()
  const min = minVersion ? versionToNumber(minVersion) : 0
  const max = maxVersion ? versionToNumber(maxVersion) : Infinity
  const map = {}
  const files = new Set()
  for (const [version, sounds] of Object.entries(allSoundsMap)) {
    const n = versionToNumber(version)
    if (n < min || n > max || !Object.keys(sounds).length) continue
    const subset = {}
    for (const [key, packed] of Object.entries(sounds)) {
      const name = key.split(';')[1]
      const isMusic = name === 'music.game'
      if (!isMusic && !EVENTS.some(re => re.test(name))) continue
      const variants = packed.split(',').filter(v => !isMusic || MUSIC_FILES.has(v.split(';')[1]))
      if (!variants.length) continue
      for (const v of variants) files.add(v.split(';')[1])
      subset[key] = variants.join(',')
    }
    map[version] = subset
  }
  const out = {}
  let bytes = 0
  for (const file of [...files].sort()) {
    const data = await encode(file, meta.baseUrl)
    bytes += data.length
    out[file] = data.toString('base64')
  }
  console.log(`[embedded sounds] ${files.size} files, ${(bytes / 1024).toFixed(0)} KB (mp3), ${Object.keys(map).length} versions`)
  return JSON.stringify({ map, files: out })
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file://').href) {
  const json = await buildEmbeddedSounds()
  if (json && process.argv[2]) fs.writeFileSync(process.argv[2], json, 'utf8')
  if (json) console.log(`json: ${(json.length / 1024).toFixed(0)} KB`)
}
