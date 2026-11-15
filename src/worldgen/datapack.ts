// Datapacks of the noise world generator (minecraft-worldgen):
//  - the bundled vanilla `data/` zip (built by `pnpm build-worldgen-datapack`; Mojang's data only),
//  - `gendata-ext.zip` next to the app (regular builds only, downloaded at build time, see rsbuild.config.ts; never part of single file builds),
//  - an optional pack the player loads themselves (a worldgen datapack .jar / .zip). It is stored in IndexedDB on this device and layered on top of vanilla;
//    it is never part of the app bundle (third-party datapacks usually do not allow redistribution).
// The noise generator adapter (flying-squid `worldGenerations/noise.ts`) reads `globalThis.__MC_WORLDGEN_DATAPACK_URL`: a function returning the pack URLs (lowest priority first).
// The vanilla zip is emitted as a file (regular build) or inlined as a data: url (single file build), see the .zip rule in rsbuildSharedConfig.ts.
import { proxy } from 'valtio'
import { filterDatapack } from 'minecraft-worldgen/dist/data/pack'
// `generated/mc-worldgen-data.zip`, or the structure-less `mc-worldgen-data-slim.zip` in the slim build (see the alias in rsbuildSharedConfig.ts)
import bundledUrl from 'worldgen-bundled-pack.zip'

export const worldgenPackState = proxy({
  /** `gendata-ext.zip` was found next to the app and is layered on top of vanilla for every new world */
  builtinExt: false,
  status: 'loading' as 'loading' | 'none' | 'loaded',
  name: '',
  files: 0,
  bytes: 0,
  error: ''
})

const DB = 'mc-worldgen'
const STORE = 'datapacks'
const KEY = 'extra'

const idb = async <T>(run: (store: IDBObjectStore) => IDBRequest<T>, mode: IDBTransactionMode = 'readonly') => new Promise<T>((resolve, reject) => {
  const open = indexedDB.open(DB, 1)
  open.onupgradeneeded = () => open.result.createObjectStore(STORE)
  open.onerror = () => reject(open.error)
  open.onsuccess = () => {
    const req = run(open.result.transaction(STORE, mode).objectStore(STORE))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  }
})

interface StoredPack { name: string, files: number, data: Blob }
let extraUrl: string | undefined

const setExtra = (pack: StoredPack | undefined) => {
  if (extraUrl) URL.revokeObjectURL(extraUrl)
  extraUrl = pack ? URL.createObjectURL(pack.data) : undefined
  worldgenPackState.status = pack ? 'loaded' : 'none'
  worldgenPackState.name = pack?.name ?? ''
  worldgenPackState.files = pack?.files ?? 0
  worldgenPackState.bytes = pack?.data.size ?? 0
}

let builtinExtUrl: string | undefined
const detectBuiltinExt = async () => {
  if (process.env.SINGLE_FILE_BUILD === 'true') return
  try {
    const url = new URL('gendata-ext.zip', globalThis.location?.href).href
    const res = await fetch(url, { method: 'HEAD' })
    // a dev server / SPA fallback answers 200 with html for unknown paths
    if (res.ok && !(res.headers.get('content-type') ?? '').includes('text/html')) {
      builtinExtUrl = url
      worldgenPackState.builtinExt = true
    }
  } catch {}
}

const ready = (async () => {
  await detectBuiltinExt()
  try {
    setExtra(await idb<StoredPack | undefined>(s => s.get(KEY)))
  } catch (err) {
    console.warn('worldgen datapack storage unavailable', err)
    setExtra(undefined)
  }
})()

/** URLs of the datapack zips, lowest priority first; awaits the stored pack so a world started right after page load still sees it */
;(globalThis as any).__MC_WORLDGEN_DATAPACK_URL = async () => {
  await ready
  return [bundledUrl, ...(builtinExtUrl ? [builtinExtUrl] : []), ...(extraUrl ? [extraUrl] : [])]
}

/** reads a datapack (.jar / .zip) chosen by the player, keeps only what the generator reads and stores it on this device */
export const loadExtraDatapack = async (file: File) => {
  worldgenPackState.error = ''
  try {
    const { data, files } = filterDatapack(new Uint8Array(await file.arrayBuffer()))
    const pack: StoredPack = { name: file.name, files, data: new Blob([data], { type: 'application/zip' }) }
    await idb(s => s.put(pack, KEY), 'readwrite')
    setExtra(pack)
  } catch (err: any) {
    worldgenPackState.error = String(err?.message ?? err)
  }
}

export const removeExtraDatapack = async () => {
  await idb(s => s.delete(KEY), 'readwrite')
  setExtra(undefined)
  worldgenPackState.error = ''
}
