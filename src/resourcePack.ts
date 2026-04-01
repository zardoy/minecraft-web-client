/* eslint-disable no-await-in-loop */
import { join, dirname, basename } from 'path'
import fs from 'fs'
import JSZip from 'jszip'
import { proxy, subscribe } from 'valtio'
import { armorTextures } from 'renderer/viewer/three/entity/armorModels'
import { copyFilesAsyncWithProgress, mkdirRecursive, removeFileRecursiveAsync } from './browserfs'
import { showNotification } from './react/NotificationProvider'
import { options } from './optionsStorage'
import { showOptionsModal } from './react/SelectOption'
import { appReplacableResources, resourcesContentOriginal } from './generated/resources'
import { gameAdditionalState, miscUiState } from './globalState'
import { watchUnloadForCleanup } from './gameUnload'
import { createConsoleLogProgressReporter, createFullScreenProgressReporter, ProgressReporter } from './core/progressReporter'

export const resourcePackState = proxy({
  resourcePackInstalled: false,
  isServerDownloading: false,
  isServerInstalling: false
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

const resourcepackPackBasePath = '/data/resourcePacks/'
export const uninstallResourcePack = async (name = 'default') => {
  if (await existsAsync('/resourcepack/pack.mcmeta')) {
    await removeFileRecursiveAsync('/resourcepack', false)
    gameAdditionalState.usingServerResourcePack = false
  }
  const basePath = resourcepackPackBasePath + name
  if (!(await existsAsync(basePath))) return
  await removeFileRecursiveAsync(basePath)
  options.enabledResourcepack = null
  await updateTexturePackInstalledState()
}

export const getResourcePackNames = async () => {
  // TODO
  try {
    return { [await fs.promises.readFile(join(resourcepackPackBasePath, 'default', 'name.txt'), 'utf8')]: true }
  } catch (err) {
    return {}
  }
}

export const fromTexturePackPath = (path) => {
  // return join(texturePackBasePath, path)
}

export const updateTexturePackInstalledState = async () => {
  try {
    resourcePackState.resourcePackInstalled = await existsAsync(resourcepackPackBasePath + 'default')
  } catch {
  }
}

export const installTexturePackFromHandle = async () => {
  // await mkdirRecursive(texturePackBasePath)
  // await copyFilesAsyncWithProgress('/world', texturePackBasePath)
  // await completeTexturePackInstall()
}

export const installResourcepackPack = async (file: File | ArrayBuffer, progressReporter: ProgressReporter, displayName = file['name'], name = 'default', isServer = false) => {
  console.time('processResourcePack')
  const installPath = isServer ? '/resourcepack/' : resourcepackPackBasePath + name
  try {
    await progressReporter.executeWithMessage('Uninstalling resource pack', async () => {
      await uninstallResourcePack(name)
    })
  } catch (err) {
  }
  const status = 'Installing resource pack: copying all files'
  progressReporter.beginStage('copy-files-resourcepack', status)

  // extract the zip and write to fs every file in it
  const zip = new JSZip()
  const zipFile = await zip.loadAsync(file)
  if (!zipFile.file('pack.mcmeta')) throw new Error('Not a resource pack: missing /pack.mcmeta')
  await mkdirRecursive(installPath)

  const allFilesArr = Object.entries(zipFile.files)
    .filter(([path]) => !path.startsWith('.') && !path.startsWith('_') && !path.startsWith('/')) // ignore dot files and __MACOSX
  let done = 0
  const upStatus = () => {
    progressReporter.reportProgress('copy-files-resourcepack', done / allFilesArr.length)
  }
  const createdDirs = new Set<string>()
  const copyTasks = [] as Array<Promise<void>>
  console.time('resourcePackCopy')
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
    const promise = fs.promises.writeFile(writePath, Buffer.from(await file.async('arraybuffer')) as any)
    copyTasks.push(promise)
    await promise
    done++
    upStatus()
  }))
  console.timeEnd('resourcePackCopy')
  await completeResourcepackPackInstall(displayName, name, isServer, progressReporter)
  console.log('resource pack install done')
  console.timeEnd('processResourcePack')
}

