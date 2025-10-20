//@ts-check
import { renderToDom, ErrorBoundary } from '@zardoy/react-util'
import { useSnapshot } from 'valtio'
import { QRCodeSVG } from 'qrcode.react'
import { createPortal } from 'react-dom'
import { useEffect, useMemo, useState } from 'react'
import { activeModalStack, miscUiState } from './globalState'
import DeathScreenProvider from './react/DeathScreenProvider'
import OptionsRenderApp from './react/OptionsRenderApp'
import MainMenuRenderApp from './react/MainMenuRenderApp'
import SingleplayerProvider from './react/SingleplayerProvider'
import CreateWorldProvider from './react/CreateWorldProvider'
import AppStatusProvider from './react/AppStatusProvider'
import SelectOption from './react/SelectOption'
import EnterFullscreenButton from './react/EnterFullscreenButton'
import ChatProvider from './react/ChatProvider'
import TitleProvider from './react/TitleProvider'
import ScoreboardProvider from './react/ScoreboardProvider'
import SignEditorProvider from './react/SignEditorProvider'
import IndicatorEffectsProvider from './react/IndicatorEffectsProvider'
import PlayerListOverlayProvider from './react/PlayerListOverlayProvider'
import MinimapProvider, { DrawerAdapterImpl } from './react/MinimapProvider'
import HudBarsProvider from './react/HudBarsProvider'
import XPBarProvider from './react/XPBarProvider'
import DebugOverlay from './react/DebugOverlay'
import MobileTopButtons from './react/MobileTopButtons'
import PauseScreen from './react/PauseScreen'
import SoundMuffler from './react/SoundMuffler'
import TouchControls from './react/TouchControls'
import widgets from './react/widgets'
import { useIsModalActive, useIsWidgetActive } from './react/utilsApp'
import GlobalSearchInput from './react/GlobalSearchInput'
import TouchAreasControlsProvider from './react/TouchAreasControlsProvider'
import NotificationProvider, { showNotification } from './react/NotificationProvider'
import HotbarRenderApp from './react/HotbarRenderApp'
import Crosshair from './react/Crosshair'
import ButtonAppProvider from './react/ButtonAppProvider'
import ServersListProvider from './react/ServersListProvider'
import GamepadUiCursor from './react/GamepadUiCursor'
import KeybindingsScreenProvider from './react/KeybindingsScreenProvider'
import HeldMapUi from './react/HeldMapUi'
import BedTime from './react/BedTime'
import NoModalFoundProvider from './react/NoModalFoundProvider'
import SignInMessageProvider from './react/SignInMessageProvider'
import BookProvider from './react/BookProvider'
import { options } from './optionsStorage'
import BossBarOverlayProvider from './react/BossBarOverlayProvider'
import ModsPage from './react/ModsPage'
import DebugEdges from './react/DebugEdges'
import GameInteractionOverlay from './react/GameInteractionOverlay'
import MineflayerPluginHud from './react/MineflayerPluginHud'
import MineflayerPluginConsole from './react/MineflayerPluginConsole'
import { UIProvider } from './react/UIProvider'
import { useAppScale } from './scaleInterface'
import PacketsReplayProvider from './react/PacketsReplayProvider'
import TouchInteractionHint from './react/TouchInteractionHint'
import { ua } from './react/utils'
import VoiceMicrophone from './react/VoiceMicrophone'
import ConnectOnlyServerUi from './react/ConnectOnlyServerUi'
import ControDebug from './react/ControDebug'
import ChunksDebug from './react/ChunksDebug'
import ChunksDebugScreen from './react/ChunksDebugScreen'
import DebugResponseTimeIndicator from './react/debugs/DebugResponseTimeIndicator'
import RendererDebugMenu from './react/RendererDebugMenu'
import CreditsAboutModal from './react/CreditsAboutModal'
import GlobalOverlayHints from './react/GlobalOverlayHints'
import FullscreenTime from './react/FullscreenTime'
import StorageConflictModal from './react/StorageConflictModal'
import FireRenderer from './react/FireRenderer'
import MonacoEditor from './react/MonacoEditor'
import OverlayModelViewer from './react/OverlayModelViewer'
import CornerIndicatorStats from './react/CornerIndicatorStats'

