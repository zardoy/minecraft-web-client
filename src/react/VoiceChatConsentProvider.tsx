import { hideModal } from '../globalState'
import { enableVoice, declineVoice } from '../voice/voiceChat'
import Screen from './Screen'
import Button from './Button'
import { useIsModalActive } from './utilsApp'

export default () => {
  const isModalActive = useIsModalActive('voice-chat-consent')
  if (!isModalActive) return null

  return <Screen title="Voice Chat" backdrop>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 320, fontSize: 10, textAlign: 'center' }}>
      <div>This server offers proximity voice chat. You will hear nearby players, and they will hear you.</div>
      <div style={{ color: '#ffcc00' }}>
        Voice chat is not moderated. You may hear anything other players say.
      </div>
      <div style={{ color: '#aaa' }}>
        Hold <b>`</b> to talk. You can mute individual players at any time from the voice menu (V).
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 8 }}>
        <Button
          label="Enable"
          onClick={() => {
            enableVoice()
            hideModal()
          }}
        />
        <Button label="No thanks" onClick={() => declineVoice()} />
      </div>
    </div>
  </Screen>
}
