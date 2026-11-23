import fs from 'fs'
import { proxy, ref } from 'valtio'
import { parse as parseYaml } from 'yaml'
import { mountWorldDirectoryHandle, mountWorldZip, possiblyCleanHandle, tryToDetectResourcePack } from '../browserfs'
import { fsState, getPlayableVersion, loadSave, longArrayToNumber, readLevelDat } from '../loadSave'
import { hideCurrentModal, isGameActive, showModal } from '../globalState'
import { showNotification } from '../react/NotificationProvider'
import { showOptionsModal } from '../react/SelectOption'

/**
 * A world dropped on the page (or picked with the file / folder picker) is mounted read only and described on a world screen
 * (DroppedWorldScreen) before anything is loaded: name, icon, version, game mode, dimensions, players, warps. Saving back to the
 * folder is opt-in there (off by default), and the player picks where to start.
 */

export type WorldPosition = { x: number, y: number, z: number }

export type DroppedWorldSource =
  | { kind: 'folder', name: string, handle: FileSystemDirectoryHandle }
  | { kind: 'zip', name: string, file: File }

export type WorldDimensionInfo = {
  id: string
  label: string
  regions: number
  bytes: number
}

export type StartOption = {
  id: string
  label: string
  /** undefined: where the server puts the player (last position, or the world spawn for a new player) */
  position?: WorldPosition
}

export type DroppedWorldInfo = {
  root: string
  folderName: string
  levelName: string
  /** level.dat version, undefined for 1.8 and older (not stored) */
  version?: string
  playVersion: string
  versionSupported: boolean
  gameMode?: string
  hardcore: boolean
  difficulty?: string
  cheats: boolean
  lastPlayed?: number
  seed?: string
  iconSrc?: string
  dimensions: WorldDimensionInfo[]
  totalBytes: number
  players: number
  datapacks: string[]
  warps: Array<{ name: string } & WorldPosition>
  startOptions: StartOption[]
}

export const droppedWorldState = proxy({
  sourceName: '',
  sourceKind: 'folder' as DroppedWorldSource['kind'],
  /** worlds found in the drop (a saves folder or a zip can hold several) */
  worldRoots: [] as string[],
  selectedRoot: '',
  info: null as DroppedWorldInfo | null,
  loading: false,
  error: '',
  /** write changes back to the dropped folder (off: read only, nothing is written) */
  saveChanges: false,
  startOptionId: '',
})

let folderHandle: FileSystemDirectoryHandle | null = null
/** the saving warning was confirmed for this drop */
let saveWarningAccepted = false

const GAME_MODES = ['Survival', 'Creative', 'Adventure', 'Spectator']
const DIFFICULTIES = ['Peaceful', 'Easy', 'Normal', 'Hard']

const exists = async (path: string) => fs.promises.stat(path).then(() => true, () => false)
const readdirSafe = async (path: string) => fs.promises.readdir(path).catch(() => [] as string[])

/** level.dat roots in the mounted /world: itself, or worlds up to two folders deep (a saves folder, a zip with a top folder) */
const findWorldRoots = async () => {
  if (await exists('/world/level.dat')) return ['/world']
  const roots: string[] = []
  for (const dir of await readdirSafe('/world')) {
    const path = `/world/${dir}`
    // eslint-disable-next-line no-await-in-loop
    if (await exists(`${path}/level.dat`)) {
      roots.push(path)
      continue
    }
    // eslint-disable-next-line no-await-in-loop
    for (const sub of await readdirSafe(path)) {
      // eslint-disable-next-line no-await-in-loop
      if (await exists(`${path}/${sub}/level.dat`)) roots.push(`${path}/${sub}`)
    }
  }
  return roots
}

const regionStats = async (dir: string) => {
  const files = (await readdirSafe(dir)).filter(f => f.endsWith('.mca') || f.endsWith('.mcr'))
  const sizes = await Promise.all(files.map(async f => fs.promises.stat(`${dir}/${f}`).then(s => s.size, () => 0)))
  return { regions: files.length, bytes: sizes.reduce((a, b) => a + b, 0) }
}

const readDimensions = async (root: string) => {
  const dims: WorldDimensionInfo[] = []
  const add = async (id: string, label: string, regionDir: string) => {
    const stats = await regionStats(regionDir)
    dims.push({ id, label, ...stats })
  }
  await add('minecraft:overworld', 'Overworld', `${root}/region`)
  await add('minecraft:the_nether', 'The Nether', `${root}/DIM-1/region`)
  await add('minecraft:the_end', 'The End', `${root}/DIM1/region`)
  // datapack / modded dimensions: dimensions/<namespace>/<name>/region
  for (const ns of await readdirSafe(`${root}/dimensions`)) {
    // eslint-disable-next-line no-await-in-loop
    for (const name of await readdirSafe(`${root}/dimensions/${ns}`)) {
      const id = `${ns}:${name}`
      if (dims.some(d => d.id === id)) continue
      // eslint-disable-next-line no-await-in-loop
      await add(id, id, `${root}/dimensions/${ns}/${name}/region`)
    }
  }
  return dims
}

