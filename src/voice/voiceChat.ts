import {
  ConnectionState,
  LocalAudioTrack,
  RemoteAudioTrack,
  RemoteParticipant,
  RemoteTrack,
  RemoteTrackPublication,
  Room,
  RoomEvent,
  Track,
  createLocalAudioTrack
} from 'livekit-client'
import { proxy } from 'valtio'
import { getThreeJsRendererMethods } from 'minecraft-renderer/src/three/threeJsMethods'
import { options } from '../optionsStorage'
import { showModal, hideModal, miscUiState } from '../globalState'
import { showNotification } from '../react/NotificationProvider'
import { voiceChatStatus } from '../react/VoiceMicrophone'
import { VoiceSpatializer } from './voiceSpatializer'

export interface VoiceConfig {
  url: string
  room: string
  token: string
  identity: string
  hearingRange: number
  moderated: boolean
}

export interface NearbyPlayer {
  identity: string
  username: string
}

/**
 * Mirrors `minecraft-renderer`'s `PlayerVoiceState`. Duplicated locally (rather
 * than imported) because the installed renderer package hasn't been published
 * with `setPlayerVoiceState` yet — see the `any`-cast in `pushVoiceIndicator`.
 * Switch to a real type import once `minecraft-renderer` is bumped.
 */
type PlayerVoiceState = 'speaking' | 'muted' | 'idle'

/** Reactive list of who is currently audible, for the management modal. */
export const voiceNearbyPlayers = proxy([] as NearbyPlayer[])

let room: Room | undefined
let localTrack: LocalAudioTrack | undefined
/** In-flight first-talk mic capture, so overlapping PTT presses share one getUserMedia. */
let localTrackPromise: Promise<LocalAudioTrack | undefined> | undefined
/** Latest push-to-talk intent; applied after the mic track is ready. */
let wantTalking = false
let spatializer: VoiceSpatializer | undefined
let currentConfig: VoiceConfig | undefined
let nearbyIdentities = new Set<string>()
let sendToServer: ((action: string, payload: unknown) => void) | undefined
/** `available` often arrives during world load; hideCurrentScreens() clears modals, so defer until gameLoaded. */
let pendingVoiceAvailable = false
/** Identities the server has force-muted (moderation). */
let serverForceMuted: string[] = []
/** Identities LiveKit currently reports as actively speaking. */
let activeSpeakerIdentities = new Set<string>()
/** Safety net for `enableVoice`: clears a stuck `isJoining` if the server never answers. */
let joinTimeoutHandle: ReturnType<typeof setTimeout> | undefined

const clearJoinTimeout = () => {
  if (joinTimeoutHandle === undefined) return
  clearTimeout(joinTimeoutHandle)
  joinTimeoutHandle = undefined
}
/** Last state actually pushed to the renderer per identity, to avoid regenerating the nametag texture except on real transitions. */
const lastAppliedVoiceState: Record<string, PlayerVoiceState | undefined> = {}

/** Called by the custom channel layer to give us a way to talk back. */
export const setVoiceServerSender = (sender: (action: string, payload: unknown) => void) => {
  sendToServer = sender
}

const getPlayerSettings = (identity: string) => {
  return options.voicePlayerSettings[identity] ?? { volume: 1, muted: false }
}

export const setPlayerVoiceSettings = (identity: string, patch: { volume?: number, muted?: boolean }) => {
  const current = getPlayerSettings(identity)
  const next = { ...current, ...patch }
  options.voicePlayerSettings = { ...options.voicePlayerSettings, [identity]: next }
  if (patch.volume !== undefined) spatializer?.setVolume(identity, patch.volume * options.voiceMasterVolume)
  if (patch.muted !== undefined) {
    spatializer?.setMuted(identity, patch.muted)
    const player = voiceNearbyPlayers.find(p => p.identity === identity)
    if (player) refreshVoiceIndicator(identity, player.username)
  }
}

export const getVoiceSpatializer = () => spatializer

const applyStoredSettings = (identity: string) => {
  const { volume, muted } = getPlayerSettings(identity)
  spatializer?.setVolume(identity, volume * options.voiceMasterVolume)
  spatializer?.setMuted(identity, muted)
}

const attachRemoteTrack = (track: RemoteTrack, participant: RemoteParticipant) => {
  if (track.kind !== Track.Kind.Audio) return
  const stream = new MediaStream([track.mediaStreamTrack])
  spatializer?.addSpeaker(participant.identity, participant.name || participant.identity, stream)
  applyStoredSettings(participant.identity)
}

