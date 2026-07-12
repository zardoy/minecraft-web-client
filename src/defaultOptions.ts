import {
  RENDERER_DEFAULT_OPTIONS,
  RENDERER_OPTIONS_META
} from 'minecraft-renderer/src/graphicsBackend/rendererDefaultOptions'

export const defaultOptions = {
  renderDistance: 3,
  closeConfirmation: true,
  autoFullScreen: false,
  mouseRawInput: true,
  autoExitFullscreen: false,
  localUsername: 'wanderer',
  mouseSensX: 50,
  mouseSensY: -1,
  chatWidth: 320,
  chatHeight: 180,
  chatScale: 100,
  chatOpacity: 100,
  chatOpacityOpened: 100,
  messagesLimit: 200,
  displayLoadingMessages: true,
  volume: 50,
  enableMusic: true,
  musicVolume: 25,
  defaultPerspective: 'first_person' as 'first_person' | 'third_person_back' | 'third_person_front',
  guiScale: 3,
  autoRequestCompletions: true,
  touchButtonsSize: 40,
  touchButtonsOpacity: 80,
  touchButtonsPosition: 12,
  touchControlsPositions: getDefaultTouchControlsPositions(),
  touchControlsSize: getTouchControlsSize(),
  touchMovementType: 'modern' as 'modern' | 'classic',
  touchInteractionType: 'classic' as 'classic' | 'buttons',
  /** @unstable */
  disableAssets: false,
  /** @unstable */
  debugLogNotFrequentPackets: false,
  unimplementedContainers: false,
  ...RENDERER_DEFAULT_OPTIONS,
  enabledResourcepack: null as string | null,
  useVersionsTextures: 'latest',
  serverResourcePacks: 'prompt' as 'prompt' | 'always' | 'never',
  displayRecordButton: true,
  packetsLoggerPreset: 'all' as 'all' | 'no-buffers',
  serversAutoVersionSelect: 'auto' as 'auto' | 'latest' | '1.20.4' | string,
  customChannels: 'websocket' as boolean | 'websocket',
  remoteContentNotSameOrigin: false as boolean | string[],
  packetsRecordingAutoStart: false,
  language: 'auto',
  preciseMouseInput: false,
  // todo ui setting, maybe enable by default?
  waitForChunksRender: false as 'sp-only' | boolean,
  inventoryJei: true as boolean | Array<'creative' | 'survival' | 'adventure' | 'spectator'>,
  inventoryNotes: true as boolean,
  inventoryPlaceholders: false,
  inventoryPlayerModel: true,
  modsSupport: false,
  modsAutoUpdate: 'check' as 'check' | 'never' | 'always',
  modsUpdatePeriodCheck: 24, // hours
  preventBackgroundTimeoutKick: false,
  preventSleep: false,
  debugContro: false,
  debugChatScroll: false,
  chatVanillaRestrictions: true,
  debugResponseTimeIndicator: false,
  chatPingExtension: true,
  chatSpellCheckEnabled: false,
  chatAlwaysDisplayTypingIndicator: false,
  // antiAliasing: false,
  topRightTimeDisplay: 'only-fullscreen' as 'only-fullscreen' | 'always' | 'never',

  singleplayerAutoSave: false,
  alwaysBackupWorldBeforeLoading: undefined as boolean | undefined | null,
  alwaysShowMobileControls: false,
  /** Portrait viewport: apply `body.rotated` landscape layout without tapping the rotate button. */
  autoDisplayRotation: false,
  excludeCommunicationDebugEvents: [] as string[],
  preventDevReloadWhilePlaying: false,
  localServerOptions: {
    gameMode: 1
  } as any,
  saveLoginPassword: 'prompt' as 'prompt' | 'never' | 'always',
  preferLoadReadonly: false,
  experimentalClientSelfReload: false,
  remoteSoundsSupport: false,
  remoteSoundsLoadTimeout: 500,
  disableLoadPrompts: false,
  guestUsername: 'guest',
  askGuestName: true,
  errorReporting: true,
  /** Actually might be useful */
  showCursorBlockInSpectator: false,
  chatSelect: true,
  autoOpenAuthModal: false,
  autoJump: 'auto' as 'auto' | 'always' | 'never',
  autoParkour: false,
  // advanced bot options
  autoRespawn: false,
  mutedSounds: [] as string[],
  plugins: [] as Array<{ enabled: boolean, name: string, description: string, script: string }>,
  /** Wether to popup sign editor on server action */
  autoSignEditor: true,
  wysiwygSignEditor: 'auto' as 'auto' | 'always' | 'never',
  showMinimap: 'never' as 'always' | 'singleplayer' | 'never',
  minimapOptimizations: true,
  displayBossBars: true,
  disabledUiParts: [] as string[],
  neighborChunkUpdates: true,
  activeRenderer: 'auto' as 'auto' | string | null
}