const isFirefox = ua.getBrowser().name === 'Firefox'
if (isFirefox) {
  // set custom property
  document.body.style.setProperty('--thin-if-firefox', 'thin')
}

const isIphone = ua.getDevice().model === 'iPhone' // todo ipad?

if (isIphone) {
  document.documentElement.style.setProperty('--hud-bottom-max', '21px') // env-safe-aria-inset-bottom
}

const RobustPortal = ({ children, to }) => {
  return createPortal(<PerComponentErrorBoundary>{children}</PerComponentErrorBoundary>, to)
}

const DisplayQr = () => {
  const { currentDisplayQr } = useSnapshot(miscUiState)

  if (!currentDisplayQr) return null

  return <div
    style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 15
    }}
    onClick={() => {
      miscUiState.currentDisplayQr = null
    }}
  >
    <QRCodeSVG size={384} value={currentDisplayQr} style={{ display: 'block', border: '2px solid black' }} />
  </div>
}

// mounted earlier than ingame ui TODO
const GameHud = ({ children }) => {
  const { loadedDataVersion } = useSnapshot(miscUiState)
  const [gameLoaded, setGameLoaded] = useState(false)

  useEffect(() => {
    customEvents.on('mineflayerBotCreated', () => {
      bot.once('inject_allowed', () => {
        setGameLoaded(true)
      })
    })
  }, [])
  useEffect(() => {
    if (!loadedDataVersion) setGameLoaded(false)
  }, [loadedDataVersion])

  return gameLoaded ? children : null
}

const InGameComponent = ({ children }) => {
  const { gameLoaded } = useSnapshot(miscUiState)
  if (!gameLoaded) return null
  return children
}

// for Fullmap and Minimap in InGameUi
let adapter: DrawerAdapterImpl

const InGameUi = () => {
  const { gameLoaded, showUI: showUIRaw } = useSnapshot(miscUiState)
  const { disabledUiParts, displayBossBars, showMinimap } = useSnapshot(options)
  const modalsSnapshot = useSnapshot(activeModalStack)
  const hasModals = modalsSnapshot.length > 0
  const showUI = showUIRaw || hasModals
  const displayFullmap = modalsSnapshot.some(modal => modal.reactType === 'full-map') || true
  // bot can't be used here

  if (!gameLoaded || !bot || disabledUiParts.includes('*')) return

  if (!adapter) adapter = new DrawerAdapterImpl(bot.entity.position)

  return <>
    <RobustPortal to={document.querySelector('#ui-root')}>
      {/* apply scaling */}
      <div style={{ display: showUI ? 'block' : 'none' }}>
        <PerComponentErrorBoundary>
          <GameInteractionOverlay zIndex={7} />
          {!disabledUiParts.includes('death-screen') && <DeathScreenProvider />}
          {!disabledUiParts.includes('debug-overlay') && <DebugOverlay />}
          {!disabledUiParts.includes('mobile-top-buttons') && <MobileTopButtons />}
          {!disabledUiParts.includes('players-list') && <PlayerListOverlayProvider />}
          {!disabledUiParts.includes('chat') && <ChatProvider />}
          <SoundMuffler />
          {showMinimap !== 'never' && <MinimapProvider adapter={adapter} displayMode='minimapOnly' />}
          {!disabledUiParts.includes('title') && <TitleProvider />}
          {!disabledUiParts.includes('scoreboard') && <ScoreboardProvider />}
          <IndicatorEffectsProvider displayEffects={!disabledUiParts.includes('effects')} displayIndicators={!disabledUiParts.includes('indicators')} />
          {!disabledUiParts.includes('crosshair') && <Crosshair />}
          {!disabledUiParts.includes('books') && <BookProvider />}
          {!disabledUiParts.includes('bossbars') && displayBossBars && <BossBarOverlayProvider />}
          <VoiceMicrophone />
          <ChunksDebugScreen />
          <RendererDebugMenu />
          {!disabledUiParts.includes('fire') && <FireRenderer />}
        </PerComponentErrorBoundary>
      </div>

      <PerComponentErrorBoundary>
        <PauseScreen />
        <FullscreenTime />
        <MineflayerPluginHud />
        <MineflayerPluginConsole />
        {showUI && <TouchInteractionHint />}
        <GlobalOverlayHints />
        <div style={{ display: showUI ? 'block' : 'none' }}>
          {!disabledUiParts.includes('xp-bar') && <XPBarProvider />}
          {!disabledUiParts.includes('hud-bars') && <HudBarsProvider />}
          <BedTime />
        </div>
        {showUI && !disabledUiParts.includes('hotbar') && <HotbarRenderApp />}
      </PerComponentErrorBoundary>
    </RobustPortal>
    <PerComponentErrorBoundary>
      <SignEditorProvider />
      <DisplayQr />
    </PerComponentErrorBoundary>
    <RobustPortal to={document.body}>
      {displayFullmap && <MinimapProvider adapter={adapter} displayMode='fullmapOnly' />}
      {/* because of z-index */}
      {showUI && <TouchControls />}
      <GlobalSearchInput />
    </RobustPortal>
  </>
}