const computeVoiceState = (identity: string): PlayerVoiceState => {
  if (serverForceMuted.includes(identity) || getPlayerSettings(identity).muted) return 'muted'
  if (activeSpeakerIdentities.has(identity)) return 'speaking'
  return 'idle'
}

/**
 * Push a mic glyph onto the player's in-world nametag, but only when the
 * state actually changed — this regenerates the nametag texture on the
 * renderer side, so it must not run every time an unrelated event fires.
 *
 * TODO: swap the `any`-cast for a typed call once `minecraft-renderer` is
 * published with `setPlayerVoiceState` and the client's dependency is bumped.
 */
const pushVoiceIndicator = (identity: string, username: string, state: PlayerVoiceState | undefined) => {
  if (lastAppliedVoiceState[identity] === state) return
  const entityId = bot?.players?.[username]?.entity?.id
  if (entityId === undefined) return // entity not loaded yet; retried on the next event
  lastAppliedVoiceState[identity] = state
  void getThreeJsRendererMethods()?.setPlayerVoiceState?.(entityId, username, state)
}

const refreshVoiceIndicator = (identity: string, username: string) => {
  pushVoiceIndicator(identity, username, computeVoiceState(identity))
}

const refreshAllNearbyIndicators = () => {
  for (const { identity, username } of voiceNearbyPlayers) {
    refreshVoiceIndicator(identity, username)
  }
}

/**
 * Reconcile subscriptions against the current `nearbyIdentities`/`serverForceMuted`
 * state. Called both when that state changes (a new `nearby` payload) and when a
 * participant or track appears — the two are not the same event: the proxy only
 * resends `nearby` when the computed set changes, but LiveKit's own connection
 * (and each participant's track publish) happens on its own timeline. If a
 * participant connects *after* the last `nearby` push and nothing re-runs this,
 * that participant is never subscribed to, permanently.
 */
const applySubscriptionState = () => {
  if (!room) return
  console.log('[voice] reconciling subscriptions', {
    nearby: [...nearbyIdentities],
    forceMuted: serverForceMuted,
    knownParticipants: [...room.remoteParticipants.keys()]
  })

  for (const participant of room.remoteParticipants.values()) {
    const shouldHear = nearbyIdentities.has(participant.identity) && !serverForceMuted.includes(participant.identity)
    for (const publication of participant.trackPublications.values()) {
      if (publication.kind !== Track.Kind.Audio) continue
      if (publication.isSubscribed !== shouldHear) {
        console.log('[voice] setSubscribed', { identity: participant.identity, shouldHear })
        ;(publication).setSubscribed(shouldHear)
      }
    }
    if (!shouldHear) spatializer?.removeSpeaker(participant.identity)
  }
}

/**
 * Apply the server-authoritative proximity set: subscribe to audible players,
 * unsubscribe from everyone else. Because the LiveKit connection is already
 * established, this is instant and causes no audio dropout.
 */
export const applyNearbyPlayers = (players: NearbyPlayer[], forceMuted: string[] = []) => {
  const previousPlayers = [...voiceNearbyPlayers]
  nearbyIdentities = new Set(players.map(p => p.identity))
  serverForceMuted = forceMuted

  voiceNearbyPlayers.splice(0, voiceNearbyPlayers.length, ...players)
  voiceChatStatus.isAlone = players.length === 0

  // Hide the indicator for anyone who just dropped out of proximity range
  for (const previous of previousPlayers) {
    if (nearbyIdentities.has(previous.identity)) continue
    pushVoiceIndicator(previous.identity, previous.username, undefined)
    delete lastAppliedVoiceState[previous.identity]
  }
  refreshAllNearbyIndicators()

  applySubscriptionState()
}

export const isVoiceConnected = () => room?.state === ConnectionState.Connected

const micCaptureOptions = () => ({
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  deviceId: options.voiceInputDeviceId || undefined
})

/**
 * Capture and publish the local mic the first time the user actually talks.
 * Join stays listen-only so getUserMedia is not prompted just to hear others.
 */
const ensureLocalMicTrack = async (): Promise<LocalAudioTrack | undefined> => {
  if (localTrack) return localTrack
  if (localTrackPromise) return localTrackPromise
  if (!room || room.state !== ConnectionState.Connected) return undefined

  const connectedRoom = room
  localTrackPromise = (async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(`Microphone unavailable: this page must be served over HTTPS (or http://localhost) to speak. Current origin: ${location.origin}`)
      }
      const track = await createLocalAudioTrack(micCaptureOptions())
      if (room !== connectedRoom || connectedRoom.state !== ConnectionState.Connected) {
        track.stop()
        return undefined
      }
      await connectedRoom.localParticipant.publishTrack(track)
      if (!wantTalking) await track.mute()
      localTrack = track
      return track
    } catch (error) {
      console.error('[voice] failed to enable microphone', error)
      showNotification('Microphone access failed', String(error), true)
      return undefined
    } finally {
      localTrackPromise = undefined
    }
  })()
  return localTrackPromise
}

