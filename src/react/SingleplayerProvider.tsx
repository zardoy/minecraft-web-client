import fs from 'fs'
import { proxy, subscribe, useSnapshot } from 'valtio'
import { useEffect, useRef, useState } from 'react'
import { loadScript } from 'minecraft-renderer/src/lib/utils'
import { fsState, loadSave, longArrayToNumber, readLevelDat } from '../loadSave'
import { googleDriveGetFileIdFromPath, mountExportFolder, mountGoogleDriveFolder, removeFileRecursiveAsync } from '../browserfs'
import { hideCurrentModal, showModal } from '../globalState'
import { haveDirectoryPicker } from '../utils'
import { setLoadingScreenStatus } from '../appStatus'
import { exportWorld } from '../builtinCommands'
import { googleProviderState, useGoogleLogIn, GoogleDriveProvider, isGoogleDriveAvailable, APP_ID } from '../googledrive'
import Singleplayer, { WorldProps } from './Singleplayer'
import { useIsModalActive } from './utilsApp'
import { showOptionsModal } from './SelectOption'
import Input from './Input'
import GoogleButton from './GoogleButton'

const worldsProxy = proxy({
  value: null as null | WorldProps[],
  brokenWorlds: [] as string[],
  selectedProvider: 'local' as 'local' | 'google',
  selectedGoogleId: '',
  error: '',
})

export const getWorldsPath = () => {
  return worldsProxy.selectedProvider === 'local' ? `/data/worlds` : worldsProxy.selectedProvider === 'google' ? `/google/${'/'.replace(/\/$/, '')}` : ''
}

const providersEnableFeatures = {
  local: {
    calculateSize: true,
    delete: true,
    export: true,
    icon: true
  },
  google: {
    calculateSize: false,
    // TODO
    delete: false,
    export: false,
    icon: true
  }
}

