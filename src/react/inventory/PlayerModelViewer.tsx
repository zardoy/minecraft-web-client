import { useEffect, useState } from 'react'
import { subscribeKey } from 'valtio/utils'
import { loadSkinFromUsername } from '../../../renderer/viewer/lib/utils/skins'
import { PlayerModelCanvas } from '../OverlayModelViewer'

/**
 * Thin wrapper around PlayerModelCanvas that handles skin resolution:
 * 1. Uses appViewer.playerState.reactive.playerSkin when available (reactive, updates on change)
 * 2. Falls back to loadSkinFromUsername(bot.username) when no local skin is set
 */
export function PlayerModelViewer ({ width, height }: { width: number; height: number }) {
  const [skinUrl, setSkinUrl] = useState<string>(() => appViewer?.playerState?.reactive?.playerSkin ?? '')

  useEffect(() => {
    const reactive = appViewer?.playerState?.reactive
    if (!reactive) return

    // Keep skinUrl in sync with playerState changes (e.g. resource pack swap, skin update)
    const unsubscribe = subscribeKey(reactive, 'playerSkin', (skin) => {
      if (skin) setSkinUrl(skin)
    })

    // If there is no locally cached skin, fetch it from Mojang by username
    if (!reactive.playerSkin) {
      void loadSkinFromUsername(bot.username, 'skin').then(url => {
        if (url) setSkinUrl(url)
      })
    }

    return unsubscribe
  }, [])

  return <PlayerModelCanvas width={width} height={height} skinUrl={skinUrl} followCursor />
}