/** Push-to-talk. Requests the mic on first press, then unmutes the published track. */
export const setTalking = (talking: boolean) => {
  wantTalking = talking
  if (!talking) {
    if (localTrack) void localTrack.mute()
    voiceChatStatus.muted = true
    return
  }
  if (!room || room.state !== ConnectionState.Connected) return
  void ensureLocalMicTrack().then(track => {
    if (!track) {
      voiceChatStatus.muted = true
      return
    }
    if (wantTalking) void track.unmute()
    else void track.mute()
    voiceChatStatus.muted = !wantTalking
  })
}

/** Open-mic mode: the keybind toggles instead of holding. */
export const toggleTalking = () => {
  setTalking(voiceChatStatus.muted)
}

// Used by the HUD indicator for tap-to-talk on touch devices
window.voiceSetTalking = setTalking

export const connectVoice = async (config: VoiceConfig) => {
  if (room) return
  currentConfig = config

  spatializer = new VoiceSpatializer()
  spatializer.setHearingRange(config.hearingRange)

  room = new Room({
    // Voice is low-bitrate and proximity-gated; we manage subscriptions ourselves
    adaptiveStream: false,
    dynacast: false
  })

  room
    .on(RoomEvent.ParticipantConnected, participant => {
      // The proxy only resends `nearby` when the computed set changes, so a
      // participant joining LiveKit after the last push must be reconciled here.
      console.log('[voice] participant connected', participant.identity)
      applySubscriptionState()
    })
    .on(RoomEvent.TrackPublished, (_publication, participant) => {
      // Publishing can also happen after the participant is already known
      // (e.g. they enabled voice chat after joining the room).
      console.log('[voice] track published', participant.identity)
      applySubscriptionState()
    })
    .on(RoomEvent.TrackSubscribed, (track, _publication, participant) => {
      console.log('[voice] track subscribed', participant.identity)
      attachRemoteTrack(track, participant)
    })
    .on(RoomEvent.TrackUnsubscribed, (_track, _publication, participant) => {
      console.log('[voice] track unsubscribed', participant.identity)
      spatializer?.removeSpeaker(participant.identity)
    })
    .on(RoomEvent.ParticipantDisconnected, participant => {
      console.log('[voice] participant disconnected', participant.identity)
      spatializer?.removeSpeaker(participant.identity)
      delete lastAppliedVoiceState[participant.identity]
    })
    .on(RoomEvent.ActiveSpeakersChanged, speakers => {
      voiceChatStatus.hasInputVoice = speakers.some(s => s.identity === config.identity)
      activeSpeakerIdentities = new Set(speakers.map(s => s.identity))
      refreshAllNearbyIndicators()
    })
    .on(RoomEvent.Disconnected, () => {
      voiceChatStatus.isConnected = false
    })
    .on(RoomEvent.Reconnected, () => {
      voiceChatStatus.isConnected = true
      voiceChatStatus.isErrored = false
    })

  try {
    // autoSubscribe off: proximity decides what we listen to
    await room.connect(config.url, config.token, { autoSubscribe: false })
    console.log('[voice] room connected, known participants:', [...room.remoteParticipants.keys()])
    // Participants already in the room at connect time never fire
    // ParticipantConnected (that event is only for later joiners), so this
    // covers the case where the other player got here first.
    applySubscriptionState()

    // Mic is captured later, on first push-to-talk, so joining can be listen-only.
    clearJoinTimeout()
    voiceChatStatus.isJoining = false
    voiceChatStatus.active = true
    voiceChatStatus.isConnected = true
    voiceChatStatus.isErrored = false
    voiceChatStatus.muted = true
  } catch (error) {
    console.error('[voice] failed to connect', error)
    showNotification('Voice chat failed to connect', String(error), true)
    // Tear down the connection but keep the HUD indicator visible in an
    // errored state, rather than fully disconnecting (which would hide it).
    await cleanupConnection()
    clearJoinTimeout()
    voiceChatStatus.isJoining = false
    voiceChatStatus.active = true
    voiceChatStatus.isConnected = false
    voiceChatStatus.isErrored = true
  }
}