export const readWorlds = (abortController: AbortController) => {
  if (abortController.signal.aborted) return
  worldsProxy.error = ''
  worldsProxy.brokenWorlds = [];
  (async () => {
    const brokenWorlds = [] as string[]
    try {
      const loggedIn = !!googleProviderState.accessToken
      worldsProxy.value = null
      if (worldsProxy.selectedProvider === 'google' && !loggedIn) {
        worldsProxy.value = []
        return
      }
      const worldsPath = getWorldsPath()
      const provider = worldsProxy.selectedProvider

      const worlds = await fs.promises.readdir(worldsPath)

      const newMappedWorlds = (await Promise.allSettled(worlds.map(async (folder) => {
        const { levelDat } = (await readLevelDat(`${worldsPath}/${folder}`))!
        const levelDatStat = await fs.promises.stat(`${worldsPath}/${folder}/level.dat`)
        let size = 0
        if (providersEnableFeatures[provider].calculateSize) {
          // todo use whole dir size
          for (const region of await fs.promises.readdir(`${worldsPath}/${folder}/region`)) {
            // eslint-disable-next-line no-await-in-loop -- it's still fast enough, nobody complains about it
            const stat = await fs.promises.stat(`${worldsPath}/${folder}/region/${region}`)
            size += stat.size
          }
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

  return <GoogleDriveProvider>
    <Inner />
  </GoogleDriveProvider>
}

export const loadGoogleDriveApi = async () => {
  const scriptEl = await loadScript('https://apis.google.com/js/api.js')
  if (!scriptEl) return // already loaded
  return new Promise<void>((resolve) => {
    gapi.load('client', () => {
      gapi.load('client:picker', () => {
        void gapi.client.load('https://www.googleapis.com/discovery/v1/apis/drive/v3/rest').then(() => {
          googleProviderState.isReady = true
          resolve()
        })
      })
    })
  })
}

const Inner = () => {
  const worlds = useSnapshot(worldsProxy).value as WorldProps[] | null
  const { selectedProvider, error, brokenWorlds, selectedGoogleId } = useSnapshot(worldsProxy)
  const readWorldsAbortController = useRef(new AbortController())

  // 3rd party providers
  useEffect(() => {
    if (selectedProvider !== 'google') return
    void loadGoogleDriveApi()
  }, [selectedProvider])

  const loggedIn = !!useSnapshot(googleProviderState).accessToken
  const googleDriveReadonly = useSnapshot(googleProviderState).readonlyMode

  useEffect(() => {
    (async () => {
      if (selectedProvider === 'google') {
        if (!selectedGoogleId) {
          worldsProxy.value = []
          return
        }
        await mountGoogleDriveFolder(googleProviderState.readonlyMode, selectedGoogleId)
        const exists = async (path) => {
          try {
            await fs.promises.stat(path)
            return true
          } catch {
            return false
          }
        }
        if (await exists(`${getWorldsPath()}/level.dat`)) {
          await loadInMemorySave(getWorldsPath())
          return
        }
      }
      if (selectedProvider === 'local' && !(await fs.promises.stat('/data/worlds').catch(() => false))) {
        await fs.promises.mkdir('/data/worlds')
      }
      readWorlds(readWorldsAbortController.current)
    })()

    return () => {
      readWorldsAbortController.current.abort()
      readWorldsAbortController.current = new AbortController()
    }
  }, [selectedProvider, loggedIn, googleDriveReadonly, selectedGoogleId])

  const googleLogIn = useGoogleLogIn()

  const googlePicker = useRef/* <google.picker.Picker | null> */(null as any)

  useEffect(() => {
    return () => {
      googlePicker.current?.dispose()
    }
  })

  const selectGoogleFolder = async () => {
    if (googleProviderState.lastSelectedFolder) {
      // ask to use saved previous fodler
      const choice = await showOptionsModal(`Use previously selected folder "${googleProviderState.lastSelectedFolder.name}"?`, ['Yes', 'No'])
      if (!choice) return
      if (choice === 'Yes') {
        worldsProxy.selectedGoogleId = googleProviderState.lastSelectedFolder.id
        return
      }
    }

    const { google } = window

    const view = new google.picker.DocsView(google.picker.ViewId.FOLDERS)
      .setIncludeFolders(true)
      .setMimeTypes('application/vnd.google-apps.folder')
      .setSelectFolderEnabled(true)
      .setParent('root')


    googlePicker.current = new google.picker.PickerBuilder()
      .enableFeature(google.picker.Feature.NAV_HIDDEN)
      .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
      .setDeveloperKey('AIzaSyBTiHpEqaLL7mEcrsnSS4M-z8cpRH5UwY0')
      .setAppId(APP_ID)
      .setOAuthToken(googleProviderState.accessToken)
      .addView(view)
      .addView(new google.picker.DocsUploadView())
      .setTitle('Select a folder with your worlds')
      .setCallback((data) => {
        if (data.action === google.picker.Action.PICKED) {
          googleProviderState.lastSelectedFolder = {
            id: data.docs[0].id,
            name: data.docs[0].name,
          }
          worldsProxy.selectedGoogleId = data.docs[0].id
        }
      })
      .build()
    googlePicker.current.setVisible(true)
  }

  const isGoogleProviderReady = useSnapshot(googleProviderState).isReady
  const providerActions = loggedIn && selectedProvider === 'google' && isGoogleProviderReady && !selectedGoogleId ? {
    'Select Folder': selectGoogleFolder
  } : selectedProvider === 'google' ? isGoogleProviderReady ? loggedIn ? {
    'Log Out' () {
      googleProviderState.hasEverLoggedIn = false
      googleProviderState.accessToken = null
      googleProviderState.lastSelectedFolder = null
      window.google.accounts.oauth2.revoke(googleProviderState.accessToken)
    },
    async [`Read Only: ${googleDriveReadonly ? 'ON' : 'OFF'}`] () {
      if (googleProviderState.readonlyMode) {
        const choice = await showOptionsModal('[Unstable Feature] Enabling world save might corrupt your worlds, eg remove entities (note: you can always restore previous version of files in Drive)', ['Continue'])
        if (choice !== 'Continue') return
      }
      googleProviderState.readonlyMode = !googleProviderState.readonlyMode
    },
    'Select Folder': selectGoogleFolder,
    // 'Worlds Path': <Input rootStyles={{ width: 100 }} placeholder='Worlds path' defaultValue={worldsPath} onBlur={(e) => {
    //   googleProviderData.worldsPath = e.target.value
    // }} />
  } : {
    'Log In': <GoogleButton onClick={googleLogIn} />
  } : {
    'Loading...' () { }
  } : undefined
  // end

  return <Singleplayer
    error={error}
    isReadonly={selectedProvider === 'google' && (googleDriveReadonly || !isGoogleProviderReady || !selectedGoogleId)}
    // providers={{
    //   local: 'Local',
    //   google: 'Google Drive',
    // }}
    disabledProviders={[...isGoogleDriveAvailable() ? [] : ['google']]}
    worldData={worlds}
    providerActions={providerActions}
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
      const openInGoogleDrive = () => {
        const fileId = googleDriveGetFileIdFromPath(worldPath.replace('/google/', ''))
        if (!fileId) return alert('File not found')
        window.open(`https://drive.google.com/drive/folders/${fileId}`)
      }

      if (action === 'load') {
        setLoadingScreenStatus(`Starting loading world ${worldName}`)
        await loadInMemorySave(worldPath)
        return
      }
      if (action === 'delete') {
        if (selectedProvider === 'google') {
          openInGoogleDrive()
          return
        }

        if (!confirm('Are you sure you want to delete current world')) return
        setLoadingScreenStatus(`Removing world ${worldName}`)
        await removeFileRecursiveAsync(worldPath)
        setLoadingScreenStatus(undefined)
        readWorlds(readWorldsAbortController.current)
      }
      if (action === 'export') {
        if (selectedProvider === 'google') {
          openInGoogleDrive()
          return
        }

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
