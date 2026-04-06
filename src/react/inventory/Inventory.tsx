import { createPortal } from 'react-dom'
import { useEffect, useMemo, useCallback, useRef, useState } from 'react'
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
import { buildItemMapper, textureConfig, clearInventoryCaches, formatWindowTitle } from './sharedConnectorSetup'
import { modelViewerState } from '../OverlayModelViewer'

export { clearInventoryCaches } from './sharedConnectorSetup'

// ----- Entity model bridge -----

function InventoryEntityBridge({ width, height }: { width: number; height: number }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const rect = el.getBoundingClientRect()
    const skinUrl = (appViewer?.playerState?.reactive as any)?.playerSkin ?? ''

    modelViewerState.model = {
      steveModelSkin: skinUrl,
      positioning: {
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      },
      zIndex: 1001,
      followCursor: true,
      followCursorCenter: {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      },
    }

    return () => {
      modelViewerState.model = undefined
    }
  }, [width, height])

  return <div ref={ref} style={{ width: '100%', height: '100%' }} />
}

// ----- Inventory component -----

export const Inventory = () => {
  const appScale = useAppScale()
  const [textureVersion, setTextureVersion] = useState(0)

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

  const handleClose = useCallback(() => {
    connector?.sendAction({ type: 'close' })
    hideCurrentModal()
  }, [connector])

  const renderEntity = useCallback((w: number, h: number) => {
    return <InventoryEntityBridge width={w} height={h} />
  }, [])

  if (!inventoryType || !connector) return null

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000 }}>
      <TextureProvider config={textureConfig}>
        <ScaleProvider scale={appScale}>
          <InventoryProvider connector={connector}>
            <InventoryOverlay
              type={inventoryType}
              showJEI={jeiEnabled}
              jeiItems={jeiEnabled ? jeiItems : []}
              jeiOnGetRecipes={handleGetRecipes}
              jeiOnGetUsages={handleGetUsages}
              onClose={handleClose}
              renderEntity={renderEntity}
              noWatermark
            />
          </InventoryProvider>
        </ScaleProvider>
      </TextureProvider>
    </div>,
    document.body,
  )
}
