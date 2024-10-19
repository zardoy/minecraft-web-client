import { join } from 'path'
import fs from 'fs'
import { useEffect } from 'react'
import { subscribe, useSnapshot } from 'valtio'
import { usedServerPathsV1 } from 'flying-squid/dist/lib/modules/world'
import { openURL } from 'prismarine-viewer/viewer/lib/simpleUtils'
import { exportLoadedTiles } from 'prismarine-viewer/examples/webgpuRendererMain'
import { Vec3 } from 'vec3'
import { generateSpiralMatrix } from 'flying-squid/dist/utils'
import { subscribeKey } from 'valtio/utils'
import {
  activeModalStack,
  showModal,
  hideModal,
  miscUiState,
  openOptionsMenu
} from '../globalState'
import { fsState } from '../loadSave'
import { disconnect } from '../flyingSquidUtils'
import { pointerLock, setLoadingScreenStatus } from '../utils'
import { closeWan, openToWanAndCopyJoinLink, getJoinLink } from '../localServerMultiplayer'
import { collectFilesToCopy, fileExistsAsyncOptimized, mkdirRecursive, uniqueFileNameFromWorldName } from '../browserfs'
import { useIsModalActive } from './utilsApp'
import { showOptionsModal } from './SelectOption'
import Button from './Button'
import Screen from './Screen'
import styles from './PauseScreen.module.css'
import { DiscordButton } from './DiscordButton'
import { showNotification } from './NotificationProvider'
import { appStatusState } from './AppStatusProvider'

const waitForPotentialRender = async () => {
  return new Promise<void>(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(resolve as any))
  })
}

export const saveToBrowserMemory = async () => {
  setLoadingScreenStatus('Saving world')
  try {
    await new Promise<void>(resolve => {
      subscribeKey(appStatusState, 'isDisplaying', () => {
        if (appStatusState.isDisplaying) {
          resolve()
        }
      })
    })
    //@ts-expect-error
    const { worldFolder } = localServer.options
    const saveRootPath = await uniqueFileNameFromWorldName(worldFolder.split('/').pop(), `/data/worlds`)
    await mkdirRecursive(saveRootPath)
    console.log('made world folder', saveRootPath)
    const allRootPaths = [...usedServerPathsV1]
    const allFilesToCopy = [] as string[]
    for (const dirBase of allRootPaths) {
      // eslint-disable-next-line no-await-in-loop
      if (dirBase.includes('.') && await fileExistsAsyncOptimized(join(worldFolder, dirBase))) {
        allFilesToCopy.push(dirBase)
        continue
      }
      // eslint-disable-next-line no-await-in-loop
      let res = await collectFilesToCopy(join(worldFolder, dirBase), true)
      if (dirBase === 'region') {
        res = res.filter(x => x.endsWith('.mca'))
      }
      allFilesToCopy.push(...res.map(x => join(dirBase, x)))
    }
    console.log('paths collected')
    const pathsSplitBasic = allFilesToCopy.filter(path => {
      if (!path.startsWith('region/')) return true
      const [x, z] = path.split('/').at(-1)!.split('.').slice(1, 3).map(Number)
      return Math.abs(x) > 50 || Math.abs(z) > 50 // HACK: otherwise it's too big and we can't handle it in visual display
    })
    let copied = 0
    let isRegionFiles = false
    const upProgress = (totalSize: number) => {
      copied++
      let action = fsState.remoteBackend ? 'Downloading & copying' : 'Copying'
      action += isRegionFiles ? ' region files (world chunks)' : ' basic save files'
      setLoadingScreenStatus(`${action} files (${copied}/${totalSize})`)
    }
    const copyFiles = async (copyPaths: string[][]) => {
      const totalSIze = copyPaths.flat().length
      for (const copyFileGroup of copyPaths) {
        // eslint-disable-next-line no-await-in-loop, @typescript-eslint/no-loop-func
        await Promise.all(copyFileGroup.map(async (copyPath) => {
          const srcPath = join(worldFolder, copyPath)
          const savePath = join(saveRootPath, copyPath)
          await mkdirRecursive(savePath)
          await fs.promises.writeFile(savePath, await fs.promises.readFile(srcPath))
          upProgress(totalSIze)
          if (isRegionFiles) {
            const regionFile = copyPath.split('/').at(-1)!
            appStatusState.loadingChunksData![regionFile] = 'done'
          }
        }))
        // eslint-disable-next-line no-await-in-loop
        await waitForPotentialRender()
      }
    }
    // basic save files
    await copyFiles(splitByCopySize(pathsSplitBasic))
    setLoadingScreenStatus('Preparing world chunks copying')
    await waitForPotentialRender()

    // region files
    isRegionFiles = true
    copied = 0
    const regionFiles = allFilesToCopy.filter(x => !pathsSplitBasic.includes(x))
    const regionFilesNumbers = regionFiles.map(x => x.split('/').at(-1)!.split('.').slice(1, 3).map(Number))
    const xMin = Math.min(...regionFilesNumbers.flatMap(x => x[0]))
    const zMin = Math.min(...regionFilesNumbers.flatMap(x => x[1]))
    const xMax = Math.max(...regionFilesNumbers.flatMap(x => x[0]))
    const zMax = Math.max(...regionFilesNumbers.flatMap(x => x[1]))
    const playerPosRegion = bot.entity.position.divide(new Vec3(32 * 16, 32 * 16, 32 * 16)).floored()
    const maxDistantRegion = Math.max(
      Math.abs(playerPosRegion.x - xMin),
      Math.abs(playerPosRegion.z - zMin),
      Math.abs(playerPosRegion.x - xMax),
      Math.abs(playerPosRegion.z - zMax)
    )
    const spiral = generateSpiralMatrix(maxDistantRegion)
    const filesWithSpiral = spiral.filter(x => allFilesToCopy.includes(`region/r.${x[0]}.${x[1]}.mca`)).map(x => `region/r.${x[0]}.${x[1]}.mca`)
    if (filesWithSpiral.length !== regionFiles.length) throw new Error('Something went wrong with region files')

    appStatusState.loadingChunksData = Object.fromEntries(regionFiles.map(x => [x.split('/').at(-1)!, 'loading']))
    appStatusState.loadingChunksDataPlayerChunk = { x: playerPosRegion.x, z: playerPosRegion.z }
    await copyFiles(splitByCopySize(filesWithSpiral, 10))

    return saveRootPath
  } catch (err) {
    console.error(err)
    void showOptionsModal(`Error while saving the world: ${err.message}`, [])
  } finally {
    setLoadingScreenStatus(undefined)
  }
}

