import { Vec3 } from 'vec3'
import { WorldRendererCommon } from 'minecraft-renderer/src/lib/worldrendererCommon'
import prettyBytes from 'pretty-bytes'
import { subscribe } from 'valtio'
import { downloadAndOpenMapFromUrl } from './downloadAndOpenFile'
import { activeModalStack, miscUiState } from './globalState'
import { disabledSettings, options } from './optionsStorage'
import { BenchmarkAdapterInfo, getAllInfoLines } from './benchmarkAdapter'
import { appQueryParams } from './appParams'
import { getScreenRefreshRate } from './utils'
import { setLoadingScreenStatus } from './appStatus'

const DEFAULT_RENDER_DISTANCE = 5

interface BenchmarkFixture {
  urlZip?: string
  urlDir?: string[]
  replayFileUrl?: string
  spawn?: [number, number, number]
}

const fixtures: Record<string, BenchmarkFixture> = {
  default: {
    urlZip: 'https://bucket.mcraft.fun/Future CITY 4.4-slim.zip',
    spawn: [-133, 87, 309] as [number, number, number],
  },
  dir: {
    urlDir: ['https://bucket.mcraft.fun/Greenfield%20v0.5.1/map-index.json', 'https://mcraft-proxy.vercel.app/0/bucket.mcraft.fun/Greenfield%20v0.5.1/map-index.json'],
  },
  replay: {
    replayFileUrl: 'https://raw.githubusercontent.com/zardoy/mcraft-fun-replays/refs/heads/main/hypepixel-tnt-lobby.worldstate.txt',
  },
}

Error.stackTraceLimit = Error.stackTraceLimit < 30 ? 30 : Error.stackTraceLimit