// or enablement
export const completeResourcepackPackInstall = async (displayName: string | undefined, name: string, isServer: boolean, progressReporter: ProgressReporter) => {
  const basePath = isServer ? '/resourcepack/' : resourcepackPackBasePath + name
  if (displayName) {
    await fs.promises.writeFile(join(basePath, 'name.txt'), displayName, 'utf8')
  }

  await updateTextures(progressReporter)
  if (currentErrors.length > 0) {
    showNotification(`Resource pack installed & enabled with ${currentErrors.length} errors`)
    console.error('Resource pack installed & enabled with errors:', currentErrors)
  } else {
    showNotification('Resource pack installed & enabled')
  }
  await updateTexturePackInstalledState()
  if (isServer) {
    gameAdditionalState.usingServerResourcePack = true
  } else {
    options.enabledResourcepack = name
  }

  progressReporter.end()
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

export const getActiveResourcepackBasePath = async () => {
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

const isDirSafe = async (filePath: string) => {
  try {
    return await fs.promises.stat(filePath).then(stat => stat.isDirectory()).catch(() => false)
  } catch (err) {
    return false
  }
}

const getFilesMapFromDir = async (dir: string) => {
  const files = [] as string[]
  const scan = async (dir) => {
    const dirFiles = await fs.promises.readdir(dir)
    for (const file of dirFiles) {
      const filePath = join(dir, file)
      if (await isDirSafe(filePath)) {
        await scan(filePath)
      } else {
        files.push(filePath)
      }
    }
  }
  await scan(dir)
  return files
}

let currentErrors = [] as string[]

export const getResourcepackTiles = async (type: 'blocks' | 'items' | 'armor', existingTextures: string[], progressReporter: ProgressReporter) => {
  const basePath = await getActiveResourcepackBasePath()
  if (!basePath) return
  let firstTextureSize: number | undefined
  const namespaces = await fs.promises.readdir(join(basePath, 'assets'))

  const textures = {} as Record<string, HTMLImageElement>
  let path
  switch (type) {
    case 'blocks':
      path = 'block'
      break
    case 'items':
      path = 'item'
      break
    case 'armor':
      path = 'models/armor'
      break
    default:
      throw new Error('Invalid type')
  }
  for (const namespace of namespaces) {
    const texturesCommonBasePath = `${basePath}/assets/${namespace}/textures`
    const isMinecraftNamespace = namespace === 'minecraft'
    let texturesBasePath = `${texturesCommonBasePath}/${path}`
    const texturesBasePathAlt = `${texturesCommonBasePath}/${path}s`
    if (!(await existsAsync(texturesBasePath))) {
      if (await existsAsync(texturesBasePathAlt)) {
        texturesBasePath = texturesBasePathAlt
      }
    }
    const allInterestedPaths = new Set(
      existingTextures
        .filter(tex => (isMinecraftNamespace && !tex.includes(':')) || (tex.includes(':') && tex.split(':')[0] === namespace))
        .map(tex => {
          tex = tex.split(':')[1] ?? tex
          if (tex.includes('/')) {
            return join(`${texturesCommonBasePath}/${tex}`)
          }
          return join(texturesBasePath, tex)
        })
    )
    // add all files from texturesCommonBasePath
    // if (!isMinecraftNamespace) {
    //   const commonBasePathFiles = await getFilesMapFromDir(texturesCommonBasePath)
    //   for (const file of commonBasePathFiles) {
    //     allInterestedPaths.add(file)
    //   }
    // }
    const allInterestedPathsPerDir = new Map<string, string[]>()
    for (const path of allInterestedPaths) {
      const dir = dirname(path)
      if (!allInterestedPathsPerDir.has(dir)) {
        allInterestedPathsPerDir.set(dir, [])
      }
      const file = basename(path)
      allInterestedPathsPerDir.get(dir)!.push(file)
    }

    const allInterestedImages = [] as string[]
    for (const [dir, paths] of allInterestedPathsPerDir) {
      if (!await existsAsync(dir)) {
        continue
      }
      const dirImages = (await fs.promises.readdir(dir)).filter(f => f.endsWith('.png')).map(f => f.replace('.png', ''))
      allInterestedImages.push(...dirImages.filter(image => paths.includes(image)).map(image => `${dir}/${image}`))
    }

    if (allInterestedImages.length === 0) {
      continue
    }

    const firstImageFile = allInterestedImages[0]!
    try {
      firstTextureSize ??= await getSizeFromImage(`${firstImageFile}.png`)
    } catch (err) { }
    // eslint-disable-next-line @typescript-eslint/no-loop-func
    const newTextures = Object.fromEntries(await Promise.all(allInterestedImages.map(async (image) => {
      try {
        const imagePath = `${image}.png`
        const contents = await fs.promises.readFile(imagePath, 'base64')
        const img = await getLoadedImage(`data:image/png;base64,${contents}`)
        const imageRelative = image.replace(`${texturesBasePath}/`, '').replace(`${texturesCommonBasePath}/`, '')
        const textureName = isMinecraftNamespace ? imageRelative : `${namespace}:${imageRelative}`

        return [textureName, img]
      } catch (err) {
        const imageRelative = image.replace(`${texturesBasePath}/`, '').replace(`${texturesCommonBasePath}/`, '')
        const textureName = isMinecraftNamespace ? imageRelative : `${namespace}:${imageRelative}`
        currentErrors.push(`[${imageRelative}] ${err.message}`)
        return [textureName, undefined]
      }
    })))
    Object.assign(textures, Object.fromEntries(Object.entries(newTextures).filter(([, img]) => img !== undefined)))
  }
  return {
    firstTextureSize,
    textures,
  }
}

const prepareBlockstatesAndModels = async (progressReporter: ProgressReporter) => {
  const resources = appViewer.resourcesManager.currentResources!
  resources.customBlockStates = {}
  resources.customModels = {}
  resources.customItemModelNames = {}
  const usedBlockTextures = new Set<string>()
  const usedItemTextures = new Set<string>()
  const basePath = await getActiveResourcepackBasePath()
  if (!basePath) return
  progressReporter.beginStage('read-resource-pack-blockstates-and-models', 'Reading resource pack blockstates and models')

  const readModelData = async (path: string, type: 'models' | 'blockstates', namespaceDir: string) => {
    if (!(await existsAsync(path))) return
    const files = await fs.promises.readdir(path)
    const jsons = {} as Record<string, any>
    await Promise.all(files.map(async (file) => {
      const filePath = `${path}/${file}`
      if (file.endsWith('.json')) {
        const contents = await fs.promises.readFile(filePath, 'utf8')
        let name = file.replace('.json', '')
        const isBlock = path.endsWith('block')
        if (type === 'models') {
          name = `${isBlock ? 'block' : 'item'}/${name}`
        }
        const parsed = JSON.parse(contents)
        if (namespaceDir === 'minecraft') {
          jsons[name] = parsed
        }
        jsons[`${namespaceDir}:${name}`] = parsed
        if (type === 'models') {
          for (let texturePath of Object.values(parsed.textures ?? {})) {
            if (typeof texturePath !== 'string') continue
            if (texturePath.startsWith('#')) continue
            if (!texturePath.includes(':')) texturePath = `minecraft:${texturePath}`
            if (isBlock) {
              usedBlockTextures.add(texturePath as string)
            } else {
              usedItemTextures.add(texturePath as string)
            }
          }
        }
      }
    }))
    return jsons
  }

  const readCustomModelData = async (path: string, namespaceDir: string) => {
    if (!(await existsAsync(path))) return
    const files = await fs.promises.readdir(path)
    const customModelData = {} as Record<string, string[]>
    await Promise.all(files.map(async (file) => {
      const filePath = `${path}/${file}`
      if (file.endsWith('.json')) {
        const contents = await fs.promises.readFile(filePath, 'utf8')
        const name = file.replace('.json', '')
        const parsed = JSON.parse(contents)
        const entries: string[] = []
        if (path.endsWith('/items')) { // 1.21.4+
          // TODO: Support other properties too
          if (parsed.model?.type === 'range_dispatch' && parsed.model?.property === 'custom_model_data') {
            for (const entry of parsed.model?.entries ?? []) {
              const threshold = entry.threshold ?? 0
              let modelPath = entry.model?.model
              if (typeof modelPath !== 'string') continue
              if (!modelPath.includes(':')) modelPath = `minecraft:${modelPath}`
              entries[threshold] = modelPath
            }
          }
        } else if (path.endsWith('/models/item')) { // pre 1.21.4
          for (const entry of parsed.overrides ?? []) {
            if (entry.predicate?.custom_model_data && entry.model) {
              let modelPath = entry.model
              if (typeof modelPath !== 'string') continue
              if (!modelPath.includes(':')) modelPath = `minecraft:${modelPath}`
              entries[entry.predicate.custom_model_data] = modelPath
            }
          }
        }
        if (entries.length > 0) {
          customModelData[`${namespaceDir}:${name}`] = entries
        }
      }
    }))
    return customModelData
  }

  const readData = async (namespaceDir: string) => {
    const blockstatesPath = `${basePath}/assets/${namespaceDir}/blockstates`
    const blockModelsPath = `${basePath}/assets/${namespaceDir}/models/block`
    const itemsPath = `${basePath}/assets/${namespaceDir}/items`
    const itemModelsPath = `${basePath}/assets/${namespaceDir}/models/item`

    Object.assign(resources.customBlockStates!, await readModelData(blockstatesPath, 'blockstates', namespaceDir))
    Object.assign(resources.customModels!, await readModelData(blockModelsPath, 'models', namespaceDir))
    Object.assign(resources.customModels!, await readModelData(itemModelsPath, 'models', namespaceDir))

    for (const [key, value] of Object.entries(await readCustomModelData(itemsPath, namespaceDir) ?? {})) {
      resources.customItemModelNames[key] = value
    }
    for (const [key, value] of Object.entries(await readCustomModelData(itemModelsPath, namespaceDir) ?? {})) {
      resources.customItemModelNames[key] = value
    }
  }

  try {
    const assetsDirs = await fs.promises.readdir(join(basePath, 'assets'))
    for (const assetsDir of assetsDirs) {
      await readData(assetsDir)
    }
  } catch (err) {
    console.error('Failed to read some of resource pack blockstates and models', err)
    currentErrors.push('Failed to read blockstates/models')
    resources.customBlockStates = undefined
    resources.customModels = undefined
    resources.customItemModelNames = {}
  }
  return {
    usedBlockTextures,
    usedItemTextures
  }
}

const downloadAndUseResourcePack = async (url: string, progressReporter: ProgressReporter): Promise<void> => {
  progressReporter.beginStage('install-resource-pack', 'Installing server resource pack')
  try {
    resourcePackState.isServerInstalling = true
    resourcePackState.isServerDownloading = true
    progressReporter.beginStage('download-resource-pack', 'Downloading server resource pack')
    console.log('Downloading server resource pack', url)
    console.time('downloadServerResourcePack')
    const response = await fetch(url).catch((err) => {
      console.error(err)
      if (err.message === 'Failed to fetch') {
        err.message = `Check internet connection and ensure server on ${url} support CORS which is not required for the vanilla client, but is required for the web client.`
      }
      progressReporter.error('Failed to download resource pack: ' + err.message)
    })
    console.timeEnd('downloadServerResourcePack')
    if (!response) return

    const contentLength = response.headers.get('Content-Length')
    const total = contentLength ? parseInt(contentLength, 10) : 0
    let loaded = 0

    const reader = response.body!.getReader()
    const chunks: Uint8Array[] = []

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      chunks.push(value)
      loaded += value.length

      if (total) {
        const progress = Math.round((loaded / total) * 100)
        progressReporter.reportProgress('download-resource-pack', progress / 100)
      }
    }

    resourcePackState.isServerDownloading = false
    const resourcePackData = await new Blob(chunks).arrayBuffer()
    progressReporter.endStage('install-resource-pack')
    await installResourcepackPack(resourcePackData, progressReporter, undefined, undefined, true).catch((err) => {
      console.error(err)
      showNotification('Failed to install resource pack: ' + err.message)
    })
  } catch (err) {
    console.error('Could not install resource pack', err)
    progressReporter.error('Could not install resource pack: ' + err.message)
  } finally {
    progressReporter.endStage('download-resource-pack')
    resourcePackState.isServerInstalling = false
    resourcePackState.isServerDownloading = false
  }
}

export const onAppLoad = () => {
  customEvents.on('mineflayerBotCreated', () => {
    // todo also handle resourcePack
    const handleResourcePackRequest = async (packet) => {
      const start = Date.now()
      console.log('Received resource pack request', packet)
      const promptMessagePacket = ('promptMessage' in packet && packet.promptMessage) ? packet.promptMessage : undefined
      const promptMessageText = promptMessagePacket ? '' : 'Do you want to use server resource pack?'
      // TODO!
      const hash = 'hash' in packet ? packet.hash : '-'
      const forced = 'forced' in packet ? packet.forced : false
      const choice = options.serverResourcePacks === 'never'
        ? false
        : options.serverResourcePacks === 'always'
          ? true
          : await showOptionsModal(promptMessageText, ['Download & Install (recommended)', 'Pretend Installed (not recommended)'], {
            cancel: !forced,
            minecraftJsonMessage: promptMessagePacket,
          })
      if (Date.now() - start < 700) {
        void new Promise(resolve => {
          // wait for state protocol switch
          setTimeout(resolve, 700)
        }).then(() => {
          if (choice === false || choice === 'Pretend Installed (not recommended)' || choice === 'Download & Install (recommended)' || choice) {
            console.log('accepting resource pack')
            bot.acceptResourcePack()
          } else {
            bot.denyResourcePack()
          }
        })
      }
      if (choice === true || choice === 'Download & Install (recommended)') {
        await downloadAndUseResourcePack(packet.url, createFullScreenProgressReporter()).catch((err) => {
          console.error(err)
          showNotification('Failed to download resource pack: ' + err.message)
        })
      }
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
  const basePath = await getActiveResourcepackBasePath()
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
      await setCustomCss(resPath, cssVar, cssVarRepeat ?? 1)
    }
    await setCustomPicture(key, resPath)
  }
}

const repeatArr = (arr, i) => Array.from({ length: i }, () => arr)

const updateTextures = async (progressReporter = createConsoleLogProgressReporter(), skipResourcesLoad = false) => {
  if (!appViewer.resourcesManager.currentResources) {
    appViewer.resourcesManager.resetResources()
  }
  const resources = appViewer.resourcesManager.currentResources!
  currentErrors = []
  const origBlocksFiles = Object.keys(appViewer.resourcesManager.sourceBlocksAtlases.latest.textures)
  const origItemsFiles = Object.keys(appViewer.resourcesManager.sourceItemsAtlases.latest.textures)
  const origArmorFiles = Object.keys(armorTextures)
  const { usedBlockTextures, usedItemTextures } = await prepareBlockstatesAndModels(progressReporter) ?? {}
  progressReporter.beginStage(`generate-atlas-texture-blocks`, `Generating atlas textures`)
  const [
    blocksData,
    itemsData,
    armorData
  ] = await Promise.all([
    getResourcepackTiles('blocks', [...origBlocksFiles, ...usedBlockTextures ?? []], progressReporter),
    getResourcepackTiles('items', [...origItemsFiles, ...usedItemTextures ?? []], progressReporter),
    getResourcepackTiles('armor', origArmorFiles, progressReporter),
    updateAllReplacableTextures()
  ])
  resources.customTextures = {}

  if (blocksData) {
    resources.customTextures.blocks = {
      tileSize: blocksData.firstTextureSize,
      textures: blocksData.textures
    }
  }
  if (itemsData) {
    resources.customTextures.items = {
      tileSize: itemsData.firstTextureSize,
      textures: itemsData.textures
    }
  }
  if (armorData) {
    resources.customTextures.armor = {
      tileSize: armorData.firstTextureSize,
      textures: armorData.textures
    }
  }

  if (!skipResourcesLoad) {
    await appViewer.resourcesManager.updateAssetsData({ })
  }
}

export const resourcepackReload = async (skipResourcesLoad = false) => {
  await updateTextures(undefined, skipResourcesLoad)
}

export const copyServerResourcePackToRegular = async (name = 'default') => {
  // Check if server resource pack exists
  if (!(await existsAsync('/resourcepack/pack.mcmeta'))) {
    throw new Error('No server resource pack is currently installed')
  }

  // Get display name from server resource pack if available
  let displayName
  try {
    displayName = await fs.promises.readFile('/resourcepack/name.txt', 'utf8')
  } catch {
    displayName = 'Server Resource Pack'
  }

  // Copy all files from server resource pack to regular location
  const destPath = resourcepackPackBasePath + name
  await mkdirRecursive(destPath)

  const reporter = createFullScreenProgressReporter()
  reporter.setMessage('Copying server resource pack to user location')
  await copyFilesAsyncWithProgress('/resourcepack', destPath, true, ' (server -> user)')

  // Complete the installation
  await completeResourcepackPackInstall(displayName, name, false, reporter)
  showNotification('Server resource pack copied to user location')

  reporter.end()
}
