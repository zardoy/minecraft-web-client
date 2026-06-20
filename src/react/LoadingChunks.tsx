import { useEffect, useRef } from 'react'
import './LoadingChunks.css'

export default ({
  regionFiles = [] as string[],
  stateMap = {} as Record<string, string>,
  displayText = false,
  playerChunk = null as null | { x: number; z: number }
}) => {
  // visualize downloading chunks
  const regionNumbers = regionFiles.map(x => x.split('.').slice(1, 3).map(Number))
  const minX = Math.min(...regionNumbers.map(([x]) => x))
  const maxX = Math.max(...regionNumbers.map(([x]) => x))
  const minZ = Math.min(...regionNumbers.map(([, z]) => z))
  const maxZ = Math.max(...regionNumbers.map(([, z]) => z))
  const xChunks = maxX - minX + 1
  const zChunks = maxZ - minZ + 1

  return (
    <div
      style={{
        // maxWidth: '80%',
        // maxHeight: '80%',
        // aspectRatio: '1',
        display: 'grid',
        gridTemplateColumns: `repeat(${xChunks}, 1fr)`,
        gridTemplateRows: `repeat(${zChunks}, 1fr)`,
        gap: 1,
        width: '110px',
        height: '110px'
      }}
    >
      {Array.from({ length: xChunks * zChunks }).map((_, i) => {
        const x = minX + (i % xChunks)
        const z = minZ + Math.floor(i / xChunks)
        const file = `r.${x}.${z}.mca`
        const state = stateMap[file]
        if (!regionFiles.includes(file)) return <div key={i} style={{ background: 'gray' }} />
        return <Chunk key={i} x={x} z={z} state={state} displayText={displayText} currentPlayer={playerChunk?.x === x && playerChunk?.z === z} />
      })}
    </div>
  )
}

const Chunk = ({ x, z, state, displayText, currentPlayer }) => {
  const text = displayText ? `${x},${z}` : undefined

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: state === 'errored' ? 'red' : state === 'loading' ? 'white' : 'limegreen',
        animation: state === 'loading' ? `loading-chunks-loading-animation 4s infinite cubic-bezier(0.4, 0, 0.2, 1)` : undefined,
        transition: 'background 1s',
        color: state === 'loading' ? 'black' : 'white',
        position: 'relative',
        zIndex: 1
      }}
    >
      {/* green dot */}
      {currentPlayer && (
        <div
          style={{
            position: 'absolute',
            background: 'red',
            borderRadius: '50%',
            width: '5px',
            height: '5px',
            zIndex: -1
          }}
        />
      )}
      {text}
    </div>
  )
}
