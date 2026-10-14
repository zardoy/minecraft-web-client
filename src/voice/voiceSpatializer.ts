import * as THREE from 'three'
import { setPannerPositionImmediate } from 'minecraft-renderer/src/three/positionalAudioAttenuation'

/**
 * Positions remote voice streams in the 3D world.
 *
 * Reuses the renderer's existing THREE.AudioListener (the same one vanilla
 * sounds are played through), so voice attenuates and pans consistently with
 * the rest of the game audio.
 */

interface SpeakerHandle {
  identity: string
  username: string
  audio: THREE.PositionalAudio
  /**
   * Chrome does not pump a remote WebRTC MediaStream through WebAudio unless
   * the stream is also attached to an HTMLMediaElement. This element is muted
   * and never heard directly; it exists purely to keep the stream flowing.
   * See https://crbug.com/121673
   */
  sink: HTMLAudioElement
  /** Last known world position, retained if the entity unloads. */
  position: THREE.Vector3
  volume: number
  muted: boolean
}

const getSoundSystem = () => {
  const soundSystem = appViewer?.backend?.soundSystem
  if (!soundSystem?.initAudioListener) return undefined
  soundSystem.initAudioListener()
  if (!soundSystem.audioListener) return undefined
  return soundSystem
}

const _pannerPosition = /*@__PURE__*/ new THREE.Vector3()
const _pannerQuaternion = /*@__PURE__*/ new THREE.Quaternion()
const _pannerScale = /*@__PURE__*/ new THREE.Vector3()

export class VoiceSpatializer {
  private readonly speakers = new Map<string, SpeakerHandle>()
  private rafHandle: number | undefined
  /** Distance in blocks at which a voice becomes inaudible. */
  hearingRange = 48

  addSpeaker (identity: string, username: string, stream: MediaStream) {
    if (this.speakers.has(identity)) this.removeSpeaker(identity)

    const soundSystem = getSoundSystem()
    if (!soundSystem) {
      console.warn('[voice] sound system not ready, cannot spatialize', username)
      return
    }

    const entity = bot?.players?.[username]?.entity
    console.log('[voice] addSpeaker', {
      identity,
      username,
      audioTracks: stream.getAudioTracks().map(t => ({ id: t.id, enabled: t.enabled, muted: t.muted, readyState: t.readyState })),
      entityFound: Boolean(entity),
      entityPosition: entity?.position,
      hearingRange: this.hearingRange
    })

    const sink = document.createElement('audio')
    sink.srcObject = stream
    sink.muted = true
    sink.autoplay = true
    void sink.play().catch(() => {
      // Autoplay can be rejected before the first user gesture; the stream is
      // still routed through WebAudio once the context resumes.
    })

    const audio = new THREE.PositionalAudio(soundSystem.audioListener)
    audio.setMediaStreamSource(stream)
    // Linear falloff to match how vanilla sounds fade out
    audio.panner.distanceModel = 'linear'
    audio.panner.refDistance = 1
    audio.panner.maxDistance = this.hearingRange
    audio.panner.rolloffFactor = 1
    audio.setVolume(1)

    soundSystem.worldRenderer.sceneOrigin.addAndTrack(audio)

    const handle: SpeakerHandle = {
      identity,
      username,
      audio,
      sink,
      position: new THREE.Vector3(),
      volume: 1,
      muted: false
    }
    this.speakers.set(identity, handle)
    this.syncPosition(handle)
    this.applyGain(handle)
    this.ensureLoop()
  }

  removeSpeaker (identity: string) {
    const handle = this.speakers.get(identity)
    if (!handle) return

    try {
      handle.audio.disconnect()
    } catch {
      // already disconnected
    }
    const soundSystem = appViewer?.backend?.soundSystem
    soundSystem?.worldRenderer?.sceneOrigin?.removeAndUntrack(handle.audio)

    handle.sink.srcObject = null
    handle.sink.remove()
    this.speakers.delete(identity)

    if (this.speakers.size === 0) this.stopLoop()
  }

  setVolume (identity: string, volume: number) {
    const handle = this.speakers.get(identity)
    if (!handle) return
    handle.volume = Math.max(0, Math.min(volume, 1))
    this.applyGain(handle)
  }

  setMuted (identity: string, muted: boolean) {
    const handle = this.speakers.get(identity)
    if (!handle) return
    handle.muted = muted
    this.applyGain(handle)
  }

  hasSpeaker (identity: string) {
    return this.speakers.has(identity)
  }

  getSpeakers () {
    return [...this.speakers.values()].map(({ identity, username, volume, muted }) => ({
      identity,
      username,
      volume,
      muted
    }))
  }

  setHearingRange (range: number) {
    this.hearingRange = range
    for (const handle of this.speakers.values()) {
      handle.audio.panner.maxDistance = range
    }
  }

  private applyGain (handle: SpeakerHandle) {
    handle.audio.setVolume(handle.muted ? 0 : handle.volume)
  }

  /**
   * Read the speaker's current world position from the entity list.
   * Forces an immediate matrix/panner update (as threeJsSound.playSound does)
   * rather than relying on the object being reached by the main render loop's
   * matrix pass this frame.
   */
  private syncPosition (handle: SpeakerHandle) {
    const entity = bot?.players?.[handle.username]?.entity
    if (entity?.position) {
      handle.position.set(entity.position.x, entity.position.y + 1.6, entity.position.z)
    }
    handle.audio.position.copy(handle.position)
    handle.audio.updateMatrixWorld(true)
    handle.audio.matrixWorld.decompose(_pannerPosition, _pannerQuaternion, _pannerScale)
    setPannerPositionImmediate(handle.audio.panner, handle.audio.listener.context, _pannerPosition.x, _pannerPosition.y, _pannerPosition.z)
  }

  private ensureLoop () {
    if (this.rafHandle !== undefined) return
    const tick = () => {
      for (const handle of this.speakers.values()) {
        this.syncPosition(handle)
      }
      this.rafHandle = requestAnimationFrame(tick)
    }
    this.rafHandle = requestAnimationFrame(tick)
  }

  private stopLoop () {
    if (this.rafHandle === undefined) return
    cancelAnimationFrame(this.rafHandle)
    this.rafHandle = undefined
  }

  destroy () {
    for (const identity of this.speakers.keys()) {
      this.removeSpeaker(identity)
    }
    this.stopLoop()
  }
}
