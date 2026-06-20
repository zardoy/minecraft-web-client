import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { proxy, useSnapshot } from 'valtio'

export const loadingTimerState = proxy({
  start: 0,
  loading: false,
  total: '0.00',

  networkOnlyStart: 0,
  networkTimeTotal: '0.0'
})

customEvents.on('gameLoaded', () => {
  loadingTimerState.loading = false
})

export default () => {
  // const time = useSnapshot(timerState).start
  const { networkTimeTotal, total } = useSnapshot(loadingTimerState)

  useEffect(() => {
    const interval = setInterval(() => {
      if (!loadingTimerState.loading) return
      if (loadingTimerState.networkOnlyStart) {
        loadingTimerState.networkTimeTotal = ((Date.now() - loadingTimerState.networkOnlyStart) / 1000).toFixed(2)
      } else {
        loadingTimerState.total = ((Date.now() - loadingTimerState.start) / 1000).toFixed(2)
      }
    }, 100)
    return () => clearInterval(interval)
  }, [])

  return (
    <Portal to={document.getElementById('ui-root')!}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          bottom: 0,
          color: 'gray',
          fontSize: '0.6em',
          paddingLeft: 'calc(env(safe-area-inset-left) / 2)'
        }}
      >
        {total}/{networkTimeTotal}
      </div>
    </Portal>
  )
}

const Portal = ({ children, to = document.body }) => {
  return createPortal(children, to)
}
