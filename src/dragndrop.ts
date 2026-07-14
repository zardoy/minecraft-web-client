import { promisify } from 'util'
import fs from 'fs'
import * as nbt from 'prismarine-nbt'
import RegionFile from 'prismarine-provider-anvil/src/region'
import { versions } from 'minecraft-data'
import { getThreeJsRendererMethods } from 'minecraft-renderer/src/three/threeJsMethods'
import { openWorldDirectory, openWorldZip } from './browserfs'
import { isGameActive } from './globalState'
import { showNotification } from './react/NotificationProvider'
import { openFile, VALID_REPLAY_EXTENSIONS } from './packetsReplay/replayPackets'

const parseNbt = promisify(nbt.parse)
const simplifyNbt = nbt.simplify
window.nbt = nbt

const VALID_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp']

const SKIN_TEXTURE_WIDTHS = new Set([64, 128, 256, 512])

/** Minecraft skin sheets: WxW or Wx(W/2) at standard power-of-two widths. */
const isLikelySkinImageSize = (width: number, height: number) => {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return false
  if (!SKIN_TEXTURE_WIDTHS.has(width)) return false
  return height === width || height === width / 2
}

const readImageDimensions = async (file: File) => {
  const bitmap = await createImageBitmap(file)
  const { width, height } = bitmap
  bitmap.close()
  return { width, height }
}

const fileToDataUrl = async (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(reader.result as string)
  reader.onerror = reject
  reader.readAsDataURL(file)
})

// todo display drop zone
for (const event of ['drag', 'dragstart', 'dragend', 'dragover', 'dragenter', 'dragleave', 'drop']) {
  window.addEventListener(event, (e: any) => {
    if (e.dataTransfer && !e.dataTransfer.types.includes('Files')) {
      // e.dataTransfer.effectAllowed = "none"
      return
    }
    e.preventDefault()
  })
}
window.addEventListener('drop', async e => {
  if (!e.dataTransfer?.files.length) return
  const { items } = e.dataTransfer
  const item = items[0]
  if (item.getAsFileSystemHandle) {
    const filehandle = await item.getAsFileSystemHandle() as FileSystemFileHandle | FileSystemDirectoryHandle
    if (filehandle.kind === 'file') {
      const file = await filehandle.getFile()

      await handleDroppedFile(file)
    } else {
      if (isGameActive(false)) {
        alert('Exit current world first, before loading a new one.')
        return
      }
      await openWorldDirectory(filehandle)
    }
  } else {
    await handleDroppedFile(item.getAsFile()!)
  }
})

async function handleDroppedFile (file: File) {
  if (VALID_IMAGE_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext))) {
    try {
      const { width, height } = await readImageDimensions(file)
      const base64Image = await fileToDataUrl(file)
      const methods = getThreeJsRendererMethods()

      if (isLikelySkinImageSize(width, height)) {
        if (!isGameActive(false) || !bot?.entity) {
          showNotification('Skin preview needs an active world', 'Join a game and drop the skin image again.')
          return
        }
        const applySkin = methods?.applyTemporaryPlayerSkinOverride
        if (!applySkin) {
          showNotification('Cannot apply skin — renderer does not support it')
          return
        }
        await applySkin(
          base64Image,
          bot.entity.id,
          bot.username,
          bot.player?.uuid ?? bot.entity.uuid
        )
        showNotification(
          'Skin temporarily applied',
          'Hand and third-person model updated until reconnect or a server skin change.'
        )
        return
      }

      if (!isGameActive(false)) return

      const setSkyboxImage = methods?.setSkyboxImage
      if (setSkyboxImage) {
        await setSkyboxImage(base64Image)
        showNotification('Skybox updated successfully')
      } else {
        showNotification('Cannot update skybox - renderer does not support it')
      }
      return
    } catch (err) {
      console.error('Failed to handle dropped image:', err)
      showNotification('Failed to use dropped image', String((err as Error).message ?? err), true)
      return
    }
  }

  if (file.name.endsWith('.zip')) {
    void openWorldZip(file)
    return
  }
  // if (file.name.endsWith('.mca')) // TODO let's do something interesting with it: viewer?
  if (file.name.endsWith('.rar')) {
    alert('Rar files are not supported yet!')
    return
  }
  if (VALID_REPLAY_EXTENSIONS.some(ext => file.name.endsWith(ext)) || file.name.startsWith('packets-replay')) {
    const contents = await file.text()
    openFile({
      contents,
      filename: file.name,
      filesize: file.size
    })
    return
  }
  if (file.name.endsWith('.mca')) {
    const tempPath = '/temp/temp.mca'
    try {
      await fs.promises.writeFile(tempPath, Buffer.from(await file.arrayBuffer()) as any)
      const region = new RegionFile(tempPath)
      await region.initialize()
      const chunks: Record<string, any> = {}
      console.log('Reading chunks...')
      console.log(chunks)
      let versionDetected = false
      for (const [i, _] of Array.from({ length: 32 }).entries()) {
        for (const [k, _] of Array.from({ length: 32 }).entries()) {
          // todo, may use faster reading, but features is not commonly used
          // eslint-disable-next-line no-await-in-loop
          const nbt = await region.read(i, k)
          chunks[`${i},${k}`] = nbt
          if (nbt && !versionDetected) {
            const simplified = simplifyNbt(nbt)
            const version = versions.pc.find(x => x['dataVersion'] === simplified.DataVersion)?.minecraftVersion
            console.log('Detected version', version ?? 'unknown')
            versionDetected = true
          }
        }
      }
      Object.defineProperty(chunks, 'simplified', {
        get () {
          const mapped = {}
          for (const [i, _] of Array.from({ length: 32 }).entries()) {
            for (const [k, _] of Array.from({ length: 32 }).entries()) {
              const key = `${i},${k}`
              const chunk = chunks[key]
              if (!chunk) continue
              mapped[key] = simplifyNbt(chunk)
            }
          }
          return mapped
        },
      })
      console.log('Done!', chunks)
    } finally {
      await fs.promises.unlink(tempPath)
    }
    return
  }

  const buffer = await file.arrayBuffer()
  const parsed = await parseNbt(Buffer.from(buffer)).catch((err) => {
    alert('Couldn\'t parse nbt, ensure you are opening .dat or file (or .zip/folder with a world)')
    throw err
  })
  showNotification(`${file.name} data available in browser console`)
  console.log('raw', parsed)
  console.log('simplified', nbt.simplify(parsed))
}
