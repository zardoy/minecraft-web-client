import { useState } from 'react'
import { useUtilsEffect } from '@zardoy/react-util'
import type { ThreeJsBackendMethods } from 'minecraft-renderer/src/three/graphicsBackendBase'
import { WorldRendererThree } from 'minecraft-renderer/src/three/worldRendererThree'
import { appViewer } from '../appViewer'

export type RendererChunksDebugState = {
  loadedSectionsChunks: Record<string, true>
  loadedChunks: Record<string, boolean>
  finishedChunks: Record<string, boolean>
}

const readFromMainThreadWorld = (world: WorldRendererThree): RendererChunksDebugState => {
  const loadedSectionsChunks: Record<string, true> = {}
  for (const sectionPos of Object.keys(world.sectionObjects)) {
    const [x, , z] = sectionPos.split(',').map(Number)
    loadedSectionsChunks[`${x},${z}`] = true
  }
  return {
    loadedSectionsChunks,
    loadedChunks: world.loadedChunks,
    finishedChunks: world.finishedChunks,
  }
}

const emptyRendererChunksState = (): RendererChunksDebugState => ({
  loadedSectionsChunks: {},
  loadedChunks: {},
  finishedChunks: {},
})

export const useRendererChunksDebugState = (update: number) => {
  const [state, setState] = useState<RendererChunksDebugState>(() => {
    const world = globalThis.world as WorldRendererThree | undefined
    return world ? readFromMainThreadWorld(world) : emptyRendererChunksState()
  })

  useUtilsEffect(({ interval }) => {
    interval(500, () => {
      const world = globalThis.world as WorldRendererThree | undefined
      if (world) {
        setState(readFromMainThreadWorld(world))
        return
      }
      const getChunksDebugState = (appViewer.backend?.backendMethods)?.getChunksDebugState
      if (!getChunksDebugState) {
        setState(emptyRendererChunksState())
        return
      }
      void Promise.resolve(getChunksDebugState()).then(setState).catch(() => {
        setState(emptyRendererChunksState())
      })
    })
  }, [update])

  return state
}
