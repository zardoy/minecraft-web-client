import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { subscribe, useSnapshot } from 'valtio'
import { openItemsCanvas, upInventoryItems } from '../inventoryWindows'
import { activeModalStack, isGameActive, miscUiState } from '../globalState'
import { currentScaling } from '../scaleInterface'
import { watchUnloadForCleanup } from '../gameUnload'
import { getItemNameRaw } from '../mineflayer/items'
import { isInRealGameSession } from '../utils'
import { triggerCommand } from '../controls'
import MessageFormattedString from './MessageFormattedString'
import SharedHudVars from './SharedHudVars'

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
  const container = useRef<HTMLDivElement>(null!)
  const [itemKey, setItemKey] = useState('')
  const hasModals = useSnapshot(activeModalStack).length
  const { currentTouch, appConfig } = useSnapshot(miscUiState)
  const mobileOpenInventory = currentTouch && !appConfig?.disabledCommands?.includes('general.inventory')

  useEffect(() => {
    const controller = new AbortController()

    const inv = openItemsCanvas('HotbarWin', {
      _client: {
        write () {}
      },
      clickWindow (slot, mouseButton, mode) {
        if (mouseButton === 1) {
          console.log('right click')
          return
        }
        const hotbarSlot = slot - bot.inventory.hotbarStart
        if (hotbarSlot < 0 || hotbarSlot > 8) return
        bot.setQuickBarSlot(hotbarSlot)
      },
    } as any)
    const { canvasManager } = inv
    inv.inventory.supportsOffhand = !bot.supportFeature('doesntHaveOffHandSlot')
    inv.pwindow.disablePicking = true

    canvasManager.children[0].disableHighlight = true
    canvasManager.minimizedWindow = true
    canvasManager.minimizedWindow = true

    function setSize () {
      canvasManager.setScale(currentScaling.scale)

      canvasManager.windowHeight = BASE_HOTBAR_HEIGHT * canvasManager.scale
      canvasManager.windowWidth = (210 - (inv.inventory.supportsOffhand ? 0 : 25) + (mobileOpenInventory ? 28 : 0)) * canvasManager.scale
    }
    setSize()
    watchUnloadForCleanup(subscribe(currentScaling, setSize))
    inv.canvas.style.pointerEvents = 'auto'
    container.current.appendChild(inv.canvas)
    const upHotbarItems = () => {
      if (!appViewer.resourcesManager?.itemsAtlasParser) return
      globalThis.debugHotbarItems = upInventoryItems(true, inv)
    }

    canvasManager.canvas.onclick = (e) => {
      if (!isGameActive(true)) return
      const pos = inv.canvasManager.getMousePos(inv.canvas, e)
      if (canvasManager.canvas.width - pos.x < 35 * inv.canvasManager.scale && mobileOpenInventory) {
        triggerCommand('general.inventory', true)
        triggerCommand('general.inventory', false)
      }
    }

    globalThis.debugUpHotbarItems = upHotbarItems
    upHotbarItems()
    bot.inventory.on('updateSlot', upHotbarItems)
    appViewer.resourcesManager.on('assetsTexturesUpdated', upHotbarItems)
    appViewer.resourcesManager.on('assetsInventoryReady', () => {
      upHotbarItems()
    })

    const setSelectedSlot = (index: number) => {
      if (index === bot.quickBarSlot) return
      bot.setQuickBarSlot(index)
      if (!bot.inventory.slots?.[bot.quickBarSlot + 36]) setItemKey('')
    }
    const heldItemChanged = () => {
      inv.inventory.activeHotbarSlot = bot.quickBarSlot

      if (!bot.inventory.slots?.[bot.quickBarSlot + 36]) {
        setItemKey('')
        return
      }
      const item = bot.inventory.slots[bot.quickBarSlot + 36]!
      const itemNbt = item.nbt ? JSON.stringify(item.nbt) : ''
      setItemKey(`${item.name}_split_${item.type}_split_${item.metadata}_split_${itemNbt}_split_${JSON.stringify(item['components'] ?? [])}`)
    }
    heldItemChanged()
    bot.on('heldItemChanged' as any, heldItemChanged)

    document.addEventListener('wheel', (e) => {
      if (!isInRealGameSession()) return
      e.preventDefault()
      const newSlot = ((bot.quickBarSlot + Math.sign(e.deltaY)) % 9 + 9) % 9
      setSelectedSlot(newSlot)
    }, {
      passive: false,
      signal: controller.signal
    })

    document.addEventListener('keydown', (e) => {
      if (!isInRealGameSession()) return
      const numPressed = +((/Digit(\d)/.exec(e.code))?.[1] ?? -1)
      if (numPressed < 1 || numPressed > 9) return
      setSelectedSlot(numPressed - 1)
    }, {
      passive: false,
      signal: controller.signal
    })

    let touchStart = 0
    document.addEventListener('touchstart', (e) => {
      if ((e.target as HTMLElement).closest('.hotbar')) {
        touchStart = Date.now()
      } else {
        touchStart = 0
      }
    })
    document.addEventListener('touchend', (e) => {
      if (touchStart && (e.target as HTMLElement).closest('.hotbar') && Date.now() - touchStart > 700) {
        triggerCommand('general.dropStack', true)
        triggerCommand('general.dropStack', false)
      }
      touchStart = 0
    })

    return () => {
      inv.destroy()
      controller.abort()
      appViewer.resourcesManager.off('assetsTexturesUpdated', upHotbarItems)
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
          width: '100dvw',
          height: '100dvh',
          zIndex: hasModals ? 1 : 8,
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}>
        <div
          className='hotbar'
          ref={container}
          style={{
            position: 'absolute',
            pointerEvents: 'none',
            bottom: 'var(--hud-bottom-raw)'
          }}
        />
      </div>
    </Portal>
  </SharedHudVars>
}

export default () => {
  const [gameMode, setGameMode] = useState(bot.game?.gameMode ?? 'creative')
  useEffect(() => {
    bot.on('game', () => {
      setGameMode(bot.game.gameMode)
    })
  }, [])

  return gameMode === 'spectator' ? null : <HotbarInner />
}

const Portal = ({ children, to = document.body }) => {
  return createPortal(children, to)
}
