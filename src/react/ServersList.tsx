import React, { useMemo } from 'react'
import { useSnapshot } from 'valtio'
import { miscUiState } from '../globalState'
import { appQueryParams } from '../appParams'
import Singleplayer from './Singleplayer'
import Input from './Input'
import Button from './Button'
import PixelartIcon, { pixelartIcons } from './PixelartIcon'
import Select from './Select'
import { BaseServerInfo } from './AddServerOrConnect'
import { useIsSmallWidth } from './simpleHooks'
import { appStorage, SavedProxiesData, ServerHistoryEntry } from './appStorageProvider'
import { withInjectableUi } from './extendableSystem'

const getInitialProxies = () => {
  const proxies = [] as string[]
  if (miscUiState.appConfig?.defaultProxy) {
    proxies.push(miscUiState.appConfig.defaultProxy)
  }
  return proxies
}

export const getCurrentProxy = (): string | undefined => {
  return appQueryParams.proxy ?? appStorage.proxiesData?.selected ?? getInitialProxies()[0]
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

  const initialProxies = getInitialProxies()
  const proxiesData = snap.proxiesData ?? { proxies: initialProxies, selected: initialProxies[0] }
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
            initialOptions={proxiesData.proxies.map(p => { return { value: p, label: p } })}
            defaultValue={{ value: proxiesData.selected, label: proxiesData.selected }}
            updateOptions={(newSel) => {
              updateProxies({ proxies: [...proxiesData.proxies], selected: newSel })
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
