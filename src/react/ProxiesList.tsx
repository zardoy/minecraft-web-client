import { useSnapshot } from 'valtio'
import { openURL } from 'minecraft-renderer/src/lib/simpleUtils'
import { hideCurrentModal } from '../globalState'
import { showInputsModal } from './SelectOption'
import Screen from './Screen'
import Button from './Button'
import { pixelartIcons } from './PixelartIcon'
import { useIsModalActive } from './utilsApp'
import { appStorage } from './appStorageProvider'
import { getInitialProxies } from './ServersList'

const getProxiesData = () => {
  if (!appStorage.proxiesData) {
    const proxies = getInitialProxies()
    appStorage.proxiesData = { proxies, selected: proxies[0] ?? '' }
  }
  return appStorage.proxiesData
}

export default () => {
  const proxies = useSnapshot(appStorage).proxiesData?.proxies ?? getInitialProxies()
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
    <Screen title="Proxies">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {proxies.map((proxy, index) => (
            <div key={proxy} style={{ display: 'flex', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.5)', padding: 5 }}>
              <span style={{ flex: 1 }}>{proxy}</span>
              <Button
                icon={pixelartIcons.edit}
                style={{ width: 24, height: 24, padding: 0 }}
                onClick={async () => editProxy(index)}
              />
              <Button
                icon={pixelartIcons.close}
                style={{ width: 24, height: 24, padding: 0, color: '#ff4444' }}
                onClick={() => removeProxy(index)}
              />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Button
            style={{ flex: 1 }}
            onClick={addProxy}
          >
            Add Proxy
          </Button>
          <span style={{ fontSize: 6, color: '#aaa' }}>
            Note: You can self-host your own proxy in less than a minute with the script from
          </span>
          <Button
            style={{ fontSize: 6, padding: '2px 4px' }}
            onClick={() => openURL('https://github.com/zardoy/minecraft-everywhere')}
          >
            github.com/zardoy/minecraft-everywhere
          </Button>
        </div>
        <Button onClick={() => hideCurrentModal()}>Done</Button>
      </div>
    </Screen>
  )
}
