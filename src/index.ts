/* eslint-disable import/order */
import './importsWorkaround'
import './styles.css'
import './testCrasher'
import './globals'
import './devtools'
import './entities'
import customChannels from './customChannels'
import './globalDomListeners'
import './mineflayer/maps'
import './mineflayer/cameraShake'
import './shims/patchShims'
import './mineflayer/java-tester/index'
import './external'
import './appConfig'
import './mineflayer/timers'
import './mineflayer/plugins'
import './app/progressControllers'
import './app/gamepadCursor'
import { getServerInfo } from './mineflayer/mc-protocol'
import { onGameLoad } from './inventoryWindows'
import initCollisionShapes from './getCollisionInteractionShapes'
import protocolMicrosoftAuth from 'minecraft-protocol/src/client/microsoftAuth'
import microsoftAuthflow from './microsoftAuthflow'
import { Duplex } from 'stream'

import './scaleInterface'

import { options } from './optionsStorage'
import './reactUi'
import { lockUrl, onBotCreate } from './controls'
import './dragndrop'
import { possiblyCleanHandle } from './browserfs'
import downloadAndOpenFile, { isInterestedInDownload } from './downloadAndOpenFile'

import fs from 'fs'
import net, { Socket } from 'net'
import mineflayer from 'mineflayer'

import debug from 'debug'
import { defaultsDeep } from 'lodash-es'
import initializePacketsReplay from './packetsReplay/packetsReplayLegacy'

import {
  activeModalStack,
  activeModalStacks,
  hideModal,
  insertActiveModalStack,
  isGameActive,
  miscUiState,
  showModal,
  gameAdditionalState,
} from './globalState'

import { parseServerAddress } from './parseServerAddress'
import { setLoadingScreenStatus } from './appStatus'
import { isCypress } from './standaloneUtils'

import { startLocalServer, unsupportedLocalServerFeatures } from './createLocalServer'
import defaultServerOptions from './defaultLocalServerOptions'

import { onAppLoad, resourcepackReload, resourcePackState } from './resourcePack'
import { ConnectPeerOptions, connectToPeer } from './localServerMultiplayer'
import CustomChannelClient from './customClient'
import { registerServiceWorker } from './serviceWorker'
import { appStatusState, lastConnectOptions, quickDevReconnect } from './react/AppStatusProvider'

import { fsState } from './loadSave'
import { watchFov } from './rendererUtils'
import { loadInMemorySave } from './react/SingleplayerProvider'

import { possiblyHandleStateVariable } from './googledrive'
import flyingSquidEvents from './flyingSquidEvents'
import { showNotification } from './react/NotificationProvider'
import { saveToBrowserMemory } from './react/PauseScreen'
import './devReload'
import './water'
import { ConnectOptions, getVersionAutoSelect, downloadOtherGameData, downloadAllMinecraftData, loadMinecraftData } from './connect'
import { ref, subscribe } from 'valtio'
import { signInMessageState } from './react/SignInMessageProvider'
import { findServerPassword, updateAuthenticatedAccountData, updateLoadedServerData, updateServerConnectionHistory } from './react/serversStorage'
import { mainMenuState } from './react/MainMenuRenderApp'
import './mobileShim'
import { parseFormattedMessagePacket } from './botUtils'
import { appStartup } from './clientMods'
import { getViewerVersionData, getWsProtocolStream, onBotCreatedViewerHandler } from './viewerConnector'
import { getWebsocketStream } from './mineflayer/websocket-core'
import { appQueryParams, appQueryParamsArray } from './appParams'
import { playerState } from './mineflayer/playerState'
import { states } from 'minecraft-protocol'
import { initMotionTracking } from './react/uiMotion'
import { UserError } from './mineflayer/userError'
import { startLocalReplayServer } from './packetsReplay/replayPackets'
import { createFullScreenProgressReporter, createWrappedProgressReporter, ProgressReporter } from './core/progressReporter'
import { appViewer } from './appViewer'
import './appViewerLoad'
import { registerOpenBenchmarkListener } from './benchmark'
import { tryHandleBuiltinCommand } from './builtinCommands'
import { loadingTimerState } from './react/LoadingTimer'
import { loadPluginsIntoWorld } from './react/CreateWorldProvider'
import { getCurrentProxy, getCurrentUsername } from './react/ServersList'

window.debug = debug
window.beforeRenderFrame = []

// ACTUAL CODE

void registerServiceWorker().then(() => {
  mainMenuState.serviceWorkerLoaded = true
})
watchFov()
initCollisionShapes()
initializePacketsReplay()
onAppLoad()
customChannels()

if (appQueryParams.testCrashApp === '2') throw new Error('test')

function hideCurrentScreens () {
  activeModalStacks['main-menu'] = [...activeModalStack]
  insertActiveModalStack('', [])
}