function getDefaultTouchControlsPositions () {
  return {
    action: [
      70,
      76
    ],
    sneak: [
      84,
      76
    ],
    break: [
      70,
      57
    ],
    jump: [
      84,
      57
    ],
  } as Record<string, [number, number]>
}

function getTouchControlsSize () {
  return {
    joystick: 55,
    action: 36,
    break: 36,
    jump: 36,
    sneak: 36,
  }
}

/**
 * Map of settings that are safe to change from the server.
 * These are rendering/display/input preferences that don't affect critical client functionality.
 * Settings like modsSupport, customChannels, or security-related options are excluded.
 */
export const serverSafeSettings: Partial<Record<keyof typeof defaultOptions, true>> = {
  remoteContentNotSameOrigin: true, // allow server to change remote content not same origin policy
  renderEars: true,
  viewBobbing: true,
  mouseRawInput: true,
  preciseMouseInput: true,
  showHand: true,
  fov: true,
  defaultPerspective: true,
  volume: true,
  musicVolume: true,
  enableMusic: true,
  smoothLighting: true,
  starfieldRendering: true,
  defaultSkybox: true,
  dayCycleAndLighting: true,
  showChunkBorders: true,
  renderDebug: true,
  highlightBlockColor: true,
  displayBossBars: true,
  showMinimap: true,
  autoJump: true,
  chatVanillaRestrictions: true,
  chatPingExtension: true,
  chatSpellCheckEnabled: true,
  renderEntities: true,
  displayRecordButton: true,
  topRightTimeDisplay: true,
  guiScale: true,
  chatWidth: true,
  chatHeight: true,
  chatScale: true,
  loadPlayerSkins: true,
  disableBlockEntityTextures: true,
  neighborChunkUpdates: true,
  newVersionsLighting: true,
  showCursorBlockInSpectator: true,
}
export type OptionValueType = string | number | boolean | string[] | Record<string, any> | null

export type OptionPossibleValues =
  | string[]
  | Array<[string, string]> // [value, label] tuples

export type OptionMeta = {
  possibleValues?: OptionPossibleValues
  isCustomInput?: boolean // If true, use showInputsModal for string input
  min?: number
  max?: number
  unit?: string
  text?: string
  tooltip?: string
  requiresRestart?: boolean
  requiresChunksReload?: boolean
}

export const optionsMeta: Partial<Record<keyof typeof defaultOptions, OptionMeta>> = {
  ...RENDERER_OPTIONS_META,
  activeRenderer: {
    possibleValues: [
      ['threejs', 'Three.js (stable)'],
    ]
  },
  serverResourcePacks: {
    possibleValues: ['prompt', 'always', 'never']
  },
  showMinimap: {
    possibleValues: ['always', 'singleplayer', 'never']
  },
  wysiwygSignEditor: {
    possibleValues: ['auto', 'always', 'never']
  },
  touchMovementType: {
    possibleValues: [['modern', 'Modern'], ['classic', 'Classic']]
  },
  touchInteractionType: {
    possibleValues: [['classic', 'Classic'], ['buttons', 'Buttons']]
  },
  autoJump: {
    possibleValues: ['always', 'auto', 'never']
  },
  saveLoginPassword: {
    possibleValues: ['prompt', 'always', 'never']
  },
  packetsLoggerPreset: {
    possibleValues: [
      ['all', 'All'],
      ['no-buffers', 'No Buffers']
    ]
  },
  // Custom string inputs (will use showInputsModal)
  localUsername: {
    isCustomInput: true
  },
  guestUsername: {
    isCustomInput: true
  },
  language: {
    isCustomInput: true
  },
  enabledResourcepack: {
    isCustomInput: true
  },
  useVersionsTextures: {
    isCustomInput: true
  }
}
