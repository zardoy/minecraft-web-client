import { Vec3 } from 'vec3'
import { useRef, useEffect, useState, CSSProperties, Dispatch, SetStateAction } from 'react'
import { WorldWarp } from 'flying-squid/dist/lib/modules/warps'
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from 'react-zoom-pan-pinch'
import { MinimapDrawer, DrawerAdapter, ChunkInfo } from './MinimapDrawer'
import Button from './Button'
import Input from './Input'
import './Fullmap.css'


type FullmapProps = {
  toggleFullMap: () => void,
  adapter: DrawerAdapter,
  drawer: MinimapDrawer | null,
  canvasRef: any
}

export default ({ toggleFullMap, adapter }: FullmapProps) => {
  const [grid, setGrid] = useState(() => new Set<string>())
  const zoomRef = useRef<ReactZoomPanPinchRef>(null)
  const redrawCell = useRef(false)
  const [lastWarpPos, setLastWarpPos] = useState({ x: 0, y: 0, z: 0 })
  const stateRef = useRef({ scale: 1, positionX: 0, positionY: 0 })
  const cells = useRef({ columns: 0, rows: 0 })
  const [isWarpInfoOpened, setIsWarpInfoOpened] = useState(false)
  const [initWarp, setInitWarp] = useState<WorldWarp | undefined>(undefined)
  const [warpPreview, setWarpPreview] = useState<{ name: string, x: number, z: number, clientX: number, clientY: number } | undefined>(undefined)

  const updateGrid = () => {
    const wrapperRect = zoomRef.current?.instance.wrapperComponent?.getBoundingClientRect()
    if (!wrapperRect) return
    const cellSize = 64
    const columns = Math.ceil(wrapperRect.width / (cellSize * stateRef.current.scale))
    const rows = Math.ceil(wrapperRect.height / (cellSize * stateRef.current.scale))
    cells.current.rows = rows
    cells.current.columns = columns
    const leftBorder = - Math.floor(stateRef.current.positionX / (stateRef.current.scale * cellSize)) * cellSize
    const topBorder = - Math.floor(stateRef.current.positionY / (stateRef.current.scale * cellSize)) * cellSize
    const newGrid = new Set<string>()
    for (let row = -1; row < rows; row += 1) {
      for (let col = -1; col < columns; col += 1) {
        const x = leftBorder + col * cellSize
        const y = topBorder + row * cellSize
        newGrid.add(`${x},${y}`)
      }
    }
    setGrid(newGrid)
  }

  useEffect(() => {
    adapter.full = true
    console.log('[fullmap] set full property to true')
    updateGrid()
  }, [])

  return <div
    style={{
      position: 'fixed',
      isolation: 'isolate',
      inset: '0px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      zIndex: 100
    }}
  >
    {window.screen.width > 500 ? <div
      style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        zIndex: '-1'
      }}
      onClick={toggleFullMap}
    />
      : <Button
        icon="close-box"
        onClick={toggleFullMap}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          zIndex: 1
        }}
      />}
    <TransformWrapper
      limitToBounds={false}
      ref={zoomRef}
      minScale={0.1}
      doubleClick={{
        disabled: false
      }}
      panning={{
        allowLeftClickPan: true,
        allowRightClickPan: false
      }}
      onTransformed={(ref, state) => {
        stateRef.current = { ...state }
      }}
      onPanningStop={() => {
        updateGrid()
      }}
      onZoomStop={() => {
        updateGrid()
      }}
    >
      <TransformComponent
        wrapperClass="map"
        wrapperStyle={{
          willChange: 'transform',
        }}
      >
        {[...grid].map((cellCoords) => {
          const [x, y] = cellCoords.split(',').map(Number)
          const playerChunkLeft = Math.floor(adapter.playerPosition.x / 16) * 16
          const playerChunkTop = Math.floor(adapter.playerPosition.z / 16) * 16
          const wrapperRect = zoomRef.current?.instance.wrapperComponent?.getBoundingClientRect()
          const offsetX = Math.floor((wrapperRect?.width ?? 0) / (8 * 16)) * 16
          const offsetY = Math.floor((wrapperRect?.height ?? 0) / (8 * 16)) * 16

          return <MapChunk
            key={'mapcell:' + cellCoords}
            x={x}
            y={y}
            scale={stateRef.current.scale}
            adapter={adapter}
            worldX={playerChunkLeft + x / 4 - offsetX}
            worldZ={playerChunkTop + y / 4 - offsetY}
            setIsWarpInfoOpened={setIsWarpInfoOpened}
            setLastWarpPos={setLastWarpPos}
            redraw={redrawCell.current}
            setInitWarp={setInitWarp}
            setWarpPreview={setWarpPreview}
          />
        })}
      </TransformComponent>
    </TransformWrapper>
    {warpPreview && <div
      style={{
        position: 'absolute',
        top: warpPreview.clientY - 70,
        left: warpPreview.clientX - 70,
        textAlign: 'center',
        fontSize: '1.5em',
        textShadow: '0.1em 0 black, 0 0.1em black, -0.1em 0 black, 0 -0.1em black, -0.1em -0.1em black, -0.1em 0.1em black, 0.1em -0.1em black, 0.1em 0.1em black'
      } as any}
    >
      {warpPreview.name}
      <div>
        {warpPreview.x} {warpPreview.z}
      </div>
    </div>}
    {
      isWarpInfoOpened && <WarpInfo
        adapter={adapter}
        warpPos={lastWarpPos}
        setIsWarpInfoOpened={setIsWarpInfoOpened}
        afterWarpIsSet={() => {
          redrawCell.current = !redrawCell.current
        }}
        initWarp={initWarp}
        setInitWarp={setInitWarp}
        toggleFullMap={toggleFullMap}
      />
    }
  </div>
}


