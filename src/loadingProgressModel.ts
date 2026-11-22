// Overall progress of a long load (singleplayer start) made of weighted stages.
// Some stages report real progress (download bytes, chunks loaded); the others (a worker building its generator, a renderer starting)
// have no signal, so their progress is estimated from the time they usually take: 1 - exp(-t / expected), never above ESTIMATE_CAP until the stage really finishes.
// The value never goes backwards and never reaches 1 before `finishAll`.

export interface LoadingStageDef {
  id: string
  label: string
  /** share of the whole bar */
  weight: number
  /** typical duration in ms on a slow phone, used to estimate progress when the stage reports none */
  expectedMs: number
}

export const ESTIMATE_CAP = 0.95
/** a real fraction is not allowed to complete the stage by itself either */
const REPORT_CAP = 0.99

export class LoadingProgressModel {
  private index = -1
  private startedAt = 0
  private real: number | undefined
  private shown = 0
  private finished = false
  detail = ''

  constructor (readonly stages: LoadingStageDef[], private readonly now: () => number = () => performance.now()) {}

  get currentStage (): LoadingStageDef | undefined {
    return this.stages[this.index]
  }

  /** starts a stage; earlier stages that never reported are done, a stage that is already running (or past) is left alone */
  begin (id: string) {
    const index = this.stages.findIndex(s => s.id === id)
    if (index === -1 || index <= this.index) return
    this.index = index
    this.startedAt = this.now()
    this.real = undefined
    this.detail = ''
  }

  /** real progress (0..1) of the running stage `id`; ignored when another stage is running */
  report (id: string, fraction: number, detail?: string) {
    if (this.stages[this.index]?.id !== id || !Number.isFinite(fraction)) return
    this.real = Math.min(REPORT_CAP, Math.max(this.real ?? 0, fraction))
    if (detail !== undefined) this.detail = detail
  }

  finishAll () {
    this.finished = true
  }

  /** progress of the running stage */
  private stageFraction (): number {
    const stage = this.currentStage
    if (!stage) return 0
    if (this.real !== undefined) return this.real
    return Math.min(ESTIMATE_CAP, 1 - Math.exp(-(this.now() - this.startedAt) / stage.expectedMs))
  }

  /** overall progress 0..1 */
  value (): number {
    if (this.finished) return 1
    const total = this.stages.reduce((sum, s) => sum + s.weight, 0)
    let done = 0
    for (let i = 0; i < this.index; i++) done += this.stages[i].weight
    const stage = this.currentStage
    const current = stage ? stage.weight * this.stageFraction() : 0
    this.shown = Math.max(this.shown, (done + current) / total)
    return this.shown
  }
}
