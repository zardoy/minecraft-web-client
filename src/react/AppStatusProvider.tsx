import { proxy, useSnapshot } from 'valtio'
import { useEffect, useRef, useState } from 'react'
import { activeModalStack, activeModalStacks, hideModal, insertActiveModalStack, maybeCleanupAfterDisconnect, miscUiState } from '../globalState'
import { guessProblem } from '../errorLoadingScreenHelpers'
import type { ConnectOptions } from '../connect'
import { downloadPacketsReplay, packetsRecordingState, replayLogger } from '../packetsReplay/packetsReplayLegacy'
import { getProxyDetails } from '../microsoftAuthflow'
import { downloadAutoCapturedPackets, getLastAutoCapturedPackets } from '../mineflayer/plugins/packetsRecording'
import { appQueryParams } from '../appParams'
import { lastConnectOptions } from '../appStatus'
import AppStatus from './AppStatus'
import DiveTransition from './DiveTransition'
import { useDidUpdateEffect } from './utils'
import { useIsModalActive } from './utilsApp'
import Button from './Button'
import { updateAuthenticatedAccountData, updateLoadedServerData, AuthenticatedAccount } from './serversStorage'
import { showOptionsModal } from './SelectOption'
import LoadingChunks from './LoadingChunks'
import MessageFormattedString from './MessageFormattedString'
import { withInjectableUi } from './extendableSystem'

const initialState = {
  status: '',
  lastStatus: '',
  maybeRecoverable: true,
  descriptionHint: '',
  isError: false,
  hideDots: false,
  loadingChunksData: null as null | Record<string, string>,
  loadingChunksDataPlayerChunk: null as null | { x: number, z: number },
  isDisplaying: false,
  minecraftJsonMessage: null as null | Record<string, any>,
  showReconnect: false
}
export const appStatusState = proxy(initialState)
export const resetAppStatusState = () => {
  Object.assign(appStatusState, initialState)
}

const saveReconnectOptions = (options: ConnectOptions) => {
  sessionStorage.setItem('reconnectOptions', JSON.stringify({
    value: options,
    timestamp: Date.now()
  }))
}

export const reconnectReload = () => {
  if (lastConnectOptions.value) {
    saveReconnectOptions(lastConnectOptions.value)
    window.location.reload()
  }
}

export const quickDevReconnect = () => {
  if (!lastConnectOptions.value) {
    return
  }

  resetAppStatusState()
  window.dispatchEvent(new window.CustomEvent('connect', {
    detail: lastConnectOptions.value
  }))
}

