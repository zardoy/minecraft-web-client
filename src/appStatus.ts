import { resetStateAfterDisconnect } from './browserfs'
import type { ConnectOptions } from './connect'
import { hideModal, activeModalStack, showModal, miscUiState } from './globalState'
import { appStatusState, resetAppStatusState } from './react/AppStatusProvider'

let ourLastStatus: string | undefined = ''

const formatErrorDetail = (err: unknown): string => {
  const formatStack = (stack: string, fallbackMessage: string) => {
    const lines = stack.split('\n')
    const frame = lines[1]?.trim()
    return frame ? `${lines[0]}\n\n${frame}` : fallbackMessage
  }

  if (err instanceof Error) {
    if (err.stack) return formatStack(err.stack, err.message)
    return err.message
  }
  if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
    const withMessage = err as { message: string, stack?: string }
    if (withMessage.stack) return formatStack(withMessage.stack, withMessage.message)
    return withMessage.message
  }
  return String(err)
}

export const formatLoadingScreenError = (source: string, err: unknown): string => {
  return `${source}: ${formatErrorDetail(err)}`
}

export const setLoadingScreenStatus = function (status: string | undefined | null, isError = false, hideDots = false, fromFlyingSquid = false, minecraftJsonMessage?: Record<string, any>) {
  if (typeof status === 'string') status = window.translateText?.(status) ?? status
  // null can come from flying squid, should restore our last status
  if (status === null) {
    status = ourLastStatus
  } else if (!fromFlyingSquid) {
    ourLastStatus = status
  }
  fromFlyingSquid = false

  if (status === undefined) {
    appStatusState.status = ''

    hideModal({ reactType: 'app-status' }, {}, { force: true })
    return
  }

  if (!activeModalStack.some(x => x.reactType === 'app-status')) {
    // just showing app status
    resetAppStatusState()
  }
  showModal({ reactType: 'app-status' })
  if (appStatusState.isError) {
    return
  }
  appStatusState.hideDots = hideDots
  appStatusState.isError = isError
  appStatusState.lastStatus = isError ? appStatusState.status : ''
  appStatusState.status = status
  appStatusState.minecraftJsonMessage = minecraftJsonMessage ?? null

  if (isError && miscUiState.gameLoaded) {
    resetStateAfterDisconnect()
  }
}
globalThis.setLoadingScreenStatus = setLoadingScreenStatus

export const lastConnectOptions = {
  value: null as ConnectOptions | null,
  hadWorldLoaded: false
}
globalThis.lastConnectOptions = lastConnectOptions
