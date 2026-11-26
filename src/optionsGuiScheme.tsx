import { useContext, useEffect, useMemo, useState } from 'react'
import { useSnapshot } from 'valtio'
import { versionToNumber } from 'mc-assets/dist/utils'
import { openURL } from 'minecraft-renderer/src/lib/simpleUtils'
import Logo from 'minecraft-renderer/logo.webp'
import {
  RENDERER_EFFECT_OPTION_KEYS,
  RENDERER_VISUAL_PROFILES,
  detectVisualProfile,
  type RendererVisualProfileId
} from 'minecraft-renderer/src/graphicsBackend/rendererDefaultOptions'
import { gameAdditionalState, miscUiState, showModal } from './globalState'
import { AppOptions, options } from './optionsStorage'
import { showResetSettingsModal } from './react/AllSettingsEditor'
import { getScreenRefreshRate } from './utils'
import { setLoadingScreenStatus } from './appStatus'
import { openFilePicker, resetLocalStorage } from './browserfs'
import { completeResourcepackPackInstall, getResourcePackNames, resourcepackReload, resourcePackState, uninstallResourcePack } from './resourcePack'
import { downloadPacketsReplay, packetsRecordingState } from './packetsReplay/packetsReplayLegacy'
import { showOptionsModal } from './react/SelectOption'
import { ClientMod, getAllMods, modsUpdateStatus } from './clientMods'
import supportedVersions from './supportedVersions.mjs'
import { getVersionAutoSelect } from './connect'
import { createNotificationProgressReporter } from './core/progressReporter'
import { appStorage } from './react/appStorageProvider'
import { exportData, importData } from './core/importExport'
import { appGraphicBackends, getCurrentGraphicsBackend } from './appViewerLoad'
import { openVisualEffectsPanel } from './visualEffectsPanel'
import { ActionRow, ChoicePicker, OptionRow, Segmented, SettingRow, SettingsViewContext, Switch } from './react/settings/SettingsControls'
import Slider from './react/Slider'
import FlatButton from './react/ui/FlatButton'
import schemeStyles from './react/settings/settings.module.css'

// Settings screen layout: tabs, each a list of sections and rows.
// An option row only names the option: its label, description, choices and limits come from `optionsMeta` (defaultOptions.ts / the renderer),
// the fields here override them. A `custom` row renders itself (usually with SettingRow / ActionRow) and is found by search with `text` + `keywords`.

export interface OptionItem {
  option: keyof AppOptions
  text?: string
  tooltip?: string
  /** forced control kind, by default it follows the value type and number of choices */
  control?: 'switch' | 'segmented' | 'picker' | 'slider'
  possibleValues?: Array<[string, string]>
  min?: number
  max?: number
  unit?: string
  valueText?: (value: number) => string
  valueOverride?: number
  onChange?: (value: number) => void
  /** slider applies the value when released */
  delayApply?: boolean
  disabledReason?: string
  disabledDuringGame?: boolean
  disableIf?: [option: keyof AppOptions, value: unknown]
  enableWarning?: string
  requiresRestart?: boolean
  requiresRestartWhenInGame?: boolean
  requiresChunksReload?: boolean
}

export interface CustomItem {
  custom: () => React.ReactNode
  /** for search, also the row's React key: unique */
  text: string
  keywords?: string
  /** false: the row renders nothing now, search skips it too */
  available?: () => boolean
}

export interface SectionItem {
  section: string
  /** old sub-page id, `openOptionsMenu(anchor)` scrolls here */
  anchor?: OptionsGroupType
}

export type SettingsItem = OptionItem | CustomItem | SectionItem

export type SettingsTabId = 'quick' | 'general' | 'graphics' | 'interface' | 'controls' | 'audio' | 'advanced' | 'vr'

export interface SettingsTab {
  id: SettingsTabId
  label: string
  icon: string
  items: SettingsItem[]
  /** rarely changed rows, behind "Show advanced settings" at the end of the tab */
  advanced?: SettingsItem[]
  /** only repeats rows of other tabs: left out of search */
  shortcuts?: boolean
}

