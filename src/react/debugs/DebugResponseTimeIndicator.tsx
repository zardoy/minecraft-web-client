import { useEffect, useState } from 'react'
import { options } from '../../optionsStorage'

import styles from './DebugResponseTimeIndicator.module.css'

export default () => {
  const [isPointerDown, setIsPointerDown] = useState(false)

  useEffect(() => {
    const handlePointerDown = () => {
      setIsPointerDown(true)
    }

    const handlePointerUp = () => {
      setIsPointerDown(false)
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [])

  if (!('debugResponseTimeIndicator' in options) || !options.debugResponseTimeIndicator) return null

  return isPointerDown ? <div className={styles.debugResponseTimeIndicator} /> : null
}
