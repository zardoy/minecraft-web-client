export const defaultOptions = {
  renderDistance: 3,
  keepChunksDistance: 1,
  multiplayerRenderDistance: 3,
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
  fov: 75,
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
  gpuPreference: 'default' as 'default' | 'high-performance' | 'low-power',
  backgroundRendering: '20fps' as 'full' | '20fps' | '5fps',
  /** @unstable */
  disableAssets: false,
  /** @unstable */
  debugLogNotFrequentPackets: false,
  unimplementedContainers: false,
  dayCycleAndLighting: true,
  loadPlayerSkins: true,
  renderEars: true,
  lowMemoryMode: false,
  starfieldRendering: true,
  defaultSkybox: true,
  enabledResourcepack: null as string | null,
  useVersionsTextures: 'latest',
  serverResourcePacks: 'prompt' as 'prompt' | 'always' | 'never',
  showHand: true,
  viewBobbing: true,
  displayRecordButton: true,
  packetsLoggerPreset: 'all' as 'all' | 'no-buffers',
  serversAutoVersionSelect: 'auto' as 'auto' | 'latest' | '1.20.4' | string,
  customChannels: false,
  remoteContentNotSameOrigin: false as boolean | string[],
  packetsRecordingAutoStart: false,
  language: 'auto',
  preciseMouseInput: false,
  // todo ui setting, maybe enable by default?
  waitForChunksRender: false as 'sp-only' | boolean,
  jeiEnabled: true as boolean | Array<'creative' | 'survival' | 'adventure' | 'spectator'>,
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
  // antiAliasing: false,
  topRightTimeDisplay: 'only-fullscreen' as 'only-fullscreen' | 'always' | 'never',

  clipWorldBelowY: undefined as undefined | number, // will be removed
  disableSignsMapsSupport: false,
  singleplayerAutoSave: false,
  showChunkBorders: false, // todo rename option
  frameLimit: false as number | false,
  alwaysBackupWorldBeforeLoading: undefined as boolean | undefined | null,
  alwaysShowMobileControls: false,
  excludeCommunicationDebugEvents: [] as string[],
  preventDevReloadWhilePlaying: false,
  numWorkers: 4,
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
  renderEntities: true,
  smoothLighting: true,
  newVersionsLighting: false,
  chatSelect: true,
  autoJump: 'auto' as 'auto' | 'always' | 'never',
  autoParkour: false,
  vrSupport: true, // doesn't directly affect the VR mode, should only disable the button which is annoying to android users
  vrPageGameRendering: false,
  renderDebug: 'basic' as 'none' | 'advanced' | 'basic',
  rendererPerfDebugOverlay: false,

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
  highlightBlockColor: 'auto' as 'auto' | 'blue' | 'classic',
  activeRenderer: 'threejs',
  rendererSharedOptions: {
    _experimentalSmoothChunkLoading: true,
    _renderByChunks: false
  }
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