/** the old sub-pages: `openOptionsMenu(group)` still works and opens the tab (and section) that holds them now */
export type OptionsGroupType = 'main' | 'render' | 'renderer-advanced' | 'interface' | 'controls' | 'sound' | 'advanced' | 'VR' | 'export-import' | 'inventory'

export const groupToTab: Record<OptionsGroupType, SettingsTabId> = {
  main: 'quick',
  render: 'graphics',
  'renderer-advanced': 'graphics',
  VR: 'vr',
  interface: 'interface',
  inventory: 'interface',
  controls: 'controls',
  sound: 'audio',
  advanced: 'advanced',
  'export-import': 'advanced',
}

// #region custom rows

const RenderDistanceRow = () => {
  const { singleplayer, gameLoaded } = useSnapshot(miscUiState)
  const sp = singleplayer || !gameLoaded
  return <OptionRow item={{ option: 'renderDistance', text: 'Render Distance', tooltip: 'How far the world is loaded around you, in chunks. Servers can limit it; more costs memory and loading time.', unit: '', min: 1, max: sp ? 16 : 12 }} />
}

const ResourcePackRow = () => {
  const { resourcePackInstalled } = useSnapshot(resourcePackState)
  const { usingServerResourcePack } = useSnapshot(gameAdditionalState)
  const { enabledResourcepack } = useSnapshot(options)
  const status = usingServerResourcePack ? 'Server pack' : resourcePackInstalled ? (enabledResourcepack ? 'On' : 'Off') : 'None'
  return <ActionRow
    label={`Resource Pack: ${status}`}
    description='Install a .zip resource pack, or turn off / remove the installed one.'
    buttonLabel={resourcePackInstalled ? 'Manage...' : 'Install...'}
    onClick={async () => {
      if (!resourcePackState.resourcePackInstalled) {
        openFilePicker('resourcepack')
        return
      }
      const names = Object.keys(await getResourcePackNames())
      const name = names[0]
      const choice = await showOptionsModal(`Resource Pack ${name}`, [options.enabledResourcepack ? 'Disable' : 'Enable', 'Uninstall'])
      if (!choice) return
      switch (choice) {
        case 'Disable': {
          options.enabledResourcepack = null
          await resourcepackReload()
          break
        }
        case 'Enable': {
          // installed packs live in the 'default' folder, `name` is only the display name
          options.enabledResourcepack = 'default'
          await completeResourcepackPackInstall(name, 'default', false, createNotificationProgressReporter())
          break
        }
        case 'Uninstall': {
          setLoadingScreenStatus('Uninstalling texturepack')
          try {
            await uninstallResourcePack()
          } finally {
            setLoadingScreenStatus(undefined)
          }
          break
        }
      }
    }}
  />
}

const ClientModsRow = () => {
  const { appConfig } = useSnapshot(miscUiState)
  const modsUpdateSnapshot = useSnapshot(modsUpdateStatus)
  const [clientMods, setClientMods] = useState<ClientMod[]>([])
  useEffect(() => {
    void getAllMods().then(setClientMods)
  }, [])
  if (appConfig?.showModsButton === false) return null
  const enabled = clientMods.filter(mod => mod.enabled).length
  const updates = Object.keys(modsUpdateSnapshot).length
  return <ActionRow
    label={`Client Mods: ${enabled} on`}
    description={updates ? `${updates} update(s) available` : 'Mods change the interface, add features or connect to custom servers.'}
    buttonLabel='Manage...'
    onClick={() => showModal({ reactType: 'mods' })}
  />
}

const LanguageRow = () => {
  const { appConfig } = useSnapshot(miscUiState)
  const { language } = useSnapshot(options)
  if (!appConfig?.displayLanguageSelector) return null
  return <ActionRow
    label={`Language: ${language}`}
    buttonLabel='Change...'
    onClick={async () => {
      const newLang = await showOptionsModal('Set Language', (appConfig.supportedLanguages ?? []) as string[])
      if (!newLang) return
      options.language = newLang.split(' - ')[0]
    }}
  />
}