/** Internal teardown, shared by the error path and the public disconnect. Does not touch `active`. */
const cleanupConnection = async () => {
  wantTalking = false
  localTrackPromise = undefined
  if (localTrack) {
    localTrack.stop()
    localTrack = undefined
  }
  if (room) {
    await room.disconnect()
    room = undefined
  }
  spatializer?.destroy()
  spatializer = undefined
  nearbyIdentities.clear()
  for (const { identity, username } of voiceNearbyPlayers) {
    pushVoiceIndicator(identity, username, undefined)
  }
  voiceNearbyPlayers.splice(0, voiceNearbyPlayers.length)
  for (const key of Object.keys(lastAppliedVoiceState)) delete lastAppliedVoiceState[key]
  activeSpeakerIdentities = new Set()
  serverForceMuted = []
}

export const disconnectVoice = async () => {
  await cleanupConnection()
  clearJoinTimeout()
  voiceChatStatus.isJoining = false
  voiceChatStatus.active = false
  voiceChatStatus.isConnected = false
  voiceChatStatus.isErrored = false
  voiceChatStatus.hasInputVoice = false
  pendingVoiceAvailable = false
}

/** Change the microphone device, republishing the track. */
export const setInputDevice = async (deviceId: string) => {
  options.voiceInputDeviceId = deviceId
  if (!room || !localTrack) return
  const wasMuted = localTrack.isMuted
  await room.localParticipant.unpublishTrack(localTrack)
  localTrack.stop()
  localTrack = await createLocalAudioTrack(micCaptureOptions())
  await room.localParticipant.publishTrack(localTrack)
  if (wasMuted) await localTrack.mute()
}

export const setMasterVolume = (volume: number) => {
  options.voiceMasterVolume = volume
  for (const { identity } of voiceNearbyPlayers) {
    applyStoredSettings(identity)
  }
}

/** Server told us voice chat exists here. Ask the user once, then opt in. */
export const onVoiceAvailable = () => {
  // Sticky regardless of the enabled/consent state below, so pause-screen
  // join/leave controls stay reachable even after declining or leaving.
  voiceChatStatus.serverSupportsVoice = true

  if (!options.voiceChatEnabled) return
  // Consent modal would be wiped by hideCurrentScreens() at end of connect — wait for world.
  if (!miscUiState.gameLoaded) {
    pendingVoiceAvailable = true
    return
  }
  presentVoiceAvailable()
}

const presentVoiceAvailable = () => {
  if (!options.voiceChatEnabled) return
  if (!options.voiceChatConsented) {
    showModal({ reactType: 'voice-chat-consent' })
    return
  }
  enableVoice()
}

/** Explicit user action (e.g. the pause screen button) — always attempts to join, ignoring a prior decline. */
export const joinVoiceChat = () => {
  if (!options.voiceChatConsented) {
    showModal({ reactType: 'voice-chat-consent' })
    return
  }
  enableVoice()
}

export const leaveVoiceChat = () => {
  options.voiceChatEnabled = false
  clearJoinTimeout()
  voiceChatStatus.isJoining = false
  // The proxy tracks who's enabled server-side (to know who to include in
  // proximity computation); without this it still thinks we're joined, and a
  // later 'enable' silently no-ops there instead of sending back a fresh config.
  sendToServer?.('disable', {})
  void disconnectVoice()
}

customEvents.on('gameLoaded', () => {
  if (!pendingVoiceAvailable) return
  pendingVoiceAvailable = false
  // hideCurrentScreens() runs synchronously after gameLoaded in connect — wait until it finishes.
  setTimeout(() => {
    presentVoiceAvailable()
  }, 0)
})

export const enableVoice = () => {
  options.voiceChatEnabled = true
  options.voiceChatConsented = true
  voiceChatStatus.isJoining = true
  sendToServer?.('enable', {})

  // If the server never answers (dropped connection, restarted proxy, the
  // stale-state bug this was added for), don't leave the button stuck showing
  // "Joining…" forever.
  clearJoinTimeout()
  joinTimeoutHandle = setTimeout(() => {
    joinTimeoutHandle = undefined
    if (!voiceChatStatus.isJoining) return
    console.warn('[voice] timed out waiting for the server to confirm voice chat')
    voiceChatStatus.isJoining = false
    voiceChatStatus.isErrored = true
    voiceChatStatus.active = true
  }, 10_000)
}

export const declineVoice = () => {
  options.voiceChatEnabled = false
  options.voiceChatConsented = true
  hideModal()
}

export const onVoiceConfig = (config: VoiceConfig) => {
  void connectVoice(config)
}

export const getVoiceConfig = () => currentConfig
