import React, { useEffect, useMemo } from 'react'
import { useSnapshot } from 'valtio'
import { miscUiState, showModal } from '../globalState'
import { appQueryParams } from '../appParams'
import { proxyPingState, selectBestProxy } from '../core/proxyAutoSelect'
import Singleplayer from './Singleplayer'
import Input from './Input'
import Button from './Button'
import PixelartIcon, { pixelartIcons } from './PixelartIcon'
import Select from './Select'
import { BaseServerInfo } from './AddServerOrConnect'
import { useIsSmallWidth } from './simpleHooks'
import { appStorage, SavedProxiesData, ServerHistoryEntry } from './appStorageProvider'
import { withInjectableUi } from './extendableSystem'

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

interface Props extends React.ComponentProps<typeof Singleplayer> {
  joinServer: (info: BaseServerInfo | string, additional: {
    shouldSave?: boolean
    index?: number
  }) => void
  onProfileClick?: () => void
  setQuickConnectIp?: (ip: string) => void
}

const ProxyPingIndicator = ({ proxy }: { proxy: string }) => {
  const pingState = useSnapshot(proxyPingState).proxyStatus[proxy]
  if (!pingState) return null

  let color = 'yellow'
  let text = '...'
  if (pingState.status === 'success') {
    color = 'limegreen'
    text = `${pingState.latency}ms`
  } else if (pingState.status === 'error') {
    color = 'red'
    text = 'offline'
  }

  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 8, color: 'lightgray', flexShrink: 0 }}>
    {text}
    <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: color }} />
  </span>
}

const AUTO_OPTION = 'auto'
const MANAGE_OPTION = 'manage'

const ProxyOptionLabel = ({ value, label }: { value: string, label: string }) => {
  const icon = value === AUTO_OPTION ? pixelartIcons.reload : value === MANAGE_OPTION ? pixelartIcons.sliders : undefined
  return <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'space-between', overflow: 'hidden' }}>
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
      {icon && <PixelartIcon iconName={icon} styles={{ fontSize: 10 }} />}
      {label}
    </span>
    {!icon && <ProxyPingIndicator proxy={value} />}
  </div>
}

