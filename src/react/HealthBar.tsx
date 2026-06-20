import { useRef, useEffect } from 'react'
import SharedHudVars from './SharedHudVars'
import './HealthBar.css'
import { barEffectAdded, barEffectEnded } from './BarsCommon'

export type HealthBarProps = {
  gameMode?: string
  isHardcore: boolean
  damaged: boolean
  healthValue: number
  effectToAdd?: number | null
  effectToRemove?: number | null
  resetEffects?: () => void
  style?: React.CSSProperties
}

export default ({ gameMode, isHardcore, damaged, healthValue, effectToAdd, effectToRemove, resetEffects, style }: HealthBarProps) => {
  const healthRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (healthRef.current) {
      healthRef.current.classList.toggle('creative', gameMode === 'creative' || gameMode === 'spectator')
    }
  }, [gameMode])

  useEffect(() => {
    if (healthRef.current) {
      if (isHardcore) {
        healthRef.current.classList.add('hardcore')
      } else {
        healthRef.current.classList.remove('hardcore')
      }
    }
  }, [isHardcore])

  useEffect(() => {
    if (healthRef.current) {
      if (damaged) {
        healthRef.current.classList.add('damaged')
        console.log('damage')
      } else {
        healthRef.current.classList.remove('damaged')
      }
    }
  }, [damaged])

  useEffect(() => {
    if (healthRef.current) {
      if (healthValue <= 4) {
        healthRef.current.classList.add('low')
      } else {
        healthRef.current.classList.remove('low')
      }

      const healthElement = healthRef.current
      const hearts = healthElement.children

      for (const heart of hearts) {
        heart.classList.remove('full')
        heart.classList.remove('half')
      }

      for (let i = 0; i < Math.ceil(healthValue / 2); i++) {
        if (i >= hearts.length) break

        if (healthValue % 2 !== 0 && Math.ceil(healthValue / 2) === i + 1) {
          hearts[i].classList.add('half')
        } else {
          hearts[i].classList.add('full')
        }
      }
    }
  }, [healthValue])

  useEffect(() => {
    if (effectToAdd) {
      barEffectAdded(healthRef.current, effectToAdd)
    }
    if (effectToRemove) {
      barEffectEnded(healthRef.current, effectToRemove)
    }
    resetEffects?.()
  }, [effectToAdd, effectToRemove])

  return (
    <SharedHudVars>
      <div ref={healthRef} className="health" style={style}>
        {Array.from({ length: 10 }, () => 0).map((num, index) => (
          <div key={`heart-${index}`} className="heart" />
        ))}
      </div>
    </SharedHudVars>
  )
}
