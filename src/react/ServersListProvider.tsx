import { useEffect, useMemo, useState } from 'react'
import { useUtilsEffect } from '@zardoy/react-util'
import { useSnapshot } from 'valtio'
import { supportedVersions } from 'minecraft-protocol'
import { versionToNumber } from 'mc-assets/dist/utils'
import { ConnectOptions } from '../connect'
import { activeModalStack, hideCurrentModal, miscUiState, notHideableModalsWithoutForce, showModal } from '../globalState'
import appSupportedVersions from '../supportedVersions.mjs'
import { appQueryParams } from '../appParams'
import { fetchServerStatus, isServerValid } from '../api/mcStatusApi'
import { getServerInfo } from '../mineflayer/mc-protocol'
import { parseServerAddress } from '../parseServerAddress'
import ServersList, { getConnectProxy, getCurrentProxy, getCurrentUsername, ServerListItem } from './ServersList'
import AddServerOrConnect, { BaseServerInfo } from './AddServerOrConnect'
import { useDidUpdateEffect } from './utils'
import { useIsModalActive } from './utilsApp'
import { showOptionsModal } from './SelectOption'
import { useCopyKeybinding } from './simpleHooks'
import { AuthenticatedAccount, setNewServersList } from './serversStorage'
import { appStorage, StoreServerItem } from './appStorageProvider'
import { showNotification } from './NotificationProvider'

const firstProtocolVersion = versionToNumber(supportedVersions[0])
const lastProtocolVersion = versionToNumber(supportedVersions.at(-1)!)
const protocolSupportedVersions = appSupportedVersions.filter(v => versionToNumber(v) >= firstProtocolVersion && versionToNumber(v) <= lastProtocolVersion)

const EXPLICIT_SHARE_SERVER_MODE = false

if (appQueryParams.lockConnect) {
  notHideableModalsWithoutForce.add('editServer')
}

type AdditionalDisplayData = {
  /** MOTD, a § formatted string or a chat component */
  motd?: string | Record<string, any>
  icon?: string
  ping?: number
  players?: string
  version?: string
  offline?: boolean
}