/** flying-squid warps: `Warp files/*.yml` in the world, or next to it (community saves, see loadSave) */
const readWarps = async (root: string) => {
  const warps: DroppedWorldInfo['warps'] = []
  for (const dir of [`${root}/Warp files`, `${root}/../Warp files`]) {
    // eslint-disable-next-line no-await-in-loop
    for (const file of await readdirSafe(dir)) {
      if (!file.endsWith('.yml')) continue
      try {
        // a Buffer, then text: BrowserFS ZipFS fails readFile with an encoding ("Invalid chunk size")
        // eslint-disable-next-line no-await-in-loop
        const warp = parseYaml(Buffer.from(await fs.promises.readFile(`${dir}/${file}`)).toString('utf8'))
        // other dimensions would need a world switch: only overworld warps are start points
        if (warp?.world && warp.world !== 'world' && warp.world !== 'minecraft:overworld') continue
        if (typeof warp?.x !== 'number' || typeof warp?.y !== 'number' || typeof warp?.z !== 'number') continue
        warps.push({ name: String(warp.name ?? file.slice(0, -4)), x: warp.x, y: warp.y, z: warp.z })
      } catch (err) {
        // BrowserFS ZipFS can't inflate entries under 64 bytes (zlib chunkSize): such a warp is skipped
        console.warn('Could not read warp', file, err)
      }
    }
    if (warps.length) break
  }
  return warps
}

/** NBT long as [high, low] (prismarine-nbt simplify) → decimal string */
const longToString = (value: unknown) => {
  if (!Array.isArray(value) || value.length !== 2) return typeof value === 'number' || typeof value === 'bigint' ? String(value) : undefined
  const [high, low] = value as [number, number]

  return BigInt.asIntN(64, (BigInt(high) << 32n) | BigInt(low >>> 0)).toString()
}

const dimensionLabel = (dimension: unknown) => {
  if (dimension === -1 || dimension === 'minecraft:the_nether') return 'the Nether'
  if (dimension === 1 || dimension === 'minecraft:the_end') return 'the End'
  if (dimension === undefined || dimension === 0 || dimension === 'minecraft:overworld') return undefined
  return String(dimension)
}

const formatPos = (p: WorldPosition) => `${Math.floor(p.x)}, ${Math.floor(p.y)}, ${Math.floor(p.z)}`

export const readDroppedWorldInfo = async (root: string): Promise<DroppedWorldInfo> => {
  const { levelDat } = (await readLevelDat(root)) ?? {}
  if (!levelDat) throw new Error('level.dat is missing')
  const data = levelDat as typeof levelDat & Record<string, any>

  const [dimensions, warps, datapacks, playerFiles, icon] = await Promise.all([
    readDimensions(root),
    readWarps(root),
    readdirSafe(`${root}/datapacks`),
    readdirSafe(`${root}/playerdata`),
    fs.promises.readFile(`${root}/icon.png`, 'base64').catch(() => ''),
  ])

  const version = data.Version?.Name
  const playable = getPlayableVersion(version)

  // 1.21.5+: spawn { pos: [x, y, z] }; before: SpawnX / SpawnY / SpawnZ
  const spawnPos = Array.isArray(data.spawn?.pos) ? data.spawn.pos as number[] : undefined
  const spawn: WorldPosition | undefined = spawnPos
    ? { x: spawnPos[0]!, y: spawnPos[1]!, z: spawnPos[2]! }
    : typeof data.SpawnX === 'number' ? { x: data.SpawnX, y: data.SpawnY, z: data.SpawnZ } : undefined
  const playerPosArr = Array.isArray(data.Player?.Pos) ? data.Player.Pos : undefined
  const playerPos: WorldPosition | undefined = playerPosArr ? { x: playerPosArr[0]!, y: playerPosArr[1]!, z: playerPosArr[2]! } : undefined
  const playerDimension = dimensionLabel(data.Player?.Dimension)

  const startOptions: StartOption[] = []
  if (playerPos) {
    startOptions.push({ id: 'player', label: `Last position (${formatPos(playerPos)}${playerDimension ? `, in ${playerDimension}` : ''})` })
  }
  // spawn and warps are overworld places: a teleport there from another dimension would land in that dimension
  if (!playerDimension) {
    if (spawn) startOptions.push({ id: 'spawn', label: `World spawn (${formatPos(spawn)})`, position: playerPos ? { x: spawn.x + 0.5, y: spawn.y, z: spawn.z + 0.5 } : undefined })
    for (const [i, warp] of warps.entries()) {
      startOptions.push({ id: `warp:${i}`, label: `Warp ${warp.name} (${formatPos(warp)})`, position: { x: warp.x, y: warp.y, z: warp.z } })
    }
  }
  if (startOptions.length === 0) startOptions.push({ id: 'default', label: 'World spawn' })

  const seed = longToString(data.WorldGenSettings?.seed ?? data.RandomSeed)
  return {
    root,
    // the drop itself is the world: its own name, otherwise the world's folder inside it
    folderName: root === '/world' ? droppedWorldState.sourceName : root.split('/').at(-1)!,
    levelName: (data.LevelName as string | undefined) || root.split('/').at(-1)!,
    version,
    playVersion: playable.version,
    versionSupported: playable.supported,
    gameMode: GAME_MODES[data.GameType],
    hardcore: !!data.hardcore,
    difficulty: DIFFICULTIES[data.Difficulty],
    cheats: !!data.allowCommands,
    lastPlayed: data.LastPlayed ? longArrayToNumber(data.LastPlayed) : undefined,
    seed,
    iconSrc: icon ? `data:image/png;base64,${icon}` : undefined,
    dimensions,
    totalBytes: dimensions.reduce((a, d) => a + d.bytes, 0),
    players: playerFiles.filter(f => f.endsWith('.dat')).length,
    datapacks: datapacks.filter(d => !d.startsWith('.')),
    warps,
    startOptions,
  }
}

