import { join } from 'path'
import { promisify } from 'util'
import fs from 'fs'
import sanitizeFilename from 'sanitize-filename'
import { oneOf } from '@zardoy/utils'
import * as browserfs from 'browserfs'
import { options, resetOptions } from './optionsStorage'

import { fsState, loadSave } from './loadSave'
import { installTexturePack, installTexturePackFromHandle, updateTexturePackInstalledState } from './resourcePack'
import { miscUiState } from './globalState'
import { setLoadingScreenStatus } from './utils'
const { GoogleDriveFileSystem } = require('google-drive-browserfs/src/backends/GoogleDrive') // disable type checking

browserfs.install(window)
const defaultMountablePoints = {
  '/world': { fs: 'LocalStorage' }, // will be removed in future
  '/data': { fs: 'IndexedDB' },
  '/resourcepack': { fs: 'InMemory' }, // temporary storage for currently loaded resource pack
}
browserfs.configure({
  fs: 'MountableFileSystem',
  options: defaultMountablePoints,
}, async (e) => {
  // todo disable singleplayer button
  if (e) throw e
  await updateTexturePackInstalledState()
  miscUiState.appLoaded = true
})

export const forceCachedDataPaths = {}
export const forceRedirectPaths = {}

window.fs = fs
//@ts-expect-error
fs.promises = new Proxy(Object.fromEntries(['readFile', 'writeFile', 'stat', 'mkdir', 'rmdir', 'unlink', 'rename', /* 'copyFile',  */'readdir'].map(key => [key, promisify(fs[key])])), {
  get (target, p: string, receiver) {
    if (!target[p]) throw new Error(`Not implemented fs.promises.${p}`)
    return (...args) => {
      // browser fs bug: if path doesn't start with / dirname will return . which would cause infinite loop, so we need to normalize paths
      if (typeof args[0] === 'string' && !args[0].startsWith('/')) args[0] = '/' + args[0]
      const toRemap = Object.entries(forceRedirectPaths).find(([from]) => args[0].startsWith(from))
      if (toRemap) {
        args[0] = args[0].replace(toRemap[0], toRemap[1])
      }
      // Write methods
      // todo issue one-time warning (in chat I guess)
      const readonly = fsState.isReadonly && !(args[0].startsWith('/data') && !fsState.inMemorySave) // allow copying worlds from external providers such as zip
      if (readonly) {
        if (oneOf(p, 'readFile', 'writeFile') && forceCachedDataPaths[args[0]]) {
          if (p === 'readFile') {
            return Promise.resolve(forceCachedDataPaths[args[0]])
          } else if (p === 'writeFile') {
            forceCachedDataPaths[args[0]] = args[1]
            console.debug('Skipped writing to readonly fs', args[0])
            return Promise.resolve()
          }
        }
        if (oneOf(p, 'writeFile', 'mkdir', 'rename')) return
      }
      if (p === 'open' && fsState.isReadonly) {
        args[1] = 'r' // read-only, zipfs throw otherwise
      }
      if (p === 'readFile') {
        fsState.openReadOperations++
      } else if (p === 'writeFile') {
        fsState.openWriteOperations++
      }
      return target[p](...args).finally(() => {
        if (p === 'readFile') {
          fsState.openReadOperations--
        } else if (p === 'writeFile') {
          fsState.openWriteOperations--
        }
      })
    }
  }
})
//@ts-expect-error
fs.promises.open = async (...args) => {
  //@ts-expect-error
  const fd = await promisify(fs.open)(...args)
  return {
    ...Object.fromEntries(['read', 'write', 'close'].map(x => [x, async (...args) => {
      return new Promise(resolve => {
        // todo it results in world corruption on interactions eg block placements
        if (x === 'write' && fsState.isReadonly) {
          resolve({ buffer: Buffer.from([]), bytesRead: 0 })
          return
        }

        if (x === 'read') {
          fsState.openReadOperations++
        } else if (x === 'write' || x === 'close') {
          fsState.openWriteOperations++
        }
        fs[x](fd, ...args, (err, bytesRead, buffer) => {
          if (x === 'read') {
            fsState.openReadOperations--
          } else if (x === 'write' || x === 'close') {
            // todo that's not correct
            fsState.openWriteOperations--
          }
          if (err) throw err
          // todo if readonly probably there is no need to open at all (return some mocked version - check reload)?
          if (x === 'write' && !fsState.isReadonly) {
            // flush data, though alternatively we can rely on close in unload
            fs.fsync(fd, () => { })
          }
          resolve({ buffer, bytesRead })
        })
      })
    }])),
    // for debugging
    fd,
    filename: args[0],
    async close () {
      return new Promise<void>(resolve => {
        fs.close(fd, (err) => {
          if (err) {
            throw err
          } else {
            resolve()
          }
        })
      })
    }
  }
}

