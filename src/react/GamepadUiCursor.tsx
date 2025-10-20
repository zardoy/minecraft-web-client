import { proxy, useSnapshot } from 'valtio'
import { useEffect } from 'react'
import { activeModalStack, miscUiState } from '../globalState'
import SharedHudVars from './SharedHudVars'
import styles from './GamepadUiCursor.module.css'

export const gamepadUiCursorState = proxy({
  x: 50,
  y: 50,
  multiply: 1,
  display: false
})
globalThis.gamepadUiCursorState = gamepadUiCursorState

export const moveGamepadCursorByPx = (value: number, isX: boolean) => {
  value *= gamepadUiCursorState.multiply * 3
  const valueToPercentage = value / (isX ? window.innerWidth : window.innerHeight) * 100
  gamepadUiCursorState[isX ? 'x' : 'y'] += valueToPercentage
}

export default () => {
  const hasModals = useSnapshot(activeModalStack).length > 0
  const { x, y } = useSnapshot(gamepadUiCursorState)
  const { usingGamepadInput, gameLoaded } = useSnapshot(miscUiState)

  const doDisplay = usingGamepadInput && (hasModals || !gameLoaded)

  useEffect(() => {
    document.body.style.cursor = gameLoaded && !hasModals && usingGamepadInput ? 'none' : 'auto'
  }, [usingGamepadInput, hasModals, gameLoaded])

  useEffect(() => {
    gamepadUiCursorState.display = doDisplay
  }, [doDisplay])

  if (!doDisplay) return null

  return <SharedHudVars>
    <div className={styles.crosshair} style={{ left: `${x}%`, top: `${y}%` }} />
  </SharedHudVars>
}
