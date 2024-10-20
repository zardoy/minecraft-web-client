import { join, dirname, basename } from 'path'
import fs from 'fs'
import JSZip from 'jszip'
import { proxy, subscribe } from 'valtio'
import { mkdirRecursive, removeFileRecursiveAsync } from './browserfs'
import { setLoadingScreenStatus } from './utils'
import { showNotification } from './react/NotificationProvider'
import { options } from './optionsStorage'
import { showOptionsModal } from './react/SelectOption'
import { appStatusState } from './react/AppStatusProvider'
import { appReplacableResources, resourcesContentOriginal } from './generated/resources'
import { loadedGameState } from './globalState'

export const resourcePackState = proxy({
  resourcePackInstalled: false,
})

const getLoadedImage = async (url: string) => {
  const img = new Image()
  img.src = url
  await new Promise((resolve, reject) => {
    img.onload = resolve
    img.onerror = reject
  })
  return img
}

const texturePackBasePath = '/data/resourcePacks/'
export const uninstallTexturePack = async (name = 'default') => {
  if (await existsAsync('/resourcepack/pack.mcmeta')) {
    await removeFileRecursiveAsync('/resourcepack')
    loadedGameState.usingServerResourcePack = false
  }
  const basePath = texturePackBasePath + name
  if (!(await existsAsync(basePath))) return
  await removeFileRecursiveAsync(basePath)
  options.enabledResourcepack = null
  await updateTexturePackInstalledState()
}

export const getResourcePackNames = async () => {
  // TODO
  try {
    return { [await fs.promises.readFile(join(texturePackBasePath, 'default', 'name.txt'), 'utf8')]: true }
  } catch (err) {
    return {}
  }
}

export const fromTexturePackPath = (path) => {
  // return join(texturePackBasePath, path)
}

export const updateTexturePackInstalledState = async () => {
  try {
    resourcePackState.resourcePackInstalled = await existsAsync(texturePackBasePath + 'default')
  } catch {
  }
}

export const installTexturePackFromHandle = async () => {
  // await mkdirRecursive(texturePackBasePath)
  // await copyFilesAsyncWithProgress('/world', texturePackBasePath)
  // await completeTexturePackInstall()
}

export const installTexturePack = async (file: File | ArrayBuffer, displayName = file['name'], name = 'default', isServer = false) => {
  const installPath = isServer ? '/resourcepack/' : texturePackBasePath + name
  try {
    await uninstallTexturePack(name)
  } catch (err) {
  }
  const showLoader = !isServer
  const status = 'Installing resource pack: copying all files'

  if (showLoader) {
    setLoadingScreenStatus(status)
  }
  // extract the zip and write to fs every file in it
  const zip = new JSZip()
  const zipFile = await zip.loadAsync(file)
  if (!zipFile.file('pack.mcmeta')) throw new Error('Not a resource pack: missing /pack.mcmeta')
  await mkdirRecursive(installPath)

  const allFilesArr = Object.entries(zipFile.files)
    .filter(([path]) => !path.startsWith('.') && !path.startsWith('_') && !path.startsWith('/')) // ignore dot files and __MACOSX
  let done = 0
  const upStatus = () => {
    if (showLoader) {
      setLoadingScreenStatus(`${status} ${Math.round(done / allFilesArr.length * 100)}%`)
    }
  }
  const createdDirs = new Set<string>()
  const copyTasks = [] as Array<Promise<void>>
  await Promise.all(allFilesArr.map(async ([path, file]) => {
    const writePath = join(installPath, path)
    if (path.endsWith('/')) return
    const dir = dirname(writePath)
    if (!createdDirs.has(dir)) {
      await mkdirRecursive(dir)
      createdDirs.add(dir)
    }
    if (copyTasks.length > 100) {
      await Promise.all(copyTasks)
      copyTasks.length = 0
    }
    const promise = fs.promises.writeFile(writePath, Buffer.from(await file.async('arraybuffer')))
    copyTasks.push(promise)
    await promise
    done++
    upStatus()
  }))
  console.log('done')
  await completeTexturePackInstall(displayName, name, isServer)
}

// or enablement
export const completeTexturePackInstall = async (displayName: string | undefined, name: string, isServer: boolean) => {
  const basePath = isServer ? '/resourcepack/' : texturePackBasePath + name
  if (displayName) {
    await fs.promises.writeFile(join(basePath, 'name.txt'), displayName, 'utf8')
  }

  await updateTextures()
  setLoadingScreenStatus(undefined)
  showNotification('Texturepack installed & enabled')
  await updateTexturePackInstalledState()
  if (isServer) {
    loadedGameState.usingServerResourcePack = true
  } else {
    options.enabledResourcepack = name
  }
}

const existsAsync = async (path) => {
  try {
    await fs.promises.stat(path)
    return true
  } catch (err) {
    return false
  }
}