const loadSingleplayer = (serverOverrides = {}, flattenedServerOverrides = {}, connectOptions?: Partial<ConnectOptions>) => {
  const serverSettingsQsRaw = appQueryParamsArray.serverSetting ?? []
  const serverSettingsQs = serverSettingsQsRaw.map(x => x.split(':')).reduce<Record<string, string>>((acc, [key, value]) => {
    acc[key] = JSON.parse(value)
    return acc
  }, {})
  void connect({
    singleplayer: true,
    username: options.localUsername,
    serverOverrides,
    serverOverridesFlat: {
      ...flattenedServerOverrides,
      ...serverSettingsQs
    },
    ...connectOptions
  })
}
function listenGlobalEvents () {
  window.addEventListener('connect', e => {
    const options = (e as CustomEvent).detail
    void connect(options)
  })
  window.addEventListener('singleplayer', (e) => {
    const { detail } = (e as CustomEvent)
    const { connectOptions, ...rest } = detail
    loadSingleplayer(rest, {}, connectOptions)
  })
}

export async function connect (connectOptions: ConnectOptions) {
  if (miscUiState.gameLoaded) return

  if (sessionStorage.delayLoadUntilFocus) {
    await new Promise(resolve => {
      if (document.hasFocus()) {
        resolve(undefined)
      } else {
        window.addEventListener('focus', resolve)
      }
    })
  }
  if (sessionStorage.delayLoadUntilClick) {
    await new Promise(resolve => {
      window.addEventListener('click', resolve)
    })
  }

  appStatusState.showReconnect = false
  loadingTimerState.loading = true
  loadingTimerState.start = Date.now()
  miscUiState.hasErrors = false
  lastConnectOptions.value = connectOptions

  const { singleplayer } = connectOptions
  const p2pMultiplayer = !!connectOptions.peerId
  miscUiState.singleplayer = singleplayer
  miscUiState.flyingSquid = singleplayer || p2pMultiplayer

  // Track server connection in history
  if (!singleplayer && !p2pMultiplayer && connectOptions.server && connectOptions.saveServerToHistory !== false) {
    const parsedServer = parseServerAddress(connectOptions.server)
    updateServerConnectionHistory(parsedServer.host, connectOptions.botVersion)
  }

  const { renderDistance: renderDistanceSingleplayer, multiplayerRenderDistance } = options

  const parsedServer = parseServerAddress(connectOptions.server)
  const server = { host: parsedServer.host, port: parsedServer.port }
  if (connectOptions.proxy?.startsWith(':')) {
    connectOptions.proxy = `${location.protocol}//${location.hostname}${connectOptions.proxy}`
  }
  if (connectOptions.proxy && location.port !== '80' && location.port !== '443' && !/:\d+$/.test(connectOptions.proxy)) {
    const https = connectOptions.proxy.startsWith('https://') || location.protocol === 'https:'
    connectOptions.proxy = `${connectOptions.proxy}:${https ? 443 : 80}`
  }
  const parsedProxy = parseServerAddress(connectOptions.proxy, false)
  const proxy = { host: parsedProxy.host, port: parsedProxy.port }
  let { username } = connectOptions

  if (connectOptions.server) {
    console.log(`connecting to ${server.host}:${server.port ?? 25_565}`)
  }
  console.log('using player username', username)

  hideCurrentScreens()
  const progress = createFullScreenProgressReporter()
  const loggingInMsg = connectOptions.server ? 'Connecting to server' : 'Logging in'
  progress.beginStage('connect', loggingInMsg)

  let ended = false
  let bot!: typeof __type_bot
  let hadConnected = false
  const destroyAll = (wasKicked = false) => {
    if (ended) return
    loadingTimerState.loading = false
    const { alwaysReconnect } = appQueryParams
    if ((!wasKicked && miscUiState.appConfig?.allowAutoConnect && appQueryParams.autoConnect && hadConnected) || (alwaysReconnect)) {
      if (alwaysReconnect === 'quick' || alwaysReconnect === 'fast') {
        quickDevReconnect()
      } else {
        location.reload()
      }
    }
    errorAbortController.abort()
    ended = true
    progress.end()
    // dont reset viewer so we can still do debugging
    localServer = window.localServer = window.server = undefined
    gameAdditionalState.viewerConnection = false

    if (bot) {
      bot.end()
      // ensure mineflayer plugins receive this event for cleanup
      bot.emit('end', '')
      bot.removeAllListeners()
      bot._client.removeAllListeners()
      bot._client = {
        //@ts-expect-error
        write (packetName) {
          console.warn('Tried to write packet', packetName, 'after bot was destroyed')
        }
      }
      //@ts-expect-error
      window.bot = bot = undefined
    }
    cleanFs()
  }
  const cleanFs = () => {
    if (singleplayer && !fsState.inMemorySave) {
      possiblyCleanHandle(() => {
        // todo: this is not enough, we need to wait for all async operations to finish
      })
    }
  }
  let lastPacket = undefined as string | undefined
  const onPossibleErrorDisconnect = () => {
    if (lastPacket && bot?._client && bot._client.state !== states.PLAY) {
      appStatusState.descriptionHint = `Last Server Packet: ${lastPacket}`
    }
  }
  const handleError = (err) => {
    console.error(err)
    if (err === 'ResizeObserver loop completed with undelivered notifications.') {
      return
    }
    if (isCypress()) throw err
    miscUiState.hasErrors = true
    if (miscUiState.gameLoaded) return
    // close all modals
    for (const modal of activeModalStack) {
      hideModal(modal)
    }

    setLoadingScreenStatus(`Error encountered. ${err}`, true)
    appStatusState.showReconnect = true
    onPossibleErrorDisconnect()
    destroyAll()
  }

  // todo(hard): remove it!
  const errorAbortController = new AbortController()
  window.addEventListener('unhandledrejection', (e) => {
    if (e.reason.name === 'ServerPluginLoadFailure') {
      if (confirm(`Failed to load server plugin ${e.reason.pluginName} (invoking ${e.reason.pluginMethod}). Continue?`)) {
        return
      }
    }
    if (e.reason?.stack?.includes('chrome-extension://')) {
      // ignore issues caused by chrome extension
      return
    }
    handleError(e.reason)
  }, {
    signal: errorAbortController.signal
  })
  window.addEventListener('error', (e) => {
    handleError(e.message)
  }, {
    signal: errorAbortController.signal
  })

  let clientDataStream: Duplex | undefined

  if (connectOptions.server && !connectOptions.viewerWsConnect && !parsedServer.isWebSocket) {
    console.log(`using proxy ${proxy.host}:${proxy.port || location.port}`)
    net['setProxy']({ hostname: proxy.host, port: proxy.port, headers: { Authorization: `Bearer ${new URLSearchParams(location.search).get('token') ?? ''}` }, artificialDelay: appQueryParams.addPing ? Number(appQueryParams.addPing) : undefined })
  }

  const renderDistance = singleplayer ? renderDistanceSingleplayer : multiplayerRenderDistance
  let updateDataAfterJoin = () => { }
  let localServer
  let localReplaySession: ReturnType<typeof startLocalReplayServer> | undefined
  let lastKnownKickReason = undefined as string | undefined
  try {
    const serverOptions = defaultsDeep({}, connectOptions.serverOverrides ?? {}, options.localServerOptions, defaultServerOptions)
    Object.assign(serverOptions, connectOptions.serverOverridesFlat ?? {})

    await progress.executeWithMessage('Downloading Minecraft data', 'download-mcdata', async () => {
      loadingTimerState.networkOnlyStart = Date.now()

      let downloadingAssets = [] as string[]
      const reportAssetDownload = (asset: string, isDone: boolean) => {
        if (isDone) {
          downloadingAssets = downloadingAssets.filter(a => a !== asset)
        } else {
          downloadingAssets.push(asset)
        }
        progress.setSubStage('download-mcdata', `(${downloadingAssets.join(', ')})`)
      }

      await Promise.all([
        downloadAllMinecraftData(reportAssetDownload),
        downloadOtherGameData(reportAssetDownload)
      ])
      loadingTimerState.networkOnlyStart = 0
    })

    let dataDownloaded = false
    const downloadMcData = async (version: string) => {
      if (dataDownloaded) return
      dataDownloaded = true
      appViewer.resourcesManager.currentConfig = { version, texturesVersion: options.useVersionsTextures || undefined }

      await progress.executeWithMessage(
        'Processing downloaded Minecraft data',
        async () => {
          await loadMinecraftData(version)
          await appViewer.resourcesManager.loadSourceData(version)
        }
      )

      await progress.executeWithMessage(
        'Applying user-installed resource pack',
        async () => {
          try {
            await resourcepackReload(true)
          } catch (err) {
            console.error(err)
            const doContinue = confirm('Failed to apply texture pack. See errors in the console. Continue?')
            if (!doContinue) {
              throw err
            }
          }
        }
      )

      await progress.executeWithMessage(
        'Preparing textures',
        async () => {
          await appViewer.resourcesManager.updateAssetsData({})
        }
      )
    }

    let finalVersion = connectOptions.botVersion || (singleplayer ? serverOptions.version : undefined)

    if (connectOptions.worldStateFileContents) {
      try {
        localReplaySession = startLocalReplayServer(connectOptions.worldStateFileContents)
      } catch (err) {
        console.error(err)
        throw new UserError(`Failed to start local replay server: ${err}`)
      }
      finalVersion = localReplaySession.version
    }

    if (singleplayer) {
      // SINGLEPLAYER EXPLAINER:
      // Note 1: here we have custom sync communication between server Client (flying-squid) and game client (mineflayer)
      // Note 2: custom Server class is used which simplifies communication & Client creation on it's side
      // local server started
      // mineflayer.createBot (see source def)
      // bot._client = bot._client ?? mc.createClient(options) <-- mc-protocol package
      // tcpDns() skipped since we define connect option
      // in setProtocol: we emit 'connect' here below so in that file we send set_protocol and login_start (onLogin handler)
      // Client (class) of flying-squid (in server/login.js of mc-protocol): onLogin handler: skip most logic & go to loginClient() which assigns uuid and sends 'success' back to client (onLogin handler) and emits 'login' on the server (login.js in flying-squid handler)
      // flying-squid: 'login' -> player.login -> now sends 'login' event to the client (handled in many plugins in mineflayer) -> then 'update_health' is sent which emits 'spawn' in mineflayer

      const serverPlugins = new URLSearchParams(location.search).getAll('serverPlugin')
      if (serverPlugins.length > 0 && !serverOptions.worldFolder) {
        console.log('Placing server plugins', serverPlugins)

        serverOptions.worldFolder ??= '/temp'
        await loadPluginsIntoWorld('/temp', serverPlugins)

        console.log('Server plugins placed')
      }

      localServer = window.localServer = window.server = startLocalServer(serverOptions)
      connectOptions?.connectEvents?.serverCreated?.()
      // todo need just to call quit if started
      // loadingScreen.maybeRecoverable = false
      // init world, todo: do it for any async plugins
      if (!localServer.pluginsReady) {
        await progress.executeWithMessage(
          'Starting local server',
          async () => {
            await new Promise(resolve => {
              localServer.once('pluginsReady', resolve)
            })
          }
        )
      }

      localServer.on('newPlayer', (player) => {
        player.on('loadingStatus', (newStatus) => {
          progress.setMessage(newStatus)
        })
      })
      flyingSquidEvents()
    }

    if (connectOptions.authenticatedAccount) username = 'you'
    let initialLoadingText: string
    if (singleplayer) {
      initialLoadingText = 'Local server is still starting'
    } else if (p2pMultiplayer) {
      initialLoadingText = 'Connecting to peer'
    } else if (connectOptions.server) {
      if (!finalVersion) {
        const versionAutoSelect = getVersionAutoSelect()
        const wrapped = createWrappedProgressReporter(progress, `Fetching server version. Preffered: ${versionAutoSelect}`)
        loadingTimerState.networkOnlyStart = Date.now()
        const autoVersionSelect = await getServerInfo(server.host, server.port ? Number(server.port) : undefined, versionAutoSelect)
        wrapped.end()
        finalVersion = autoVersionSelect.version
      }
      initialLoadingText = `Connecting to server ${server.host}:${server.port ?? 25_565} with version ${finalVersion}`
    } else if (connectOptions.viewerWsConnect) {
      initialLoadingText = `Connecting to Mineflayer WebSocket server ${connectOptions.viewerWsConnect}`
    } else if (connectOptions.worldStateFileContents) {
      initialLoadingText = `Loading local replay server`
    } else {
      initialLoadingText = 'We have no idea what to do'
    }
    progress.setMessage(initialLoadingText)

    if (parsedServer.isWebSocket) {
      loadingTimerState.networkOnlyStart = Date.now()
      clientDataStream = (await getWebsocketStream(server.host)).mineflayerStream
    }

    let newTokensCacheResult = null as any
    const cachedTokens = typeof connectOptions.authenticatedAccount === 'object' ? connectOptions.authenticatedAccount.cachedTokens : {}
    let authData: Awaited<ReturnType<typeof microsoftAuthflow>> | undefined
    if (connectOptions.authenticatedAccount) {
      authData = await microsoftAuthflow({
        tokenCaches: cachedTokens,
        proxyBaseUrl: connectOptions.proxy,
        setProgressText (text) {
          progress.setMessage(text)
        },
        setCacheResult (result) {
          newTokensCacheResult = result
        },
        connectingServer: server.host
      })
    }

    if (p2pMultiplayer) {
      clientDataStream = await connectToPeer(connectOptions.peerId!, connectOptions.peerOptions)
    }
    if (connectOptions.viewerWsConnect) {
      const { version, time, requiresPass } = await getViewerVersionData(connectOptions.viewerWsConnect)
      let password
      if (requiresPass) {
        password = prompt('Enter password')
        if (!password) {
          throw new UserError('Password is required')
        }
      }
      console.log('Latency:', Date.now() - time, 'ms')
      // const version = '1.21.1'
      finalVersion = version
      await downloadMcData(version)
      setLoadingScreenStatus(`Connecting to WebSocket server ${connectOptions.viewerWsConnect}`)
      clientDataStream = (await getWsProtocolStream(connectOptions.viewerWsConnect)).clientDuplex
      if (password) {
        clientDataStream.write(password)
      }
      gameAdditionalState.viewerConnection = true
    }

    if (finalVersion) {
      // ensure data is downloaded
      loadingTimerState.networkOnlyStart ??= Date.now()
      await downloadMcData(finalVersion)
    }

    const brand = clientDataStream ? 'minecraft-web-client' : undefined
    bot = mineflayer.createBot({
      host: server.host,
      port: server.port ? +server.port : undefined,
      brand,
      version: finalVersion || false,
      ...clientDataStream ? {
        stream: clientDataStream as any,
      } : {},
      ...singleplayer || p2pMultiplayer || localReplaySession ? {
        keepAlive: false,
      } : {},
      ...singleplayer ? {
        version: serverOptions.version,
        connect () { },
        Client: CustomChannelClient as any,
      } : {},
      ...localReplaySession ? {
        connect () { },
        Client: CustomChannelClient as any,
      } : {},
      onMsaCode (data) {
        signInMessageState.code = data.user_code
        signInMessageState.link = data.verification_uri
        signInMessageState.expiresOn = Date.now() + data.expires_in * 1000
      },
      sessionServer: authData?.sessionEndpoint?.toString(),
      auth: connectOptions.authenticatedAccount ? async (client, options) => {
        authData!.setOnMsaCodeCallback(options.onMsaCode)
        authData?.setConnectingVersion(client.version)
        //@ts-expect-error
        client.authflow = authData!.authFlow
        try {
          signInMessageState.abortController = ref(new AbortController())
          await Promise.race([
            protocolMicrosoftAuth.authenticate(client, options),
            new Promise((_r, reject) => {
              signInMessageState.abortController.signal.addEventListener('abort', () => {
                reject(new UserError('Aborted by user'))
              })
            })
          ])
          if (signInMessageState.shouldSaveToken) {
            updateAuthenticatedAccountData(accounts => {
              const existingAccount = accounts.find(a => a.username === client.username)
              if (existingAccount) {
                existingAccount.cachedTokens = { ...existingAccount.cachedTokens, ...newTokensCacheResult }
              } else {
                accounts.push({
                  username: client.username,
                  cachedTokens: { ...cachedTokens, ...newTokensCacheResult }
                })
              }
              return accounts
            })
            updateDataAfterJoin = () => {
              updateLoadedServerData(s => ({ ...s, authenticatedAccountOverride: client.username }), connectOptions.serverIndex)
            }
          } else {
            updateDataAfterJoin = () => {
              updateLoadedServerData(s => ({ ...s, authenticatedAccountOverride: undefined }), connectOptions.serverIndex)
            }
          }
          setLoadingScreenStatus('Authentication successful. Logging in to server')
        } finally {
          signInMessageState.code = ''
        }
      } : undefined,
      username,
      viewDistance: renderDistance,
      checkTimeoutInterval: 240 * 1000,
      // noPongTimeout: 240 * 1000,
      closeTimeout: 240 * 1000,
      respawn: options.autoRespawn,
      maxCatchupTicks: 0,
      'mapDownloader-saveToFile': false,
      // "mapDownloader-saveInternal": false, // do not save into memory, todo must be implemeneted as we do really care of ram
    }) as unknown as typeof __type_bot
    window.bot = bot

    if (connectOptions.viewerWsConnect) {
      void onBotCreatedViewerHandler()
    }
    customEvents.emit('mineflayerBotCreated')
    if (singleplayer || p2pMultiplayer || localReplaySession) {
      if (singleplayer || p2pMultiplayer) {
        // in case of p2pMultiplayer there is still flying-squid on the host side
        const _supportFeature = bot.supportFeature
        bot.supportFeature = ((feature) => {
          if (unsupportedLocalServerFeatures.includes(feature)) {
            return false
          }
          return _supportFeature(feature)
        }) as typeof bot.supportFeature
      }

      bot.emit('inject_allowed')
      bot._client.emit('connect')
    } else if (clientDataStream) {
      // bot.emit('inject_allowed')
      bot._client.emit('connect')
    } else {
      const setupConnectHandlers = () => {
        Socket.prototype['handleStringMessage'] = function (message: string) {
          if (message.startsWith('proxy-message') || message.startsWith('proxy-command:')) { // for future
            return false
          }
          if (message.startsWith('proxy-shutdown:')) {
            lastKnownKickReason = message.slice('proxy-shutdown:'.length)
            return false
          }
          return true
        }
        bot._client.socket.on('connect', () => {
          console.log('Proxy WebSocket connection established')
          //@ts-expect-error
          bot._client.socket._ws.addEventListener('close', () => {
            console.log('WebSocket connection closed')
            setTimeout(() => {
              if (bot) {
                bot.emit('end', 'WebSocket connection closed with unknown reason')
              }
            }, 1000)
          })
          bot._client.socket.on('close', () => {
            setTimeout(() => {
              if (bot) {
                bot.emit('end', 'WebSocket connection closed with unknown reason')
              }
            })
          })
        })
      }
      // socket setup actually can be delayed because of dns lookup
      if (bot._client.socket) {
        setupConnectHandlers()
      } else {
        const originalSetSocket = bot._client.setSocket.bind(bot._client)
        bot._client.setSocket = (socket) => {
          if (!bot) return
          originalSetSocket(socket)
          setupConnectHandlers()
        }
      }

    }
  } catch (err) {
    handleError(err)
  }
  if (!bot) return

  const p2pConnectTimeout = p2pMultiplayer ? setTimeout(() => { throw new UserError('Spawn timeout. There might be error on the other side, check console.') }, 20_000) : undefined

  // bot.on('inject_allowed', () => {
  //   loadingScreen.maybeRecoverable = false
  // })

  bot.on('error', handleError)

  bot.on('kicked', (kickReason) => {
    console.log('You were kicked!', kickReason)
    const { formatted: kickReasonFormatted, plain: kickReasonString } = parseFormattedMessagePacket(kickReason)
    // close all modals
    for (const modal of activeModalStack) {
      hideModal(modal)
    }
    setLoadingScreenStatus(`The Minecraft server kicked you. Kick reason: ${kickReasonString}`, true, undefined, undefined, kickReasonFormatted)
    appStatusState.showReconnect = true
    destroyAll(true)
  })

  const packetBeforePlay = (_, __, ___, fullBuffer) => {
    lastPacket = fullBuffer.toString()
  }
  bot._client.on('packet', packetBeforePlay as any)
  const playStateSwitch = (newState) => {
    if (newState === 'play') {
      bot._client.removeListener('packet', packetBeforePlay)
    }
  }
  bot._client.on('state', playStateSwitch)

  bot.on('end', (endReason) => {
    if (ended) return
    console.log('disconnected for', endReason)
    if (endReason === 'socketClosed') {
      endReason = lastKnownKickReason ?? 'Connection with proxy server lost'
    }
    // close all modals
    for (const modal of activeModalStack) {
      hideModal(modal)
    }
    setLoadingScreenStatus(`You have been disconnected from the server. End reason:\n${endReason}`, true)
    appStatusState.showReconnect = true
    onPossibleErrorDisconnect()
    destroyAll()
    if (isCypress()) throw new Error(`disconnected: ${endReason}`)
  })

  onBotCreate()

  bot.once('login', () => {
    errorAbortController.abort()
    loadingTimerState.networkOnlyStart = 0
    progress.setMessage('Loading world')
  })

  let worldWasReady = false
  const waitForChunksToLoad = async (progress?: ProgressReporter) => {
    await new Promise<void>(resolve => {
      if (worldWasReady) {
        resolve()
        return
      }
      const unsub = subscribe(appViewer.rendererState, () => {
        if (appViewer.rendererState.world.allChunksLoaded && appViewer.nonReactiveState.world.chunksTotalNumber) {
          worldWasReady = true
          resolve()
          unsub()
        } else {
          const perc = Math.round(appViewer.rendererState.world.chunksLoaded.size / appViewer.nonReactiveState.world.chunksTotalNumber * 100)
          progress?.reportProgress('chunks', perc / 100)
        }
      })
    })
  }

  const spawnEarlier = !singleplayer && !p2pMultiplayer
  const displayWorld = async () => {
    if (resourcePackState.isServerInstalling) {
      await new Promise<void>(resolve => {
        subscribe(resourcePackState, () => {
          if (!resourcePackState.isServerInstalling) {
            resolve()
          }
        })
      })
      await appViewer.resourcesManager.promiseAssetsReady
    }
    if (appStatusState.isError) return

    if (!appViewer.resourcesManager.currentResources?.itemsRenderer) {
      await appViewer.resourcesManager.updateAssetsData({})
    }

    const loadWorldStart = Date.now()
    console.log('try to focus window')
    window.focus?.()
    void waitForChunksToLoad().then(() => {
      window.worldLoadTime = (Date.now() - loadWorldStart) / 1000
      console.log('All chunks done and ready! Time from renderer connect to ready', (Date.now() - loadWorldStart) / 1000, 's')
      document.dispatchEvent(new Event('cypress-world-ready'))
    })

    try {
      if (p2pConnectTimeout) clearTimeout(p2pConnectTimeout)
      playerState.reactive.onlineMode = !!connectOptions.authenticatedAccount

      progress.setMessage('Placing blocks (starting viewer)')
      if (!connectOptions.worldStateFileContents || connectOptions.worldStateFileContents.length < 3 * 1024 * 1024) {
        localStorage.lastConnectOptions = JSON.stringify(connectOptions)
        if (process.env.NODE_ENV === 'development' && !localStorage.lockUrl && !location.search.slice(1).length) {
          lockUrl()
        }
      } else {
        localStorage.removeItem('lastConnectOptions')
      }
      connectOptions.onSuccessfulPlay?.()
      updateDataAfterJoin()
      const password = findServerPassword()
      if (password) {
        setTimeout(() => {
          bot.chat(`/login ${password}`)
        }, 500)
      }


      console.log('bot spawned - starting viewer')
      await appViewer.startWorld(bot.world, renderDistance)
      appViewer.worldView!.listenToBot(bot)
      if (appViewer.backend) {
        void appViewer.worldView!.init(bot.entity.position)
      }

      initMotionTracking()

      // Bot position callback
      const botPosition = () => {
        appViewer.lastCamUpdate = Date.now()
        // this might cause lag, but not sure
        appViewer.backend?.updateCamera(bot.entity.position, bot.entity.yaw, bot.entity.pitch)
        void appViewer.worldView?.updatePosition(bot.entity.position)
      }
      bot.on('move', botPosition)
      botPosition()

      progress.setMessage('Setting callbacks')

      onGameLoad()

      if (appStatusState.isError) return

      const waitForChunks = async () => {
        if (appQueryParams.sp === '1') return //todo
        const waitForChunks = options.waitForChunksRender === 'sp-only' ? !!singleplayer : options.waitForChunksRender
        if (!appViewer.backend || appViewer.rendererState.world.allChunksLoaded || !waitForChunks) {
          return
        }

        await progress.executeWithMessage(
          'Loading chunks',
          'chunks',
          async () => {
            await waitForChunksToLoad(progress)
          }
        )
      }

      await waitForChunks()

      setTimeout(() => {
        if (appQueryParams.suggest_save) {
          showNotification('Suggestion', 'Save the world to keep your progress!', false, undefined, async () => {
            const savePath = await saveToBrowserMemory()
            if (!savePath) return
            const saveName = savePath.split('/').pop()
            bot.end()
            // todo hot reload
            location.search = `loadSave=${saveName}`
          })
        }
      }, 600)

      miscUiState.gameLoaded = true
      miscUiState.loadedServerIndex = connectOptions.serverIndex ?? ''
      customEvents.emit('gameLoaded')

      // Test iOS Safari crash by creating memory pressure
      if (appQueryParams.testIosCrash) {
        setTimeout(() => {
          console.log('Starting iOS crash test with memory pressure...')
          // eslint-disable-next-line sonarjs/no-unused-collection
          const arrays: number[][] = []
          try {
            // Create large arrays until we run out of memory
            // eslint-disable-next-line no-constant-condition
            while (true) {
              const arr = Array.from({ length: 1024 * 1024 }).fill(0).map((_, i) => i)
              arrays.push(arr)
            }
          } catch (e) {
            console.error('Memory allocation failed:', e)
          }
        }, 1000)
      }

      progress.end()
      setLoadingScreenStatus(undefined)
    } catch (err) {
      handleError(err)
    }
    hadConnected = true
  }
  // don't use spawn event, player can be dead
  bot.once(spawnEarlier ? 'forcedMove' : 'health', displayWorld)

  if (singleplayer && connectOptions.serverOverrides.worldFolder) {
    fsState.saveLoaded = true
  }

  if (!connectOptions.ignoreQs || process.env.NODE_ENV === 'development') {
    // todo cleanup
    customEvents.on('gameLoaded', () => {
      const commands = appQueryParamsArray.command ?? []
      for (let command of commands) {
        if (!command.startsWith('/')) command = `/${command}`
        const builtinHandled = tryHandleBuiltinCommand(command)
        if (!builtinHandled) {
          bot.chat(command)
        }
      }
    })
  }
}

