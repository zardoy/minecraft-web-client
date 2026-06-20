import { proxy, useSnapshot } from 'valtio'
import PixelartIcon, { pixelartIcons } from './PixelartIcon'

export const voiceChatStatus = proxy({
  active: false,
  muted: false,
  hasInputVoice: false,
  isErrored: false,
  isConnected: false,
  isAlone: false,

  isSharingScreen: false
})

window.voiceChatStatus = voiceChatStatus

const Icon = () => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
      <path fill="currentColor" d="M9 14H8v-2h3v-1H8V9h3V8H8V6h3V5H8V3h1V2h1V1h4v1h1v1h1v2h-3v1h3v2h-3v1h3v2h-3v1h3v2h-1v1h-1v1h-4v-1H9z" />
      <path fill="currentColor" d="M19 12v3h-1v2h-1v1h-2v1h-2v2h3v2H8v-2h3v-2H9v-1H7v-1H6v-2H5v-3h1v2h1v2h1v1h2v1h4v-1h2v-1h1v-2h1v-2z" />
    </svg>
  )
}

export default () => {
  const SIZE = 48
  const { active, muted, hasInputVoice, isSharingScreen, isConnected, isErrored, isAlone } = useSnapshot(voiceChatStatus)
  if (!active) return null

  const getRingColor = () => {
    if (isErrored) return 'rgba(214, 4, 4, 0.5)' // red with opacity
    if (isConnected) {
      if (isAlone) return 'rgba(183, 255, 0, 0.5)' // lime yellow
      return 'rgba(50, 205, 50, 0.5)' // green with opacity
    }
    return 'rgba(128, 128, 128, 0.5)' // gray with opacity
  }

  return (
    <div
      className="voice-chat-microphone"
      onClick={() => {
        // toggleMicrophoneMuted()
      }}
    >
      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          zIndex: 10,
          left: '20px',
          width: SIZE,
          height: SIZE,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: muted ? 'rgb(214 4 4)' : hasInputVoice ? '#32cd32' : '#ffffff',
          border: `2px solid ${getRingColor()}`,
          borderRadius: '50%',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
          transition: 'background-color 0.2s ease'
        }}
      >
        <Icon />
      </div>
      {/* stop sharing screen */}
      {isSharingScreen && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            left: '20px',
            width: SIZE,
            height: SIZE,
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <PixelartIcon iconName={pixelartIcons.cast} /> Stop Sharing Screen
        </div>
      )}
    </div>
  )
}
