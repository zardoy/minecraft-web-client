import { options } from './optionsStorage'
import { activeModalStack } from './globalState'
import { FrameStats, buildPerfReport, perfStatsOptOutReason, type OptOutReason, type Phase } from './perfStatsCore'

/**
 * Anonymous performance stats for servers that ask for it (the play.mcraft.fun proxy): frame rate while the world loads and while
 * playing, stutters, the time joining takes in stages, device facts and the performance-related settings, every 10 s.
 * What is NOT sent: the player name, chat, position, the server address, the world. The proxy sees the IP address (it always does, it is
 * the connection) and stores it for abuse and support, it is not shown in the statistics.
 *
 * Off with the "Send anonymous performance data" setting (Advanced), `?stats=0`, or a browser that sends Do Not Track / Global Privacy Control.
 * Nothing is sent unless the server answers the connect handshake with `perf` (see `onServerMetadata`).
 * The other side is src/telemetry in the proxy repo (mcraft-play/play-mcraft-proxy-server).
 */

export const PERF_REPORT_CHANNEL = 'minecraft-web-client:perf-report'
const INSTALL_ID_KEY = 'perfInstallId'
const MAX_REPORTS = 720 // two hours at one every 10 s

/** settings that change performance (the proxy keeps only the ones on its own list) */
const REPORTED_SETTINGS = ['renderDistance', 'newVersionsLighting', 'clientLighting', 'smoothLighting', 'animatedTextures', 'sunShadows', 'wavingFoliage', 'rendererMesher', 'visualEffectsProfile']

const optOutReason = (): OptOutReason | undefined => {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean }
  return perfStatsOptOutReason({
    option: options.sendPerfData,
    urlParam: new URLSearchParams(location.search).get('stats'),
    doNotTrack: nav.doNotTrack ?? (window as any).doNotTrack,
    globalPrivacyControl: nav.globalPrivacyControl
  })
}

export const isPerfStatsOn = (): boolean => optOutReason() === undefined

/** A random id of this browser profile, made on first use. Not linked to the player name; "Remove all data" deletes it. */
const getInstallId = (): string | undefined => {
  try {
    let id = localStorage.getItem(INSTALL_ID_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(INSTALL_ID_KEY, id)
    }
    return id
  } catch {
    return undefined
  }
}

/**
 * Goes into the connect metadata the client sends the server when it joins: does the player take part, and under which random id.
 * A player who does not take part sends only the reason (setting, Do Not Track, ...) and no id.
 */
export const getConnectStats = (): { optIn: boolean; installId?: string; reason?: OptOutReason } => {
  const reason = optOutReason()
  if (reason) return { optIn: false, reason }
  const installId = getInstallId()
  return installId ? { optIn: true, installId } : { optIn: false, reason: 'no-storage' }
}

// when joining started, to time the stages (set when the bot is created, so it covers the whole connection)
let connectStartedAt: number | undefined
let loginAt: number | undefined
let chunksMs: number | undefined
let stopCurrent: (() => void) | undefined

customEvents.on('mineflayerBotCreated', () => {
  stopCurrent?.()
  connectStartedAt = performance.now()
  loginAt = undefined
  chunksMs = undefined
  bot.once('login', () => {
    loginAt = performance.now()
  })
})

const readGpu = (): string | undefined => {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl')
    if (!gl) return undefined
    const ext = gl.getExtension('WEBGL_debug_renderer_info')
    const name = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : undefined
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return name
  } catch {
    return undefined
  }
}

/** Android Chrome freezes the user agent ("Android 10; K"), the real phone model is only in the client hints (needs a secure context) */
let hintModel: string | undefined
try {
  const uaData = (navigator as Navigator & { userAgentData?: { getHighEntropyValues?: (hints: string[]) => Promise<{ model?: string }> } }).userAgentData
  void uaData?.getHighEntropyValues?.(['model']).then(values => {
    hintModel = values.model || undefined
  }).catch(() => {})
} catch {}

const readDevice = () => {
  const nav = navigator as Navigator & { deviceMemory?: number; cpuPerformance?: number }
  // the game canvas is the biggest one (the FPS meter and others are small)
  let canvas: HTMLCanvasElement | undefined
  for (const candidate of document.querySelectorAll('canvas')) {
    if (!canvas || candidate.width * candidate.height > canvas.width * canvas.height) canvas = candidate
  }
  return {
    model: hintModel,
    gpu: readGpu(),
    cpuTier: nav.cpuPerformance,
    ramGb: nav.deviceMemory,
    cores: nav.hardwareConcurrency,
    pixelRatio: window.devicePixelRatio,
    screenW: screen.width,
    screenH: screen.height,
    canvasW: canvas?.width,
    canvasH: canvas?.height,
    touch: navigator.maxTouchPoints > 0
  }
}