const applyProfile = (id: RendererVisualProfileId) => {
  Object.assign(options, RENDERER_VISUAL_PROFILES[id].options)
}

const VisualPresetRow = () => {
  const snapshot = useSnapshot(options)
  const active = detectVisualProfile(snapshot)
  return <SettingRow
    label='Visual Preset'
    description={active ? RENDERER_VISUAL_PROFILES[active].description : 'Custom: the effects below were changed by hand. Pick a preset to set them all at once.'}
  >
    <Segmented
      choices={Object.entries(RENDERER_VISUAL_PROFILES).map(([id, profile]) => [id, profile.label])}
      value={active ?? ''}
      onChange={id => applyProfile(id as RendererVisualProfileId)}
    />
  </SettingRow>
}

/** which engine draws the world: a small logo at the top of Graphics */
const PoweredByRow = () => {
  const { name } = useMemo(() => getCurrentGraphicsBackend(), [useSnapshot(options).activeRenderer])
  return <div className={schemeStyles.poweredBy}>
    <span>{translate('Graphics powered by')}</span>
    <img src={Logo} alt={name} title={name} />
  </div>
}

const LiveEffectsRow = () => {
  const { gameLoaded } = useSnapshot(miscUiState)
  return <ActionRow
    label='Live Tuning (F7)'
    description='A small panel over the game to tune the effects while you look at the world.'
    buttonLabel={gameLoaded ? 'Open' : 'In game only'}
    disabled={!gameLoaded}
    onClick={openVisualEffectsPanel}
  />
}

const FrameLimitRow = () => {
  const { frameLimit } = useSnapshot(options)
  const [frameLimitMax, setFrameLimitMax] = useState(null as number | null)
  return <SettingRow label='Frame Limit' description='Caps the frame rate to save battery. Press the lock to read your screen refresh rate first; the rightmost value is VSync.'>
    <div style={{ display: 'flex', gap: 2 }}>
      <Slider
        label=''
        disabledReason={frameLimitMax ? undefined : 'Press the lock button first'}
        unit={frameLimit ? 'fps' : ''}
        valueDisplay={frameLimit || 'VSync'}
        value={frameLimit || frameLimitMax! + 1}
        min={20}
        max={frameLimitMax! + 1}
        updateValue={(newVal) => {
          options.frameLimit = newVal > frameLimitMax! ? false : newVal
        }}
      />
      <FlatButton
        icon={frameLimitMax ? 'lock-open' : 'lock'}
        title='Read the screen refresh rate'
        onClick={async () => setFrameLimitMax(await getScreenRefreshRate())}
      />
    </div>
  </SettingRow>
}

const BackendRow = () => {
  const { activeRenderer } = useSnapshot(options)
  const { name, id } = useMemo(() => getCurrentGraphicsBackend(), [activeRenderer])
  const choices = appGraphicBackends.map(backend => [backend.id, backend.displayName ?? backend.id] as [string, string])
  return <SettingRow label='Graphics Backend' description={appGraphicBackends.find(b => b.id === id)?.description || `Draws the world: ${name}`}>
    <ChoicePicker
      title='Change Renderer (Builtin Graphics Backends)'
      choices={choices}
      value={id ?? ''}
      onChange={value => { options.activeRenderer = value }}
    />
  </SettingRow>
}

const UiPartRow = ({ name, label, description }: { name: string, label: string, description?: string }) => {
  const { disabledUiParts } = useSnapshot(options)
  const shown = !disabledUiParts.includes(name)
  return <SettingRow label={label} description={description}>
    <Switch
      value={shown}
      onChange={(show) => {
        options.disabledUiParts = show ? disabledUiParts.filter(x => x !== name) : [...disabledUiParts, name]
      }}
    />
  </SettingRow>
}

