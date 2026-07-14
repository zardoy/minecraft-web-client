import { formatMessage } from '../../chatUtils'
import { showAutoFillLoginModal } from '../../react/AutoFillLoginModal'
import { clearServerPassword, findServerPassword, saveServerPassword } from '../../react/serversStorage'
import { showNotification } from '../../react/NotificationProvider'
import { runAuthFlow } from './authCommands'

type MonitorSource = 'manual' | 'modal'

interface MonitorOptions {
  password: string
  newPassword?: string
  mode: 'login' | 'register' | 'changepassword' | 'unregister'
  source: MonitorSource
  serverIp?: string
  username?: string
  preSaved: boolean
  timeoutMs?: number
}

interface ActiveMonitor {
  cleanup: () => void
}

const FAILURE_REGEX = /wrong password|incorrect password|invalid password|wrong username|login failed|access denied|old password is wrong|неверн|неправильн|пароль[^а-яё]*невер/i
const SUCCESS_REGEX = /password changed|password successfully updated|account removed|пароль изменён|аккаунт удалён/i

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

    if (opts.preSaved && opts.mode !== 'unregister') {
      try { clearServerPassword() } catch (err) { console.error('clearServerPassword failed', err) }
    }

    const subtitle = opts.preSaved && opts.mode !== 'unregister' ? 'Saved password was cleared' : 'Try again'
    const title = opts.mode === 'changepassword' ? 'Auto-fill: password change failed'
      : opts.mode === 'unregister' ? 'Auto-fill: unregister failed'
        : 'Auto-fill login: wrong password'
    showNotification(title, subtitle, true)

    if (opts.source === 'modal' && opts.serverIp && opts.username && opts.mode !== 'unregister') {
      const { serverIp, username, mode } = opts
      setTimeout(() => {
        void showAutoFillLoginModal({ mode, serverIp, username, prefilledPassword: findServerPassword() })
          .then(result => {
            if (!result?.password) return
            if (mode === 'changepassword' && !result.newPassword) return
            runAuthFlow(bot, mode, result, { serverIp, username, source: 'modal' })
          })
      }, 50)
    }
  }

  const onSuccess = () => {
    if (finished) return
    finished = true
    cleanup()

    if (opts.mode === 'unregister') {
      try { clearServerPassword() } catch (err) { console.error('clearServerPassword failed', err) }
      showNotification('Account unregistered', 'Saved password was removed', false)
      return
    }

    if (opts.mode === 'changepassword' && opts.newPassword) {
      onSuccessSave({ ...opts, password: opts.newPassword })
      showNotification('Password changed', 'Saved password was updated', false)
      return
    }

    if (!opts.preSaved) {
      onSuccessSave(opts)
    } else if (opts.username && opts.serverIp) {
      void tryStoreInBrowserCredentials(opts.username, opts.password, opts.serverIp)
    }
  }

  function messageListener (message: any) {
    const text = extractText(message)
    if (!text) return
    if (FAILURE_REGEX.test(text)) {
      onFailure()
      return
    }
    if ((opts.mode === 'changepassword' || opts.mode === 'unregister') && SUCCESS_REGEX.test(text)) {
      onSuccess()
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