// for testing purposes, todo move it to core patch
const removeFileRecursiveSync = (path) => {
  for (const file of fs.readdirSync(path)) {
    const curPath = join(path, file)
    if (fs.lstatSync(curPath).isDirectory()) {
      // recurse
      removeFileRecursiveSync(curPath)
      fs.rmdirSync(curPath)
    } else {
      // delete file
      fs.unlinkSync(curPath)
    }
  }
}

window.removeFileRecursiveSync = removeFileRecursiveSync

export const mkdirRecursive = async (path: string) => {
  const parts = path.split('/')
  let current = ''
  for (const part of parts) {
    current += part + '/'
    try {
      // eslint-disable-next-line no-await-in-loop
      await fs.promises.mkdir(current)
    } catch (err) {
    }
  }
}

export const uniqueFileNameFromWorldName = async (title: string, savePath: string) => {
  const name = sanitizeFilename(title)
  let resultPath!: string
  // getUniqueFolderName
  let i = 0
  let free = false
  while (!free) {
    try {
      resultPath = `${savePath.replace(/\$/, '')}/${name}${i === 0 ? '' : `-${i}`}`
      // eslint-disable-next-line no-await-in-loop
      await fs.promises.stat(resultPath)
      i++
    } catch (err) {
      free = true
    }
  }
  return resultPath
}

