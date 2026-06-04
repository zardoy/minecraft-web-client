import { resetStateAfterDisconnect } from './browserfs'
import type { ConnectOptions } from './connect'
import { hideModal, activeModalStack, showModal, miscUiState } from './globalState'
import { appStatusState, resetAppStatusState } from './react/AppStatusProvider'

let ourLastStatus: string | undefined = ''

const formatErrorDetail = (err: unknown): string => {
  if (err instanceof Error) {
    if (err.stack) {
      const lines = err.stack.split('\n')
      const trace = lines.slice(1, 6).join('\n')
      return trace ? `${lines[0]}\n${trace}` : err.message
    }
    return err.message
  }
  if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
    const withMessage = err as { message: string, stack?: string }
    if (withMessage.stack) {
      const lines = withMessage.stack.split('\n')
      const trace = lines.slice(1, 6).join('\n')
      return trace ? `${lines[0]}\n${trace}` : withMessage.message
    }
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