const arrEqual = (a: any[], b: any[]) => a.length === b.length && a.every((x) => b.includes(x))

const getSizeFromImage = async (filePath: string) => {
  const probeImg = new Image()
  const file = await fs.promises.readFile(filePath, 'base64')
  probeImg.src = `data:image/png;base64,${file}`
  await new Promise((resolve, reject) => {
    probeImg.addEventListener('load', resolve)
  })
  if (probeImg.width !== probeImg.height) throw new Error(`Probe texture ${filePath} is not square`)
  return probeImg.width
}

export const getActiveTexturepackBasePath = async () => {
  if (await existsAsync('/resourcepack/pack.mcmeta')) {
    return '/resourcepack'
  }
  const { enabledResourcepack } = options
  // const enabledResourcepack = 'default'
  if (!enabledResourcepack) {
    return null
  }
  if (await existsAsync(`/data/resourcePacks/${enabledResourcepack}/pack.mcmeta`)) {
    return `/data/resourcePacks/${enabledResourcepack}`
  }
  return null
}

export const getResourcepackTiles = async (type: 'blocks' | 'items', existingTextures: string[]) => {
  const basePath = await getActiveTexturepackBasePath()
  if (!basePath) return
  const texturesCommonBasePath = `${basePath}/assets/minecraft/textures`
  let texturesBasePath = `${texturesCommonBasePath}/${type === 'blocks' ? 'block' : 'item'}`
  const texturesBasePathAlt = `${texturesCommonBasePath}/${type === 'blocks' ? 'blocks' : 'items'}`
  if (!(await existsAsync(texturesBasePath))) {
    if (await existsAsync(texturesBasePathAlt)) {
      texturesBasePath = texturesBasePathAlt
    }
  }
  const allInterestedPaths = existingTextures.map(tex => {
    if (tex.includes('/')) {
      return join(`${texturesCommonBasePath}/${tex}`)
    }
    return join(texturesBasePath, tex)
  })
  const allInterestedPathsPerDir = new Map<string, string[]>()
  for (const path of allInterestedPaths) {
    const dir = dirname(path)
    if (!allInterestedPathsPerDir.has(dir)) {
      allInterestedPathsPerDir.set(dir, [])
    }
    const file = basename(path)
    allInterestedPathsPerDir.get(dir)!.push(file)
  }
  // filter out by readdir each dir
  const allInterestedImages = [] as string[]
  for (const [dir, paths] of allInterestedPathsPerDir) {
    if (!await existsAsync(dir)) {
      continue
    }
    const dirImages = (await fs.promises.readdir(dir)).filter(f => f.endsWith('.png')).map(f => f.replace('.png', ''))
    allInterestedImages.push(...dirImages.filter(image => paths.includes(image)).map(image => `${dir}/${image}`))
  }

  if (allInterestedImages.length === 0) {
    return
  }

  if (appStatusState.status) {
    setLoadingScreenStatus(`Generating atlas texture for ${type}`)
  }

  const firstImageFile = allInterestedImages[0]!

  let firstTextureSize: number | undefined
  try {
    // todo compare sizes from atlas
    firstTextureSize = await getSizeFromImage(`${firstImageFile}.png`)
  } catch (err) { }
  const textures = Object.fromEntries(await Promise.all(allInterestedImages.map(async (image) => {
    const imagePath = `${image}.png`
    const contents = await fs.promises.readFile(imagePath, 'base64')
    const img = await getLoadedImage(`data:image/png;base64,${contents}`)
    const imageRelative = image.replace(`${texturesBasePath}/`, '').replace(`${texturesCommonBasePath}/`, '')
    return [imageRelative, img]
  })))
  return {
    firstTextureSize,
    textures
  }
}

const prepareBlockstatesAndModels = async () => {
  viewer.world.customBlockStates = undefined
  viewer.world.customModels = undefined
  const basePath = await getActiveTexturepackBasePath()
  if (!basePath) return
  if (appStatusState.status) {
    setLoadingScreenStatus('Reading resource pack blockstates and models')
  }
  const readData = async (namespaceDir: string) => {
    const blockstatesPath = `${basePath}/assets/${namespaceDir}/blockstates`
    const modelsPath = `${basePath}/assets/${namespaceDir}/models/block` // todo also models/item
    const getAllJson = async (path: string, type: 'models' | 'blockstates') => {
      if (!(await existsAsync(path))) return
      const files = await fs.promises.readdir(path)
      const jsons = {} as Record<string, any>
      await Promise.all(files.map(async (file) => {
        const filePath = `${path}/${file}`
        if (file.endsWith('.json')) {
          const contents = await fs.promises.readFile(filePath, 'utf8')
          let name = file.replace('.json', '')
          if (type === 'models') {
            name = `block/${name}`
          }
          if (namespaceDir !== 'minecraft') {
            name = `${namespaceDir}:${name}`
          }
          jsons[name] = JSON.parse(contents)
        }
      }))
      return jsons
    }
    viewer.world.customBlockStates = await getAllJson(blockstatesPath, 'blockstates')
    viewer.world.customModels = await getAllJson(modelsPath, 'models')
  }
  try {
    const assetsDirs = await fs.promises.readdir(join(basePath, 'assets'))
    for (const assetsDir of assetsDirs) {
      await readData(assetsDir)
    }
  } catch (err) {
    console.error('Failed to read some of resource pack blockstates and models', err)
    viewer.world.customBlockStates = undefined
    viewer.world.customModels = undefined
  }
}