listenGlobalEvents()

// #region fire click event on touch as we disable default behaviors
let activeTouch: { touch: Touch, elem: HTMLElement, start: number } | undefined
document.body.addEventListener('touchend', (e) => {
  if (!isGameActive(true)) return
  if (activeTouch?.touch.identifier !== e.changedTouches[0].identifier) return
  if (Date.now() - activeTouch.start > 500) {
    activeTouch.elem.dispatchEvent(new Event('longtouch', { bubbles: true }))
  } else {
    activeTouch.elem.click()
  }
  activeTouch = undefined
})
document.body.addEventListener('touchstart', (e) => {
  const targetElement = (e.target as HTMLElement).closest('#ui-root')
  if (!isGameActive(true) || !targetElement) return
  // we always prevent default behavior to disable magnifier on ios, but by doing so we also disable click events
  e.preventDefault()
  let firstClickable // todo remove composedPath and this workaround when lit-element is fully dropped
  const path = e.composedPath() as Array<{ click?: () => void }>
  for (const elem of path) {
    if (elem.click) {
      firstClickable = elem
      break
    }
  }
  if (!firstClickable) return
  activeTouch = {
    touch: e.touches[0],
    elem: firstClickable,
    start: Date.now(),
  }
}, { passive: false })
// #endregion