const AppStatusProviderBase = () => {
  const lastState = useRef(JSON.parse(JSON.stringify(appStatusState)))
  const currentState = useSnapshot(appStatusState)
  const { active: replayActive } = useSnapshot(packetsRecordingState)

  const isOpen = useIsModalActive('app-status')

  if (isOpen) {
    lastState.current = JSON.parse(JSON.stringify(currentState))
  }

  const usingState = (isOpen ? currentState : lastState.current) as typeof currentState
  const { isError, lastStatus, maybeRecoverable, status, hideDots, descriptionHint, loadingChunksData, loadingChunksDataPlayerChunk, minecraftJsonMessage, showReconnect } = usingState

  useDidUpdateEffect(() => {
    // todo play effect only when world successfully loaded
    if (!isOpen) {
      const startDiveAnimation = (divingElem: HTMLElement) => {
        divingElem.style.animationName = 'dive-animation'
        divingElem.parentElement!.style.perspective = '1200px'
        divingElem.onanimationend = () => {
          divingElem.parentElement!.style.perspective = ''
          divingElem.onanimationend = null
        }
      }

      const divingElem = document.querySelector('#viewer-canvas')
      let observer: MutationObserver | null = null
      if (divingElem) {
        startDiveAnimation(divingElem as HTMLElement)
      } else {
        observer = new MutationObserver((mutations) => {
          const divingElem = document.querySelector('#viewer-canvas')
          if (divingElem) {
            startDiveAnimation(divingElem as HTMLElement)
            observer!.disconnect()
          }
        })
        observer.observe(document.body, {
          childList: true,
          subtree: true
        })
      }
      return () => {
        if (observer) {
          observer.disconnect()
        }
      }
    }
  }, [isOpen])

  useEffect(() => {
    const controller = new AbortController()
    window.addEventListener('keyup', (e) => {
      if ('input textarea select'.split(' ').includes((e.target as HTMLElement).tagName?.toLowerCase() ?? '')) return
      if (activeModalStack.at(-1)?.reactType !== 'app-status') return
      // todo do only if reconnect is possible
      if (e.code !== 'KeyR' || !lastConnectOptions.value) return
      quickDevReconnect()
    }, {
      signal: controller.signal
    })
    return () => controller.abort()
  }, [])

  const displayAuthButton = status.includes('This server appears to be an online server and you are providing no authentication.')
    || JSON.stringify(minecraftJsonMessage ?? {}).toLowerCase().includes('authenticate')
  const hasVpnText = (text: string) => text.includes('VPN') || text.includes('Proxy')
  const displayVpnButton = hasVpnText(status) || (minecraftJsonMessage && hasVpnText(JSON.stringify(minecraftJsonMessage)))
  const authReconnectAction = async () => {
    let accounts = [] as AuthenticatedAccount[]
    updateAuthenticatedAccountData(oldAccounts => {
      accounts = oldAccounts
      return oldAccounts
    })

    const account = await showOptionsModal('Choose account to connect with', [...accounts.map(account => account.username), 'Use other account'])
    if (!account) return
    lastConnectOptions.value!.authenticatedAccount = accounts.find(acc => acc.username === account) || true
    quickDevReconnect()
  }

  const lastAutoCapturedPackets = getLastAutoCapturedPackets()
  const lockConnect = appQueryParams.lockConnect === 'true'
  const wasDisconnected = showReconnect
  let backAction = undefined as (() => void) | undefined
  if (maybeRecoverable && (!lockConnect || !wasDisconnected)) {
    backAction = () => {
      maybeCleanupAfterDisconnect()

      if (!wasDisconnected) {
        hideModal(undefined, undefined, { force: true })
        return
      }
      resetAppStatusState()
      miscUiState.gameLoaded = false
      miscUiState.loadedDataVersion = null
      window.loadedData = undefined
      if (activeModalStacks['main-menu']) {
        insertActiveModalStack('main-menu')
        if (activeModalStack.at(-1)?.reactType === 'app-status') {
          hideModal(undefined, undefined, { force: true }) // workaround: hide loader that was shown on world loading
        }
      } else {
        hideModal(undefined, undefined, { force: true })
      }
    }
  }
  return <DiveTransition open={isOpen} isError={isError}>
    <AppStatus
      status={status}
      isError={isError || status === ''} // display back button if status is empty as probably our app is errored
      hideDots={hideDots}
      lastStatus={lastStatus}
      showReconnect={showReconnect}
      onReconnect={reconnectReload}
      description={<>{
        displayAuthButton ? '' : (isError ? guessProblem(status) : '') || descriptionHint
      }{
        minecraftJsonMessage && <MessageFormattedString message={minecraftJsonMessage} />
      }</>}
      backAction={backAction}
      actionsSlot={
        <>
          {displayAuthButton && <Button label='Authenticate' onClick={authReconnectAction} />}
          {displayVpnButton && <PossiblyVpnBypassProxyButton reconnect={quickDevReconnect} />}
          {replayActive && <Button label={`Download Packets Replay ${replayLogger?.contents.split('\n').length}L`} onClick={downloadPacketsReplay} />}
          {wasDisconnected && lastAutoCapturedPackets && <Button label={`Inspect Last ${lastAutoCapturedPackets} Packets`} onClick={() => downloadAutoCapturedPackets()} />}
        </>
      }
    >
      {loadingChunksData && <LoadingChunks regionFiles={Object.keys(loadingChunksData)} stateMap={loadingChunksData} playerChunk={loadingChunksDataPlayerChunk} />}
      {isOpen && <DisplayingIndicator />}
    </AppStatus>
  </DiveTransition>
}

export default withInjectableUi(AppStatusProviderBase, 'appStatusProvider')

const DisplayingIndicator = () => {
  useEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        appStatusState.isDisplaying = true
      })
    })
  }, [])

  return <div />
}

const PossiblyVpnBypassProxyButton = ({ reconnect }: { reconnect: () => void }) => {
  const [vpnBypassProxy, setVpnBypassProxy] = useState('')

  const useVpnBypassProxyAction = () => {
    updateLoadedServerData((data) => {
      data.proxyOverride = vpnBypassProxy
      return data
    }, lastConnectOptions.value?.serverIndex)
    lastConnectOptions.value!.proxy = vpnBypassProxy
    reconnect()
  }

  useEffect(() => {
    const proxy = lastConnectOptions.value?.proxy
    if (!proxy) return
    getProxyDetails(proxy)
      .then(async (r) => r.json())
      .then(({ capabilities }) => {
        const { vpnBypassProxy } = capabilities
        if (!vpnBypassProxy) return
        setVpnBypassProxy(vpnBypassProxy)
      })
      .catch(() => { })
  }, [])

  if (!vpnBypassProxy) return
  return <Button label='Use VPN bypass proxy' onClick={useVpnBypassProxyAction} />
}
