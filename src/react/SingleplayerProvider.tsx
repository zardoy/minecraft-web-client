import fs from 'fs'
import { proxy, subscribe, useSnapshot } from 'valtio'
import { useEffect, useRef, useState } from 'react'
import { fsState, loadSave, longArrayToNumber, readLevelDat } from '../loadSave'
import { mountExportFolder, removeFileRecursiveAsync } from '../browserfs'
import { hideCurrentModal, showModal } from '../globalState'
import { haveDirectoryPicker } from '../utils'
import { setLoadingScreenStatus } from '../appStatus'
import { exportWorld } from '../builtinCommands'
import Singleplayer, { WorldProps } from './Singleplayer'
import { useIsModalActive } from './utilsApp'
import { showOptionsModal } from './SelectOption'
import Input from './Input'

const worldsProxy = proxy({
  value: null as null | WorldProps[],
  brokenWorlds: [] as string[],
  selectedProvider: 'local' as 'local',
  error: '',
})

export const getWorldsPath = () => {
  return '/data/worlds'
}

const providersEnableFeatures = {
  local: {
    calculateSize: true,
    delete: true,
    export: true,
    icon: true
  }
}

const LOCAL_WORLDS_FLAG = 'hasLocalWorlds'

/** remembered whether local worlds exist (the list updates it on every read, creating a world sets it): reading the folder on click took ~400 ms on a slow CPU */
export const setHasLocalWorlds = (has: boolean) => {
  try {
    localStorage.setItem(LOCAL_WORLDS_FLAG, has ? '1' : '0')
  } catch {}
}

/** true only when the last read of the local worlds found none (unknown = false: the list opens and switches to Create World itself) */
export const knownNoLocalWorlds = () => {
  if (worldsProxy.selectedProvider !== 'local') return false
  try {
    return localStorage.getItem(LOCAL_WORLDS_FLAG) === '0'
  } catch {
    return false
  }
}

export const readWorlds = (abortController: AbortController) => {
  if (abortController.signal.aborted) return
  worldsProxy.error = ''
  worldsProxy.brokenWorlds = [];
  (async () => {
    const brokenWorlds = [] as string[]
    try {
      worldsProxy.value = null
      const worldsPath = getWorldsPath()
      const provider = worldsProxy.selectedProvider

      const worlds = await fs.promises.readdir(worldsPath)

      const newMappedWorlds = (await Promise.allSettled(worlds.map(async (folder) => {
        // a folder without level.dat (a world closed before its first autosave, written by older builds) is still a world: it is listed and level.dat is created on load
        const levelDat: Record<string, any> = (await readLevelDat(`${worldsPath}/${folder}`))?.levelDat ?? {}
        const levelDatStat = await fs.promises.stat(`${worldsPath}/${folder}/level.dat`).catch(async () => fs.promises.stat(`${worldsPath}/${folder}`))
        let size = 0
        if (providersEnableFeatures[provider].calculateSize) {
          // todo use whole dir size
          try {
            for (const region of await fs.promises.readdir(`${worldsPath}/${folder}/region`)) {
              // eslint-disable-next-line no-await-in-loop -- it's still fast enough, nobody complains about it
              const stat = await fs.promises.stat(`${worldsPath}/${folder}/region/${region}`)
              size += stat.size
            }
          } catch {} // no chunks saved yet
        }
        let iconBase64 = ''
        if (providersEnableFeatures[provider].icon) {
          const iconPath = `${worldsPath}/${folder}/icon.png`
          try {
            iconBase64 = await fs.promises.readFile(iconPath, 'base64')
          } catch {
            // ignore
          }
        }
        const levelName = levelDat.LevelName as string | undefined
        return {
          name: folder,
          title: levelName ?? folder,
          lastPlayed: levelDat.LastPlayed && longArrayToNumber(levelDat.LastPlayed),
          detail: `${levelDat.Version?.Name ?? 'unknown version'}, ${folder}`,
          iconSrc: iconBase64 ? `data:image/png;base64,${iconBase64}` : undefined,
          size,
          lastModified: levelDatStat.mtimeMs,
          group: 'IndexedDB Memory Worlds'
        } satisfies WorldProps & { lastModified?: number }
      }))).filter((x, i) => {
        if (x.status === 'rejected') {
          console.warn(x.reason)
          brokenWorlds.push(worlds[i])
          return false
        }
        return true
      }).map(x => (x as Extract<typeof x, { value }>).value).sort((a, b) => {
        const getScore = (x: typeof a) => {
          return x.lastModified ?? 0
        }
        return getScore(b) - getScore(a)
      })
      if (abortController.signal.aborted) return
      worldsProxy.value = newMappedWorlds
      if (provider === 'local') setHasLocalWorlds(newMappedWorlds.length > 0)
    } catch (err) {
      if (err.name === 'AbortError') return
      console.warn(err)
      worldsProxy.value = null
      worldsProxy.error = err.message
    }
    worldsProxy.brokenWorlds = brokenWorlds
  })().catch((err) => {
    // todo it still doesn't work for some reason!
    worldsProxy.error = err.message
  })
}

