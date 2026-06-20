import { useState } from 'react'
import { useIsHashActive } from './simpleHooks'

export default () => {
  const MODES_COUNT = 5
  const [mode, setMode] = useState(0)
  const isHashActive = useIsHashActive('#edges')

  if (!isHashActive) return null

  const styles: React.CSSProperties = {
    display: 'flex',
    fontSize: 18,
    zIndex: 10_000,
    background: 'rgba(0, 0, 255, 0.5)',
    border: '2px solid red',
    whiteSpace: 'pre'
  }
  let text = ''
  if (mode === 0) {
    styles.position = 'fixed'
    styles.inset = 0
    styles.height = '100%'
    text = 'inset 0 fixed 100% height'
  }
  if (mode === 1) {
    styles.position = 'fixed'
    styles.inset = 0
    text = 'inset 0 fixed'
  }
  if (mode === 2) {
    styles.position = 'absolute'
    styles.inset = 0
    text = 'inset 0 absolute'
  }
  if (mode === 3) {
    styles.position = 'fixed'
    styles.top = 0
    styles.left = 0
    styles.right = 0
    styles.height = '100dvh'
    text = 'top 0 fixed 100dvh'
  }
  if (mode === 4) {
    styles.position = 'fixed'
    styles.top = 0
    styles.left = 0
    styles.right = 0
    styles.height = '100dvh'
    text = 'top 0 bottom 0 fixed 100dvh'
  }

  return (
    <div
      style={styles}
      onClick={() => {
        setMode((mode + 1) % MODES_COUNT)
      }}
    >
      {mode}: {text}
      {'\n'}
      inner: {window.innerWidth}x{window.innerHeight}
      {'\n'}
      outer: {window.outerWidth}x{window.outerHeight}
      {'\n'}
    </div>
  )
}
