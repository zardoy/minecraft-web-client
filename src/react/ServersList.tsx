import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useSnapshot } from 'valtio'
import { isMobile } from 'minecraft-renderer/src/lib/simpleUtils'
import { miscUiState, showModal } from '../globalState'
import { appQueryParams } from '../appParams'
import { proxyPingState, selectBestProxy } from '../core/proxyAutoSelect'
import FlatButton from './ui/FlatButton'
import PixelartIcon from './PixelartIcon'
import MessageFormattedString from './MessageFormattedString'
import { showOptionsModal } from './SelectOption'
import { BaseServerInfo } from './AddServerOrConnect'
import { appStorage, SavedProxiesData } from './appStorageProvider'
import { withInjectableUi } from './extendableSystem'
import { ScreenDirtBg } from './Screen'
import styles from './serversList.module.css'

export const getDefaultProxies = () => {
  const { defaultProxies, defaultProxy } = miscUiState.appConfig ?? {}
  return defaultProxies?.length ? defaultProxies : defaultProxy ? [defaultProxy] : []
}

/** Saved proxies or, if user never touched them, defaults from config (auto-select when there are several) */
export const getProxiesData = (): SavedProxiesData => {
  if (appStorage.proxiesData) return appStorage.proxiesData
  const proxies = getDefaultProxies()
  return { proxies, selected: proxies[0] ?? '', isAutoSelect: proxies.length > 1 }
}

/** Proxy to use for connecting. Undefined when it should be auto-selected right before connecting */
export const getConnectProxy = (): string | undefined => {
  if (appQueryParams.proxy) return appQueryParams.proxy
  const data = getProxiesData()
  return data.isAutoSelect && data.proxies.length > 0 ? undefined : data.selected || undefined
}

/** Proxy for background requests (e.g. server list pings): in auto-select mode the fastest known one */
export const getCurrentProxy = (): string | undefined => {
  const data = getProxiesData()
  return getConnectProxy() ?? proxyPingState.selectedProxy ?? data.proxies[0]
}

export const getCurrentUsername = () => {
  return appQueryParams.username ?? appStorage.username
}

const HIGH_PING_MS = 150

const PingIndicator = ({ status, latency }: { status: 'checking' | 'success' | 'error', latency?: number }) => {
  const color = status === 'success' ? (latency! > HIGH_PING_MS ? 'greenyellow' : 'limegreen') : status === 'error' ? 'red' : 'yellow'
  const text = status === 'success' ? `${latency}ms` : status === 'error' ? 'offline' : '...'
  return <span style={{ fontSize: 8, color, flexShrink: 0 }}>{text}</span>
}

export const ProxyPingIndicator = ({ proxy }: { proxy: string }) => {
  const pingState = useSnapshot(proxyPingState).proxyStatus[proxy]
  return pingState ? <PingIndicator status={pingState.status} latency={pingState.latency} /> : null
}

// #region server rows

export interface ServerListItem {
  /** index in the provider's list, passed back in actions */
  key: string
  title: string
  address: string
  icon?: string
  /** MOTD: § formatted string or a chat component */
  motd?: string | Record<string, any>
  status: 'loading' | 'online' | 'offline' | 'unknown'
  ping?: number
  /** "12/40" */
  players?: string
  version?: string
  /** promoted by the app config, can't be edited or removed */
  featured?: boolean
  /** "username · version override" */
  overrides?: string
}

export type ServerAction = 'load' | 'edit' | 'delete' | 'share'

const SignalBars = ({ status, ping }: { status: ServerListItem['status'], ping?: number }) => {
  const level = status === 'online' ? ping === undefined ? 4 : ping < 100 ? 4 : ping < 200 ? 3 : ping < 400 ? 2 : 1 : 0
  return <span className={`${styles.bars} ${status === 'loading' ? styles.barsLoading : ''} ${status === 'offline' ? styles.barsOffline : ''}`} aria-hidden>
    {[1, 2, 3, 4].map(i => <span key={i} className={i <= level ? styles.barOn : ''} style={{ height: 2 + i * 2 }} />)}
  </span>
}

