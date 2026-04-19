import { createPortal } from 'react-dom'
import { useEffect, useMemo, useCallback, useState } from 'react'
import { useSnapshot } from 'valtio'
import PItem from 'prismarine-item'
import {
  TextureProvider,
  ScaleProvider,
  InventoryProvider,
  InventoryOverlay,
  createMineflayerConnector,
  type MineflayerBot,
  type JEIItem,
  type RecipeGuide,
} from 'minecraft-inventory/src'
import { useAppScale } from '../../scaleInterface'
import { activeModalStack, hideCurrentModal, openOptionsMenu } from '../../globalState'
import { options } from '../../optionsStorage'
import { getJeiItems, getItemRecipes, getItemUsages } from '../../inventoryWindows'
import { PlayerModelViewer } from './PlayerModelViewer'
import { buildItemMapper, textureConfig, clearInventoryCaches, formatWindowTitle } from './sharedConnectorSetup'

export { clearInventoryCaches } from './sharedConnectorSetup'


// ----- Inventory component -----

export const Inventory = () => {
  const appScale = useAppScale()
  const [textureVersion, setTextureVersion] = useState(0)
  const [gameMode, setGameMode] = useState(bot.game?.gameMode ?? '')

  useEffect(() => {
    const onGame = () => setGameMode(bot.game.gameMode)
    bot.on('game', onGame)
    return () => { bot.removeListener('game', onGame) }
  }, [])

  const modalStack = useSnapshot(activeModalStack) as Array<{ reactType: string }>
  const activeInvModal = useMemo(
    () => modalStack.findLast(m => m.reactType.startsWith('player_win:')),
    [modalStack],
  )
  const inventoryType = activeInvModal?.reactType.replace('player_win:', '') ?? null
  // Hide inventory overlay when another modal (e.g. settings) is stacked on top
  const isInventoryOnTop = modalStack.at(-1)?.reactType === activeInvModal?.reactType

  // Recreate connector when textures refresh so itemMapper re-extracts sprites
  const connector = useMemo(() => {
    if (!inventoryType) return null
    const Item = PItem(bot.version)
    return createMineflayerConnector(bot as MineflayerBot, {
      itemMapper: buildItemMapper(bot.version),
      formatTitle: formatWindowTitle,
      computeAnvilCost (item1, item2) {
        if (!item1) return null
        try {
          const result = Item.anvil(item1 as any, item2 as any, bot.game.gameMode === 'creative', undefined)
          return result.xpCost
        } catch (e) {
          return null
        }
      },
    })
  }, [textureVersion, !!inventoryType])

  // Destroy connector on unmount — handles E-key close (unmount without handleClose)
  useEffect(() => {
    if (!connector) return
    return () => {
      connector.sendAction({ type: 'close' })
    }
  }, [connector])

  // Clear caches and force connector refresh on resource-pack changes
  useEffect(() => {
    const refresh = () => {
      clearInventoryCaches()
      setTextureVersion(v => v + 1)
    }
    appViewer.resourcesManager.on('assetsTexturesUpdated', refresh)
    appViewer.resourcesManager.on('assetsInventoryReady', refresh)
    return () => {
      appViewer.resourcesManager.off('assetsTexturesUpdated', refresh)
      appViewer.resourcesManager.off('assetsInventoryReady', refresh)
    }
  }, [])

  const jeiEnabled = options.inventoryJei === true
    || (Array.isArray(options.inventoryJei) && options.inventoryJei.includes(bot.game?.gameMode as any))
  const inventoryNotesEnabled = options.inventoryNotes
  const inventoryPlaceholdersEnabled = options.inventoryPlaceholders
  const inventoryPlayerModelEnabled = options.inventoryPlayerModel

  // Defer JEI mount by 2 animation frames so the inventory window appears first
  const [jeiReady, setJeiReady] = useState(false)
  useEffect(() => {
    if (!inventoryType || !jeiEnabled) {
      setJeiReady(false)
      return
    }
    let cancelled = false
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!cancelled) setJeiReady(true)
      })
    })
    return () => { cancelled = true }
  }, [!!inventoryType, jeiEnabled])

  const jeiItems = useMemo(
    (): JEIItem[] => (jeiReady ? getJeiItems() : []),
    [jeiReady, textureVersion],
  )

  const handleGetRecipes = useCallback(
    (item: JEIItem): RecipeGuide[] => getItemRecipes(item.name),
    [],
  )
  const handleGetUsages = useCallback(
    (item: JEIItem): RecipeGuide[] => getItemUsages(item.name),
    [],
  )

  const handleJeiItemGive = useCallback((item: JEIItem, count: number) => {
    if (!item.type || !loadedData.items[item.type]) return
    const PrismarineItem = require('prismarine-item')(bot.version)
    const pItem = new PrismarineItem(item.type, count, item.metadata ?? 0)
    const freeSlot = bot.inventory.firstEmptyInventorySlot()
    if (freeSlot === null) return
    bot._client.write('set_creative_slot', {
      slot: freeSlot,
      item: PrismarineItem.toNotch(pItem)
    })
    // @ts-expect-error _setSlot is private
    bot._setSlot(freeSlot, pItem)
  }, [])

  const handleJeiItemClick = useCallback((item: JEIItem) => handleJeiItemGive(item, 1), [handleJeiItemGive])
  const handleJeiItemRightClick = useCallback((item: JEIItem) => handleJeiItemGive(item, 64), [handleJeiItemGive])

  const handleClose = useCallback(() => {
    connector?.sendAction({ type: 'close' })
    hideCurrentModal()
  }, [connector])

  const renderEntity = useCallback((w: number, h: number) => {
    return <PlayerModelViewer width={w} height={h} />
  }, [])

  if (!inventoryType || !connector) return null

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: isInventoryOnTop ? undefined : 'none' }}>
      <TextureProvider config={textureConfig}>
        <ScaleProvider scale={appScale}>
          <InventoryProvider
            connector={connector}
            noPlaceholders={!inventoryPlaceholdersEnabled}
            resolveEnchantmentName={(id) => (globalThis as any).loadedData?.enchantments?.[id]?.displayName}
          >
            <InventoryOverlay
              type={inventoryType}
              showJEI={jeiEnabled && jeiReady}
              jeiItems={jeiReady ? jeiItems : []}
              jeiOnGetRecipes={handleGetRecipes}
              jeiOnGetUsages={handleGetUsages}
              jeiOnItemClick={gameMode === 'creative' ? handleJeiItemClick : undefined}
              jeiOnItemRightClick={gameMode === 'creative' ? handleJeiItemRightClick : undefined}
              onClose={handleClose}
              renderEntity={inventoryPlayerModelEnabled ? renderEntity : undefined}
              enableNotes={inventoryNotesEnabled}
              onOpenSettings={() => openOptionsMenu('inventory')}
            />
          </InventoryProvider>
        </ScaleProvider>
      </TextureProvider>
    </div>,
    document.body,
  )
}