export const loadInMemorySave = async (worldPath: string) => {
  fsState.saveLoaded = false
  fsState.isReadonly = false
  fsState.syncFs = false
  fsState.inMemorySave = true
  await loadSave(worldPath)
}

export default () => {
  const active = useIsModalActive('singleplayer')

  if (!active) return null

  return <Inner />
}

const Inner = () => {
  const worlds = useSnapshot(worldsProxy).value as WorldProps[] | null
  const { selectedProvider, error, brokenWorlds } = useSnapshot(worldsProxy)
  const readWorldsAbortController = useRef(new AbortController())

  // like vanilla: with no worlds there is nothing to pick, so go straight to "Create New World" (its Cancel returns to the title screen).
  // worldsProxy keeps the list of the previous visit, so only trust an empty list after this visit saw the list loading
  const sawWorldsLoading = useRef(false)
  const openedCreateWorld = useRef(false)
  useEffect(() => {
    if (worlds === null) {
      sawWorldsLoading.current = true
      return
    }
    if (!sawWorldsLoading.current || openedCreateWorld.current) return
    if (selectedProvider !== 'local' || worlds.length > 0 || error || brokenWorlds.length > 0) return
    openedCreateWorld.current = true
    hideCurrentModal()
    showModal({ reactType: 'create-world' })
  }, [worlds, selectedProvider, error, brokenWorlds])

  useEffect(() => {
    (async () => {
      if (selectedProvider === 'local' && !(await fs.promises.stat('/data/worlds').catch(() => false))) {
        await fs.promises.mkdir('/data/worlds')
      }
      readWorlds(readWorldsAbortController.current)
    })()

    return () => {
      readWorldsAbortController.current.abort()
      readWorldsAbortController.current = new AbortController()
    }
  }, [selectedProvider])

  return <Singleplayer
    error={error}
    // providers={{
    //   local: 'Local',
    //   google: 'Google Drive',
    // }}
    worldData={worlds}
    activeProvider={selectedProvider}
    setActiveProvider={(provider) => {
      worldsProxy.selectedProvider = provider as any
    }}
    warning={brokenWorlds.length ? `Some worlds are broken: ${brokenWorlds.join(', ')}` : undefined}
    warningAction={async () => {
      for (const brokenWorld of worldsProxy.brokenWorlds) {
        setLoadingScreenStatus(`Removing broken world ${brokenWorld}`)
        // eslint-disable-next-line no-await-in-loop
        await removeFileRecursiveAsync(`${getWorldsPath()}/${brokenWorld}`)
      }
      setLoadingScreenStatus(undefined)
    }}
    warningActionLabel='Remove broken worlds'
    onWorldAction={async (action, worldName) => {
      const worldPath = `${getWorldsPath()}/${worldName}`
      if (action === 'load') {
        setLoadingScreenStatus(`Starting loading world ${worldName}`)
        await loadInMemorySave(worldPath)
        return
      }
      if (action === 'delete') {
        if (!confirm('Are you sure you want to delete current world')) return
        setLoadingScreenStatus(`Removing world ${worldName}`)
        await removeFileRecursiveAsync(worldPath)
        setLoadingScreenStatus(undefined)
        readWorlds(readWorldsAbortController.current)
      }
      if (action === 'export') {
        const selectedVariant =
          haveDirectoryPicker()
            ? await showOptionsModal('Select export type', ['Select folder (recommended)', 'Download ZIP file'])
            : await showOptionsModal('Select export type', ['Download ZIP file'])
        if (!selectedVariant) return
        if (selectedVariant === 'Select folder (recommended)') {
          const success = await mountExportFolder()
          if (!success) return
        }
        await exportWorld(worldPath, selectedVariant === 'Select folder (recommended)' ? 'folder' : 'zip', worldName)
      }
    }}
    onGeneralAction={(action) => {
      if (action === 'cancel') {
        hideCurrentModal()
      }
      if (action === 'create') {
        showModal({ reactType: 'create-world' })
      }
    }}
  />
}
