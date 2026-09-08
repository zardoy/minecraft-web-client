import { proxy, useSnapshot } from 'valtio'
import { showModal } from '../globalState'
import { useUsingTouch } from './utilsApp'
import PixelartIcon, { pixelartIcons } from './PixelartIcon'

export const voiceChatStatus = proxy({
  active: false,
  muted: true,
  hasInputVoice: false,
  isErrored: false,
  isConnected: false,
  isAlone: false,

  isSharingScreen: false,
  /** The current server advertised voice chat at least once this session. Sticky — never reset to false, so pause-screen controls stay available even after declining or leaving. */
  serverSupportsVoice: false,
  /** Between sending 'enable' and the connection settling (success or failure). Lets buttons show a "Joining…" state and avoid double-submits. */
  isJoining: false,
})

window.voiceChatStatus = voiceChatStatus

const Icon = ({ muted }: { muted: boolean }) => {
  if (muted) {
    // Microphone with a slash through it
    return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
      <path fill="currentColor" d="M2 3h2v2H2zm2 2h2v2H4zm2 2h2v2H6zm2 2h2v2H8zm2 2h2v2h-2zm2 2h2v2h-2zm2 2h2v2h-2zm2 2h2v2h-2zm2 2h2v2h-2z" />
      <path fill="currentColor" d="M9 3h6v1h1v7h-1v1H9v-1H8V4h1zM6 10h1v2h1v1h1v1h6v-1h1v-1h1v-2h1v3h-1v2h-2v1h-2v2h2v2H9v-2h2v-2H9v-1H7v-2H6z" opacity="0.55" />
    </svg>
  }
  return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
    <path fill="currentColor" d="M9 3h6v1h1v7h-1v1H9v-1H8V4h1z" />
    <path fill="currentColor" d="M6 10h1v2h1v1h1v1h6v-1h1v-1h1v-2h1v3h-1v2h-2v1h-2v2h2v2H9v-2h2v-2H9v-1H7v-2H6z" />
  </svg>
}

export default () => {
  const SIZE = 34
  const { active, muted, hasInputVoice, isConnected, isErrored, isAlone } = useSnapshot(voiceChatStatus)
  const usingTouch = useUsingTouch()
  if (!active) return null

  const getRingColor = () => {
    if (isErrored) return 'rgba(214, 4, 4, 0.6)'
    if (!isConnected) return 'rgba(128, 128, 128, 0.5)'
    if (isAlone) return 'rgba(183, 255, 0, 0.45)'
    return 'rgba(50, 205, 50, 0.5)'
  }

  const getTitle = () => {
    if (isErrored) return 'Voice chat error'
    if (!isConnected) return 'Voice chat connecting…'
    if (muted) return usingTouch ? 'Tap and hold to talk' : 'Voice chat: hold ` to talk'
    return 'Talking'
  }

  // On touch devices the indicator doubles as a push-to-talk button
  const touchHandlers = usingTouch ? {
    onPointerDown (e: React.PointerEvent) {
      e.preventDefault()
      window.voiceSetTalking?.(true)
    },
    onPointerUp (e: React.PointerEvent) {
      e.preventDefault()
      window.voiceSetTalking?.(false)
    },
    onPointerCancel () {
      window.voiceSetTalking?.(false)
    },
    onPointerLeave () {
      window.voiceSetTalking?.(false)
    }
  } : {}

  const SETTINGS_SIZE = 22

  return (
    <>
      <div
        className='voice-chat-microphone'
        title={getTitle()}
        {...touchHandlers}
        style={{
          position: 'fixed',
          top: 4,
          left: 4,
          zIndex: 10,
          width: SIZE,
          height: SIZE,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: muted ? 'rgba(255, 255, 255, 0.55)' : hasInputVoice ? '#32cd32' : '#ffffff',
          background: 'rgba(0, 0, 0, 0.4)',
          border: `2px solid ${getRingColor()}`,
          borderRadius: '50%',
          boxShadow: hasInputVoice && !muted ? '0 0 8px rgba(50, 205, 50, 0.8)' : '0 2px 8px rgba(0, 0, 0, 0.2)',
          transition: 'color 0.1s ease, box-shadow 0.1s ease',
          touchAction: 'none',
          userSelect: 'none',
          cursor: usingTouch ? 'pointer' : 'default',
        }}
      >
        <Icon muted={muted} />
      </div>
      {/* Desktop has the `V` keybind; touch devices have no keyboard, so surface an explicit settings tap target. */}
      {usingTouch && (
        <div
          title='Voice chat settings'
          onClick={() => showModal({ reactType: 'voice-chat-menu' })}
          style={{
            position: 'fixed',
            top: 4 + SIZE + 6,
            left: 4 + (SIZE - SETTINGS_SIZE) / 2,
            zIndex: 10,
            width: SETTINGS_SIZE,
            height: SETTINGS_SIZE,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            background: 'rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.35)',
            borderRadius: '50%',
            touchAction: 'manipulation',
            userSelect: 'none',
            cursor: 'pointer',
          }}
        >
          <PixelartIcon iconName={pixelartIcons.sliders} width={14} />
        </div>
      )}
    </>
  )
}