const ServerRow = ({ server, selected, lockedEditing, onSelect, onAction, rowRef }: {
  server: ServerListItem
  selected: boolean
  lockedEditing?: boolean
  onSelect: () => void
  onAction: (action: ServerAction) => void
  rowRef: (el: HTMLDivElement | null) => void
}) => {
  const statusText = server.status === 'offline' ? translate('Offline') : server.status === 'loading' ? translate('Pinging...') : server.ping === undefined ? '' : `${server.ping} ms`
  const canEdit = !server.featured && !lockedEditing
  return <div
    ref={rowRef}
    role='option'
    aria-selected={selected}
    tabIndex={0}
    className={`${styles.server} ${selected ? styles.serverSelected : ''} server-row`}
    onFocus={onSelect}
    onClick={onSelect}
    onDoubleClick={() => onAction('load')}
    onKeyDown={(e) => {
      // only the row itself: Enter on its Edit / Copy Link / Remove buttons activates them
      if (e.code === 'Enter' && e.target === e.currentTarget) {
        e.preventDefault()
        onAction('load')
      }
    }}
  >
    <div className={styles.serverMain}>
      {server.icon
        ? <img className={styles.serverIcon} src={server.icon} alt='' />
        : <div className={`${styles.serverIcon} ${styles.serverIconEmpty}`}><PixelartIcon iconName='server' /></div>}
      <div className={styles.serverInfo}>
        <div className={styles.serverTitleLine}>
          <span className={styles.serverTitle}>{server.title}</span>
          <span className={styles.serverStatus}>
            {server.players && <span className={styles.serverPlayers}><PixelartIcon iconName='users' />{server.players}</span>}
            <span className={server.status === 'offline' ? styles.offlineText : ''}>{statusText}</span>
            <SignalBars status={server.status} ping={server.ping} />
          </span>
        </div>
        <div className={styles.serverMotd}>
          {server.motd ? <MessageFormattedString message={server.motd} fallbackColor='#aaaaaa' /> : <span className={styles.muted}>{server.address}</span>}
        </div>
        {(server.version || server.overrides) && <div className={styles.serverMeta}>
          {server.motd && server.title !== server.address ? `${server.address} · ` : ''}{[server.version, server.overrides].filter(Boolean).join(' · ')}
        </div>}
      </div>
      <FlatButton
        className={styles.joinButton}
        variant='primary'
        tabIndex={-1}
        label='Join'
        onClick={(e) => {
          e.stopPropagation()
          onAction('load')
        }}
      />
    </div>
    {selected && <div className={styles.serverActions}>
      {canEdit && <FlatButton small icon='edit' label='Edit' onClick={() => onAction('edit')} />}
      <FlatButton small icon='link' label='Copy Link' onClick={() => onAction('share')} />
      {canEdit && <FlatButton small variant='danger' icon='trash' label='Remove' onClick={() => onAction('delete')} />}
      {canEdit && !isMobile() && <span className={styles.reorderHint}>{translate('Shift+↑↓ to reorder')}</span>}
    </div>}
  </div>
}

// #endregion

// #region proxy and account (footer)

