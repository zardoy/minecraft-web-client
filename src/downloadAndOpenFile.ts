import prettyBytes from 'pretty-bytes'
import { openWorldFromHttpDir, openWorldZip } from './browserfs'
import { getResourcePackNames, installResourcepackPack, resourcePackState, updateTexturePackInstalledState } from './resourcePack'
import { setLoadingScreenStatus } from './appStatus'
import { appQueryParams, appQueryParamsArray } from './appParams'
import { VALID_REPLAY_EXTENSIONS, openFile } from './packetsReplay/replayPackets'
import { createFullScreenProgressReporter } from './core/progressReporter'
import { ConnectOptions } from './connect'

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

export const downloadAndOpenMapFromUrl = async (mapUrl: string | undefined, texturepackUrl: string | undefined, mapUrlDir: string[] | undefined, replayFileUrl: string | undefined, connectOptions?: Partial<ConnectOptions>) => {
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

  if (texturepackUrl) {
    await updateTexturePackInstalledState()
    if (resourcePackState.resourcePackInstalled) {
      if (!confirm(`You are going to install a new resource pack, which will REPLACE the current one: ${await getResourcePackNames()[0]} Continue?`)) return
    }
  }
  const name = mapUrl.slice(mapUrl.lastIndexOf('/') + 1).slice(-25)
  const downloadThing = texturepackUrl ? 'texturepack' : 'world'
  setLoadingScreenStatus(`Downloading ${downloadThing} ${name}...`)

  const response = await fetch(mapUrl)
  const contentType = response.headers.get('Content-Type')
  if (!contentType || !contentType.startsWith('application/zip')) {
    alert('Invalid map file')
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
    await installResourcepackPack(buffer, createFullScreenProgressReporter(), name)
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
