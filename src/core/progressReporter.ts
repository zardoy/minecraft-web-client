import { setLoadingScreenStatus, formatLoadingScreenError } from '../appStatus'
import { appStatusState } from '../react/AppStatusProvider'
import { hideNotification, showNotification } from '../react/NotificationProvider'
import { pixelartIcons } from '../react/PixelartIcon'

export interface ProgressReporter {
  currentMessage: string | undefined
  beginStage (stage: string, title: string): void
  endStage (stage: string): void
  setSubStage (stage: string, subStageTitle: string): void
  reportProgress (stage: string, progress: number): void
  executeWithMessage<T>(message: string, fn: () => Promise<T>): Promise<T>
  executeWithMessage<T>(message: string, stage: string, fn: () => Promise<T>): Promise<T>

  setMessage (message: string): void

  end(): void
  error(message: string): void
}

interface ReporterDisplayImplementation {
  setMessage (message: string): void
  end (): void
  error(message: string): void
}

interface StageInfo {
  title: string
  subStage?: string
  progress?: number
}

const NO_STAGES_ACTION_END = false

const createProgressReporter = (implementation: ReporterDisplayImplementation): ProgressReporter => {
  const stages = new Map<string, StageInfo>()
  let currentMessage: string | undefined
  let ended = false

  const end = () => {
    if (ended) return
    ended = true
    stages.clear()
    implementation.end()
  }

  const updateStatus = () => {
    if (ended) return
    const activeStages = [...stages.entries()]
    if (activeStages.length === 0) {
      if (NO_STAGES_ACTION_END) {
        end()
      } else {
        implementation.setMessage('Waiting for tasks')
      }
      return
    }

    const [currentStage, info] = activeStages.at(-1)!
    let message = info.title
    if (info.subStage) {
      message += ` - ${info.subStage}`
    }
    if (info.progress !== undefined) {
      const num = Math.round(info.progress * 100)
      if (isFinite(num)) {
        message += `: ${num}%`
      }
    }

    currentMessage = message
    implementation.setMessage(message)
  }

  const reporter = {
    beginStage (stage: string, title: string) {
      if (stages.has(stage)) {
        throw new Error(`Stage ${stage} already is running`)
      }
      stages.set(stage, { title })
      updateStatus()
    },

    endStage (stage: string) {
      stages.delete(stage)
      updateStatus()
    },

    setSubStage (stage: string, subStageTitle: string) {
      const info = stages.get(stage)
      if (info) {
        info.subStage = subStageTitle
        updateStatus()
      }
    },

    reportProgress (stage: string, progress: number) {
      const info = stages.get(stage)
      if (info) {
        info.progress = progress
        updateStatus()
      }
    },

    async executeWithMessage<T>(...args: any[]): Promise<T> {
      const message = args[0]
      const stage = typeof args[1] === 'string' ? args[1] : undefined
      const fn = typeof args[1] === 'string' ? args[2] : args[1]

      const tempStage = stage ?? 'temp-' + Math.random().toString(36).slice(2)
      reporter.beginStage(tempStage, message)
      try {
        const result = await fn()
        return result
      } finally {
        reporter.endStage(tempStage)
      }
    },

    end (): void {
      end()
    },

    setMessage (message: string): void {
      if (ended) return
      implementation.setMessage(message)
    },

    get currentMessage () {
      return currentMessage
    },

    error (message: string): void {
      if (ended) return
      implementation.error(message)
    }
  }

  return reporter
}

const fullScreenReporters = [] as ProgressReporter[]
export const createFullScreenProgressReporter = (): ProgressReporter => {
  const reporter = createProgressReporter({
    setMessage (message: string) {
      if (appStatusState.isError) return
      setLoadingScreenStatus(message)
    },
    end () {
      if (appStatusState.isError) return
      fullScreenReporters.splice(fullScreenReporters.indexOf(reporter), 1)
      if (fullScreenReporters.length === 0) {
        setLoadingScreenStatus(undefined)
      } else {
        setLoadingScreenStatus(fullScreenReporters.at(-1)!.currentMessage)
      }
    },

    error (message: string): void {
      if (appStatusState.isError) return
      setLoadingScreenStatus(formatLoadingScreenError('Progress reporter', message), true)
    }
  })
  fullScreenReporters.push(reporter)
  return reporter
}

export const createNotificationProgressReporter = (endMessage?: string): ProgressReporter => {
  const id = `progress-reporter-${Math.random().toString(36).slice(2)}`
  return createProgressReporter({
    setMessage (message: string) {
      showNotification(`${message}...`, '', false, '', undefined, true, id)
    },
    end () {
      if (endMessage) {
        showNotification(endMessage, '', false, pixelartIcons.check, undefined, true)
      } else {
        hideNotification(id)
      }
    },

    error (message: string): void {
      showNotification(message, '', true, '', undefined, true)
    }
  })
}

export const createConsoleLogProgressReporter = (group?: string): ProgressReporter => {
  return createProgressReporter({
    setMessage (message: string) {
      console.log(group ? `[${group}] ${message}` : message)
    },
    end () {
      console.log(group ? `[${group}] done` : 'done')
    },

    error (message: string): void {
      console.error(message)
    }
  })
}

export const createWrappedProgressReporter = (reporter: ProgressReporter, message?: string) => {
  const stage = `wrapped-${message}`
  if (message) {
    reporter.beginStage(stage, message)
  }

  return createProgressReporter({
    setMessage (message: string) {
      reporter.setMessage(message)
    },
    end () {
      if (message) {
        reporter.endStage(stage)
      }
    },

    error (message: string): void {
      reporter.error(message)
    }
  })
}

export const createNullProgressReporter = (): ProgressReporter => {
  return createProgressReporter({
    setMessage (message: string) {
    },
    end () {
    },
    error (message: string) {
    }
  })
}