const MapChunk = (
  { x, y, scale, adapter, worldX, worldZ, setIsWarpInfoOpened, setLastWarpPos, redraw, setInitWarp, setWarpPreview }:
  {
    x: number,
    y: number,
    scale: number,
    adapter: DrawerAdapter,
    worldX: number,
    worldZ: number,
    setIsWarpInfoOpened: (x: boolean) => void,
    setLastWarpPos: (obj: { x: number, y: number, z: number }) => void,
    redraw?: boolean
    setInitWarp?: (warp: WorldWarp | undefined) => void
    setWarpPreview?: (warpInfo) => void
  }
) => {
  const containerRef = useRef(null)
  const drawerRef = useRef<MinimapDrawer | null>(null)
  const touchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isCanvas, setIsCanvas] = useState(false)

  const longPress = (e) => {
    touchTimer.current = setTimeout(() => {
      touchTimer.current = null
      handleClick(e)
    }, 500)
  }

  const cancel = () => {
    if (touchTimer.current) clearTimeout(touchTimer.current)
  }

  const handleClick = (e: MouseEvent | TouchEvent) => {
    // console.log('click:', e)
    if (!drawerRef.current) return
    let clientX: number
    let clientY: number
    if ('buttons' in e && e.button === 2) {
      clientX = e.clientX
      clientY = e.clientY
    } else if ('changedTouches' in e) {
      clientX = (e).changedTouches[0].clientX
      clientY = (e).changedTouches[0].clientY
    } else { return }
    const [x, z] = getXZ(clientX, clientY)
    const mapX = Math.floor(x + worldX)
    const mapZ = Math.floor(z + worldZ)
    const y = adapter.getHighestBlockY(mapX, mapZ)
    drawerRef.current.setWarpPosOnClick(new Vec3(mapX, y, mapZ))
    setLastWarpPos(drawerRef.current.lastWarpPos)
    const { lastWarpPos } = drawerRef.current
    const initWarp = adapter.warps.find(warp => Math.hypot(lastWarpPos.x - warp.x, lastWarpPos.z - warp.z) < 2)
    setInitWarp?.(initWarp)
    setIsWarpInfoOpened(true)
  }

  const getXZ = (clientX: number, clientY: number) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const factor = scale * (drawerRef.current?.mapPixel ?? 1)
    const x = (clientX - rect.left) / factor
    const y = (clientY - rect.top) / factor
    return [x, y]
  }

  const handleMouseMove = (e: MouseEvent) => {
    const [x, z] = getXZ(e.clientX, e.clientY)
    const warp = adapter.warps.find(w => Math.hypot(w.x - x - worldX, w.z - z - worldZ) < 2)
    setWarpPreview?.(
      warp ? { name: warp.name, x: warp.x, z: warp.z, clientX: e.clientX, clientY: e.clientY } : undefined
    )
  }

  const handleRedraw = (key?: string, chunk?: ChunkInfo) => {
    if (key !== `${worldX / 16},${worldZ / 16}`) return
    adapter.mapDrawer.canvas = canvasRef.current!
    adapter.mapDrawer.full = true
    // console.log('handle redraw:', key)
    // if (chunk) {
    //   drawerRef.current?.chunksStore.set(key, chunk)
    // }
    if (!adapter.chunksStore.has(key)) {
      adapter.chunksStore.set(key, 'requested')
      void adapter.loadChunk(key)
      return
    }
    const timeout = setTimeout(() => {
      const center = new Vec3(worldX + 8, 0, worldZ + 8)
      drawerRef.current!.lastBotPos = center
      drawerRef.current?.drawChunk(key)
      // drawerRef.current?.drawWarps(center)
      // drawerRef.current?.drawPlayerPos(center.x, center.z)
      clearTimeout(timeout)
    }, 100)
  }

  useEffect(() => {
    // if (canvasRef.current && !drawerRef.current) {
    //   drawerRef.current = adapter.mapDrawer
    // } else if (canvasRef.current && drawerRef.current) {
    // }
    if (canvasRef.current) void adapter.drawChunkOnCanvas(`${worldX / 16},${worldZ / 16}`, canvasRef.current)
  }, [canvasRef.current])

  useEffect(() => {
    canvasRef.current?.addEventListener('contextmenu', handleClick)
    canvasRef.current?.addEventListener('touchstart', longPress)
    canvasRef.current?.addEventListener('touchend', cancel)
    canvasRef.current?.addEventListener('touchmove', cancel)
    canvasRef.current?.addEventListener('mousemove', handleMouseMove)

    return () => {
      canvasRef.current?.removeEventListener('contextmenu', handleClick)
      canvasRef.current?.removeEventListener('touchstart', longPress)
      canvasRef.current?.removeEventListener('touchend', cancel)
      canvasRef.current?.removeEventListener('touchmove', cancel)
      canvasRef.current?.removeEventListener('mousemove', handleMouseMove)
    }
  }, [canvasRef.current, scale])

  useEffect(() => {
    // handleRedraw()
  }, [drawerRef.current, redraw])

  useEffect(() => {
    const intersectionObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          setIsCanvas(true)
        }
      }
    })
    intersectionObserver.observe(containerRef.current!)

    // adapter.on('chunkReady', handleRedraw)

    return () => {
      intersectionObserver.disconnect()
      // adapter.off('chunkReady', handleRedraw)
    }
  }, [])

  return <div
    ref={containerRef}
    style={{
      position: 'absolute',
      width: '64px',
      height: '64px',
      top: `${y}px`,
      left: `${x}px`,
    }}
  >
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        imageRendering: 'pixelated'
      }}
      width={64}
      height={64}
    />
  </div>
}

