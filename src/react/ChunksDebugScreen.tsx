import { useState } from 'react'
import { useUtilsEffect } from '@zardoy/react-util'
import { Vec3 } from 'vec3'
import { generateSpiralMatrix } from 'flying-squid/dist/utils'
import { appViewer } from '../appViewer'
import Screen from './Screen'
import ChunksDebug, { ChunkDebug } from './ChunksDebug'
import { useIsModalActive } from './utilsApp'
import { useRendererChunksDebugState } from './useRendererChunksDebugState'

const Inner = () => {
  const [playerX, setPlayerX] = useState(Math.floor(appViewer.worldView!.lastPos.x / 16) * 16)
  const [playerZ, setPlayerZ] = useState(Math.floor(appViewer.worldView!.lastPos.z / 16) * 16)
  const [update, setUpdate] = useState(0)
  const { worldView } = appViewer
  const { loadedSectionsChunks, loadedChunks: rendererLoadedChunks, finishedChunks: rendererFinishedChunks } = useRendererChunksDebugState(update)

  useUtilsEffect(({ interval }) => {
    const up = () => {
      // setUpdate(u => u + 1)
    }
    bot.on('chunkColumnLoad', up)
    interval(
      500,
      () => {
        setPlayerX(Math.floor(worldView!.lastPos.x / 16) * 16)
        setPlayerZ(Math.floor(worldView!.lastPos.z / 16) * 16)
        setUpdate(u => u + 1)
      }
    )
    return () => {
      bot.removeListener('chunkColumnLoad', up)
    }
  }, [])

  // Track first load time for all chunks
  const allLoadTimes = Object.values(worldView!.debugChunksInfo)
    .map(chunk => chunk?.loads[0]?.time ?? Infinity)
    .filter(time => time !== Infinity)
    .sort((a, b) => a - b)

  const allSpiralChunks = Object.fromEntries(generateSpiralMatrix(worldView!.viewDistance).map(pos => [`${pos[0]},${pos[1]}`, pos]))

  const mapChunk = (key: string, state: ChunkDebug['state']): ChunkDebug => {
    const x = Number(key.split(',')[0])
    const z = Number(key.split(',')[1])
    const chunkX = Math.floor(x / 16)
    const chunkZ = Math.floor(z / 16)

    delete allSpiralChunks[`${chunkX},${chunkZ}`]
    const chunk = worldView!.debugChunksInfo[key]
    const firstLoadTime = chunk?.loads[0]?.time
    const loadIndex = firstLoadTime ? allLoadTimes.indexOf(firstLoadTime) + 1 : 0
    // const timeSinceFirstLoad = firstLoadTime ? firstLoadTime - allLoadTimes[0] : 0
    const timeSinceFirstLoad = firstLoadTime ? firstLoadTime - allLoadTimes[0] : 0
    let line = ''
    let line2 = ''
    if (loadIndex) {
      line = `${loadIndex}`
      line2 = `${timeSinceFirstLoad}ms`
    }
    if (chunk?.loads.length > 1) {
      line += ` - ${chunk.loads.length}`
    }

    return {
      x,
      z,
      state,
      lines: [line, line2],
      sidebarLines: [
        `loads: ${chunk?.loads?.map(l => `${l.reason} ${l.dataLength} ${l.time}`).join('\n')}`,
        // `blockUpdates: ${chunk.blockUpdates}`,
      ],
    }
  }

  const chunksWaitingServer = Object.keys(worldView!.waitingSpiralChunksLoad).map(key => mapChunk(key, 'server-waiting'))

  const chunksWaitingClient = Object.keys(worldView!.loadedChunks).map(key => mapChunk(key, 'client-waiting'))

  const clientProcessingChunks = Object.keys(rendererLoadedChunks).map(key => mapChunk(key, 'client-processing'))

  const chunksDoneEmpty = Object.keys(rendererFinishedChunks)
    .filter(chunkPos => !loadedSectionsChunks[chunkPos])
    .map(key => mapChunk(key, 'done-empty'))

  const chunksDone = Object.keys(rendererFinishedChunks).map(key => mapChunk(key, 'done'))


  const chunksWaitingOrder = Object.values(allSpiralChunks).map(([x, z]) => {
    const pos = new Vec3(x * 16, 0, z * 16)
    if (bot.world.getColumnAt(pos) === null) return null
    return mapChunk(`${pos.x},${pos.z}`, 'order-queued')
  }).filter(a => !!a)

  const allChunks = [
    ...chunksWaitingServer,
    ...chunksWaitingClient,
    ...clientProcessingChunks,
    ...chunksDone,
    ...chunksDoneEmpty,
    ...chunksWaitingOrder,
  ]
  return <Screen title={`Chunks Debug (avg: ${worldView!.lastChunkReceiveTimeAvg.toFixed(1)}ms)`}>
    <ChunksDebug
      chunks={allChunks}
      playerChunk={{
        x: playerX,
        z: playerZ
      }}
      maxDistance={worldView!.viewDistance}
      tileSize={32}
      fontSize={8}
    />
  </Screen>
}

export default () => {
  const isActive = useIsModalActive('chunks-debug')
  if (!isActive) return null

  return <Inner />
}