const AllWidgets = () => {
  return widgets.map(widget => <WidgetDisplay key={widget.name} name={widget.name} Component={widget.default} />)
}

const WidgetDisplay = ({ name, Component }) => {
  const isWidgetActive = useIsWidgetActive(name)
  if (!isWidgetActive) return null

  return <Component />
}

const App = () => {
  const scale = useAppScale()
  return (
    <UIProvider scale={scale}>
      <div>
        <ButtonAppProvider>
          <RobustPortal to={document.body}>
            <div className='overlay-bottom-scaled'>
              <InGameComponent>
                <HeldMapUi />
              </InGameComponent>
            </div>
            <ControDebug />
            <div />
          </RobustPortal>
          <EnterFullscreenButton />
          <StorageConflictModal />
          <InGameUi />
          <RobustPortal to={document.querySelector('#ui-root')}>
            <AllWidgets />
            <SingleplayerProvider />
            <CreateWorldProvider />
            <AppStatusProvider />
            <KeybindingsScreenProvider />
            <ServersListProvider />
            <OptionsRenderApp />
            <MainMenuRenderApp />
            <ConnectOnlyServerUi />
            <TouchAreasControlsProvider />
            <SignInMessageProvider />
            <PacketsReplayProvider />
            <NotificationProvider />
            <ModsPage />
            <SelectOption />
            <CreditsAboutModal />
            <NoModalFoundProvider />
          </RobustPortal>
          <RobustPortal to={document.body}>
            <div className='overlay-top-scaled'>
              <GamepadUiCursor />
            </div>
            <div />
            <DebugEdges />
            <OverlayModelViewer />
            <MonacoEditor />
            <DebugResponseTimeIndicator />
            <CornerIndicatorStats />
          </RobustPortal>
        </ButtonAppProvider>
      </div>
    </UIProvider>
  )
}

const PerComponentErrorBoundary = ({ children }) => {
  return children.map((child, i) => <ErrorBoundary
    key={i}
    renderError={(error) => {
      const componentNameClean = (child.type.name || child.type.displayName || 'Unknown').replaceAll(/__|_COMPONENT/g, '')
      showNotification(`UI component ${componentNameClean} crashed!`, 'Please report this. Use console for more.', true, undefined)
      return null
    }}
  >
    {child}
  </ErrorBoundary>)
}

if (!new URLSearchParams(window.location.search).get('no-ui')) {
  renderToDom(<App />, {
    strictMode: false,
    selector: '#react-root',
  })
}

disableReactProfiling()
function disableReactProfiling () {
  if (window.reactPerfPatchApplied) return
  window.reactPerfPatchApplied = true
  //@ts-expect-error
  window.performance.markOrig = window.performance.mark
  //@ts-expect-error
  window.performance.mark = (name, options) => {
    // ignore react internal marks
    if (!name.startsWith('⚛') && !localStorage.enableReactProfiling) {
      //@ts-expect-error
      window.performance.markOrig(name, options)
    }
  }
}