const splitByCopySize = (files: string[], copySize = 15) => {
  return files.reduce<string[][]>((acc, cur, i) => {
    if (i % copySize === 0) {
      acc.push([])
    }
    acc.at(-1)!.push(cur)
    return acc
  }, [])
}

export default () => {
  const qsParams = new URLSearchParams(window.location.search)
  const lockConnect = qsParams?.get('lockConnect') === 'true'
  const isModalActive = useIsModalActive('pause-screen')
  const fsStateSnap = useSnapshot(fsState)
  const activeModalStackSnap = useSnapshot(activeModalStack)
  const { singleplayer, wanOpened, wanOpening } = useSnapshot(miscUiState)

  const handlePointerLockChange = () => {
    if (!pointerLock.hasPointerLock && activeModalStack.length === 0) {
      showModal({ reactType: 'pause-screen' })
    }
  }

  useEffect(() => {
    document.addEventListener('pointerlockchange', handlePointerLockChange)

    return () => {
      document.removeEventListener('pointerlockchange', handlePointerLockChange)
    }
  }, [])

  const onReturnPress = () => {
    hideModal({ reactType: 'pause-screen' })
  }

  const clickWebShareButton = async () => {
    if (!wanOpened) return
    try {
      const url = getJoinLink()
      const shareData = { url }
      await navigator.share?.(shareData)
    } catch (err) {
      console.log(`Error: ${err}`)
    }
  }

  const clickJoinLinkButton = async (qr = false) => {
    if (!qr && wanOpened) {
      closeWan()
      return
    }
    if (!wanOpened || !qr) {
      await openToWanAndCopyJoinLink((err) => {
        if (!miscUiState.wanOpening) return
        alert(`Something went wrong: ${err}`)
      }, !qr)
    }
    if (qr) {
      const joinLink = getJoinLink()
      miscUiState.currentDisplayQr = joinLink ?? null
    }
  }

  const openWorldActions = async () => {
    if (fsStateSnap.inMemorySave || !singleplayer) {
      return showOptionsModal('World actions...', [])
    }
    const action = await showOptionsModal('World actions...', [
      ...!fsStateSnap.inMemorySave && singleplayer ? ['Save to browser memory'] : [],
      'Dump loaded chunks'
    ])
    if (action === 'Save to browser memory') {
      const path = await saveToBrowserMemory()
      if (!path) return
      const saveName = path.split('/').at(-1)
      showNotification(`World saved to ${saveName}`, 'Load it to keep your progress!')
      // fsState.inMemorySave = true
      // fsState.syncFs = false
      // fsState.isReadonly = false
      // fsState.remoteBackend = false
    }
    if (action === 'Dump loaded chunks') {
      exportLoadedTiles()
    }
  }

  if (!isModalActive) return null
  return <Screen title='Game Menu'>
    <Button
      icon="pixelarticons:folder"
      style={{ position: 'fixed', top: '5px', left: 'calc(env(safe-area-inset-left) + 5px)' }}
      onClick={async () => openWorldActions()}
    />
    <div className={styles.pause_container}>
      <Button className="button" style={{ width: '204px' }} onClick={onReturnPress}>Back to Game</Button>
      <div className={styles.row}>
        <Button className="button" style={{ width: '98px' }} onClick={() => openURL(process.env.GITHUB_URL!)}>GitHub</Button>
        <DiscordButton />
      </div>
      <Button className="button" style={{ width: '204px' }} onClick={() => openOptionsMenu('main')}>Options</Button>
      {singleplayer ? (
        <div className={styles.row}>
          <Button className="button" style={{ width: '170px' }} onClick={async () => clickJoinLinkButton()}>
            {wanOpening ? 'Opening, wait...' : wanOpened ? 'Close Wan' : 'Copy Join Link'}
          </Button>
          {(navigator.share as typeof navigator.share | undefined) ? (
            <Button
              className="button"
              icon="pixelarticons:arrow-up"
              style={{ width: '20px' }}
              onClick={async () => clickWebShareButton()}
            />
          ) : null}
          <Button
            className="button"
            icon="pixelarticons:dice"
            style={{ width: '20px' }}
            onClick={async () => clickJoinLinkButton(true)}
          />
        </div>
      ) : null}
      {!lockConnect && <>
        <Button className="button" style={{ width: '204px' }} onClick={disconnect}>
          {localServer && !fsState.syncFs && !fsState.isReadonly ? 'Save & Quit' : 'Disconnect & Reset'}
        </Button>
      </>}
    </div>
  </Screen>
}
