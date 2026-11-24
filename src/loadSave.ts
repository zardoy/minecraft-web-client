import fs from 'fs'
import path from 'path'
import * as nbt from 'prismarine-nbt'
import { proxy } from 'valtio'
import { gzip } from 'node-gzip'
import { versionToNumber } from 'minecraft-renderer/src/lib/utils'
import { options } from './optionsStorage'
import { nameToMcOfflineUUID, disconnect } from './flyingSquidUtils'
import { existsViaStats, forceCachedDataPaths, forceRedirectPaths, mkdirRecursive } from './browserfs'
import { isMajorVersionGreater } from './utils'

import { activeModalStacks, insertActiveModalStack, miscUiState } from './globalState'
import supportedVersions from './supportedVersions.mjs'
import { ConnectOptions } from './connect'
import { appQueryParams } from './appParams'
import { showNotification } from './react/NotificationProvider'

// todo include name of opened handle (zip)!
// additional fs metadata
export const fsState = proxy({
  isReadonly: false,
  syncFs: false,
  inMemorySave: false,
  saveLoaded: false,
  openReadOperations: 0,
  openWriteOperations: 0,
  remoteBackend: false,
  inMemorySavePath: ''
})

const PROPOSE_BACKUP = true

/** NBT long as [high, low] int32s (prismarine-nbt simplify) → number (`high << 32` in JS shifts mod 32, so it went through BigInt) */
export function longArrayToNumber (longArray: number[]) {
  const [high, low] = longArray
  return Number(BigInt.asIntN(64, (BigInt(high) << 32n) | BigInt(low >>> 0)))
}

export const readLevelDat = async (path) => {
  let levelDatContent
  try {
    // todo-low cache reading
    levelDatContent = await fs.promises.readFile(`${path}/level.dat`)
  } catch (err) {
    if (err.code === 'ENOENT') {
      return undefined
    }
    throw err
  }
  const { parsed } = await nbt.parse(Buffer.from(levelDatContent))
  const levelDat: import('./mcTypes').LevelDat = nbt.simplify(parsed).Data
  return { levelDat, dataRaw: parsed.value.Data!.value as Record<string, any> }
}

export type LoadSaveOptions = {
  /** version to play the world with (the world screen picks a supported one), instead of level.dat's */
  version?: string
}

/** Nearest supported version for a world version (worlds older / newer than the supported range load with its first / last). */
// 1.8 and older don't store the version: 1.8.8
export const getPlayableVersion = (version = '1.8.8') => {
  const lastSupportedVersion = supportedVersions.at(-1)!
  const firstSupportedVersion = supportedVersions[0]
  if (isMajorVersionGreater(firstSupportedVersion, version)) return { version: firstSupportedVersion, supported: false }
  if (versionToNumber(version) > versionToNumber(lastSupportedVersion)) return { version: lastSupportedVersion, supported: false }
  return { version, supported: true }
}

export const loadSave = async (root = '/world', connectOptions?: Partial<ConnectOptions>, loadOptions: LoadSaveOptions = {}) => {
  // todo test
  if (miscUiState.gameLoaded) {
    await disconnect()
    await new Promise(resolve => {
      setTimeout(resolve)
    })
  }


  // todo do it in singleplayer as well
  // eslint-disable-next-line guard-for-in
  for (const key in forceCachedDataPaths) {

    delete forceCachedDataPaths[key]
  }
  // eslint-disable-next-line guard-for-in
  for (const key in forceRedirectPaths) {

    delete forceRedirectPaths[key]
  }
  // todo check jsHeapSizeLimit

  const warnings: string[] = []
  const { levelDat, dataRaw } = (await readLevelDat(root)) ?? {} as { levelDat?: import('./mcTypes').LevelDat, dataRaw?: Record<string, any> }
  if (levelDat === undefined) {
    if (fsState.isReadonly) {
      throw new Error('level.dat not found, ensure you are loading world folder')
    } else {
      warnings.push('level.dat not found, world in current folder will be created')
    }
  }

  let version: string | undefined | null
  if (levelDat) {
    version = loadOptions.version ?? appQueryParams.mapVersion ?? levelDat.Version?.Name
    if (!version) {
      // const newVersion = disablePrompts ? '1.8.8' : prompt(`In 1.8 and before world save doesn't contain version info, please enter version you want to use to load the world.\nSupported versions ${supportedVersions.join(', ')}`, '1.8.8')
      // if (!newVersion) return
      // todo detect world load issues
      const newVersion = '1.8.8'
      version = newVersion
    }
    // unsupported versions load with the nearest supported one (the world screen shows that before Play)
    const playable = getPlayableVersion(version)
    if (!playable.supported) {
      showNotification(`Version ${version} is not supported`, `Loading the world as ${playable.version}`)
      version = playable.version
    }

    const playerUuid = nameToMcOfflineUUID(options.localUsername)
    const playerDatPath = `${root}/playerdata/${playerUuid}.dat`
    const playerDataOverride = dataRaw?.Player
    if (playerDataOverride) {
      const playerDat = await gzip(nbt.writeUncompressed({ name: '', ...playerDataOverride }))
      if (fsState.isReadonly) {
        forceCachedDataPaths[playerDatPath] = playerDat
      } else {
        await mkdirRecursive(path.dirname(playerDatPath))
        await fs.promises.writeFile(playerDatPath, playerDat)
      }
    }
  }

  for (const warning of warnings) {
    showNotification(warning)
  }

  if (PROPOSE_BACKUP) {
    // const doBackup = options.alwaysBackupWorldBeforeLoading ?? confirm('Do you want to backup your world files before loading it?')
    // // const doBackup = true
    // if (doBackup) {
    //   // todo do it in flying squid instead
    //   await fs.promises.copyFile('/world/level.dat', `/world/level.dat_old`)
    //   try {
    //     await fs.promises.mkdir('/backups/region.old', { recursive: true })
    //   } catch (err) { }
    //   const files = await fs.promises.readdir('/world/region')
    //   for (const file of files) {
    //     await fs.promises.copyFile(`/world/region/${file}`, `/world/region.old/${file}`)
    //   }
    // }
  }

  if (!fsState.isReadonly && !fsState.inMemorySave) {
    // todo allow also to ctrl+s
    showNotification('Saving to the world folder', 'On an interval, on /save and when you leave')
  }

  // improve compatibility with community saves
  const rootRemapFiles = ['Warp files']
  for (const rootRemapFile of rootRemapFiles) {
    // eslint-disable-next-line no-await-in-loop
    if (await existsViaStats(path.join(root, '..', rootRemapFile))) {
      forceRedirectPaths[path.join(root, rootRemapFile)] = path.join(root, '..', rootRemapFile)
    }
  }

  // todo reimplement
  if (activeModalStacks['main-menu']) {
    insertActiveModalStack('main-menu')
  }
  // todo use general logic
  // if (activeModalStack.at(-1)?.reactType === 'app-status' && !appStatusState.isError) {
  //   alert('Wait for operations to finish before loading a new world')
  //   return
  // }
  // for (const _i of activeModalStack) {
  //   hideModal(undefined, undefined, { force: true })
  // }

  // todo should not be set here
  fsState.saveLoaded = true
  fsState.inMemorySavePath = root
  window.dispatchEvent(new CustomEvent('singleplayer', {
    // todo check gamemode level.dat data etc
    detail: {
      version,
      ...root === '/world' ? {} : {
        'worldFolder': root
      },
      connectOptions
    },
  }))
}
