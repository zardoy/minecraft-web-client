// Pure detection logic for AuthMe-style login/register prompts in chat.
// See issue #527 (auto-fill server login).

export type LoginPromptKind = 'login' | 'register' | 'either' | 'changepassword' | 'unregister'

const stripFormatting = (text: string): string => {
  return text.replaceAll(/\u00A7./g, '')
}

const LOGIN_CMD_RE = /(?:^|\W)\/login\b/i
const REGISTER_CMD_RE = /(?:^|\W)\/register\b/i
const CHANGEPASSWORD_CMD_RE = /(?:^|\W)\/changepassword\b/i
const UNREGISTER_CMD_RE = /(?:^|\W)\/unregister\b/i

export const detectLoginPrompt = (text: string): LoginPromptKind | null => {
  if (!text) return null
  const cleaned = stripFormatting(text)
  const hasLogin = LOGIN_CMD_RE.test(cleaned)
  const hasRegister = REGISTER_CMD_RE.test(cleaned)
  const hasChangePassword = CHANGEPASSWORD_CMD_RE.test(cleaned)
  const hasUnregister = UNREGISTER_CMD_RE.test(cleaned)

  if (hasLogin && hasRegister) return 'either'
  if (hasLogin) return 'login'
  if (hasRegister) return 'register'
  if (hasChangePassword) return 'changepassword'
  if (hasUnregister) return 'unregister'
  return null
}

export interface LoginPromptDebouncer {
  shouldTrigger: (serverKey: string) => boolean
  reset: (serverKey?: string) => void
}

export const createLoginPromptDebouncer = (intervalMs = 30_000): LoginPromptDebouncer => {
  const lastTrigger = new Map<string, number>()

  return {
    shouldTrigger (serverKey: string): boolean {
      const now = Date.now()
      const prev = lastTrigger.get(serverKey)
      if (prev !== undefined && now - prev < intervalMs) {
        return false
      }
      lastTrigger.set(serverKey, now)
      return true
    },
    reset (serverKey?: string): void {
      if (serverKey === undefined) {
        lastTrigger.clear()
      } else {
        lastTrigger.delete(serverKey)
      }
    },
  }
}