export const mountExportFolder = async () => {
  let handle: FileSystemDirectoryHandle
  try {
    handle = await showDirectoryPicker({
      id: 'world-export',
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return
    throw err
  }
  if (!handle) return false
  await new Promise<void>(resolve => {
    browserfs.configure({
      fs: 'MountableFileSystem',
      options: {
        ...defaultMountablePoints,
        '/export': {
          fs: 'FileSystemAccess',
          options: {
            handle
          }
        }
      },
    }, (e) => {
      if (e) throw e
      resolve()
    })
  })
  return true
}

let googleDriveFileSystem

/** Only cached! */
export const googleDriveGetFileIdFromPath = (path: string) => {
  return googleDriveFileSystem._getExistingFileId(path)
}

export const mountGoogleDriveFolder = async (readonly: boolean, rootId: string) => {
  googleDriveFileSystem = new GoogleDriveFileSystem()
  googleDriveFileSystem.rootDirId = rootId
  googleDriveFileSystem.isReadonly = readonly
  await new Promise<void>(resolve => {
    browserfs.configure({
      fs: 'MountableFileSystem',
      options: {
        ...defaultMountablePoints,
        '/google': googleDriveFileSystem
      },
    }, (e) => {
      if (e) throw e
      resolve()
    })
  })
  fsState.isReadonly = readonly
  fsState.syncFs = false
  fsState.inMemorySave = false
  fsState.remoteBackend = true
  return true
}

export async function removeFileRecursiveAsync (path) {
  const errors = [] as Array<[string, Error]>
  try {
    const files = await fs.promises.readdir(path)

    // Use Promise.all to parallelize file/directory removal
    await Promise.all(files.map(async (file) => {
      const curPath = join(path, file)
      const stats = await fs.promises.stat(curPath)
      if (stats.isDirectory()) {
        // Recurse
        await removeFileRecursiveAsync(curPath)
      } else {
        // Delete file
        await fs.promises.unlink(curPath)
      }
    }))

    // After removing all files/directories, remove the current directory
    await fs.promises.rmdir(path)
  } catch (error) {
    errors.push([path, error])
  }

  if (errors.length) {
    setTimeout(() => {
      console.error(errors)
      throw new Error(`Error removing directories/files: ${errors.map(([path, err]) => `${path}: ${err.message}`).join(', ')}`)
    })
  }
}


const SUPPORT_WRITE = true

export const openWorldDirectory = async (dragndropHandle?: FileSystemDirectoryHandle) => {
  let _directoryHandle: FileSystemDirectoryHandle
  if (dragndropHandle) {
    _directoryHandle = dragndropHandle
  } else {
    try {
      _directoryHandle = await window.showDirectoryPicker({
        id: 'select-world', // important: this is used to remember user choice (start directory)
      })
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      throw err
    }
  }
  const directoryHandle = _directoryHandle

  const requestResult = SUPPORT_WRITE && !options.preferLoadReadonly ? await directoryHandle.requestPermission?.({ mode: 'readwrite' }) : undefined
  const writeAccess = requestResult === 'granted'

  const doContinue = writeAccess || !SUPPORT_WRITE || options.disableLoadPrompts || confirm('Continue in readonly mode?')
  if (!doContinue) return
  await new Promise<void>(resolve => {
    browserfs.configure({
      fs: 'MountableFileSystem',
      options: {
        ...defaultMountablePoints,
        '/world': {
          fs: 'FileSystemAccess',
          options: {
            handle: directoryHandle
          }
        }
      },
    }, (e) => {
      if (e) throw e
      resolve()
    })
  })

  fsState.isReadonly = !writeAccess
  fsState.syncFs = false
  fsState.inMemorySave = false
  fsState.remoteBackend = false
  await loadSave()
}

const tryToDetectResourcePack = async () => {
  const askInstall = async () => {
    // todo investigate browserfs read errors
    return alert('ATM You can install texturepacks only via options menu.')
    // if (confirm('Resource pack detected, do you want to install it?')) {
    //   await installTexturePackFromHandle()
    // }
  }

  if (fs.existsSync('/world/pack.mcmeta')) {
    await askInstall()
    return true
  }
  // const jszip = new JSZip()
  // let loaded = await jszip.loadAsync(file)
  // if (loaded.file('pack.mcmeta')) {
  //   loaded = null
  //   askInstall()
  //   return true
  // }
  // loaded = null
}

export const possiblyCleanHandle = (callback = () => { }) => {
  if (!fsState.saveLoaded) {
    // todo clean handle
    browserfs.configure({
      fs: 'MountableFileSystem',
      options: defaultMountablePoints,
    }, (e) => {
      callback()
      if (e) throw e
    })
  }
}

const readdirSafe = async (path: string) => {
  try {
    return await fs.promises.readdir(path)
  } catch (err) {
    return null
  }
}

export const collectFilesToCopy = async (basePath: string, safe = false): Promise<string[]> => {
  const result: string[] = []
  const countFiles = async (relPath: string) => {
    const resolvedPath = join(basePath, relPath)
    const files = relPath === '.' && !safe ? await fs.promises.readdir(resolvedPath) : await readdirSafe(resolvedPath)
    if (!files) return null
    await Promise.all(files.map(async file => {
      const res = await countFiles(join(relPath, file))
      if (res === null) {
        // is file
        result.push(join(relPath, file))
      }
    }))
  }
  await countFiles('.')
  return result
}

export const copyFilesAsyncWithProgress = async (pathSrc: string, pathDest: string, throwRootNotExist = true, addMsg = '') => {
  const stat = await existsViaStats(pathSrc)
  if (!stat) {
    if (throwRootNotExist) throw new Error(`Cannot copy. Source directory ${pathSrc} does not exist`)
    console.debug('source directory does not exist', pathSrc)
    return
  }
  if (!stat.isDirectory()) {
    await fs.promises.writeFile(pathDest, await fs.promises.readFile(pathSrc))
    console.debug('copied single file', pathSrc, pathDest)
    return
  }

  try {
    setLoadingScreenStatus('Copying files')
    let filesCount = 0
    const countFiles = async (path: string) => {
      const files = await fs.promises.readdir(path)
      await Promise.all(files.map(async (file) => {
        const curPath = join(path, file)
        const stats = await fs.promises.stat(curPath)
        if (stats.isDirectory()) {
          // Recurse
          await countFiles(curPath)
        } else {
          filesCount++
        }
      }))
    }
    console.debug('Counting files', pathSrc)
    await countFiles(pathSrc)
    console.debug('counted', filesCount)
    let copied = 0
    await copyFilesAsync(pathSrc, pathDest, (name) => {
      copied++
      setLoadingScreenStatus(`Copying files${addMsg} (${copied}/${filesCount}): ${name}`)
    })
  } finally {
    setLoadingScreenStatus(undefined)
  }
}

export const existsViaStats = async (path: string) => {
  try {
    return await fs.promises.stat(path)
  } catch (e) {
    return false
  }
}

export const fileExistsAsyncOptimized = async (path: string) => {
  try {
    await fs.promises.readdir(path)
  } catch (err) {
    if (err.code === 'ENOTDIR') return true
    // eslint-disable-next-line sonarjs/prefer-single-boolean-return
    if (err.code === 'ENOENT') return false
    // throw err
    return false
  }
  return true
}

export const copyFilesAsync = async (pathSrc: string, pathDest: string, fileCopied?: (name) => void) => {
  // query: can't use fs.copy! use fs.promises.writeFile and readFile
  const files = await fs.promises.readdir(pathSrc)

  if (!await existsViaStats(pathDest)) {
    await fs.promises.mkdir(pathDest, { recursive: true })
  }

  // Use Promise.all to parallelize file/directory copying
  await Promise.all(files.map(async (file) => {
    const curPathSrc = join(pathSrc, file)
    const curPathDest = join(pathDest, file)
    const stats = await fs.promises.stat(curPathSrc)
    if (stats.isDirectory()) {
      // Recurse
      await fs.promises.mkdir(curPathDest)
      await copyFilesAsync(curPathSrc, curPathDest, fileCopied)
    } else {
      // Copy file
      try {
        await fs.promises.writeFile(curPathDest, await fs.promises.readFile(curPathSrc))
        console.debug('copied file', curPathSrc, curPathDest)
      } catch (err) {
        console.error('Error copying file', curPathSrc, curPathDest, err)
        throw err
      }
      fileCopied?.(curPathDest)
    }
  }))
}

export const openWorldFromHttpDir = async (fileDescriptorUrl: string/*  | undefined */, baseUrl = fileDescriptorUrl.split('/').slice(0, -1).join('/')) => {
  // todo try go guess mode
  let index
  const file = await fetch(fileDescriptorUrl).then(async a => a.json())
  if (file.baseUrl) {
    baseUrl = new URL(file.baseUrl, baseUrl).toString()
    index = file.index
  } else {
    index = file
  }
  if (!index) throw new Error(`The provided mapDir file is not valid descriptor file! ${fileDescriptorUrl}`)
  await new Promise<void>(async resolve => {
    browserfs.configure({
      fs: 'MountableFileSystem',
      options: {
        ...defaultMountablePoints,
        '/world': {
          fs: 'HTTPRequest',
          options: {
            index,
            baseUrl
          }
        }
      },
    }, (e) => {
      if (e) throw e
      resolve()
    })
  })

  fsState.saveLoaded = false
  fsState.isReadonly = true
  fsState.syncFs = false
  fsState.inMemorySave = false
  fsState.remoteBackend = true

  await loadSave()
}

// todo rename method
const openWorldZipInner = async (file: File | ArrayBuffer, name = file['name']) => {
  await new Promise<void>(async resolve => {
    browserfs.configure({
      // todo
      fs: 'MountableFileSystem',
      options: {
        ...defaultMountablePoints,
        '/world': {
          fs: 'ZipFS',
          options: {
            zipData: Buffer.from(file instanceof File ? (await file.arrayBuffer()) : file),
            name
          }
        }
      },
    }, (e) => {
      if (e) throw e
      resolve()
    })
  })

  fsState.saveLoaded = false
  fsState.isReadonly = true
  fsState.syncFs = true
  fsState.inMemorySave = false
  fsState.remoteBackend = false

  if (fs.existsSync('/world/level.dat')) {
    await loadSave()
  } else {
    const dirs = fs.readdirSync('/world')
    const availableWorlds: string[] = []
    for (const dir of dirs) {
      if (fs.existsSync(`/world/${dir}/level.dat`)) {
        availableWorlds.push(dir)
      }
    }

    if (availableWorlds.length === 0) {
      if (await tryToDetectResourcePack()) return
      alert('No worlds found in the zip')
      return
    }

    if (availableWorlds.length === 1) {
      await loadSave(`/world/${availableWorlds[0]}`)
      return
    }

    alert(`Many (${availableWorlds.length}) worlds found in the zip!`)
    // todo prompt picker
    // const selectWorld
  }
}

export const openWorldZip = async (...args: Parameters<typeof openWorldZipInner>) => {
  try {
    return await openWorldZipInner(...args)
  } finally {
    possiblyCleanHandle()
  }
}

export const resetLocalStorageWorld = () => {
  for (const key of Object.keys(localStorage)) {
    if (/^[\da-fA-F]{8}(?:\b-[\da-fA-F]{4}){3}\b-[\da-fA-F]{12}$/g.test(key) || key === '/') {
      localStorage.removeItem(key)
    }
  }
}

export const resetLocalStorageWithoutWorld = () => {
  for (const key of Object.keys(localStorage)) {
    if (!/^[\da-fA-F]{8}(?:\b-[\da-fA-F]{4}){3}\b-[\da-fA-F]{12}$/g.test(key) && key !== '/') {
      localStorage.removeItem(key)
    }
  }
  resetOptions()
}

window.resetLocalStorageWorld = resetLocalStorageWorld
export const openFilePicker = (specificCase?: 'resourcepack') => {
  // create and show input picker
  let picker: HTMLInputElement = document.body.querySelector('input#file-zip-picker')!
  if (!picker) {
    picker = document.createElement('input')
    picker.type = 'file'
    picker.accept = '.zip'

    picker.addEventListener('change', () => {
      const file = picker.files?.[0]
      picker.value = ''
      if (!file) return
      if (!file.name.endsWith('.zip')) {
        const doContinue = confirm(`Are you sure ${file.name.slice(-20)} is .zip file? Only .zip files are supported. Continue?`)
        if (!doContinue) return
      }
      if (specificCase === 'resourcepack') {
        void installTexturePack(file).catch((err) => {
          setLoadingScreenStatus(err.message, true)
        })
      } else {
        void openWorldZip(file)
      }
    })
    picker.hidden = true
    document.body.appendChild(picker)
  }

  picker.click()
}

export const resetStateAfterDisconnect = () => {
  miscUiState.gameLoaded = false
  miscUiState.loadedDataVersion = null
  miscUiState.singleplayer = false
  miscUiState.flyingSquid = false
  miscUiState.wanOpened = false
  miscUiState.currentDisplayQr = null

  fsState.saveLoaded = false
}
