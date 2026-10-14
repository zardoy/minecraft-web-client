import { useMemo } from 'react'
import { useSnapshot } from 'valtio'
import { appQueryParams } from '../appParams'
import { ConnectOptions } from '../connect'
import { lastConnectOptions } from '../appStatus'
import PixelartIcon, { pixelartIcons } from './PixelartIcon'
import { useIsModalActive } from './utilsApp'
import Button from './Button'

const VERTICAL_LAYOUT = false

export default () => {
  const { ip, version, proxy, username, connectText } = appQueryParams
  const isModalActive = useIsModalActive('only-connect-server')

  if (!isModalActive) return null

  const handleConnect = () => {
    const connectOptions: ConnectOptions = {
      username: username || '',
      server: ip,
      proxy,
      botVersion: version,
    }
    window.dispatchEvent(new CustomEvent('connect', { detail: connectOptions }))
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'rgba(0, 0, 0, 0.25)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        display: 'flex',
        gap: '40px',
        alignItems: 'center',
        background: 'rgba(0, 0, 0, 0.5)',
        padding: VERTICAL_LAYOUT ? '15px 40px' : '25px',
        // paddingRight: VERTICAL_LAYOUT ? '0' : '40px',
        borderRadius: '5px',
        flexDirection: VERTICAL_LAYOUT ? 'column' : 'row',
      }}>
        <div style={{
          color: 'white',
          fontSize: '13px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
            <PixelartIcon iconName={pixelartIcons.server} width={16} />
            <span style={{ marginLeft: '8px' }}>{ip}</span>
            {proxy && <span style={{ marginLeft: '8px', color: 'lightgray' }}>({proxy})</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <PixelartIcon iconName={pixelartIcons.user} width={16} />
            <span style={{ marginLeft: '8px' }}>{username}</span>
            {version && <span style={{ marginLeft: '8px', color: 'lightgray' }}>({version})</span>}
          </div>
        </div>
        <Button
          onClick={handleConnect}
          style={{
            width: 'auto',
            padding: '0 12px',
            transform: 'scale(1.4)',
            transformOrigin: 'center'
          }}
        >
          {connectText || 'Connect'}
        </Button>
      </div>
    </div>
  )
}
