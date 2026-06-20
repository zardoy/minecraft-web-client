import { useState } from 'react'
import { useSnapshot } from 'valtio'
import { hideCurrentModal } from '../globalState'
import { lastPlayedSounds } from '../sounds/botSoundSystem'
import { options } from '../optionsStorage'
import Button from './Button'
import Screen from './Screen'
import { useIsModalActive } from './utilsApp'

const SoundRow = ({ sound, children }) => {
  const { mutedSounds } = useSnapshot(options)

  const isMuted = mutedSounds.includes(sound)

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 15 }}>
      <div>
        <span style={{ fontSize: 12, marginRight: 2, ...(isMuted ? { color: '#af1c1c' } : {}) }}>{sound}</span>
        {children}
      </div>
      <Button
        icon={isMuted ? 'pixelarticons:music' : 'pixelarticons:close'}
        onClick={() => {
          if (isMuted) {
            options.mutedSounds.splice(options.mutedSounds.indexOf(sound), 1)
          } else {
            options.mutedSounds.push(sound)
          }
        }}
      />
    </div>
  )
}

export default () => {
  const isModalActive = useIsModalActive('sound-muffler')

  const [showMuted, setShowMuted] = useState(true)
  const [i, setI] = useState(0)
  const { mutedSounds } = useSnapshot(options)

  if (!isModalActive) return null

  return (
    <Screen title="Sound Muffler" backdrop>
      <div style={{ display: 'flex', gap: 5, flexDirection: 'column' }}>
        <Button onClick={() => setI(i => i + 1)}>Refresh</Button>
        <Button onClick={() => setShowMuted(s => !s)}>Show Muted: {showMuted ? 'ON' : 'OFF'}</Button>
        <span style={{ padding: '3px 0' }}>Last World Played</span>
        {Object.entries(lastPlayedSounds.lastServerPlayed)
          .map(([key, value]) => {
            if (!showMuted && mutedSounds.includes(key)) return null
            return [key, value.count] as const
          })
          .filter(a => !!a)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 20)
          .map(([key, count]) => {
            return (
              <SoundRow key={key} sound={key}>
                <span style={{ fontSize: 12, fontWeight: 'bold' }}>{count}</span>
              </SoundRow>
            )
          })}
        <span style={{ padding: '3px 0' }}>Last Client Played</span>
        {lastPlayedSounds.lastClientPlayed.map(key => {
          if (!showMuted && mutedSounds.includes(key)) return null
          return <SoundRow key={key} sound={key} children={undefined} />
        })}
        <Button onClick={() => hideCurrentModal()}>Back</Button>
      </div>
    </Screen>
  )
}
