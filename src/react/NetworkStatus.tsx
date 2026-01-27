import { useEffect, useMemo, useState, useRef } from 'react'
import { parseServerAddress } from '../parseServerAddress'
import { lastConnectOptions } from '../appStatus'
import PixelartIcon, { pixelartIcons } from './PixelartIcon'
import styles from './NetworkStatus.module.css'

export default () => {
  const [proxyPing, setProxyPing] = useState<number | null>(null)
  const [serverPing, setServerPing] = useState<number | null>(null)
  const [isProxyStale, setIsProxyStale] = useState(false)
  const [isServerStale, setIsServerStale] = useState(false)

  const proxyTimeoutRef = useRef<NodeJS.Timeout>()
  const serverTimeoutRef = useRef<NodeJS.Timeout>()

  const isWebSocket = useMemo(() => parseServerAddress(lastConnectOptions.value?.server).isWebSocket, [lastConnectOptions.value?.server])
  const serverIp = useMemo(() => lastConnectOptions.value?.server, [])

  const setProxyPingWithTimeout = (ping: number | null) => {
    setProxyPing(ping)
    setIsProxyStale(false)
    if (proxyTimeoutRef.current) clearTimeout(proxyTimeoutRef.current)
    proxyTimeoutRef.current = setTimeout(() => setIsProxyStale(true), 1000)
  }

  const setServerPingWithTimeout = (ping: number | null) => {
    setServerPing(ping)
    setIsServerStale(false)
    if (serverTimeoutRef.current) clearTimeout(serverTimeoutRef.current)
    serverTimeoutRef.current = setTimeout(() => setIsServerStale(true), 1000)
  }

  useEffect(() => {
    if (!serverIp) return

    const updatePing = async () => {
      const updateServerPing = async () => {
        const ping = await bot.pingServer()
        if (ping) {
          setServerPingWithTimeout(ping)
        }
      }

      const updateProxyPing = async () => {
        if (!isWebSocket) {
          const ping = await bot.pingProxy()
          setProxyPingWithTimeout(ping)
        }
      }

      try {
        await Promise.all([updateServerPing(), updateProxyPing()])
      } catch (err) {
        console.error('Failed to ping:', err)
      }
    }

    void updatePing()
    const interval = setInterval(updatePing, 1000)
    return () => {
      clearInterval(interval)
      if (proxyTimeoutRef.current) clearTimeout(proxyTimeoutRef.current)
      if (serverTimeoutRef.current) clearTimeout(serverTimeoutRef.current)
    }
  }, [])

  if (!serverIp) return null

  const { username } = bot
  const { proxy: proxyUrl } = lastConnectOptions.value!
  const pingTotal = serverPing

  const ICON_SIZE = 18

  return (
    <div className={`${styles.container} ${isWebSocket ? styles.websocket : ''}`}>
      <PixelartIcon className={styles.iconRow} iconName={pixelartIcons.user} width={ICON_SIZE} />
      {!isWebSocket && (
        <>
          <PixelartIcon className={`${styles.iconRow} ${styles.arrowRow}`} iconName={pixelartIcons['arrow-right']} width={16} />
          <PixelartIcon className={styles.iconRow} iconName={pixelartIcons.server} width={ICON_SIZE} />
        </>
      )}
      <PixelartIcon className={`${styles.iconRow} ${styles.arrowRow}`} iconName={pixelartIcons['arrow-right']} width={16} />
      <PixelartIcon className={styles.iconRow} iconName={pixelartIcons['list-box']} width={ICON_SIZE} />

      <span className={styles.dataRow}>{username}</span>
      {!isWebSocket && (
        <>
          <span className={`${styles.dataRow} ${styles.ping} ${isProxyStale ? styles.stale : ''}`}>{proxyPing}ms</span>
          <span className={styles.dataRow}>{proxyUrl}</span>
        </>
      )}
      <span className={`${styles.dataRow} ${styles.ping} ${isServerStale ? styles.stale : ''}`}>
        {isWebSocket ? (pingTotal || '?') : (pingTotal ? pingTotal - (proxyPing ?? 0) : '...')}ms
      </span>
      <span className={styles.dataRow}>{serverIp}</span>

      <span className={styles.totalRow}>Ping: {pingTotal || '?'}ms</span>
    </div>
  )
}