const downloadAndUseResourcePack = async (url: string): Promise<void> => {
  console.log('Downloading server resource pack', url)
  const response = await fetch(url)
  const resourcePackData = await response.arrayBuffer()
  showNotification('Installing resource pack...')
  installTexturePack(resourcePackData, undefined, undefined, true).catch((err) => {
    console.error(err)
    showNotification('Failed to install resource pack: ' + err.message)
  })
}

export const onAppLoad = () => {
  customEvents.on('mineflayerBotCreated', () => {
    // todo also handle resourcePack
    const handleResourcePackRequest = async (packet) => {
      if (options.serverResourcePacks === 'never') return
      const promptMessage = ('promptMessage' in packet && packet.promptMessage) ? JSON.stringify(packet.promptMessage) : 'Do you want to use server resource pack?'
      // TODO!
      const hash = 'hash' in packet ? packet.hash : '-'
      const forced = 'forced' in packet ? packet.forced : false
      const choice = options.serverResourcePacks === 'always'
        ? true
        : await showOptionsModal(promptMessage, ['Download & Install'], {
          cancel: !forced
        })
      if (!choice) return
      bot.acceptResourcePack()
      await downloadAndUseResourcePack(packet.url).catch((err) => {
        console.error(err)
        showNotification('Failed to download resource pack: ' + err.message)
      })
    }
    bot._client.on('resource_pack_send', handleResourcePackRequest)
    bot._client.on('add_resource_pack' as any, handleResourcePackRequest)
  })

  subscribe(resourcePackState, () => {
    if (!resourcePackState.resourcePackInstalled) return
    void updateAllReplacableTextures()
  })
}

const updateAllReplacableTextures = async () => {
  const basePath = await getActiveTexturepackBasePath()
  const setCustomCss = async (path: string | null, varName: string, repeat = 1) => {
    if (path && await existsAsync(path)) {
      const contents = await fs.promises.readFile(path, 'base64')
      const dataUrl = `data:image/png;base64,${contents}`
      document.body.style.setProperty(varName, repeatArr(`url(${dataUrl})`, repeat).join(', '))
    } else {
      document.body.style.setProperty(varName, '')
    }
  }
  const setCustomPicture = async (key: string, path: string) => {
    let contents = resourcesContentOriginal[key]
    if (await existsAsync(path)) {
      const file = await fs.promises.readFile(path, 'base64')
      const dataUrl = `data:image/png;base64,${file}`
      contents = dataUrl
    }
    appReplacableResources[key].content = contents
  }
  const vars = Object.entries(appReplacableResources).filter(([, x]) => x.cssVar)
  for (const [key, { cssVar, cssVarRepeat, resourcePackPath }] of vars) {
    const resPath = `${basePath}/assets/${resourcePackPath}`
    if (cssVar) {
      // eslint-disable-next-line no-await-in-loop
      await setCustomCss(resPath, cssVar, cssVarRepeat ?? 1)
    } else {
      // eslint-disable-next-line no-await-in-loop
      await setCustomPicture(key, resPath)
    }
  }
}

const repeatArr = (arr, i) => Array.from({ length: i }, () => arr)

const updateTextures = async () => {
  const blocksFiles = Object.keys(viewer.world.blocksAtlases.latest.textures)
  const itemsFiles = Object.keys(viewer.world.itemsAtlases.latest.textures)
  const blocksData = await getResourcepackTiles('blocks', blocksFiles)
  const itemsData = await getResourcepackTiles('items', itemsFiles)
  await updateAllReplacableTextures()
  await prepareBlockstatesAndModels()
  viewer.world.customTextures = {}
  if (blocksData) {
    viewer.world.customTextures.blocks = {
      tileSize: blocksData.firstTextureSize,
      textures: blocksData.textures
    }
  }
  if (itemsData) {
    viewer.world.customTextures.items = {
      tileSize: itemsData.firstTextureSize,
      textures: itemsData.textures
    }
  }
  if (viewer.world.active) {
    await viewer.world.updateTexturesData()
  }
}

export const resourcepackReload = async (version) => {
  await updateTextures()
}
