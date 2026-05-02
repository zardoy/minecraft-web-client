import { formatMessage } from './chatUtils'
import { showAutoFillLoginModal } from './react/AutoFillLoginModal'
import { clearServerPassword, saveServerPassword } from './react/serversStorage'
import { showNotification } from './react/NotificationProvider'

type Source = 'manual' | 'modal'

interface MonitorOptions {
  password: string
  mode: 'login' | 'register'
  source: Source
  serverIp?: string
  username?: string
  preSaved: boolean
  timeoutMs?: number
}

interface ActiveMonitor {
  cleanup: () => void
}

const FAILURE_REGEX = /wrong password|incorrect password|invalid password|wrong username|login failed|access denied|неверн|неправильн|пароль[^а-яё]*невер/i

let activeMonitor: ActiveMonitor | undefined

export const isLoginMonitorActive = (): boolean => activeMonitor !== undefined

const extractText = (message: any): string => {
  try {
    const parts = formatMessage(message)
    return parts.map((p) => p.text ?? '').join('')
  } catch {
    if (typeof message === 'string') return message
    return ''
  }
}

const tryStoreInBrowserCredentials = async (id: string, password: string, name: string): Promise<void> => {
  try {
    if (typeof navigator === 'undefined' || !('credentials' in navigator)) return
    const PasswordCredentialCtor = (window as any).PasswordCredential
    if (typeof PasswordCredentialCtor !== 'function') return
    const cred = new PasswordCredentialCtor({ id, password, name })
    await navigator.credentials.store(cred)
  } catch {
    // silent: not all browsers support, and the operation is best-effort
  }
}

const onSuccessSave = (opts: MonitorOptions): void => {
  try {
    saveServerPassword(opts.password, { silent: true })
  } catch (err) {
    console.error('saveServerPassword failed', err)
  }
  if (opts.username && opts.serverIp) {
    void tryStoreInBrowserCredentials(opts.username, opts.password, opts.serverIp)
  }
}

export const monitorLoginAttempt = (opts: MonitorOptions): void => {
  if (typeof bot === 'undefined' || !bot) return

  if (activeMonitor) {
    activeMonitor.cleanup()
    activeMonitor = undefined
  }

  const timeoutMs = opts.timeoutMs ?? 5000
  const localBot = bot
  let finished = false
  let timer: ReturnType<typeof setTimeout> | undefined
  const monitorRef: ActiveMonitor = { cleanup () {} }

  const cleanup = () => {
    if (timer !== undefined) {
      clearTimeout(timer)
      timer = undefined
    }
    try {
      localBot.removeListener('message', messageListener)
    } catch {}
    try {
      localBot.removeListener('kicked', kickListener)
    } catch {}
    if (activeMonitor === monitorRef) activeMonitor = undefined
  }
  monitorRef.cleanup = cleanup

  const onFailure = () => {
    if (finished) return
    finished = true
    cleanup()

    if (opts.preSaved) {
      try { clearServerPassword() } catch (err) { console.error('clearServerPassword failed', err) }
    }

    const subtitle = opts.preSaved ? 'Saved password was cleared' : 'Try again'
    showNotification('Auto-fill login: wrong password', subtitle, true)

    if (opts.source === 'modal' && opts.serverIp && opts.username) {
      const { serverIp, username, mode } = opts
      setTimeout(() => {
        void showAutoFillLoginModal({ mode, serverIp, username })
      }, 50)
    }
  }

  const onSuccess = () => {
    if (finished) return
    finished = true
    cleanup()
    if (!opts.preSaved) {
      onSuccessSave(opts)
    } else if (opts.username && opts.serverIp) {
      // Already saved in our storage; still nudge the browser's password manager
      // to make sure the credential is stored there too (helps Chrome/Edge).
      void tryStoreInBrowserCredentials(opts.username, opts.password, opts.serverIp)
    }
  }

  function messageListener (message: any) {
    const text = extractText(message)
    if (text && FAILURE_REGEX.test(text)) {
      onFailure()
    }
  }

  function kickListener () {
    onFailure()
  }

  localBot.on('message', messageListener)
  localBot.on('kicked', kickListener)
  timer = setTimeout(onSuccess, timeoutMs)

  activeMonitor = monitorRef
}
