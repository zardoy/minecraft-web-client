import { useRef, useEffect, useState } from 'react'
import { MinimapDrawer, DrawerAdapter, ChunkInfo } from './MinimapDrawer'
import Fullmap from './Fullmap'


export type DisplayMode = 'fullmapOnly' | 'minimapOnly'

export default (
  { adapter, showMinimap, showFullmap, singleplayer, fullMap, toggleFullMap, displayMode }:
  {
    adapter: DrawerAdapter,
    showMinimap: string,
    showFullmap: string,
    singleplayer: boolean,
    fullMap?: boolean,
    toggleFullMap?: ({ command }: { command: string }) => void
    displayMode?: DisplayMode
  }
) => {
  const full = useRef(false)
  const canvasTick = useRef(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const warpsAndPartsCanvasRef = useRef<HTMLCanvasElement>(null)
  const playerPosCanvasRef = useRef<HTMLCanvasElement>(null)
  const warpsDrawerRef = useRef<MinimapDrawer | null>(null)
  const drawerRef = useRef<MinimapDrawer | null>(null)
  const playerPosDrawerRef = useRef<MinimapDrawer | null>(null)
  const [position, setPosition] = useState({ x: 0, y: 0, z: 0 })

  const updateMap = () => {
    setPosition({ x: adapter.playerPosition.x, y: adapter.playerPosition.y, z: adapter.playerPosition.z })
    if (drawerRef.current) {
      if (!full.current) {
        rotateMap()
        drawerRef.current.draw(adapter.playerPosition)
        drawerRef.current.drawPlayerPos()
        drawerRef.current.drawWarps()
      }
      if (canvasTick.current % 300 === 0 && !fullMap) {
        if ('requestIdleCallback' in window) {
          requestIdleCallback(() => {
            drawerRef.current?.clearChunksStore()
          })
        } else {
          drawerRef.current.clearChunksStore()
        }
        canvasTick.current = 0
      }
    }
    canvasTick.current += 1
  }

  const updateWarps = () => { }

  const rotateMap = () => {
    if (!drawerRef.current) return
    drawerRef.current.canvas.style.transform = `rotate(${adapter.yaw}rad)`
    if (!warpsDrawerRef.current) return
    warpsDrawerRef.current.canvas.style.transform = `rotate(${adapter.yaw}rad)`
  }

  const updateChunkOnMap = (key: string, chunk: ChunkInfo) => {
    adapter.chunksStore.set(key, chunk)
  }

  useEffect(() => {
    if (canvasRef.current && !drawerRef.current) {
      drawerRef.current = adapter.mapDrawer
      drawerRef.current.canvas = canvasRef.current
      // drawerRef.current.adapter.on('chunkReady', updateChunkOnMap)
    } else if (canvasRef.current && drawerRef.current) {
      drawerRef.current.canvas = canvasRef.current
    }

  }, [canvasRef.current])

  // useEffect(() => {
  //   if (warpsAndPartsCanvasRef.current && !warpsDrawerRef.current) {
  //     warpsDrawerRef.current = new MinimapDrawer(warpsAndPartsCanvasRef.current, adapter)
  //   } else if (warpsAndPartsCanvasRef.current && warpsDrawerRef.current) {
  //     warpsDrawerRef.current.canvas = warpsAndPartsCanvasRef.current
  //   }
  // }, [warpsAndPartsCanvasRef.current])

  // useEffect(() => {
  //   if (playerPosCanvasRef.current && !playerPosDrawerRef.current) {
  //     playerPosDrawerRef.current = new MinimapDrawer(playerPosCanvasRef.current, adapter)
  //   } else if (playerPosCanvasRef.current && playerPosDrawerRef.current) {
  //     playerPosDrawerRef.current.canvas = playerPosCanvasRef.current
  //   }
  // }, [playerPosCanvasRef.current])

  useEffect(() => {
    adapter.on('updateMap', updateMap)
    adapter.on('updateWaprs', updateWarps)

    return () => {
      adapter.off('updateMap', updateMap)
      adapter.off('updateWaprs', updateWarps)
    }
  }, [adapter])

  useEffect(() => {
    return () => {
      // if (drawerRef.current) drawerRef.current.adapter.off('chunkReady', updateChunkOnMap)
    }
  }, [])

  return fullMap && displayMode !== 'minimapOnly' && (showFullmap === 'singleplayer' && singleplayer || showFullmap === 'always')
    ? <Fullmap
      toggleFullMap={() => {
        toggleFullMap?.({ command: 'ui.toggleMap' })
      }}
      adapter={adapter}
      drawer={drawerRef.current}
      canvasRef={canvasRef}
    />
    : displayMode !== 'fullmapOnly' && (showMinimap === 'singleplayer' && singleplayer || showMinimap === 'always')
      ? <div
        className='minimap'
        style={{
          position: 'absolute',
          right: '0px',
          top: '0px',
          padding: '5px 5px 0px 0px',
          textAlign: 'center',
        }}
        onClick={() => {
          toggleFullMap?.({ command: 'ui.toggleMap' })
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
        <canvas
          style={{
            transition: '0.5s',
            transitionTimingFunction: 'ease-out',
            position: 'absolute',
            left: '0px'
          }}
          width={80}
          height={80}
          ref={warpsAndPartsCanvasRef}
        />
        <canvas
          style={{
            transition: '0.5s',
            transitionTimingFunction: 'ease-out',
            position: 'absolute',
            left: '0px'
          }}
          width={80}
          height={80}
          ref={playerPosCanvasRef}
        />
        <div
          style={{
            fontSize: '0.5em',
            textShadow: '0.1em 0 black, 0 0.1em black, -0.1em 0 black, 0 -0.1em black, -0.1em -0.1em black, -0.1em 0.1em black, 0.1em -0.1em black, 0.1em 0.1em black'
          }}
        >
          {position.x.toFixed(2)} {position.y.toFixed(2)} {position.z.toFixed(2)}
        </div>
      </div> : null
}