const JeiRow = () => {
  const { inventoryJei } = useSnapshot(options)
  const isOff = inventoryJei === false || (Array.isArray(inventoryJei) && inventoryJei.length === 0)
  const partial = Array.isArray(inventoryJei) && !isOff
  return <SettingRow
    label='Item List (JEI)'
    description={`Recipe and item list beside the inventory, chests and crafting.${partial ? ' Now: only in some game modes (set in the all settings editor).' : ''}`}
  >
    <Switch value={!isOff} onChange={(on) => { options.inventoryJei = on }} />
  </SettingRow>
}

const MusicVolumeRow = () => {
  const { enableMusic } = useSnapshot(options)
  return <OptionRow item={{ option: 'musicVolume', text: 'Music Volume', unit: '%', min: 0, max: 100, valueOverride: enableMusic ? undefined : 0, disableIf: ['enableMusic', false] }} />
}

const DefaultVersionRow = () => {
  const { serversAutoVersionSelect } = useSnapshot(options)
  // the automatic choices first, then the versions newest first
  const allVersions = ['auto', 'latest', ...[...supportedVersions].sort((a, b) => versionToNumber(b) - versionToNumber(a))]
  const label = (version: string) => {
    const resolved = getVersionAutoSelect(version)
    if (version === 'latest') return `Latest (${resolved})`
    if (version === 'auto') return `Auto (${resolved})`
    return version
  }
  return <SettingRow label='Default Version' description='For servers without a version set: the version the client offers when it asks the server which one to use. Servers that support several versions answer with this one.'>
    <ChoicePicker
      title='Default Version'
      choices={allVersions.map(v => [v, label(v)])}
      value={serversAutoVersionSelect}
      onChange={(v) => { options.serversAutoVersionSelect = v }}
    />
  </SettingRow>
}

const StorageRow = () => {
  const { cookieStorage } = useSnapshot(appStorage)
  return <SettingRow label='Storage' description='Where settings, servers and accounts are kept. Applies after a reload.'>
    <Segmented
      choices={[['local', 'Local'], ['cookies', 'Cookies']]}
      value={cookieStorage ? 'cookies' : 'local'}
      onChange={(v) => {
        appStorage.cookieStorage = v === 'cookies'
        alert('Reload the page to apply this change')
      }}
    />
  </SettingRow>
}

const PacketsLoggingRow = () => {
  const { active, hasRecordedPackets } = useSnapshot(packetsRecordingState)
  return <SettingRow label='Packets Replay Logging' description='Records the network packets of the session, to attach to a bug report. The button downloads the recording.'>
    <div style={{ display: 'flex', gap: 2 }}>
      <Switch value={active} onChange={(v) => { packetsRecordingState.active = v }} />
      <FlatButton icon='download' title='Download Packets Replay' disabled={!hasRecordedPackets} onClick={() => { void downloadPacketsReplay() }} />
    </div>
  </SettingRow>
}

const AllSettingsRow = () => {
  const openView = useContext(SettingsViewContext)
  return <ActionRow label='All Settings' description='Every setting by its key, also the ones without a row in these tabs.' buttonLabel='Show...' onClick={() => openView('all')} />
}

const TouchLayoutRow = () => {
  const { touchInteractionType, touchMovementType } = useSnapshot(options)
  return <ActionRow
    label='Touch Buttons Layout'
    description='Move and resize the touch buttons on screen.'
    buttonLabel='Setup...'
    disabled={touchInteractionType === 'classic' && touchMovementType === 'classic'}
    onClick={() => showModal({ reactType: 'touch-buttons-setup' })}
  />
}

// #endregion

const custom = (text: string, render: () => React.ReactNode, keywords?: string, available?: () => boolean): CustomItem => ({ custom: render, text, keywords, available })

