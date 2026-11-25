// Single file builds carry a small sound pack inline (scripts/embeddedSounds.mjs): a <script type="application/json" id="embedded-sounds">
// with a subset of the sounds map and the mp3 files as base64. It stands in for the remote sounds.js + sound files.

let embeddedFiles: Record<string, string> | undefined
const blobUrls = new Map<string, string>()

/** @returns true when the page has an embedded sound pack (the sounds map globals are then set from it) */
export const loadEmbeddedSounds = (): boolean => {
  if (embeddedFiles) return true
  const el = document.getElementById('embedded-sounds')
  if (!el?.textContent) return false
  try {
    const data = JSON.parse(el.textContent) as { map: Record<string, Record<string, string>>, files: Record<string, string> }
    window.allSoundsMap = data.map
    window.allSoundsVersionedMap = {}
    window.allSoundsMeta = { format: 'mp3', baseUrl: '' }
    embeddedFiles = data.files
  } catch (err) {
    console.warn('Failed to read the embedded sounds', err)
    return false
  }
  // the parsed copy is enough, don't keep the text in the DOM too
  el.remove()
  return true
}

/** blob: URL for an embedded sound file (e.g. `step/grass1`), undefined when the file is not embedded */
export const getEmbeddedSoundUrl = (file: string): string | undefined => {
  const cached = blobUrls.get(file)
  if (cached) return cached
  const b64 = embeddedFiles?.[file]
  if (!b64) return undefined
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.codePointAt(i)!
  const url = URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }))
  blobUrls.set(file, url)
  // the blob holds the bytes now
  delete embeddedFiles![file]
  return url
}
