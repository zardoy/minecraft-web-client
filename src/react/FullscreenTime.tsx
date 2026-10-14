import { useEffect, useState } from 'react'
import { useSnapshot } from 'valtio'
import { options } from '../optionsStorage'
import { miscUiState } from '../globalState'
import PixelartIcon, { pixelartIcons } from './PixelartIcon'

interface BatteryManager extends EventTarget {
  charging: boolean
  chargingTime: number
  dischargingTime: number
  level: number
  addEventListener(type: 'chargingchange' | 'levelchange', listener: EventListener): void
  removeEventListener(type: 'chargingchange' | 'levelchange', listener: EventListener): void
}

declare global {
  interface Navigator {
    getBattery(): Promise<BatteryManager>
  }
}

export default () => {
  const [fullScreen, setFullScreen] = useState(false)
  const { topRightTimeDisplay } = useSnapshot(options)
  if (topRightTimeDisplay === 'never') return null
  return <FullscreenTime />
}

const FullscreenTime = () => {
  const { topRightTimeDisplay } = useSnapshot(options)
  const { fullscreen } = useSnapshot(miscUiState)
  const [time, setTime] = useState('')
  const [batteryInfo, setBatteryInfo] = useState<{ level: number, charging: boolean } | null>(null)

  useEffect(() => {
    // Update time every second
    const updateTime = () => {
      const now = new Date()
      const hours = now.getHours().toString().padStart(2, '0')
      const minutes = now.getMinutes().toString().padStart(2, '0')
      setTime(`${hours}:${minutes}`)
    }
    updateTime()
    const timeInterval = setInterval(updateTime, 1000)

    // Get battery info if available
    if ('getBattery' in navigator) {
      void navigator.getBattery().then(battery => {
        const updateBatteryInfo = () => {
          setBatteryInfo({
            level: Math.round(battery.level * 100),
            charging: battery.charging
          })
        }
        updateBatteryInfo()
        battery.addEventListener('levelchange', updateBatteryInfo)
        battery.addEventListener('chargingchange', updateBatteryInfo)
        return () => {
          battery.removeEventListener('levelchange', updateBatteryInfo)
          battery.removeEventListener('chargingchange', updateBatteryInfo)
        }
      })
    }

    return () => {
      clearInterval(timeInterval)
    }
  }, [])

  if (topRightTimeDisplay === 'only-fullscreen' && !fullscreen) return null

  return (
    <div
      className='top-right-time'
      style={{
        position: 'fixed',
        top: 'env(safe-area-inset-top, 5px)',
        right: 'env(safe-area-inset-right, 5px)',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '1px 3px',
        background: 'rgba(0, 0, 0, 0.75)',
        borderRadius: '2px',
        fontSize: 8,
        color: 'white',
        fontFamily: 'minecraft, mojangles, monospace',
        zIndex: 1,
        pointerEvents: 'none'
      }}
    >
      <span>{time}</span>
      {batteryInfo && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <PixelartIcon
            iconName={getBatteryIcon(batteryInfo.level, batteryInfo.charging)}
            styles={{ fontSize: 10 }}
          />
          <span>{batteryInfo.level}%</span>
        </div>
      )}
    </div>
  )
}

const getBatteryIcon = (level: number, charging: boolean) => {
  if (charging) return pixelartIcons['battery-charging']
  if (level > 60) return pixelartIcons['battery-full']
  if (level > 20) return pixelartIcons['battery-2']
  if (level > 5) return pixelartIcons['battery-1']
  return pixelartIcons['battery']
}