const AUTO_LABEL = 'Auto-select (fastest)'
const MANAGE_LABEL = 'Manage proxies...'
const shortenProxy = (proxy: string) => proxy.replace(/^(https?|wss?):\/\//, '')

const ProxyButton = () => {
  const snap = useSnapshot(appStorage)
  const pings = useSnapshot(proxyPingState).proxyStatus
  const proxiesData = snap.proxiesData ?? getProxiesData()
  const lockedByLink = !!appQueryParams.proxy

  const proxiesKey = proxiesData.proxies.join('\n')
  useEffect(() => {
    if (appQueryParams.proxy || proxiesData.proxies.length === 0) return
    // debounce so quickly opening/closing the list doesn't ping every time (selectBestProxy also reuses recent results)
    const timeout = setTimeout(() => {
      void selectBestProxy([...proxiesData.proxies])
    }, 1000)
    return () => clearTimeout(timeout)
  }, [proxiesKey])

  const pingText = (proxy: string) => {
    const state = pings[proxy]
    if (!state) return ''
    return state.status === 'success' ? `${state.latency} ms` : state.status === 'error' ? 'offline' : '...'
  }
  const best = Object.values(pings).filter(p => p.status === 'success').map(p => p.latency!)
  const current = lockedByLink ? shortenProxy(appQueryParams.proxy!) : proxiesData.isAutoSelect ? 'Auto' : shortenProxy(proxiesData.selected || 'none')
  const currentPing = proxiesData.isAutoSelect ? (best.length ? `${Math.min(...best)} ms` : '') : pingText(proxiesData.selected)

  return <button
    type='button'
    className={styles.footerChip}
    disabled={lockedByLink}
    title={translate('Proxy: the server that connects you to Java servers from the browser. Websocket (ws://) servers do not need one.')}
    onClick={async () => {
      const labels = [AUTO_LABEL, ...proxiesData.proxies.map(p => `${shortenProxy(p)}${pingText(p) ? ` (${pingText(p)})` : ''}`), MANAGE_LABEL]
      const picked = await showOptionsModal('Connection proxy', labels, {
        descriptions: ['Pings the proxies and uses the fastest one', ...proxiesData.proxies.map(() => ''), 'Add your own proxy or remove one'],
        hoveredOptionIndex: proxiesData.isAutoSelect ? 0 : proxiesData.proxies.indexOf(proxiesData.selected) + 1,
      })
      if (!picked) return
      if (picked === MANAGE_LABEL) {
        showModal({ reactType: 'proxies' })
        return
      }
      if (picked === AUTO_LABEL) {
        appStorage.proxiesData = { proxies: [...proxiesData.proxies], selected: proxiesData.selected, isAutoSelect: true }
        return
      }
      const proxy = proxiesData.proxies[labels.indexOf(picked) - 1]
      appStorage.proxiesData = { proxies: [...proxiesData.proxies], selected: proxy, isAutoSelect: false }
    }}
  >
    <PixelartIcon iconName='cellular-signal-3' />
    <span className={styles.footerChipLabel}>{translate('Proxy')}:</span>
    <span className={styles.footerChipValue}>{current}</span>
    {currentPing && <span className={styles.footerChipPing}>{currentPing}</span>}
  </button>
}

const UsernameField = ({ onAccountsClick }: { onAccountsClick?: () => void }) => {
  const snap = useSnapshot(appStorage)
  // read through the snapshot so typing re-renders the field
  const username = appQueryParams.username ?? snap.username ?? ''
  const locked = appQueryParams.username !== undefined
  const valid = /^\w{3,16}$/.test(username)
  return <label className={styles.username} title={translate('Name used on offline (cracked) servers. Servers with Microsoft login use your account name.')}>
    <PixelartIcon iconName='user' className={styles.usernameIcon} />
    <input
      value={username}
      disabled={locked}
      placeholder={translate('Username')}
      maxLength={16}
      autoComplete='off'
      autoCorrect='off'
      autoCapitalize='off'
      spellCheck={false}
      className={valid || !username ? '' : styles.invalid}
      onChange={({ target: { value } }) => { appStorage.username = value }}
    />
    {snap.authenticatedAccounts.length > 0 && <button type='button' className={styles.accountsButton} title={translate('Signed in Microsoft accounts')} onClick={onAccountsClick}>
      <PixelartIcon iconName='shield' />{snap.authenticatedAccounts.length}
    </button>}
  </label>
}

// #endregion

interface Props {
  /** null while loading */
  servers: ServerListItem[] | null
  joinServer: (info: BaseServerInfo | string, additional: {
    shouldSave?: boolean
    index?: number
  }) => void
  onServerAction: (action: ServerAction, key: string) => void
  onAdd: () => void
  onClose: () => void
  onProfileClick?: () => void
  setQuickConnectIp?: (ip: string) => void
  onRowSelect?: (key: string) => void
  selectedKey?: string
  retriggerFocusCounter?: number
  lockedEditing?: boolean
  hidden?: boolean
  /** "Provided servers" title for lists from the page link */
  customListTitle?: string
}

const ServersListBase = ({
  servers,
  joinServer,
  onServerAction,
  onAdd,
  onClose,
  onProfileClick,
  setQuickConnectIp,
  onRowSelect,
  selectedKey,
  retriggerFocusCounter,
  lockedEditing,
  hidden,
  customListTitle,
}: Props) => {
  const snap = useSnapshot(appStorage)
  const [serverIp, setServerIp] = useState('')
  const [save, setSave] = useState(true)
  const [search, setSearch] = useState('')
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (selectedKey === undefined || hidden) return
    const el = rowRefs.current[selectedKey]
    if (el && document.activeElement !== el && !(document.activeElement instanceof HTMLInputElement)) el.focus({ preventScroll: true })
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedKey, retriggerFocusCounter, hidden])

  const filtered = useMemo(() => {
    const words = search.trim().toLowerCase()
    if (!servers || !words) return servers
    return servers.filter(s => `${s.title} ${s.address}`.toLowerCase().includes(words))
  }, [servers, search])

  const saved = filtered?.filter(s => !s.featured) ?? []
  const featured = filtered?.filter(s => s.featured) ?? []
  const ordered = [...saved, ...featured]

  const moveSelection = (dir: 1 | -1) => {
    if (ordered.length === 0) return
    const index = ordered.findIndex(s => s.key === selectedKey)
    const next = ordered[Math.max(0, Math.min(ordered.length - 1, index + dir))]
    if (next) rowRefs.current[next.key]?.focus()
  }

  const renderGroup = (title: string, list: ServerListItem[], action?: React.ReactNode) => <>
    <div className={styles.groupHeader}>
      <span>{translate(title)} <span className={styles.muted}>{list.length}</span></span>
      {action}
    </div>
    {list.map(server => <ServerRow
      key={server.key}
      server={server}
      selected={server.key === selectedKey}
      lockedEditing={lockedEditing}
      rowRef={el => { rowRefs.current[server.key] = el }}
      onSelect={() => onRowSelect?.(server.key)}
      onAction={action => onServerAction(action, server.key)}
    />)}
  </>

  return <div hidden={hidden}>
    <ScreenDirtBg />
    <div className={`fullscreen ${styles.root} servers-screen`}>
      <div className={styles.panel}>
        <div className={styles.header}>
          <FlatButton icon='chevron-left' title={translate('Back')} onClick={onClose} />
          <span className={styles.title}>{translate('Multiplayer')}</span>
          <UsernameField onAccountsClick={onProfileClick} />
        </div>

        <form
          className={styles.quickConnect}
          onSubmit={(e) => {
            e.preventDefault()
            if (!serverIp.trim()) return
            joinServer(serverIp.trim(), { shouldSave: save })
          }}
        >
          <label className={styles.addressField}>
            <PixelartIcon iconName='server' className={styles.addressIcon} />
            <input
              value={serverIp}
              placeholder={translate('Server address, e.g. play.example.net')}
              list='server-history'
              autoComplete='on'
              autoCorrect='off'
              autoCapitalize='off'
              spellCheck={false}
              onChange={({ target: { value } }) => {
                setQuickConnectIp?.(value)
                setServerIp(value)
              }}
            />
            <datalist id='server-history'>
              {[...(snap.serversHistory ?? [])].sort((a, b) => b.numConnects - a.numConnects).map((server) => (
                <option key={server.ip} value={`${server.ip}${server.version ? `:${server.version}` : ''}`} />
              ))}
            </datalist>
          </label>
          <button
            type='button'
            role='checkbox'
            aria-checked={save}
            className={`${styles.saveToggle} ${save ? styles.saveToggleOn : ''}`}
            title={translate('Add the server to your list after joining')}
            onClick={() => setSave(!save)}
          >
            <span className={styles.checkbox}>{save && <PixelartIcon iconName='check' />}</span>{translate('Save')}
          </button>
          <FlatButton type='submit' variant='primary' className={styles.connectButton} label='Join' />
        </form>
        <div className={styles.quickHint}>{translate('Add :version to force one, e.g. mc.example.net:1.20.4. Websocket servers start with ws:// or wss://')}</div>

        <div
          className={styles.list}
          ref={listRef}
          role='listbox'
          onKeyDown={(e) => {
            if (e.shiftKey) return // reordering, handled by the provider
            if (e.code === 'ArrowDown' || e.code === 'ArrowUp') {
              e.preventDefault()
              moveSelection(e.code === 'ArrowDown' ? 1 : -1)
            }
          }}
        >
          {filtered
            ? <>
              {(saved.length > 0 || !lockedEditing) && renderGroup(
                customListTitle ?? 'Your Servers',
                saved,
                !lockedEditing && <FlatButton small variant='primary' icon='plus' label='Add Server' onClick={onAdd} />
              )}
              {saved.length === 0 && !lockedEditing && !search && <div className={styles.emptyGroup}>
                {translate('Servers you join or add appear here.')}
              </div>}
              {featured.length > 0 && renderGroup('Featured', featured)}
              {search && ordered.length === 0 && <div className={styles.empty}>{translate('No servers match')}</div>}
            </>
            : <div className={styles.empty}>{translate('Loading servers...')}</div>}
        </div>

        <div className={styles.footer}>
          <ProxyButton />
          {((servers?.length ?? 0) > 6 || search) && <label className={styles.filter}>
            <PixelartIcon iconName='search' />
            <input value={search} placeholder={translate('Filter')} onChange={e => setSearch(e.target.value)} />
          </label>}
        </div>
      </div>
    </div>
  </div>
}

export default withInjectableUi(ServersListBase, 'serversList')
