import { useSnapshot } from 'valtio'
import { miscUiState } from '../globalState'
import { options } from '../optionsStorage'

export default () => {
  const { fullscreen } = useSnapshot(miscUiState)
  const { topRightTimeDisplay } = useSnapshot(options)
  const useBottom = (
    (process.env.NODE_ENV === 'development' && document.exitPointerLock) ||
    (
      topRightTimeDisplay === 'always' ||
      (topRightTimeDisplay === 'only-fullscreen' && fullscreen)
    )
  )

  return <div
    id='corner-indicator-stats'
    style={{
      position: 'fixed',
      right: 0,
      zIndex: 1,
      ...(useBottom ? { bottom: 0 } : { top: 0 }),
    }}
  />
}
