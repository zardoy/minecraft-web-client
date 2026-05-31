export {
  type LoginPromptKind,
  type LoginPromptDebouncer,
  detectLoginPrompt,
  createLoginPromptDebouncer,
} from './promptDetection'

export {
  isLoginMonitorActive,
  monitorLoginAttempt,
} from './attemptMonitor'
