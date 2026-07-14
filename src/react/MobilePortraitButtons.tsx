import { useEffect, useState } from 'react'
import { useSnapshot } from 'valtio'
import { activeModalStack, miscUiState } from '../globalState'
import { setDisplayRotationEnabled } from '../displayRotation'
import { options } from '../optionsStorage'
import Button from './Button'
import { useUsingTouch } from './utilsApp'
import { pixelartIcons } from './PixelartIcon'
import { showNotification } from './NotificationProvider'

const hideOnModals = new Set(['chat'])

// Match MobileTopButtons.module.css: 14px * 1.3, scaled 1.4 in portrait-tall aspect.
const BTN_BASE = 14
const BTN_SCALE = 1.3
const PORTRAIT_TALL_SCALE = 1.4
const BTN_GAP = 5

const portraitButtonSize = (viewportPortrait: boolean) => Math.round(BTN_BASE * BTN_SCALE * (viewportPortrait ? PORTRAIT_TALL_SCALE : 1))

export default () => {
  const [fullScreen, setFullScreen] = useState(false)
  useEffect(() => {
    const onFullscreenChange = () => {
      setFullScreen(!!document.fullscreenElement)
    }
    document.documentElement.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.documentElement.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  const { gameLoaded, displayRotationEnabled, viewportPortrait } = useSnapshot(miscUiState)
  const { autoDisplayRotation } = useSnapshot(options)
  const activeStack = useSnapshot(activeModalStack)
  const inMainMenu = activeStack.length === 0 && !gameLoaded
  const usingTouch = useUsingTouch()
  const hideButtons = activeStack.some(x => hideOnModals.has(x.reactType))

  const showRotate = viewportPortrait && !autoDisplayRotation
  const showFullscreen = Boolean(document.documentElement.requestFullscreen) && !fullScreen

  if (hideButtons || !usingTouch || (!showRotate && !showFullscreen)) return null

  const btnSize = portraitButtonSize(viewportPortrait)
  const btnStyle = {
    width: btnSize,
    minHeight: btnSize,
    maxHeight: btnSize,
    '--scale': btnSize / 20,
  } as React.CSSProperties

  return (
    <div
      style={{
        position: 'fixed',
        top: 5,
        left: inMainMenu ? 35 : 5,
        display: 'flex',
        flexDirection: 'row',
        gap: BTN_GAP,
        zIndex: 7,
      }}
    >
      {showRotate && (
        <Button
          icon={displayRotationEnabled ? pixelartIcons.sync : pixelartIcons.reload}
          style={btnStyle}
          title={displayRotationEnabled ? 'Отключить альбомную вёрстку' : 'Повернуть в альбомный режим'}
          onClick={() => {
            setDisplayRotationEnabled(!displayRotationEnabled)
          }}
        />
      )}
      {showFullscreen && (
        <Button
          icon={pixelartIcons.scale}
          style={btnStyle}
          title='Полный экран'
          onClick={async () => {
            try {
              await document.documentElement.requestFullscreen()
            } catch (err) {
              showNotification(`${(err as Error).message ?? err}`, undefined, true)
            }
          }}
        />
      )}
    </div>
  )
}
