import { useSnapshot } from 'valtio'
import { openURL } from 'minecraft-renderer/src/lib/simpleUtils'
import { hideCurrentModal } from '../globalState'
import { showInputsModal } from './SelectOption'
import Screen from './Screen'
import Button from './Button'
import { pixelartIcons } from './PixelartIcon'
import { useIsModalActive } from './utilsApp'
import { appStorage } from './appStorageProvider'
import { getProxiesData as getEffectiveProxiesData, ProxyPingIndicator } from './ServersList'

const getProxiesData = () => {
  appStorage.proxiesData ??= { ...getEffectiveProxiesData(), proxies: [...getEffectiveProxiesData().proxies] }
  return appStorage.proxiesData
}

export default () => {
  const { proxies } = useSnapshot(appStorage).proxiesData ?? getEffectiveProxiesData()
  const isActive = useIsModalActive('proxies')

  if (!isActive) return null

  const addProxy = async () => {
    const result = await showInputsModal('Add Proxy', {
      url: {
        type: 'text',
        label: 'Proxy URL',
        placeholder: 'wss://your-proxy.com'
      }
    })
    const url = result?.url.trim()
    if (!url) return

    const data = getProxiesData()
    if (data.proxies.includes(url)) return
    data.proxies.push(url)
    if (!data.selected) data.selected = url
  }

  const editProxy = async (index: number) => {
    const data = getProxiesData()
    const oldUrl = data.proxies[index]
    const result = await showInputsModal('Edit Proxy', {
      url: {
        type: 'text',
        label: 'Proxy URL',
        placeholder: 'wss://your-proxy.com',
        defaultValue: oldUrl
      }
    })
    const url = result?.url.trim()
    if (!url) return

    // list may have changed while the modal was open
    const currentIndex = data.proxies.indexOf(oldUrl)
    if (currentIndex === -1) return
    data.proxies[currentIndex] = url
    if (data.selected === oldUrl) data.selected = url
  }

  const removeProxy = (index: number) => {
    const data = getProxiesData()
    const [removed] = data.proxies.splice(index, 1)
    if (data.selected === removed) {
      data.selected = data.proxies[0] ?? ''
    }
  }

  return (
    <Screen title="Proxies" titleMarginTop={20}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: 300, maxWidth: '100%', margin: '0 auto' }}>
        <div style={{ fontSize: 8, color: 'lightgray', textAlign: 'center' }}>
          Auto-select picks the fastest working proxy from this list when connecting
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 150, overflowY: 'auto' }}>
          {proxies.length === 0 && <div style={{ color: 'gray', fontSize: 10, textAlign: 'center', padding: 12 }}>No proxies added</div>}
          {proxies.map((proxy, index) => (
            <div key={proxy} style={{ display: 'flex', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.6)', border: '1px solid #444', padding: '2px 4px 2px 6px', minHeight: 24 }}>
              <span style={{ flex: 1, fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={proxy}>{proxy}</span>
              <ProxyPingIndicator proxy={proxy} />
              <Button
                icon={pixelartIcons.edit}
                title="Edit"
                style={{ width: 20, height: 20, padding: 0 }}
                onClick={async () => editProxy(index)}
              />
              <Button
                icon={pixelartIcons.close}
                title="Remove"
                style={{ width: 20, height: 20, padding: 0, color: '#ff4444' }}
                onClick={() => removeProxy(index)}
              />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <Button style={{ flex: 1, width: 'auto' }} icon={pixelartIcons.plus} onClick={addProxy}>
            Add Proxy
          </Button>
          <Button style={{ flex: 1, width: 'auto' }} onClick={() => hideCurrentModal()}>Done</Button>
        </div>
        <div style={{ fontSize: 7, color: '#aaa', textAlign: 'center', marginTop: 4, lineHeight: 1.4 }}>
          You can self-host your own proxy in less than a minute with{' '}
          <span
            style={{ color: '#7a9cff', textDecoration: 'underline', cursor: 'pointer' }}
            onClick={() => openURL('https://github.com/zardoy/minecraft-everywhere')}
          >
            github.com/zardoy/minecraft-everywhere
          </span>
        </div>
      </div>
    </Screen>
  )
}