const readSettings = (): Record<string, string | number | boolean> => {
  const settings: Record<string, string | number | boolean> = {}
  for (const key of REPORTED_SETTINGS) {
    const value = (options as Record<string, unknown>)[key]
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') settings[key] = value
  }
  return settings
}

const currentPhase = (): Phase => {
  if (document.visibilityState === 'hidden') return 0
  if (activeModalStack.some(modal => modal.reactType === 'pause-screen' || modal.reactType === 'empty')) return 0
  const worldState = appViewer?.rendererState?.world
  if (!worldState || !bot?.entity) return 0
  return worldState.allChunksLoaded ? 2 : 1
}

/** Call with the metadata the server sent. Starts reporting only when it asks for performance data and the player allows it. */
export const onServerMetadata = (metadata: any) => {
  if (!metadata?.perf || !isPerfStatsOn()) return
  if (stopCurrent) return // already reporting on this connection
  const intervalMs = Math.max(5000, Math.min(60_000, Number(metadata.perf.intervalS) * 1000 || 10_000))
  startReporting(intervalMs)
}

const startReporting = (intervalMs: number) => {
  const channel = bot._client as any
  const frames = new FrameStats()
  let phase: Phase = 0
  let lastFrameAt = 0
  let rafId = 0
  let sent = 0
  // render call cost, from the renderer's running average: the change since the last look is what the new calls cost
  let lastCount = 0
  let lastSum = 0
  let renderSum = 0
  let renderCount = 0
  let reportedDevice = false
  const sessionStart = loginAt ?? performance.now()

  const onFrame = (time: number) => {
    rafId = requestAnimationFrame(onFrame)
    const dt = time - lastFrameAt
    lastFrameAt = time
    if (lastFrameAt !== 0 && dt > 0) frames.frame(dt, phase)
  }
  const tick = () => {
    phase = currentPhase()
    const { world } = (window as any)
    if (world) {
      const count = Number(world.renderTimeAvgCount) || 0
      const sum = (Number(world.renderTimeAvg) || 0) * count
      if (phase === 2 && count > lastCount && sum >= lastSum) {
        renderSum += sum - lastSum
        renderCount += count - lastCount
      }
      lastCount = count
      lastSum = sum
    }
    if (chunksMs === undefined && phase === 2 && loginAt !== undefined) chunksMs = performance.now() - loginAt
  }
  const send = () => {
    try {
      if (sent >= MAX_REPORTS) return
      const window_ = frames.takeWindow()
      const summary = frames.summary()
      if (!window_ && summary.frames === 0 && summary.loadFps === undefined) return // nothing measured yet (tab hidden the whole time)
      sent++
      const payload = buildPerfReport({
        t: (performance.now() - sessionStart) / 1000,
        phase,
        device: reportedDevice ? undefined : readDevice(),
        settings: readSettings(),
        stages: {
          prepMs: connectStartedAt === undefined ? undefined : Math.round(connectStartedAt),
          loginMs: connectStartedAt !== undefined && loginAt !== undefined ? Math.round(loginAt - connectStartedAt) : undefined,
          chunksMs: chunksMs === undefined ? undefined : Math.round(chunksMs),
          chunksTotal: appViewer?.nonReactiveState?.world?.chunksTotalNumber
        },
        summary: { ...summary, renderMs: renderCount >= 30 ? Math.round((renderSum / renderCount) * 10) / 10 : undefined },
        window: window_
      })
      reportedDevice = true
      channel.writeChannel(PERF_REPORT_CHANNEL, { reportJson: payload })
    } catch (error) {
      // statistics must never disturb the game
      console.debug('perf report failed', error)
    }
  }

  try {
    channel.registerChannel(PERF_REPORT_CHANNEL, ['container', [{ name: 'reportJson', type: ['pstring', { countType: 'i16' }] }]], true)
  } catch (error) {
    console.debug('perf channel not registered', error)
    return
  }
  const tickTimer = setInterval(tick, 1000)
  const sendTimer = setInterval(send, intervalMs)
  rafId = requestAnimationFrame(onFrame)
  const stop = () => {
    clearInterval(tickTimer)
    clearInterval(sendTimer)
    cancelAnimationFrame(rafId)
    if (stopCurrent === stop) stopCurrent = undefined
  }
  stopCurrent = stop
  bot._client.once('end', stop)
}