const KeybindingsRow = () => {
  const openView = useContext(SettingsViewContext)
  return <ActionRow label='Keybindings' description='Keyboard and gamepad buttons for every action.' buttonLabel='Edit...' onClick={() => openView('keybindings')} />
}
const keybindingsRow = custom('Keybindings', () => <KeybindingsRow />, 'keys keyboard bindings')
const renderDistanceRow = custom('Render Distance', () => <RenderDistanceRow />, 'chunks view distance')
const musicVolumeRow = custom('Music Volume', () => <MusicVolumeRow />, 'music volume')
const visualPresetRow = custom('Visual Preset', () => <VisualPresetRow />, 'profile vanilla default maximum quality')
const isTouchDevice = () => matchMedia('(pointer: coarse)').matches

export const settingsTabs: SettingsTab[] = [
  {
    // what people change most, repeated from the other tabs
    id: 'quick',
    label: 'Quick',
    icon: 'zap',
    shortcuts: true,
    items: [
      renderDistanceRow,
      { option: 'fov', text: 'Field of View', min: 30, max: 110, unit: '' },
      { option: 'mouseSensX', text: 'Mouse Sensitivity' },
      { option: 'guiScale', max: 4, min: 1, unit: '', delayApply: true, text: 'GUI Scale', tooltip: 'Size of the whole interface. Applies when you release the slider.' },
      { option: 'volume', text: 'Master Volume' },
      musicVolumeRow,
      visualPresetRow,
      { option: 'renderDebug', text: 'Debug Overlay', tooltip: 'Frame rate and renderer numbers in the corner.' },
      { option: 'autoJump', disableIf: ['autoParkour', true], tooltip: 'Jump up one block without pressing jump.' },
      custom('Touch Movement', () => <OptionRow item={{ option: 'touchMovementType', text: 'Touch Movement' }} />, 'touch joystick', isTouchDevice),
      keybindingsRow,
    ],
  },
  {
    id: 'general',
    label: 'General',
    icon: 'sliders',
    items: [
      { section: 'View', anchor: 'main' },
      { option: 'fov', text: 'Field of View', min: 30, max: 110, unit: '', tooltip: 'How wide you see. Higher shows more around you, lower looks zoomed in.' },
      renderDistanceRow,
      { section: 'Content' },
      custom('Resource Pack', () => <ResourcePackRow />, 'texture pack textures'),
      custom('Client Mods', () => <ClientModsRow />, 'mods plugins', () => miscUiState.appConfig?.showModsButton !== false),
      custom('Language', () => <LanguageRow />, 'translation', () => !!miscUiState.appConfig?.displayLanguageSelector),
    ],
  },
  {
    id: 'graphics',
    label: 'Graphics',
    icon: 'monitor',
    items: [
      custom('Graphics powered by', () => <PoweredByRow />, 'three.js renderer engine'),
      { section: 'Quality', anchor: 'render' },
      visualPresetRow,
      { option: 'renderDebug', text: 'Debug Overlay', tooltip: 'Frame rate and renderer numbers in the corner.' },
      custom('Frame Limit', () => <FrameLimitRow />, 'fps vsync'),
      { section: 'Effects' },
      ...RENDERER_EFFECT_OPTION_KEYS.map((option): OptionItem => ({ option })),
      custom('Live Tuning', () => <LiveEffectsRow />, 'visual effects panel f7'),
      { section: 'World' },
      { option: 'dayCycleAndLighting', text: 'Day Cycle' },
      { option: 'animatedTextures' },
      { option: 'chunkFadeMs' },
      { option: 'cloudsRendering' },
      { option: 'starfieldRendering' },
      { option: 'renderEntities' },
      { option: 'renderEars', text: 'Deadmau5 Ears', tooltip: 'Render ears for all players whose skin has them' },
      { section: 'Menu' },
      { option: 'menuBackgroundMode', text: 'Menu Background' },
    ],
    advanced: [
      { section: 'Performance', anchor: 'renderer-advanced' },
      { option: 'backgroundRendering', text: 'Background FPS Limit', tooltip: 'Frame rate while the tab is not focused. "No" keeps the full rate.' },
      { option: 'rendererWorldPerformance', text: 'World Performance', requiresRestartWhenInGame: true },
      { option: 'rendererMesher' },
      { option: 'rendererSmartCull' },
      { option: 'keepChunksDistance', max: 5, unit: '', text: 'Keep Chunks Distance', tooltip: 'Additional distance to keep the chunks loading before unloading them by marking them as too far' },
      custom('Graphics Backend', () => <BackendRow />, 'renderer three.js'),
      { section: 'Lighting' },
      { option: 'newVersionsLighting' },
      { option: 'clientLighting' },
      { section: 'Debug' },
      { option: 'disableBlockEntityTextures', text: 'No Block Entity Textures', tooltip: 'Disables rendering of textures for block entities like signs, banners, heads, and maps' },
      { option: 'rendererPerfDebugOverlay', text: 'Performance Debug' },
      {
        option: 'preserveDrawingBuffer',
        text: 'Screenshot Buffer (F2)',
        tooltip: 'Keeps the last frame so F2 can save a screenshot. Turning it off saves some GPU work, mostly on older GPUs and phones, but F2 then does nothing. Applies after a reload.',
        requiresRestart: true,
      },
      custom('Disable VSync guide', () => <ActionRow label='Disable VSync' description='How to unlock the frame rate above your screen refresh rate in the browser.' buttonLabel='Open Guide' onClick={() => openURL('https://gist.github.com/zardoy/6e5ce377d2b4c1e322e660973da069cd')} />),
    ],
  },
  {
    id: 'interface',
    label: 'Interface',
    icon: 'layout',
    items: [
      { section: 'Display', anchor: 'interface' },
      { option: 'guiScale', max: 4, min: 1, unit: '', delayApply: true, text: 'GUI Scale', tooltip: 'Size of the whole interface. Applies when you release the slider.' },
      { option: 'highlightBlockColor', text: 'Block Highlight Color' },
      { option: 'showMinimap', text: 'Minimap', requiresRestart: true },
      { option: 'displayBossBars', text: 'Boss Bars' },
      { section: 'First Person' },
      { option: 'viewBobbing', text: 'View Bobbing', tooltip: 'The camera sways while walking.' },
      { option: 'showHand', text: 'Show Hand' },
      { section: 'HUD' },
      custom('Show Hotbar', () => <UiPartRow name='hotbar' label='Hotbar' />, 'hud ui'),
      custom('Show Chat', () => <UiPartRow name='chat' label='Chat' />, 'hud ui'),
      custom('Show Title', () => <UiPartRow name='title' label='Titles' description='Big title texts servers show in the middle of the screen.' />, 'hud ui'),
      custom('Show Scoreboard', () => <UiPartRow name='scoreboard' label='Scoreboard' />, 'hud ui'),
      custom('Show Effects', () => <UiPartRow name='effects' label='Effects' description='Potion effects with their time left.' />, 'hud ui'),
      custom('Show Indicators', () => <UiPartRow name='indicators' label='Game Indicators' description='Network, recording and other status icons.' />, 'hud ui'),
      { section: 'Chat' },
      { option: 'chatWidth', max: 320, unit: 'px' },
      { option: 'chatHeight', max: 180, unit: 'px' },
      { option: 'chatOpacity' },
      { option: 'chatOpacityOpened' },
      { section: 'Inventory & Containers', anchor: 'inventory' },
      custom('Item List (JEI)', () => <JeiRow />, 'jei recipes'),
      { option: 'inventoryPlayerModel', text: 'Player Preview', tooltip: 'Show the rotating player model in the survival inventory when supported.' },
    ],
    advanced: [
      { section: 'Chat Details' },
      { option: 'chatSelect', text: 'Text Select' },
      { option: 'chatPingExtension' },
      { option: 'chatAlwaysDisplayTypingIndicator', text: 'Always Show Typing' },
      { option: 'displayLoadingMessages', text: 'Loading Messages' },
      { section: 'Signs' },
      { option: 'autoSignEditor', text: 'Sign Editor' },
      { option: 'wysiwygSignEditor', text: 'WYSIWYG Editor' },
      { section: 'Containers' },
      { option: 'inventoryNotes', text: 'Side Notes Panel', tooltip: 'Show extra note slots in container UIs where supported.' },
      { option: 'inventoryPlaceholders', text: 'Slot Hints', tooltip: 'Show placeholder hints in empty inventory slots when supported.' },
      { option: 'unimplementedContainers', text: 'Try Unknown Containers', tooltip: 'If the server opens a container type the client does not implement yet, show a generic chest-style UI instead of failing.' },
    ],
  },
  {
    id: 'controls',
    label: 'Controls',
    icon: 'gamepad',
    items: [
      { section: 'Keyboard & Mouse', anchor: 'controls' },
      keybindingsRow,
      { option: 'mouseSensX', text: 'Mouse Sensitivity X' },
      { option: 'mouseSensY', text: 'Mouse Sensitivity Y', min: -1, valueText: (value) => (value === -1 ? 'Same as X' : `${value} %`) },
      { section: 'Movement' },
      { option: 'autoJump', disableIf: ['autoParkour', true], tooltip: 'Jump up one block without pressing jump.' },
      { option: 'autoParkour', tooltip: 'Also jump over gaps automatically.' },
      { section: 'Touch' },
      { option: 'touchMovementType', text: 'Movement Controls' },
      { option: 'touchInteractionType', text: 'Interaction Controls' },
      custom('Touch Buttons Layout', () => <TouchLayoutRow />, 'touch buttons setup position size'),
      { option: 'alwaysShowMobileControls', text: 'Always Show Touch Controls', disableIf: ['forceDisableTouchControls', true] },
      { option: 'forceDisableTouchControls', text: 'Never Show Touch Controls', tooltip: 'Never show touch controls, even if your device has a touchscreen. Useful for touch laptops used with mouse and keyboard.' },
      { option: 'autoDisplayRotation', text: 'Auto Landscape Rotation', tooltip: 'On portrait screens, automatically rotate the game to landscape layout (same as the rotate button).' },
    ],
    advanced: [
      { section: 'Mouse & Fullscreen' },
      {
        option: 'mouseRawInput',
        text: 'Raw Input',
        tooltip: 'Wether to disable any mouse acceleration (MC does it by default). Most probably it is still supported only by Chrome.',
        // eslint-disable-next-line no-extra-boolean-cast
        disabledReason: Boolean(document.documentElement.requestPointerLock) ? undefined : 'Your browser does not support pointer lock.',
      },
      {
        option: 'autoFullScreen',
        tooltip: 'Auto Fullscreen allows you to use Ctrl+W and Escape having to wait/click on screen again.',
        disabledReason: navigator['keyboard'] ? undefined : 'Your browser doesn\'t support keyboard lock API'
      },
      { option: 'autoExitFullscreen', tooltip: 'Exit fullscreen on escape (pause menu open). But note you can always do it with F11.' },
      { section: 'Classic Touch Buttons' },
      { option: 'touchButtonsSize', min: 40, disableIf: ['touchMovementType', 'modern'] },
      { option: 'touchButtonsOpacity', min: 10, max: 90, disableIf: ['touchMovementType', 'modern'] },
      { option: 'touchButtonsPosition', max: 80, disableIf: ['touchMovementType', 'modern'] },
    ],
  },
  {
    id: 'audio',
    label: 'Audio',
    icon: 'volume-3',
    items: [
      { section: 'Volume', anchor: 'sound' },
      { option: 'volume', text: 'Master Volume' },
      { option: 'enableMusic', text: 'Music' },
      musicVolumeRow,
      custom('Sound Muffler', () => <ActionRow label='Sound Muffler' description='Mute or quiet down single sounds that annoy you.' buttonLabel='Open...' onClick={() => showModal({ reactType: 'sound-muffler' })} />, 'mute sounds'),
      { section: 'Voice Chat' },
      { option: 'voiceChatEnabled', text: 'Voice Chat', tooltip: 'Join voice chat when a server offers it.' },
    ],
  },
  {
    id: 'advanced',
    label: 'Advanced',
    icon: 'code',
    items: [
      { section: 'Server Connection', anchor: 'advanced' },
      { option: 'serverResourcePacks', text: 'Server Resource Packs' },
      { option: 'saveLoginPassword', text: 'Save Login Passwords', tooltip: 'Controls whether to save login passwords for servers in this browser memory.' },
      custom('Default Version', () => <DefaultVersionRow />, 'version auto latest'),
      {
        option: 'preventBackgroundTimeoutKick',
        text: 'Stay Connected In Background',
        tooltip: 'Browsers slow down the timers of background tabs, and servers then kick you for not responding. This plays a silent sound while connected, so the browser keeps the tab running at full speed.',
      },
      {
        option: 'preventSleep',
        text: 'Prevent Device Sleep',
        disabledReason: navigator.wakeLock ? undefined : 'Your browser does not support wake lock API',
        enableWarning: 'When connected to a server, prevent PC from sleeping or screen dimming. Useful for purpusely staying AFK for long time. Some events might still prevent this like loosing tab focus or going low power mode.',
      },
      {
        option: 'sendPerfData',
        text: 'Send Performance Data',
        tooltip: 'Sends frame rate, stutters, loading times, and your device and graphics settings to servers that ask for it, to find and fix slow spots. Also off when your browser sends Do Not Track. Applies from the next connection.',
      },
      { section: 'Data', anchor: 'export-import' },
      custom('Export Data', () => <ActionRow label='Export Data' description='Settings, keybindings, servers and accounts as a file.' buttonLabel='Export' onClick={exportData} />, 'backup'),
      custom('Import Data', () => <ActionRow label='Import Data' description='Load a file made with Export.' buttonLabel='Import' onClick={importData} />, 'restore backup'),
      custom('Storage', () => <StorageRow />, 'cookies local storage'),
      custom('Reset Settings', () => <ActionRow label='Reset Settings' description='Pick which changed settings go back to their defaults.' buttonLabel='Reset...' onClick={() => { void showResetSettingsModal() }} />, 'defaults'),
      custom('Remove All Data', () => <ActionRow
        label='Remove All Data'
        description='Deletes settings, keybindings, servers, username, accounts and proxies from this browser.'
        buttonLabel='Remove...'
        danger
        onClick={() => {
          if (confirm('Are you sure you want to remove all data (settings, keybindings, servers, username, auth, proxies)?')) resetLocalStorage()
        }}
      />, 'clear wipe'),
      { section: 'Developer' },
      custom('All Settings', () => <AllSettingsRow />, 'raw json editor every key'),
      custom('Packets Replay Logging', () => <PacketsLoggingRow />, 'packets record replay download'),
      { option: 'packetsLoggerPreset', text: 'Packets Logger Preset' },
      { option: 'debugContro', text: 'Debug Controls' },
      { option: 'debugResponseTimeIndicator', text: 'Debug Input Lag' },
      { option: 'debugChatScroll' },
    ],
  },
  {
    id: 'vr',
    label: 'VR',
    icon: 'eye',
    items: [
      { section: 'VR', anchor: 'VR' },
      custom('VR note', () => <div className={schemeStyles.note}>{translate('Play in VR from the browser of your headset (WebXR): with VR Support on, the game shows an Enter VR button.')}</div>),
      { option: 'vrSupport' },
      { option: 'vrPageGameRendering', text: 'Page Game Rendering', tooltip: 'Wether to continue rendering page even when vr is active.' },
    ],
  },
]

export const isOptionItem = (item: SettingsItem): item is OptionItem => 'option' in item
export const isSectionItem = (item: SettingsItem): item is SectionItem => 'section' in item
export const isCustomItem = (item: SettingsItem): item is CustomItem => 'custom' in item

export const tryFindOptionConfig = (option: keyof AppOptions) => {
  for (const tab of settingsTabs) {
    for (const item of tab.items) {
      if (isOptionItem(item) && item.option === option) return item
    }
  }
  return null
}