const SESSION_STORAGE_BACKUP_KEY = 'benchmark-backup'
export const openBenchmark = async (renderDistance = DEFAULT_RENDER_DISTANCE) => {
  let fixtureNameOpen = appQueryParams.openBenchmark
  if (!fixtureNameOpen || fixtureNameOpen === '1' || fixtureNameOpen === 'true' || fixtureNameOpen === 'zip') {
    fixtureNameOpen = 'default'
  }


  if (sessionStorage.getItem(SESSION_STORAGE_BACKUP_KEY)) {
    const backup = JSON.stringify(JSON.parse(sessionStorage.getItem(SESSION_STORAGE_BACKUP_KEY)!), null, 2)
    setLoadingScreenStatus('Either other tab with benchmark is open or page crashed. Last data backup is downloaded. Reload page to retry.')
    // download file
    const a = document.createElement('a')
    a.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(backup)
    a.download = `benchmark-${appViewer.backend?.id}.txt`
    a.click()
    sessionStorage.removeItem(SESSION_STORAGE_BACKUP_KEY)
    return
  }

  const fixture: BenchmarkFixture = appQueryParams.benchmarkMapZipUrl ? {
    urlZip: appQueryParams.benchmarkMapZipUrl,
    spawn: appQueryParams.benchmarkPosition ? appQueryParams.benchmarkPosition.split(',').map(Number) as [number, number, number] : fixtures.default.spawn,
  } : fixtures[fixtureNameOpen]

  if (!fixture) {
    setLoadingScreenStatus(`Benchmark fixture ${fixtureNameOpen} not found`)
    return
  }

  let memoryUsageAverage = 0
  let memoryUsageSamples = 0
  let memoryUsageWorst = 0
  setInterval(() => {
    const memoryUsage = (window.performance as any)?.memory?.usedJSHeapSize
    if (memoryUsage) {
      memoryUsageAverage = (memoryUsageAverage * memoryUsageSamples + memoryUsage) / (memoryUsageSamples + 1)
      memoryUsageSamples++
      if (memoryUsage > memoryUsageWorst) {
        memoryUsageWorst = memoryUsage
      }
    }
  }, 200)

  let mainThreadFpsAverage = 0
  let mainThreadFpsWorst = undefined as number | undefined
  let mainThreadFpsSamples = 0
  let currentPassedFrames = 0
  const mainLoop = () => {
    currentPassedFrames++
    requestAnimationFrame(mainLoop)
  }
  requestAnimationFrame(mainLoop)
  setInterval(() => {
    mainThreadFpsAverage = (mainThreadFpsAverage * mainThreadFpsSamples + currentPassedFrames) / (mainThreadFpsSamples + 1)
    mainThreadFpsSamples++
    if (mainThreadFpsWorst === undefined) {
      mainThreadFpsWorst = currentPassedFrames
    } else {
      mainThreadFpsWorst = Math.min(mainThreadFpsWorst, currentPassedFrames)
    }
    currentPassedFrames = 0
  }, 1000)

  // todo urlDir fix
  let fixtureName = `${fixture.urlZip ?? fixture.urlDir?.join('|') ?? fixture.replayFileUrl ?? 'unknown'}`
  if (fixture.spawn) {
    fixtureName += ` - ${fixture.spawn.join(' ')}`
  }

  fixtureName += ` - ${renderDistance}`
  if (process.env.NODE_ENV !== 'development') { // do not delay
    setLoadingScreenStatus('Benchmark requested... Getting screen refresh rate')
    await new Promise(resolve => {
      setTimeout(resolve, 1000)
    })
  }
  let start = 0
  // interval to backup data in sessionStorage in case of page crash
  const saveBackupInterval = setInterval(() => {
    if (!window.world) return
    const backup = JSON.parse(JSON.stringify(window.benchmarkAdapter))
    backup.timePassed = ((Date.now() - start) / 1000).toFixed(2)
    sessionStorage.setItem(SESSION_STORAGE_BACKUP_KEY, JSON.stringify(backup))
  }, 500)

  const screenRefreshRate = await getScreenRefreshRate()
  const benchmarkAdapter: BenchmarkAdapterInfo = {
    get fixture () {
      return fixtureName
    },
    get worldLoadTimeSeconds () {
      return window.worldLoadTime
    },
    get mesherWorkersCount () {
      return (window.world as WorldRendererCommon).worldRendererConfig.mesherWorkers
    },
    get mesherProcessAvgMs () {
      return (window.world as WorldRendererCommon).workersProcessAverageTime
    },
    get mesherProcessTotalMs () {
      return (window.world as WorldRendererCommon).workersProcessAverageTime * (window.world as WorldRendererCommon).workersProcessAverageTimeCount
    },
    get mesherProcessWorstMs () {
      return (window.world as WorldRendererCommon).maxWorkersProcessTime
    },
    get chunksFullInfo () {
      return appViewer.nonReactiveState.world.chunksFullInfo
        ?? (window.world as WorldRendererCommon | undefined)?.chunksFullInfo
        ?? '-'
    },
    get averageRenderTimeMs () {
      return (window.world as WorldRendererCommon).renderTimeAvg
    },
    get worstRenderTimeMs () {
      return (window.world as WorldRendererCommon).renderTimeMax
    },
    get fpsAveragePrediction () {
      const avgRenderTime = (window.world as WorldRendererCommon).renderTimeAvg
      return 1000 / avgRenderTime
    },
    get fpsWorstPrediction () {
      const maxRenderTime = (window.world as WorldRendererCommon).renderTimeMax
      return 1000 / maxRenderTime
    },
    get fpsAverageReal () {
      return `${(window.world as WorldRendererCommon).fpsAverage.toFixed(0)} / ${screenRefreshRate}`
    },
    get fpsWorstReal () {
      return (window.world as WorldRendererCommon).fpsWorst ?? -1
    },
    get backendInfoReport () {
      return (window.world as WorldRendererCommon).backendInfoReport
    },
    get fpsAverageMainThread () {
      return mainThreadFpsAverage
    },
    get fpsWorstMainThread () {
      return mainThreadFpsWorst ?? -1
    },
    get memoryUsageAverage () {
      return prettyBytes(memoryUsageAverage)
    },
    get memoryUsageWorst () {
      return prettyBytes(memoryUsageWorst)
    },
    get gpuInfo () {
      return appViewer.rendererState.renderer
    },
    get hardwareConcurrency () {
      return navigator.hardwareConcurrency
    },
    get userAgent () {
      return navigator.userAgent
    },
    clientVersion: `${process.env.RELEASE_TAG} ${process.env.BUILD_VERSION} ${process.env.RELEASE_LINK ?? ''}`,
  }
  window.benchmarkAdapter = benchmarkAdapter

  disabledSettings.value.add('renderDistance')
  options.renderDistance = renderDistance
  disabledSettings.value.add('renderDebug')
  options.renderDebug = 'advanced'
  disabledSettings.value.add('waitForChunksRender')
  options.waitForChunksRender = false

  void downloadAndOpenMapFromUrl(fixture.urlZip, undefined, fixture.urlDir, fixture.replayFileUrl, {
    connectEvents: {
      serverCreated () {
        if (fixture.spawn) {
          localServer!.spawnPoint = new Vec3(...fixture.spawn)
          localServer!.on('newPlayer', (player) => {
            player.on('dataLoaded', () => {
              player.position = new Vec3(...fixture.spawn!)
              start = Date.now()
            })
          })
        }
      },
    }
  })

  document.addEventListener('cypress-world-ready', () => {
    clearInterval(saveBackupInterval)
    sessionStorage.removeItem(SESSION_STORAGE_BACKUP_KEY)
    let stats = getAllInfoLines(window.benchmarkAdapter)
    const downloadFile = () => {
      // const changedSettings =

      const a = document.createElement('a')
      a.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(stats.join('\n'))
      a.download = `benchmark-${appViewer.backend?.id}.txt`
      a.click()
    }
    if (appQueryParams.downloadBenchmark) {
      downloadFile()
    }

    const panel = document.createElement('div')
    panel.style.position = 'fixed'
    panel.style.top = '20px'
    panel.style.right = '10px'
    panel.style.backgroundColor = 'rgba(0,0,0,0.8)'
    panel.style.color = 'white'
    panel.style.padding = '10px'
    panel.style.zIndex = '1000'
    panel.style.fontFamily = 'monospace'
    panel.style.maxWidth = '80%'
    panel.style.maxHeight = '90vh'
    panel.style.overflow = 'auto'
    panel.id = 'benchmark-panel'

    // Add download button
    const downloadButton = document.createElement('button')
    downloadButton.textContent = 'Download Results'
    downloadButton.style.marginBottom = '10px'
    downloadButton.style.padding = '5px 10px'
    downloadButton.style.backgroundColor = '#4CAF50'
    downloadButton.style.color = 'white'
    downloadButton.style.border = 'none'
    downloadButton.style.borderRadius = '4px'
    downloadButton.style.cursor = 'pointer'
    downloadButton.onclick = downloadFile
    panel.appendChild(downloadButton)

    const pre = document.createElement('pre')
    pre.style.whiteSpace = 'pre-wrap'
    pre.style.wordBreak = 'break-word'
    panel.appendChild(pre)

    pre.textContent = stats.join('\n')
    const updateStats = () => {
      stats = getAllInfoLines(window.benchmarkAdapter)
      pre.textContent = stats.join('\n')
    }

    document.body.appendChild(panel)
    // setInterval(updateStats, 100)
  })
}

// add before unload
window.addEventListener('beforeunload', () => {
  // remove sessionStorage backup
  sessionStorage.removeItem(SESSION_STORAGE_BACKUP_KEY)
})

document.addEventListener('pointerlockchange', (e) => {
  const panel = document.querySelector<HTMLDivElement>('#benchmark-panel')
  if (panel) {
    panel.hidden = !!document.pointerLockElement
  }
})

subscribe(activeModalStack, () => {
  const panel = document.querySelector<HTMLDivElement>('#benchmark-panel')
  if (panel && activeModalStack.length > 1) {
    panel.hidden = true
  }
})

export const registerOpenBenchmarkListener = () => {
  if (appQueryParams.openBenchmark) {
    void openBenchmark(appQueryParams.renderDistance ? +appQueryParams.renderDistance : undefined)
  }

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyB' && e.shiftKey && !miscUiState.gameLoaded && activeModalStack.length === 0) {
      e.preventDefault()
      // add ?openBenchmark=true to url without reload
      const url = new URL(window.location.href)
      url.searchParams.set('openBenchmark', 'true')
      window.history.replaceState({}, '', url.toString())
      void openBenchmark()
    }
  })
}
