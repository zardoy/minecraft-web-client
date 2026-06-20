import { useRef, useEffect, useState } from 'react'
import { miscUiState } from '../globalState'
import { DrawerAdapter } from './MinimapDrawer'
import Fullmap from './Fullmap'

export type DisplayMode = 'fullmapOnly' | 'minimapOnly'

export default ({
  adapter,
  showMinimap,
  showFullmap,
  singleplayer,
  fullMap,
  toggleFullMap,
  displayMode
}: {
  adapter: DrawerAdapter
  showMinimap: string
  showFullmap: string
  singleplayer: boolean
  fullMap?: boolean
  toggleFullMap?: () => void
  displayMode?: DisplayMode
}) => {
  const full = useRef(false)
  const canvasTick = useRef(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0, z: 0 })
  const lastUpdate = useRef(0)
  const THROTTLE_MS = 50 // 20fps

  const updateMap = () => {
    const now = Date.now()
    if (now - lastUpdate.current < THROTTLE_MS) return
    lastUpdate.current = now

    setPosition({ x: adapter.playerPosition.x, y: adapter.playerPosition.y, z: adapter.playerPosition.z })
    if (adapter.mapDrawer) {
      if (!full.current) {
        rotateMap()
        adapter.mapDrawer.draw(adapter.playerPosition)
        adapter.mapDrawer.drawPlayerPos()
        adapter.mapDrawer.drawWarps()
      }
      if (canvasTick.current % 300 === 0 && !fullMap) {
        if ('requestIdleCallback' in window) {
          requestIdleCallback(() => {
            adapter.mapDrawer?.clearChunksStore()
          })
        } else {
          adapter.mapDrawer.clearChunksStore()
        }
        canvasTick.current = 0
      }
    }
    canvasTick.current += 1
  }

  const updateWarps = () => {}

  const rotateMap = () => {
    if (!adapter.mapDrawer) return
    adapter.mapDrawer.canvas.style.transform = `rotate(${adapter.yaw}rad)`
    adapter.mapDrawer.yaw = adapter.yaw
  }

  useEffect(() => {
    if (canvasRef.current && adapter.mapDrawer && !miscUiState.displayFullmap) {
      adapter.mapDrawer.canvas = canvasRef.current
      adapter.mapDrawer.full = false
    }
  }, [canvasRef.current, miscUiState.displayFullmap])

  useEffect(() => {
    adapter.on('updateMap', updateMap)
    adapter.on('updateWaprs', updateWarps)

    return () => {
      adapter.off('updateMap', updateMap)
      adapter.off('updateWaprs', updateWarps)
    }
  }, [adapter])

  return fullMap && displayMode !== 'minimapOnly' && ((showFullmap === 'singleplayer' && singleplayer) || showFullmap === 'always') ? (
    <Fullmap toggleFullMap={toggleFullMap} adapter={adapter} />
  ) : displayMode !== 'fullmapOnly' && ((showMinimap === 'singleplayer' && singleplayer) || showMinimap === 'always') ? (
    <div
      className="minimap"
      style={{
        position: 'absolute',
        right: '0px',
        top: '0px',
        padding: '5px 5px 0px 0px',
        textAlign: 'center',
        zIndex: 7
      }}
      onClick={() => {
        toggleFullMap?.()
      }}
    >
      <canvas
        style={{
          transition: '0.5s',
          transitionTimingFunction: 'ease-out',
          borderRadius: '1000px'
        }}
        width={80}
        height={80}
        ref={canvasRef}
      />
      <div
        style={{
          fontSize: '0.5em',
          textShadow:
            '0.1em 0 black, 0 0.1em black, -0.1em 0 black, 0 -0.1em black, -0.1em -0.1em black, -0.1em 0.1em black, 0.1em -0.1em black, 0.1em 0.1em black'
        }}
      >
        {Math.round(position.x)} {Math.round(position.y)} {Math.round(position.z)}
      </div>
    </div>
  ) : null
}
