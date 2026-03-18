import { TextureProvider, ScaleProvider, InventoryProvider, InventoryOverlay, createMineflayerConnector, MineflayerBot, InventoryOverlayProps } from 'minecraft-inventory/src'
import { useMemo } from 'react'
import { proxy, useSnapshot } from 'valtio'
import { localTexturesConfig } from 'minecraft-inventory/src/generated/localTextures'
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
  }}>
    <TextureProvider config={localTexturesConfig}>
      <ScaleProvider scale={appScale}>
        <InventoryProvider connector={connector}>
          <InventoryOverlay
            showJEI
            enableNotes
            {...inventory}
          />
        </InventoryProvider>
      </ScaleProvider>
    </TextureProvider>
  </div>
}