const ServersListBase = ({
  joinServer,
  onProfileClick,
  setQuickConnectIp,
  ...props
}: Props) => {
  const snap = useSnapshot(appStorage)
  const username = useMemo(() => getCurrentUsername(), [appQueryParams.username, appStorage.username])
  const [serverIp, setServerIp] = React.useState('')
  const [save, setSave] = React.useState(true)
  const [activeHighlight, setActiveHighlight] = React.useState(undefined as 'quick-connect' | 'server-list' | undefined)

  const updateProxies = (newData: SavedProxiesData) => {
    appStorage.proxiesData = newData
  }

  const setUsername = (username: string) => {
    appStorage.username = username
  }

  const getActiveHighlightStyles = (type: typeof activeHighlight) => {
    const styles: React.CSSProperties = {
      transition: 'filter 0.2s',
    }
    if (activeHighlight && activeHighlight !== type) {
      styles.filter = 'brightness(0.7)'
    }
    return styles
  }

  const isSmallWidth = useIsSmallWidth()

  const proxiesData = snap.proxiesData ?? getProxiesData()
  const proxiesKey = proxiesData.proxies.join('\n')
  useEffect(() => {
    if (appQueryParams.proxy || proxiesData.proxies.length === 0) return
    void selectBestProxy([...proxiesData.proxies])
  }, [proxiesKey])
  const selectedValue = proxiesData.isAutoSelect ? AUTO_OPTION : proxiesData.selected
  const shortenProxy = (proxy: string) => proxy.replace(/^(https?|wss?):\/\//, '')
  return <Singleplayer
    {...props}
    worldData={props.worldData ? props.worldData.map(world => ({
      ...world
    })) : null}
    firstRowChildrenOverride={<form
      style={{ width: '100%', display: 'flex', justifyContent: 'center' }} onSubmit={(e) => {
        e.preventDefault()
        joinServer(serverIp, { shouldSave: save })
      }}
    >
      <div
        style={{ display: 'flex', gap: 5, alignItems: 'center', ...getActiveHighlightStyles('quick-connect') }}
        className='quick-connect-row'
        onMouseEnter={() => setActiveHighlight('quick-connect')}
        onMouseLeave={() => setActiveHighlight(undefined)}
      >
        <Input
          required
          placeholder='Quick Connect IP (:version)'
          value={serverIp}
          onChange={({ target: { value } }) => {
            setQuickConnectIp?.(value)
            setServerIp(value)
          }}
          width={isSmallWidth ? 120 : 180}
          list="server-history"
          autoComplete="on"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
        />
        <datalist id="server-history">
          {[...(snap.serversHistory ?? [])].sort((a, b) => b.numConnects - a.numConnects).map((server) => (
            <option key={server.ip} value={`${server.ip}${server.version ? `:${server.version}` : ''}`} />
          ))}
        </datalist>
        <label style={{ fontSize: 10, display: 'flex', alignItems: 'center', gap: 5, height: '100%', marginTop: '-1px' }}>
          <input
            type='checkbox' checked={save}
            style={{ borderRadius: 0 }}
            onChange={({ target: { checked } }) => setSave(checked)}
          /> Save
        </label>
        <Button style={{ width: 90 }} type='submit'>Connect</Button>
      </div>
    </form>}
    searchRowChildrenOverride={
      <div style={{
        // marginTop: 12,
      }}
      >
        <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
          {isSmallWidth
            ? <PixelartIcon iconName={pixelartIcons.server} styles={{ fontSize: 14, color: 'lightgray', marginLeft: 2 }} onClick={onProfileClick} />
            : <span style={{ color: 'lightgray', fontSize: 14 }}>Proxy:</span>}
          <Select
            key={selectedValue}
            initialOptions={[
              { value: AUTO_OPTION, label: 'Auto-select' },
              ...proxiesData.proxies.map(p => ({ value: p, label: shortenProxy(p) })),
              { value: MANAGE_OPTION, label: 'Manage proxies...' }
            ]}
            defaultValue={{ value: selectedValue, label: selectedValue === AUTO_OPTION ? 'Auto-select' : shortenProxy(selectedValue) }}
            renderOption={(option) => <ProxyOptionLabel value={option.value} label={option.label} />}
            updateOptions={(newSel) => {
              if (newSel === MANAGE_OPTION) {
                showModal({ reactType: 'proxies' })
                return
              }
              if (newSel === AUTO_OPTION) {
                updateProxies({ proxies: [...proxiesData.proxies], selected: proxiesData.selected, isAutoSelect: true })
                return
              }
              if (!newSel) return
              // option may be a custom typed proxy url
              const proxies = proxiesData.proxies.includes(newSel) ? [...proxiesData.proxies] : [...proxiesData.proxies, newSel]
              updateProxies({ proxies, selected: newSel, isAutoSelect: false })
            }}
            containerStyle={{
              width: isSmallWidth ? 140 : 180,
            }}
          />
          <PixelartIcon iconName='user' styles={{ fontSize: 14, color: 'lightgray', marginLeft: 2 }} onClick={onProfileClick} />
          <Input
            rootStyles={{ width: 80 }}
            value={username}
            disabled={appQueryParams.username !== undefined}
            onChange={({ target: { value } }) => setUsername(value)}
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
          />
        </div>
      </div>
    }
    serversLayout
    onWorldAction={(action, serverName) => {
      if (action === 'load') {
        joinServer({
          ip: serverName,
        }, {})
      }
      props.onWorldAction?.(action, serverName)
    }}
    setListHovered={(hovered) => {
      setActiveHighlight(hovered ? 'server-list' : undefined)
    }}
    listStyle={getActiveHighlightStyles('server-list')}
    secondRowStyles={getActiveHighlightStyles('server-list')}
  />
}

export default withInjectableUi(ServersListBase, 'serversList')
