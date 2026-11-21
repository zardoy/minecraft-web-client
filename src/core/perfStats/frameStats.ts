/**
 * Pure parts of the performance stats (no browser globals): frame statistics and the opt-out rule.
 * The wiring (events, the channel to the proxy) is in perfStats.ts. The proxy side validates every field again.
 */

/** 0 = not measured (tab hidden, game paused, not in a world), 1 = the world is loading, 2 = playing (all chunks loaded) */
export type Phase = 0 | 1 | 2

/** frames longer than this are not frames of play (the tab was hidden, the machine slept) */
const MAX_FRAME_MS = 2000
const HIST_MAX_MS = 200

export type FrameSummary = {
  loadFps?: number
  loadSec?: number
  playFps?: number
  playSec?: number
  frames: number
  p95Ms?: number
  jankPct?: number
  stutters50: number
  stutters100: number
  worstMs: number
  loadStutters100: number
}

export type WindowSample = { phase: 1 | 2; fps: number; p95Ms?: number; stutters100: number }

const round = (value: number, digits: number) => {
  const f = 10 ** digits
  return Math.round(value * f) / f
}

function p95Of (hist: Uint32Array, frames: number): number | undefined {
  if (frames < 30) return undefined
  let seen = 0
  for (const [i, count] of hist.entries()) {
    seen += count
    if (seen >= frames * 0.95) return i
  }
  return undefined
}

type Bucket = { frames: number; ms: number; stutters100: number; hist: Uint32Array }
const newBucket = (): Bucket => ({ frames: 0, ms: 0, stutters100: 0, hist: new Uint32Array(HIST_MAX_MS + 1) })

/** Frame times of one session, split into "world loading" and "playing". Feed it every animation frame. */
export class FrameStats {
  private readonly load = newBucket()
  private readonly play = newBucket()
  private jank50 = 0
  private worst = 0
  private windows: Record<1 | 2, Bucket> = { 1: newBucket(), 2: newBucket() }

  frame (dtMs: number, phase: Phase) {
    if (phase === 0 || !Number.isFinite(dtMs) || dtMs <= 0 || dtMs > MAX_FRAME_MS) return
    const bucket = phase === 1 ? this.load : this.play
    const slot = Math.min(HIST_MAX_MS, Math.round(dtMs))
    for (const b of [bucket, this.windows[phase]]) {
      b.frames++
      b.ms += dtMs
      b.hist[slot]!++
      if (dtMs > 100) b.stutters100++
    }
    if (phase === 2) {
      if (dtMs > 50) this.jank50++
      if (dtMs > this.worst) this.worst = dtMs
    }
  }

  /** Everything since the session started. */
  summary (): FrameSummary {
    const { load, play } = this
    return {
      loadFps: load.ms > 0 ? round((load.frames * 1000) / load.ms, 1) : undefined,
      loadSec: load.ms > 0 ? round(load.ms / 1000, 1) : undefined,
      playFps: play.ms > 0 ? round((play.frames * 1000) / play.ms, 1) : undefined,
      playSec: play.ms > 0 ? round(play.ms / 1000, 1) : undefined,
      frames: play.frames,
      p95Ms: p95Of(play.hist, play.frames),
      jankPct: play.frames >= 100 ? round((this.jank50 / play.frames) * 100, 1) : undefined,
      stutters50: this.jank50,
      stutters100: play.stutters100,
      worstMs: Math.round(this.worst),
      loadStutters100: load.stutters100,
    }
  }

  /** The time since the last call (the point of the time series), in the phase that had more of it. Undefined when nothing was measured. */
  takeWindow (): WindowSample | undefined {
    const { 1: loading, 2: playing } = this.windows
    const phase: 1 | 2 = playing.ms >= loading.ms ? 2 : 1
    const bucket = this.windows[phase]
    this.windows = { 1: newBucket(), 2: newBucket() }
    if (bucket.ms <= 0) return undefined
    return { phase, fps: round((bucket.frames * 1000) / bucket.ms, 1), p95Ms: p95Of(bucket.hist, bucket.frames), stutters100: bucket.stutters100 }
  }
}

export type PerfReportInput = {
  /** seconds since the login packet */
  t: number
  phase: Phase
  device?: Record<string, unknown>
  settings?: Record<string, string | number | boolean>
  stages?: { prepMs?: number; loginMs?: number; chunksMs?: number; chunksTotal?: number }
  summary: FrameSummary & { renderMs?: number }
  window?: WindowSample
}

/** The JSON string for the `minecraft-web-client:perf-report` channel (version 1). Undefined fields are dropped by JSON. */
export function buildPerfReport (input: PerfReportInput): string {
  return JSON.stringify({ v: 1, ...input, t: Math.round(input.t) })
}

export type OptOutReason = 'setting' | 'dnt' | 'gpc' | 'url' | 'no-storage'

export type PerfStatsInput = { option: boolean; urlParam?: string | null; doNotTrack?: string | null; globalPrivacyControl?: boolean }

/**
 * Why performance data may NOT be sent, undefined when it may. The player's setting decides, and a browser that says "do not track"
 * or sends the global privacy control signal turns it off too, even though the setting is on by default.
 * `?stats=0` / `?stats=1` overrides all of it for a session. The reason goes to the server (nothing else does) so the opt-out rate is visible.
 */
export function perfStatsOptOutReason (input: PerfStatsInput): OptOutReason | undefined {
  if (input.urlParam === '0') return 'url'
  if (input.urlParam === '1') return undefined
  if (!input.option) return 'setting'
  if (input.doNotTrack === '1' || input.doNotTrack === 'yes') return 'dnt'
  if (input.globalPrivacyControl === true) return 'gpc'
  return undefined
}

export const perfStatsAllowed = (input: PerfStatsInput): boolean => perfStatsOptOutReason(input) === undefined
