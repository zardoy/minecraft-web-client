import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { useSnapshot } from 'valtio'
import {
  TextureProvider,
  ScaleProvider,
  InventoryProvider,
  InventoryWindow,
  createMineflayerConnector,
  type MineflayerBot,
} from 'minecraft-inventory/src'
import { activeModalStack, miscUiState } from '../globalState'
import { useAppScale } from '../scaleInterface'
import { getItemNameRaw } from '../mineflayer/items'
import { isInRealGameSession } from '../utils'
import { openPlayerInventory } from '../inventoryWindows'
import MessageFormattedString from './MessageFormattedString'
import SharedHudVars from './SharedHudVars'
import { textureConfig, buildItemMapper, clearInventoryCaches } from './inventory/sharedConnectorSetup'

export const BASE_HOTBAR_HEIGHT = 25

const ItemName = ({ itemKey }: { itemKey: string }) => {
  const [show, setShow] = useState(false)
  const [itemName, setItemName] = useState<Record<string, any> | string>('')

  const duration = 0.3

  const defaultStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: `calc(env(safe-area-inset-bottom) + ${bot ? bot.game.gameMode === 'creative' ? '40px' : '50px' : '50px'})`,
    left: 0,
    right: 0,
    fontSize: 10,
    textAlign: 'center',
    pointerEvents: 'none',
  }

  useEffect(() => {
    const item = bot.heldItem
    if (item) {
      const customDisplay = getItemNameRaw(item, appViewer.resourcesManager)
      if (customDisplay) {
        setItemName(customDisplay)
      } else {
        setItemName(item.displayName)
      }
    } else {
      setItemName('')
    }
    setShow(true)
    const id = setTimeout(() => {
      setShow(false)
    }, 1500)
    return () => {
      setShow(false)
      clearTimeout(id)
    }
  }, [itemKey])

  return (
    <AnimatePresence>
      {show && (
        <SharedHudVars>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration }}
            style={defaultStyle}
            className='item-display-name'
          >
            <MessageFormattedString message={itemName} />
          </motion.div>
        </SharedHudVars>
      )}
    </AnimatePresence>
  )
}

const HotbarInner = () => {
  const [itemKey, setItemKey] = useState('')
  const [textureVersion, setTextureVersion] = useState(0)
  const hasModals = useSnapshot(activeModalStack).length
  const { currentTouch, appConfig } = useSnapshot(miscUiState)
  const appScale = useAppScale()

  const supportsOffhand = !bot.supportFeature('doesntHaveOffHandSlot')
  const isMobile = currentTouch && !appConfig?.disabledCommands?.includes('general.inventory')

  const connector = useMemo(() => {
    return createMineflayerConnector(bot as MineflayerBot, {
      itemMapper: buildItemMapper(bot.version),
      hotbarOnly: true,
    })
  }, [textureVersion])

  useEffect(() => {
    return connector.subscribe((event) => {
      if (event.type === 'windowOpen') {
        openPlayerInventory()
      }
    })
  }, [connector])

  useEffect(() => {
    const controller = new AbortController()

    const heldItemChanged = () => {
      if (!bot.inventory.slots?.[bot.quickBarSlot + 36]) {
        setItemKey('')
        return
      }
      const item = bot.inventory.slots[bot.quickBarSlot + 36]!
      const itemNbt = item.nbt ? JSON.stringify(item.nbt) : ''
      setItemKey(`${item.name}_split_${item.type}_split_${item.metadata}_split_${itemNbt}_split_${JSON.stringify(item['components'] ?? [])}`)
    }
    heldItemChanged() // initial call
    bot.on('heldItemChanged' as any, heldItemChanged)

    document.addEventListener('wheel', (e) => {
      if (!isInRealGameSession()) return
      e.preventDefault()
      const newSlot = ((bot.quickBarSlot + Math.sign(e.deltaY)) % 9 + 9) % 9
      if (newSlot !== bot.quickBarSlot) bot.setQuickBarSlot(newSlot)
    }, {
      passive: false,
      signal: controller.signal,
    })

    document.addEventListener('keydown', (e) => {
      if (!isInRealGameSession()) return
      const numPressed = +((/Digit(\d)/.exec(e.code))?.[1] ?? -1)
      if (numPressed < 1 || numPressed > 9) return
      const newSlot = numPressed - 1
      if (newSlot !== bot.quickBarSlot) bot.setQuickBarSlot(newSlot)
    }, {
      passive: false,
      signal: controller.signal,
    })

    const refresh = () => {
      clearInventoryCaches()
      setTextureVersion(v => v + 1)
    }
    appViewer.resourcesManager.on('assetsTexturesUpdated', refresh)
    appViewer.resourcesManager.on('assetsInventoryReady', refresh)

    return () => {
      controller.abort()
      bot.off('heldItemChanged' as any, heldItemChanged)
      appViewer.resourcesManager.off('assetsTexturesUpdated', refresh)
      appViewer.resourcesManager.off('assetsInventoryReady', refresh)
    }
  }, [])

  return <SharedHudVars>
    <ItemName itemKey={itemKey} />
    <Portal>
      <div
        className='hotbar-fullscreen-container'
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: hasModals ? 1 : 8,
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}>
        <div
          className='hotbar'
          style={{
            position: 'absolute',
            pointerEvents: isMobile ? 'auto' : 'none',
            bottom: 'var(--hud-bottom-raw)',
          }}
        >
          <TextureProvider config={textureConfig}>
            <ScaleProvider scale={appScale}>
              <InventoryProvider connector={connector}>
                <InventoryWindow
                  type="hotbar"
                  properties={{
                    showOffhand: supportsOffhand ? 1 : 0,
                    container: isMobile ? 1 : 0,
                  }}
                />
              </InventoryProvider>
            </ScaleProvider>
          </TextureProvider>
        </div>
      </div>
    </Portal>
  </SharedHudVars>
}

export default () => {
  const [gameMode, setGameMode] = useState(bot.game?.gameMode ?? 'creative')
  useEffect(() => {
    const onGame = () => setGameMode(bot.game.gameMode)
    bot.on('game', onGame)
    return () => { bot.off('game', onGame) }
  }, [])
  return gameMode === 'spectator' ? null : <HotbarInner />
}

const Portal = ({ children, to = document.body }) => {
  return createPortal(children, to)
}
