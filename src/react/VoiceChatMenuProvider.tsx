import { useEffect, useState } from 'react'
import { useSnapshot } from 'valtio'
import { hideModal } from '../globalState'
import { options } from '../optionsStorage'
import {
  voiceNearbyPlayers,
  setPlayerVoiceSettings,
  setMasterVolume,
  setInputDevice,
  leaveVoiceChat
} from '../voice/voiceChat'
import { voiceChatStatus } from './VoiceMicrophone'
import Screen from './Screen'
import Button from './Button'
import Slider from './Slider'
import { useIsModalActive } from './utilsApp'
import { useIsSmallWidth } from './simpleHooks'

const PlayerRow = ({ identity, username, compact }: { identity: string, username: string, compact: boolean }) => {
  const { voicePlayerSettings } = useSnapshot(options)
  const settings = voicePlayerSettings[identity] ?? { volume: 1, muted: false }

  const controls = <>
    <Button
      label={settings.muted ? 'Unmute' : 'Mute'}
      style={{ width: 60 }}
      onClick={() => setPlayerVoiceSettings(identity, { muted: !settings.muted })}
    />
    <Slider
      label=""
      width={compact ? 130 : 90}
      min={0}
      max={100}
      value={Math.round(settings.volume * 100)}
      disabledReason={settings.muted ? 'muted' : undefined}
      updateValue={value => setPlayerVoiceSettings(identity, { volume: value / 100 })}
    />
  </>

  if (compact) {
    return <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 10 }}>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{username}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{controls}</div>
    </div>
  }

  return <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10 }}>
    <span style={{ width: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{username}</span>
    {controls}
  </div>
}

export default () => {
  const isModalActive = useIsModalActive('voice-chat-menu')
  const nearby = useSnapshot(voiceNearbyPlayers)
  const { voiceMasterVolume, voiceInputDeviceId } = useSnapshot(options)
  const { isConnected, isErrored } = useSnapshot(voiceChatStatus)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const compact = useIsSmallWidth()

  useEffect(() => {
    if (!isModalActive) return
    void navigator.mediaDevices?.enumerateDevices().then(all => {
      setDevices(all.filter(d => d.kind === 'audioinput'))
    })
  }, [isModalActive])

  if (!isModalActive) return null

  return <Screen title="Voice Chat" backdrop>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: compact ? 220 : 300, fontSize: 10 }}>
      {isErrored && (
        <div style={{ color: '#ff5555', textAlign: 'center' }}>Voice chat failed to connect. Check the notification for details.</div>
      )}
      {!isErrored && !isConnected && (
        <div style={{ color: '#ffcc00', textAlign: 'center' }}>Connecting…</div>
      )}
      <div>
        <div style={{ marginBottom: 4, color: '#aaa' }}>Nearby players ({nearby.length})</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 160, overflowY: 'auto' }}>
          {nearby.length === 0
            ? <div style={{ color: '#777' }}>No one in range</div>
            : nearby.map(player => (
              <PlayerRow key={player.identity} identity={player.identity} username={player.username} compact={compact} />
            ))}
        </div>
      </div>

      <div>
        <div style={{ marginBottom: 4, color: '#aaa' }}>Your settings</div>
        <Slider
          label="Master volume"
          min={0}
          max={100}
          value={Math.round(voiceMasterVolume * 100)}
          updateValue={value => setMasterVolume(value / 100)}
        />
        <div style={{ display: 'flex', flexDirection: compact ? 'column' : 'row', alignItems: compact ? 'stretch' : 'center', gap: compact ? 2 : 6, marginTop: 6 }}>
          <span style={compact ? undefined : { width: 60 }}>Microphone</span>
          <select
            value={voiceInputDeviceId}
            style={{ flex: 1, fontSize: 10, minWidth: 0 }}
            onChange={e => {
              void setInputDevice(e.target.value)
            }}
          >
            <option value="">Default</option>
            {devices.map(device => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Microphone ${device.deviceId.slice(0, 6)}`}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        <Button label="Close" onClick={() => hideModal()} />
        <Button
          label="Leave voice"
          onClick={() => {
            leaveVoiceChat()
            hideModal()
          }}
        />
      </div>
    </div>
  </Screen>
}