// todo move to base
const normalizeIp = (ip: string) => ip.replace(/https?:\/\//, '').replace(/\/(:|$)/, '')

const FETCH_DELAY = 100 // ms between each request
const MAX_CONCURRENT_REQUESTS = 10

const Inner = ({ hidden, customServersList }: { hidden?: boolean, customServersList?: string[] }) => {
  const [serverEditScreen, setServerEditScreen] = useState<StoreServerItem | true | null>(null) // true for add
  const { authenticatedAccounts } = useSnapshot(appStorage)
  const [quickConnectIp, setQuickConnectIp] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [retriggerFocusCounter, setRetriggerFocusCounter] = useState(0)

  useEffect(() => {
    if (!hidden) {
      setRetriggerFocusCounter(x => x + 1)
    }
  }, [hidden])

  const _savedServersListWatchOnly = useSnapshot(appStorage).serversList

  const serversListProvided = useMemo(() => {
    return (
      customServersList
        ? customServersList.map((row): StoreServerItem => {
          const [ip, name] = row.split(' ')
          const [_ip, _port, version] = ip.split(':')
          return {
            ip,
            versionOverride: version,
            name,
          }
        })
        : [...(appStorage.serversList?.filter(server => server) ?? [])]
    )
  }, [customServersList, _savedServersListWatchOnly])

  const [additionalServerData, setAdditionalServerData] = useState<Record<string, AdditionalDisplayData>>({})

  // Add keyboard handler for moving servers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['input', 'textarea', 'select'].includes((e.target as HTMLElement)?.tagName?.toLowerCase())) return
      if (!e.shiftKey || selectedIndex === undefined) return
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
      if (customServersList) return
      e.preventDefault()
      e.stopImmediatePropagation()

      const newIndex = e.key === 'ArrowUp'
        ? Math.max(0, selectedIndex - 1)
        : Math.min(serversListProvided.length - 1, selectedIndex + 1)

      if (newIndex === selectedIndex) return
      if (newIndex < 0 || newIndex >= serversListProvided.length) return

      // Move server in the list
      const newList = [...serversListProvided]
      const oldItem = newList[selectedIndex]
      const newItem = newList[newIndex]
      if (oldItem.isRecommended || newItem.isRecommended) {
        return
      }

      newList[selectedIndex] = newItem
      newList[newIndex] = oldItem

      appStorage.serversList = newList
      setSelectedIndex(newIndex)
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedIndex, serversListProvided])

  const serversListSorted: Array<StoreServerItem & { index: number }> = useMemo(() => [
    ...serversListProvided,
    ...(customServersList ? [] : (miscUiState.appConfig?.promoteServers ?? [])).map((server): StoreServerItem => ({
      ip: server.ip,
      name: server.name,
      versionOverride: server.version,
      description: server.description,
      isRecommended: true
    }))
  ].map((server, index) => ({ ...server, index })), [serversListProvided])
  // by lastJoined
  // const serversListSorted = useMemo(() => {
  //   return serversList.map((server, index) => ({ ...server, index })).sort((a, b) => (b.lastJoined ?? 0) - (a.lastJoined ?? 0))
  // }, [serversList])

  const isEditScreenModal = useIsModalActive('editServer')

  useUtilsEffect(({ signal }) => {
    if (isEditScreenModal) return
    const update = async () => {
      const queue = serversListSorted
        .map(server => {
          if (!isServerValid(server.ip, true) || signal.aborted) return null

          return server
        })
        .filter(x => x !== null)

      const activeRequests = new Set<Promise<void>>()

      let lastRequestStart = 0
      for (const server of queue) {
        // Wait if at concurrency limit
        if (activeRequests.size >= MAX_CONCURRENT_REQUESTS) {
          // eslint-disable-next-line no-await-in-loop
          await Promise.race(activeRequests)
        }

        // Create and track new request
        // eslint-disable-next-line @typescript-eslint/no-loop-func
        const request = new Promise<void>(resolve => {
          setTimeout(async () => {
            try {
              lastRequestStart = Date.now()
              if (signal.aborted) return
              const isWebSocket = server.ip.startsWith('ws://') || server.ip.startsWith('wss://')
              let data
              if (isWebSocket) {
                try {
                  const pingResult = await getServerInfo(server.ip, undefined, undefined, true)
                  data = {
                    motd: pingResult.fullInfo.description,
                    icon: pingResult.fullInfo.favicon,
                    ping: pingResult.latency,
                    players: `${pingResult.fullInfo.players?.online ?? '??'}/${pingResult.fullInfo.players?.max ?? '??'}`,
                    offline: false
                  } satisfies AdditionalDisplayData
                } catch (err) {
                  data = { offline: true } satisfies AdditionalDisplayData
                }
              } else {
                const status = await fetchServerStatus(server.ip, /* signal */undefined, server.versionOverride) // DONT ADD SIGNAL IT WILL CRUSH JS RUNTIME
                if (status) {
                  const { raw } = status
                  data = {
                    motd: status.formattedText,
                    icon: status.icon,
                    offline: status.offline,
                    players: raw.online && raw.players ? `${raw.players.online}/${raw.players.max}` : undefined,
                    version: raw.online ? raw.version?.name_raw.replace(/^[^\d.]+/, '') : undefined,
                  } satisfies AdditionalDisplayData
                }
              }
              if (data) {
                setAdditionalServerData(old => ({
                  ...old,
                  [server.ip]: data
                }))
              }
            } catch (err) {
              console.warn('Failed to fetch server status', err)
            } finally {
              activeRequests.delete(request)
              resolve()
            }
          }, lastRequestStart ? Math.max(0, FETCH_DELAY - (Date.now() - lastRequestStart)) : 0)
        })

        activeRequests.add(request)
      }

      await Promise.all(activeRequests)
    }

    void update()
  }, [serversListSorted, isEditScreenModal])

  useDidUpdateEffect(() => {
    if (serverEditScreen && !isEditScreenModal) {
      showModal({ reactType: 'editServer' })
    }
    if (!serverEditScreen && isEditScreenModal) {
      hideCurrentModal()
    }
  }, [serverEditScreen])

  useDidUpdateEffect(() => {
    if (!isEditScreenModal) {
      setServerEditScreen(null)
    }
  }, [isEditScreenModal])

  useCopyKeybinding(() => {
    const item = serversListProvided[selectedIndex]
    if (!item) return
    let str = `${item.ip}`
    if (item.versionOverride) {
      str += `:${item.versionOverride}`
    }
    return str
  })

  const editModalJsx = isEditScreenModal ? <AddServerOrConnect
    placeholders={{
      proxyOverride: getCurrentProxy(),
      usernameOverride: getCurrentUsername(),
    }}
    parseQs={!serverEditScreen}
    onBack={() => {
      hideCurrentModal()
    }}
    onConfirm={(info) => {
      if (!serverEditScreen) return
      if (serverEditScreen === true) {
        const server: StoreServerItem = { ...info, lastJoined: Date.now() } // so it appears first
        appStorage.serversList = [server, ...(appStorage.serversList ?? serversListProvided)]
      } else {
        const index = appStorage.serversList?.indexOf(serverEditScreen)
        if (index !== undefined) {
          const { lastJoined } = appStorage.serversList![index]
          appStorage.serversList![index] = { ...info, lastJoined }
        }
      }
      setServerEditScreen(null)
    }}
    accounts={authenticatedAccounts.map(a => a.username)}
    initialData={!serverEditScreen || serverEditScreen === true ? {
      ip: quickConnectIp
    } : serverEditScreen}
    onQsConnect={(info) => {
      const connectOptions: ConnectOptions = {
        username: info.usernameOverride || getCurrentUsername() || '',
        server: normalizeIp(info.ip),
        proxy: info.proxyOverride || getConnectProxy(),
        botVersion: info.versionOverride,
        ignoreQs: true,
      }
      dispatchEvent(new CustomEvent('connect', { detail: connectOptions }))
    }}
    versions={protocolSupportedVersions}
  /> : null

  const joinServer = (overridesOrIp: BaseServerInfo | string, { shouldSave }: { shouldSave?: boolean }) => {
    let overrides: BaseServerInfo
    if (typeof overridesOrIp === 'string') {
      let msAuth = false
      const parts = overridesOrIp.split(':')
      if (parts.at(-1) === 'ms') {
        msAuth = true
        parts.pop()
      }
      const parsed = parseServerAddress(parts.join(':'))
      overrides = {
        ip: parsed.serverIpFull,
        versionOverride: parsed.version,
        authenticatedAccountOverride: msAuth ? true : undefined, // todo popup selector
      }
    } else {
      overrides = overridesOrIp
    }

    const indexOrIp = overrides.ip
    let ip = indexOrIp
    let server: StoreServerItem | undefined
    if (shouldSave === undefined) {
      // hack: inner component doesn't know of overrides for existing servers
      server = serversListSorted.find(s => s.index.toString() === indexOrIp)!
      ip = server.ip
      overrides = server
    }

    const lastJoinedUsername = serversListProvided.find(s => s.usernameOverride)?.usernameOverride
    let username = overrides.usernameOverride || getCurrentUsername() || ''
    if (!username) {
      const promptUsername = prompt('Enter username', lastJoinedUsername || '')
      if (!promptUsername) return
      username = promptUsername
    }
    let authenticatedAccount: AuthenticatedAccount | true | undefined
    if (overrides.authenticatedAccountOverride) {
      if (overrides.authenticatedAccountOverride === true) {
        authenticatedAccount = true
      } else {
        authenticatedAccount = authenticatedAccounts.find(a => a.username === overrides.authenticatedAccountOverride) ?? true
      }
    }
    const options = {
      username,
      server: normalizeIp(ip),
      proxy: overrides.proxyOverride || getConnectProxy(),
      botVersion: overrides.versionOverride ?? /* legacy */ overrides['version'],
      ignoreQs: true,
      authenticatedAccount,
      saveServerToHistory: shouldSave,
      onSuccessfulPlay () {
        if (shouldSave !== false && !serversListProvided.some(s => s.ip === ip)) {
          const newServersList: StoreServerItem[] = [
            {
              ip,
              lastJoined: Date.now(),
              versionOverride: overrides.versionOverride,
              numConnects: 1
            },
            ...serversListProvided
          ]
          setNewServersList(newServersList)
          miscUiState.loadedServerIndex = (newServersList.length - 1).toString()
        }

        if (shouldSave === undefined) { // loading saved
          // find and update
          const server = serversListProvided.find(s => s.ip === ip)
          if (server) {
            // move to top
            const newList = [...serversListProvided]
            const index = newList.indexOf(server)
            const thisItem = newList[index]
            newList.splice(index, 1)
            newList.unshift(thisItem)

            server.lastJoined = Date.now()
            server.numConnects = (server.numConnects || 0) + 1
            setNewServersList(newList)
          }
        }
      },
      serverIndex: shouldSave ? serversListProvided.length.toString() : indexOrIp // assume last
    } satisfies ConnectOptions
    dispatchEvent(new CustomEvent('connect', { detail: options }))
  }

  const shareServer = async (server: StoreServerItem) => {
    try {
      const qs = new URLSearchParams()
      qs.set('ip', server.ip)
      if (server.proxyOverride) qs.set('proxy', server.proxyOverride)
      if (server.versionOverride) qs.set('version', server.versionOverride)
      qs.set('username', server.usernameOverride ?? '')
      const shareUrl = `${window.location.origin}${window.location.pathname}?${qs.toString()}`
      await navigator.clipboard.writeText(shareUrl)
      const MESSAGE = 'Join link copied: send it to friends to join this server'
      if (EXPLICIT_SHARE_SERVER_MODE) {
        await showOptionsModal(MESSAGE, [])
      } else {
        showNotification(MESSAGE)
      }
    } catch (err) {
      console.error(err)
      showNotification('Failed to copy the join link')
    }
  }

  const serversListJsx = <ServersList
    joinServer={joinServer}
    lockedEditing={!!customServersList}
    customListTitle={customServersList ? 'Provided Servers' : undefined}
    setQuickConnectIp={setQuickConnectIp}
    onProfileClick={async () => {
      if (authenticatedAccounts.length === 0) {
        await showOptionsModal('No Microsoft accounts signed in. You sign in when joining a server that needs it, or with Account in the Advanced options of a server.', [])
        return
      }
      const username = await showOptionsModal('Signed in Microsoft accounts: pick one to sign out', authenticatedAccounts.map(a => a.username))
      if (!username) return
      appStorage.authenticatedAccounts = authenticatedAccounts.filter(a => a.username !== username)
    }}
    onServerAction={(action, key) => {
      const index = Number(key)
      if (action === 'load') {
        joinServer({ ip: key }, {})
        return
      }
      if (action === 'share') {
        const server = serversListSorted[index]
        if (server) void shareServer(server)
        return
      }
      const server = serversListProvided[index]
      if (!server) return
      if (action === 'edit') {
        setServerEditScreen(server)
      }
      if (action === 'delete') {
        void showOptionsModal(`Remove ${server.name || server.ip} from your servers?`, ['Remove']).then(confirmed => {
          if (!confirmed) return
          appStorage.serversList = appStorage.serversList!.filter(s => s !== server)
        })
      }
    }}
    onAdd={() => setServerEditScreen(true)}
    onClose={() => hideCurrentModal()}
    servers={serversListSorted.map((server): ServerListItem => {
      const additional = additionalServerData[server.ip]
      return {
        key: server.index.toString(),
        title: server.name || server.ip,
        address: server.ip,
        icon: additional?.icon,
        motd: additional?.motd ?? server.description,
        // the status API is not asked about local network addresses (only websocket servers are pinged directly): no status, not "Pinging..." forever
        status: isServerValid(server.ip, /^wss?:\/\//.test(server.ip)) ? additional ? (additional.offline ? 'offline' : 'online') : 'loading' : 'unknown',
        ping: additional?.ping,
        players: additional?.players,
        version: server.versionOverride ?? additional?.version,
        featured: !!server.isRecommended,
        overrides: server.usernameOverride ? `as ${server.usernameOverride}` : undefined,
      }
    })}
    hidden={hidden}
    onRowSelect={(key) => {
      setSelectedIndex(Number(key))
    }}
    selectedKey={String(selectedIndex)}
    retriggerFocusCounter={retriggerFocusCounter}
  />
  return <>
    {serversListJsx}
    {editModalJsx}
  </>
}

