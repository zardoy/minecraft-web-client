import { useEffect, useState } from 'react'
import { useSnapshot } from 'valtio'
import { miscUiState } from '../globalState'
import { options } from '../optionsStorage'

const narrowBottomMq = '(max-width: 419px)'

export default () => {
  const { fullscreen } = useSnapshot(miscUiState)
  const { topRightTimeDisplay } = useSnapshot(options)
  const [narrowForBottomOffset, setNarrowForBottomOffset] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(narrowBottomMq).matches
  )

  useEffect(() => {
    const mq = window.matchMedia(narrowBottomMq)
    const sync = () => setNarrowForBottomOffset(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

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
      zIndex: 10,
      ...(useBottom
        ? { bottom: narrowForBottomOffset ? 62 : 0 }
        : { top: 0 }),
    }}
  />
}
