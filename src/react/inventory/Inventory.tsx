import { TextureProvider, ScaleProvider, InventoryProvider, InventoryOverlay, createMineflayerConnector, MineflayerBot, InventoryOverlayProps } from 'minecraft-inventory/src'
import { useMemo } from 'react'
import { proxy, useSnapshot } from 'valtio'
import { useAppScale } from '../../scaleInterface'

export const openInventoryProxy = proxy({
  inventory: undefined as InventoryOverlayProps | undefined,
})

export const Inventory = () => {
  const windowType = 'player'
  const connector = useMemo(() => createMineflayerConnector(bot as MineflayerBot), [bot])
  const appScale = useAppScale()
  const { inventory } = useSnapshot(openInventoryProxy) as typeof openInventoryProxy

  if (!inventory) return null

  return <div style={{
    position: 'fixed',
    inset: 0,
    width: '100%',
    height: '100dvh',
    zIndex: 1000,
    // backgroundColor: 'rgba(0, 0, 0, 0.5)',
  }}>
    <TextureProvider>
      <ScaleProvider scale={appScale}>
        <InventoryProvider connector={connector}>
          <InventoryOverlay
            showJEI
            {...inventory}
          />
        </InventoryProvider>
      </ScaleProvider>
    </TextureProvider>
  </div>
}