const WarpInfo = (
  { adapter, warpPos, setIsWarpInfoOpened, afterWarpIsSet, initWarp, toggleFullMap }:
  {
    adapter: DrawerAdapter,
    warpPos: { x: number, y: number, z: number },
    setIsWarpInfoOpened: Dispatch<SetStateAction<boolean>>,
    afterWarpIsSet?: () => void
    initWarp?: WorldWarp,
    setInitWarp?: React.Dispatch<React.SetStateAction<WorldWarp | undefined>>,
    toggleFullMap?: ({ command }: { command: string }) => void
  }
) => {
  const [warp, setWarp] = useState<WorldWarp>(initWarp ?? {
    name: '',
    x: warpPos?.x ?? 100,
    y: warpPos?.y ?? 100,
    z: warpPos?.z ?? 100,
    color: '',
    disabled: false,
    world: adapter.world
  })

  const posInputStyle: CSSProperties = {
    flexGrow: '1',
  }
  const fieldCont: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '5px'
  }

  const updateChunk = () => {
    for (let i = -1; i < 2; i += 1) {
      for (let j = -1; j < 2; j += 1) {
        adapter.emit(
          'chunkReady',
          `${Math.floor(warp.x / 16) + j},${Math.floor(warp.z / 16) + i}`
        )
      }
    }
  }

  const tpNow = () => {
    adapter.off('updateChunk', tpNow)
  }

  const quickTp = () => {
    toggleFullMap?.({ command: 'ui.toggleMap' })
    adapter.quickTp?.(warp.x, warp.z)
  }

  return <div
    style={{
      position: 'absolute',
      inset: '0px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'column',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      fontSize: '0.8em',
      transform: 'scale(2)'
    }}
  >
    <form
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        width: window.screen.width > 500 ? '100%' : '50%',
        minWidth: '100px',
        maxWidth: '300px',
        padding: '20px',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        border: '2px solid black'
      }}
    >
      <h2 style={{ alignSelf: 'center' }}>Point on the map</h2>
      <div style={fieldCont}>
        <div>
          Name:
        </div>
        <Input
          defaultValue={warp.name}
          onChange={(e) => {
            if (!e.target) return
            setWarp(prev => { return { ...prev, name: e.target.value } })
          }}
          autoFocus
        />
      </div>
      <div style={fieldCont}>
        <div>
          X:
        </div>
        <Input
          rootStyles={posInputStyle}
          defaultValue={warp.x ?? 100}
          onChange={(e) => {
            if (!e.target) return
            setWarp(prev => { return { ...prev, x: Number(e.target.value) } })
          }}
        />
        <div>
          Z:
        </div>
        <Input
          rootStyles={posInputStyle}
          defaultValue={warp.z ?? 100}
          onChange={(e) => {
            if (!e.target) return
            setWarp(prev => { return { ...prev, z: Number(e.target.value) } })
          }}
        />
      </div>
      <div style={fieldCont}>
        <div>Color:</div>
        <Input
          type='color'
          defaultValue={warp.color === '' ? '#232323' : warp.color}
          onChange={(e) => {
            if (!e.target) return
            setWarp(prev => { return { ...prev, color: e.target.value } })
          }}
          rootStyles={{ width: '30px', }}
          style={{ left: '0px' }}
        />
      </div>
      <div style={fieldCont} >
        <label htmlFor='warp-disabled'>Disabled:</label>
        <input
          id='warp-disabled'
          type="checkbox"
          checked={warp.disabled ?? false}
          onChange={(e) => {
            if (!e.target) return
            setWarp(prev => { return { ...prev, disabled: e.target.checked } })
          }}
        />
      </div>
      <Button
        style={{ alignSelf: 'center' }}
        onClick={() => {
          quickTp()
        }}
      >Quick TP</Button>
      <div style={fieldCont}>
        <Button
          onClick={() => {
            setIsWarpInfoOpened(false)
          }}
        >Cancel</Button>
        <Button
          onClick={() => {
            adapter.setWarp({ ...warp })
            console.log(adapter.warps)
            setIsWarpInfoOpened(false)
            updateChunk()
            afterWarpIsSet?.()
          }}
          type='submit'
        >Add Warp</Button>
        {initWarp && <Button
          onClick={() => {
            const index = adapter.warps.findIndex(thisWarp => thisWarp.name === warp.name)
            if (index !== -1) {
              adapter.setWarp({ name: warp.name, x: 0, y: 0, z: 0, color: '', disabled: false, world: '' }, true)
              setIsWarpInfoOpened(false)
              updateChunk()
              afterWarpIsSet?.()
            }
          }}
        >Delete</Button>}
      </div>
    </form>
  </div>
}
