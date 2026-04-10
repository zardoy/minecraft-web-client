import { createPortal } from 'react-dom'
import { useEffect, useMemo, useCallback, useState } from 'react'
import { useSnapshot } from 'valtio'
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
import { activeModalStack, hideCurrentModal } from '../../globalState'
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

  // Recreate connector when textures refresh so itemMapper re-extracts sprites
  const connector = useMemo(() => {
    if (!inventoryType) return null
    return createMineflayerConnector(bot as MineflayerBot, {
      itemMapper: buildItemMapper(bot.version),
      formatTitle: formatWindowTitle,
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

  const jeiEnabled = options.jeiEnabled === true
    || (Array.isArray(options.jeiEnabled) && options.jeiEnabled.includes(bot.game?.gameMode as any))

  const jeiItems = useMemo(
    (): JEIItem[] => (inventoryType && jeiEnabled ? getJeiItems() : []),
    [!!inventoryType, jeiEnabled],
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
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000 }}>
      <TextureProvider config={textureConfig}>
        <ScaleProvider scale={appScale}>
          <InventoryProvider connector={connector} noPlaceholders>
            <InventoryOverlay
              type={inventoryType}
              showJEI={jeiEnabled}
              jeiItems={jeiEnabled ? jeiItems : []}
              jeiOnGetRecipes={handleGetRecipes}
              jeiOnGetUsages={handleGetUsages}
              jeiOnItemClick={gameMode === 'creative' ? handleJeiItemClick : undefined}
              jeiOnItemRightClick={gameMode === 'creative' ? handleJeiItemRightClick : undefined}
              onClose={handleClose}
              renderEntity={renderEntity}
              enableNotes
            />
          </InventoryProvider>
        </ScaleProvider>
      </TextureProvider>
    </div>,
    document.body,
  )
}