export const selectDroppedWorld = async (root: string) => {
  droppedWorldState.selectedRoot = root
  droppedWorldState.loading = true
  droppedWorldState.error = ''
  try {
    const info = await readDroppedWorldInfo(root)
    if (droppedWorldState.selectedRoot !== root) return
    droppedWorldState.info = ref(info) as DroppedWorldInfo
    droppedWorldState.startOptionId = info.startOptions[0]!.id
  } catch (err) {
    console.error(err)
    droppedWorldState.error = `Could not read this world: ${(err as Error).message ?? err}`
  } finally {
    droppedWorldState.loading = false
  }
}

/** Mount the drop read only, find its worlds and open the world screen. */
export const openDroppedWorld = async (source: DroppedWorldSource) => {
  if (isGameActive(false)) {
    showNotification('Leave the current world first', 'Then drop the world again to open it.', true)
    return
  }
  folderHandle = source.kind === 'folder' ? source.handle : null
  saveWarningAccepted = false
  Object.assign(droppedWorldState, {
    sourceName: source.name,
    sourceKind: source.kind,
    worldRoots: [] as string[],
    selectedRoot: '',
    info: null,
    loading: true,
    error: '',
    saveChanges: false,
    startOptionId: '',
  })
  try {
    if (source.kind === 'folder') await mountWorldDirectoryHandle(source.handle)
    else await mountWorldZip(source.file, source.name)
    fsState.saveLoaded = false
    const roots = await findWorldRoots()
    if (roots.length === 0) {
      droppedWorldState.loading = false
      if (source.kind === 'zip' && await tryToDetectResourcePack()) return
      possiblyCleanHandle()
      showNotification(`No Minecraft world in ${source.name}`, 'Drop a world folder (with level.dat) or a .zip of one.', true)
      return
    }
    droppedWorldState.worldRoots = roots
    showModal({ reactType: 'dropped-world' })
    await selectDroppedWorld(roots[0]!)
  } catch (err) {
    console.error(err)
    droppedWorldState.loading = false
    showNotification(`Could not open ${source.name}`, String((err as Error).message ?? err), true)
  }
}

/** Folder picker (main menu "open world" button): same world screen as a drop. */
export const pickWorldDirectory = async () => {
  try {
    const handle = await window.showDirectoryPicker({ id: 'select-world' })
    await openDroppedWorld({ kind: 'folder', name: handle.name, handle })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return
    throw err
  }
}

/**
 * Turn saving back to the folder on or off. Turning it on warns first (once per drop) and asks the browser for write access to
 * the folder (its own permission prompt; called from the checkbox click, so the user gesture is still there).
 */
export const setDroppedWorldSaving = async (enabled: boolean) => {
  if (!enabled) {
    droppedWorldState.saveChanges = false
    return
  }
  if (droppedWorldState.sourceKind !== 'folder' || !folderHandle) return
  if (!saveWarningAccepted) {
    const choice = await showOptionsModal(
      'Saving can corrupt this world: there are known edge cases where writing breaks a save. Make sure you have a backup of the folder.',
      ['I have a backup, save changes'],
    )
    if (!choice) return
    saveWarningAccepted = true
  }
  const permission = await folderHandle.requestPermission?.({ mode: 'readwrite' }).catch(() => 'denied' as const)
  if (permission !== 'granted') {
    showNotification('No write access to the folder', 'The world stays read only.', true)
    return
  }
  droppedWorldState.saveChanges = true
}

export const closeDroppedWorld = () => {
  hideCurrentModal()
  possiblyCleanHandle()
}

export const playDroppedWorld = async () => {
  const { info, saveChanges, sourceKind, startOptionId } = droppedWorldState
  if (!info) return
  const start = info.startOptions.find(o => o.id === startOptionId)
  fsState.isReadonly = !saveChanges
  fsState.syncFs = sourceKind === 'zip'
  fsState.inMemorySave = false
  fsState.remoteBackend = false
  hideCurrentModal()
  try {
    await loadSave(info.root, start?.position ? { startPosition: start.position } : undefined, { version: info.playVersion })
  } finally {
    possiblyCleanHandle()
  }
}
