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

export type AuthFlowResult = {
  password: string
  newPassword?: string
  /** Command was already sent from the modal (Safari save step). */
  commandSent?: boolean
}

export const sendAuthCommand = (
  bot: AuthFlowBot | undefined | null,
  mode: AuthMode,
  password: string,
  newPassword?: string,
): boolean => {
  if (!bot) return false
  const cmd = buildAuthCommand(mode, password, newPassword)
  if (!cmd) return false
  try { bot.chat(cmd) } catch {}
  return true
}

export const runAuthFlow = (
  bot: AuthFlowBot | undefined | null,
  mode: AuthMode,
  result: AuthFlowResult,
  ctx: { serverIp: string, username: string, source: 'manual' | 'modal', preSaved?: boolean }
): boolean => {
  if (result.commandSent) return true
  if (!sendAuthCommand(bot, mode, result.password, result.newPassword)) return false
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
