// Test hook for measuring memory headroom: makes a big phone behave like a small one. Inert unless the URL has one of the ballast parameters below
// (nothing is allocated, no request is made), so it is safe to ship, but players have no use for it.
//   ?ballastMB=N        allocate N MiB of real (incompressible, touched) memory before the app starts, then run the app normally
//   ?ballastCalibrate=1 instead allocate step by step up to ?ballastMB (default 6000) and stop (the tab dies at the device limit), logging every step
// Progress is posted to `/__log?m=...` (the dev proxy appends it to a file), so survival is read from the log instead of a WebDriver session:
//   ballast-ok / step N   what was allocated, hb t=.. loaded=.. chunks=..   a heartbeat every 3 s (the last one is the time of death)
const params = new URLSearchParams(location.search)
const ballastMB = Number(params.get('ballastMB') ?? 0)
const calibrate = params.get('ballastCalibrate') === '1'
const MIB = 1024 * 1024

const log = (message: string) => {
  try {
    void fetch(`/__log?${new URLSearchParams({ m: message, p: location.search.slice(0, 80) }).toString()}`, { keepalive: true, cache: 'no-store' }).catch(() => {})
  } catch {}
}

const held: Uint8Array[] = []
;(globalThis as any).__ballast = held

/** one random 64 KiB block copied over the whole chunk: every page is touched and none of them compresses (iOS counts compressed memory in the footprint) */
const randomBlock = new Uint8Array(65_536)
const allocate = (mb: number) => {
  for (let i = 0; i < mb; i += 16) {
    const chunk = new Uint8Array(Math.min(16, mb - i) * MIB)
    crypto.getRandomValues(randomBlock)
    for (let offset = 0; offset < chunk.length; offset += randomBlock.length) chunk.set(randomBlock.subarray(0, Math.min(randomBlock.length, chunk.length - offset)), offset)
    // vary the content per chunk so identical chunks cannot be deduplicated
    chunk[0] = i & 255
    held.push(chunk)
  }
}

if (ballastMB > 0 || calibrate || params.get('ballastLog') === '1') {
  log(`start ballastMB=${ballastMB} calibrate=${calibrate} ua=${navigator.userAgent.slice(30, 70)}`)
  const heartbeat = () => {
    const w = globalThis as any
    log(`hb t=${Math.round(performance.now() / 1000)} held=${held.length * 16}MiB loaded=${!!w.miscUiState?.gameLoaded} chunks=${Object.keys(w.appViewer?.rendererState?.world?.chunksLoaded ?? {}).length}`)
  }
  if (calibrate) {
    void (async () => {
      const step = 128
      for (let total = step; total <= (ballastMB || 6000); total += step) {
        log(`step ${total}`)
        // eslint-disable-next-line no-await-in-loop
        await new Promise(resolve => { setTimeout(resolve, 60) })
        allocate(step)
        log(`ok ${total}`)
      }
      log('calibrate-finished')
    })()
  } else if (ballastMB > 0) {
    allocate(ballastMB)
    log(`ballast-ok ${ballastMB}`)
  }
  setInterval(heartbeat, 3000)
}

export {}