export default () => {
  const serversListQs = appQueryParams.serversList
  const [customServersList, setCustomServersList] = useState<string[] | undefined>(serversListQs ? [] : undefined)

  useEffect(() => {
    if (serversListQs) {
      if (serversListQs.startsWith('http')) {
        void fetch(serversListQs).then(async r => r.text()).then((text) => {
          const isJson = serversListQs.endsWith('.json') ? true : serversListQs.endsWith('.txt') ? false : text.startsWith('[')
          setCustomServersList(isJson ? JSON.parse(text) : text.split('\n').map(x => x.trim()).filter(x => x.trim().length > 0))
        }).catch((err) => {
          console.error(err)
          alert(`Failed to get servers list file: ${err}`)
        })
      } else {
        setCustomServersList(serversListQs.split(','))
      }
    }
  }, [serversListQs])

  const modalStack = useSnapshot(activeModalStack)
  const hasServersListModal = modalStack.some(x => x.reactType === 'serversList')
  const editServerModalActive = useIsModalActive('editServer')
  const generalSelectActive = useIsModalActive('general-select')
  // const isServersListModalActive = useIsModalActive('serversList') || (modalStack.some(x => x.reactType === 'serversList') && generalSelectActive)
  const isServersListModalActive = useIsModalActive('serversList')

  const eitherModal = isServersListModalActive || editServerModalActive
  const render = eitherModal || hasServersListModal
  return render ? <Inner hidden={!isServersListModalActive} customServersList={customServersList} /> : null
}
