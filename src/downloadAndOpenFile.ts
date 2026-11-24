import prettyBytes from 'pretty-bytes'
import { openWorldFromHttpDir, openWorldZip } from './browserfs'
import { getResourcePackNames, installResourcepackPack, resourcePackState, updateTexturePackInstalledState } from './resourcePack'
import { setLoadingScreenStatus } from './appStatus'
import { appQueryParams, appQueryParamsArray } from './appParams'
import { VALID_REPLAY_EXTENSIONS, openFile } from './packetsReplay/replayPackets'
import { createFullScreenProgressReporter } from './core/progressReporter'
import { ConnectOptions } from './connect'
import { showNotification } from './react/NotificationProvider'
import { showOptionsModal } from './react/SelectOption'

export const getFixedFilesize = (bytes: number) => {
  return prettyBytes(bytes, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export const isInterestedInDownload = () => {
  const { map, texturepack, replayFileUrl } = appQueryParams
  const { mapDir } = appQueryParamsArray
  return !!map || !!texturepack || !!replayFileUrl || !!mapDir
}

const inner = async () => {
  const { map, texturepack, replayFileUrl } = appQueryParams
  const { mapDir } = appQueryParamsArray
  return downloadAndOpenMapFromUrl(map, texturepack, mapDir, replayFileUrl)
}

/** @param temporaryPack mount the pack (ZenFS, like a server resource pack) instead of copying it into the browser storage: it lasts for this session and the link applies it again on every load */
export const downloadAndOpenMapFromUrl = async (mapUrl: string | undefined, texturepackUrl: string | undefined, mapUrlDir: string[] | undefined, replayFileUrl: string | undefined, connectOptions?: Partial<ConnectOptions>, temporaryPack = false) => {
  if (replayFileUrl) {
    setLoadingScreenStatus('Downloading replay file')
    const response = await fetch(replayFileUrl)
    const contentLength = response.headers?.get('Content-Length')
    const size = contentLength ? +contentLength : undefined
    const filename = replayFileUrl.split('/').pop()

    let downloadedBytes = 0
    const buffer = await new Response(new ReadableStream({
      async start (controller) {
        if (!response.body) throw new Error('Server returned no response!')
        const reader = response.body.getReader()

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read()

          if (done) {
            controller.close()
            break
          }

          downloadedBytes += value.byteLength

          // Calculate download progress as a percentage
          const progress = size ? (downloadedBytes / size) * 100 : undefined
          setLoadingScreenStatus(`Download replay file progress: ${progress === undefined ? '?' : Math.floor(progress)}% (${getFixedFilesize(downloadedBytes)} / ${size && getFixedFilesize(size)})`, false, true)

          // Pass the received data to the controller
          controller.enqueue(value)
        }
      },
    })).arrayBuffer()

    // Convert buffer to text, handling any compression automatically
    const decoder = new TextDecoder()
    const contents = decoder.decode(buffer)

    openFile({
      contents,
      filename,
      filesize: size
    })
    return true
  }

  if (texturepackUrl && (mapUrl || mapUrlDir?.length)) {
    // a link with a map AND a resource pack (?texturepack=...&mapDir=...): the map branches below never look at the pack, so install the pack first (the texturepack-only path of
    // this function), then open the map. The pack is only mounted (nothing is copied into IndexedDB: the copy sometimes hangs, and the link brings the pack back on every load)
    await downloadAndOpenMapFromUrl(undefined, texturepackUrl, undefined, undefined, undefined, true)
    texturepackUrl = undefined
  }

  const mapUrlDirGuess = appQueryParams.mapDirGuess
  const mapUrlDirBaseUrl = appQueryParams.mapDirBaseUrl
  if (mapUrlDir?.length) {
    await openWorldFromHttpDir(mapUrlDir, mapUrlDirBaseUrl ?? undefined)
    return true
  }

  if (mapUrlDirGuess) {
    // await openWorldFromHttpDir(undefined, mapUrlDirGuess)
    return true
  }

  // fixme
  if (texturepackUrl) mapUrl = texturepackUrl
  if (!mapUrl) return false

  if (texturepackUrl && !temporaryPack) {
    await updateTexturePackInstalledState()
    if (resourcePackState.resourcePackInstalled) {
      const choice = await showOptionsModal(`This resource pack will REPLACE the current one: ${await getResourcePackNames()[0]}`, ['Replace'])
      if (!choice) return
    }
  }
  const name = mapUrl.slice(mapUrl.lastIndexOf('/') + 1).slice(-25)
  const downloadThing = texturepackUrl ? 'texturepack' : 'world'
  setLoadingScreenStatus(`Downloading ${downloadThing} ${name}...`)

  const response = await fetch(mapUrl)
  const contentType = response.headers.get('Content-Type')
  if (!contentType || !contentType.startsWith('application/zip')) {
    showNotification('This may not be a map file', `The server sent ${contentType || 'no content type'} instead of a zip.`, true)
  }
  const contentLengthStr = response.headers?.get('Content-Length')
  const contentLength = contentLengthStr && +contentLengthStr
  setLoadingScreenStatus(`Downloading ${downloadThing} ${name}: have to download ${contentLength && getFixedFilesize(contentLength)}...`)

  let downloadedBytes = 0
  const buffer = await new Response(new ReadableStream({
    async start (controller) {
      if (!response.body) throw new Error('Server returned no response!')
      const reader = response.body.getReader()

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          controller.close()
          break
        }

        downloadedBytes += value.byteLength

        // Calculate download progress as a percentage
        const progress = contentLength ? (downloadedBytes / contentLength) * 100 : undefined
        setLoadingScreenStatus(`Download ${downloadThing} progress: ${progress === undefined ? '?' : Math.floor(progress)}% (${getFixedFilesize(downloadedBytes)} / ${contentLength && getFixedFilesize(contentLength)})`, false, true)

        // Pass the received data to the controller
        controller.enqueue(value)
      }
    },
  })).arrayBuffer()
  if (texturepackUrl) {
    const name = mapUrl.slice(mapUrl.lastIndexOf('/') + 1).slice(-30)
    await installResourcepackPack(buffer, createFullScreenProgressReporter(), name, undefined, temporaryPack)
  } else {
    await openWorldZip(buffer, undefined, connectOptions)
  }
  return true
}

export default async () => {
  try {
    return await inner()
  } catch (err) {
    setLoadingScreenStatus(`Failed to download/open. Either refresh page or remove map param from URL. Reason: ${err.message}`)
    return true
  }
}