// immediate game enter actions: reconnect or URL QS
const maybeEnterGame = () => {
  const waitForConfigFsLoad = (fn: () => void) => {
    let unsubscribe: () => void | undefined
    const checkDone = () => {
      if (miscUiState.fsReady && miscUiState.appConfig) {
        fn()
        unsubscribe?.()
        return true
      }
      return false
    }

    if (!checkDone()) {
      const text = miscUiState.appConfig ? 'Loading' : 'Loading config'
      setLoadingScreenStatus(text)
      unsubscribe = subscribe(miscUiState, checkDone)
    }
  }

  const reconnectOptions = sessionStorage.getItem('reconnectOptions') ? JSON.parse(sessionStorage.getItem('reconnectOptions')!) : undefined

  if (reconnectOptions) {
    sessionStorage.removeItem('reconnectOptions')
    if (Date.now() - reconnectOptions.timestamp < 1000 * 60 * 2) {
      return waitForConfigFsLoad(async () => {
        void connect(reconnectOptions.value)
      })
    }
  }

  if (appQueryParams.reconnect && localStorage.lastConnectOptions && process.env.NODE_ENV === 'development') {
    const lastConnect = JSON.parse(localStorage.lastConnectOptions ?? {})
    return waitForConfigFsLoad(async () => {
      void connect({
        botVersion: appQueryParams.version ?? undefined,
        ...lastConnect,
        ip: appQueryParams.ip || undefined
      })
    })
  }

  if (appQueryParams.singleplayer === '1' || appQueryParams.sp === '1') {
    return waitForConfigFsLoad(async () => {
      loadSingleplayer({}, {
        worldFolder: undefined,
        ...appQueryParams.version ? { version: appQueryParams.version } : {}
      })
    })
  }
  if (appQueryParams.loadSave) {
    const enterSave = async () => {
      const savePath = `/data/worlds/${appQueryParams.loadSave}`
      try {
        await fs.promises.stat(savePath)
        await loadInMemorySave(savePath)
      } catch (err) {
        alert(`Save ${savePath} not found`)
      }
    }
    return waitForConfigFsLoad(enterSave)
  }

  if (appQueryParams.ip || appQueryParams.proxy) {
    const openServerAction = () => {
      if (appQueryParams.autoConnect && miscUiState.appConfig?.allowAutoConnect) {
        void connect({
          server: appQueryParams.ip,
          proxy: getCurrentProxy(),
          botVersion: appQueryParams.version ?? undefined,
          username: getCurrentUsername()!,
        })
        return
      }

      setLoadingScreenStatus(undefined)
      if (appQueryParams.onlyConnect || process.env.ALWAYS_MINIMAL_SERVER_UI === 'true') {
        showModal({ reactType: 'only-connect-server' })
      } else {
        showModal({ reactType: 'editServer' })
      }
    }

    // showModal({ reactType: 'empty' })
    return waitForConfigFsLoad(openServerAction)
  }

  if (appQueryParams.connectPeer) {
    // try to connect to peer
    const peerId = appQueryParams.connectPeer
    const peerOptions = {} as ConnectPeerOptions
    if (appQueryParams.server) {
      peerOptions.server = appQueryParams.server
    }
    const version = appQueryParams.peerVersion
    let username: string | null = options.guestUsername
    if (options.askGuestName) username = prompt('Enter your username to connect to peer', username)
    if (!username) return
    options.guestUsername = username
    void connect({
      username,
      botVersion: version || undefined,
      peerId,
      peerOptions
    })
    return

  }

  if (appQueryParams.viewerConnect) {
    void connect({
      username: `viewer-${Math.random().toString(36).slice(2, 10)}`,
      viewerWsConnect: appQueryParams.viewerConnect,
    })
    return
  }

  if (appQueryParams.modal) {
    const modals = appQueryParams.modal.split(',')
    for (const modal of modals) {
      showModal({ reactType: modal })
    }
    return
  }

  if (appQueryParams.serversList && !miscUiState.appConfig?.appParams?.serversList) {
    // open UI only if it's in URL
    showModal({ reactType: 'serversList' })
  }

  if (isInterestedInDownload()) {
    void downloadAndOpenFile()
  }

  void possiblyHandleStateVariable()
}

try {
  maybeEnterGame()
} catch (err) {
  console.error(err)
  alert(`Something went wrong: ${err}`)
}

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
const initialLoader = document.querySelector('.initial-loader') as HTMLElement | null
if (initialLoader) {
  initialLoader.style.opacity = '0'
  initialLoader.style.pointerEvents = 'none'
}
window.pageLoaded = true

appViewer.waitBackendLoadPromises.push(appStartup())
registerOpenBenchmarkListener()
