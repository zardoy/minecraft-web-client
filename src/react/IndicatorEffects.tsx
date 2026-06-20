import { useMemo, useEffect, useRef, useState } from 'react'
import PixelartIcon, { pixelartIcons } from './PixelartIcon'
import './IndicatorEffects.css'

function formatTime(seconds: number): string {
  if (seconds < 0) return ''
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  const formattedMinutes = String(minutes).padStart(2, '0')
  const formattedSeconds = String(remainingSeconds).padStart(2, '0')
  return `${formattedMinutes}:${formattedSeconds}`
}

export type EffectType = {
  id: number
  image: string
  level: number
  initialTime: number
  duration: number
  name: string
}

const EffectBox = ({ image, level, name, initialTime, duration }: Pick<EffectType, 'image' | 'level' | 'initialTime' | 'name' | 'duration'>) => {
  const [currentTime, setCurrentTime] = useState(Date.now())

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now())
    }, 100)
    return () => clearInterval(interval)
  }, [])

  const timeElapsed = (currentTime - initialTime) / 1000
  const timeRemaining = Math.max(0, duration - timeElapsed)
  const progress = duration > 0 ? Math.max(0, Math.min(1, timeRemaining / duration)) : 0
  const formattedTime = useMemo(() => formatTime(timeRemaining), [timeRemaining])

  // Convert level to Roman numerals
  const toRomanNumeral = (num: number): string => {
    if (num <= 0) return ''
    const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']
    return romanNumerals[num - 1] || `${num}`
  }

  const levelText = level > 0 && level < 256 ? ` ${toRomanNumeral(level + 1)}` : ''

  return (
    <div className="effect-box">
      <div className="effect-box__progress-bg" style={{ width: `${progress * 100}%` }} />
      <img className="effect-box__image" src={image} alt="" />
      <div className="effect-box__content">
        <div className="effect-box__title">
          {name}
          {levelText}
        </div>
        {formattedTime && <div className="effect-box__time">{formattedTime}</div>}
      </div>
    </div>
  )
}

export const defaultIndicatorsState = {
  chunksLoading: false,
  readingFiles: false,
  readonlyFiles: false,
  writingFiles: false, // saving
  appHasErrors: false,
  connectionIssues: 0,
  preventSleep: false
}

const indicatorIcons: Record<keyof typeof defaultIndicatorsState, string> = {
  chunksLoading: 'add-grid',
  readingFiles: 'arrow-bar-down',
  writingFiles: 'arrow-bar-up',
  appHasErrors: 'alert',
  readonlyFiles: 'file-off',
  connectionIssues: pixelartIcons['cellular-signal-off'],
  preventSleep: pixelartIcons.moon
}

const colorOverrides = {
  connectionIssues: {
    0: false,
    1: 'orange',
    2: 'red'
  }
}

export default ({
  indicators,
  effects,
  displayIndicators,
  displayEffects
}: {
  indicators: typeof defaultIndicatorsState
  effects: readonly EffectType[]
  displayIndicators: boolean
  displayEffects: boolean
}) => {
  const indicatorsMapped = Object.entries(defaultIndicatorsState).map(([key]) => {
    const state = indicators[key]
    return {
      icon: indicatorIcons[key],
      // preserve order
      state,
      key
    }
  })
  return (
    <div className="indicators-container-outer">
      <div className="indicators-container">
        {displayIndicators &&
          indicatorsMapped.map(indicator => (
            <div
              key={indicator.icon}
              style={{
                opacity: indicator.state ? 1 : 0,
                transition: 'opacity color 0.1s',
                color: colorOverrides[indicator.key]?.[indicator.state]
              }}
            >
              <PixelartIcon iconName={indicator.icon} />
            </div>
          ))}
      </div>
      {displayEffects && <EffectsInner effects={effects} />}
    </div>
  )
}

const EffectsInner = ({ effects }: { effects: readonly EffectType[] }) => {
  return (
    <div className="effects-container">
      {effects.map(effect => (
        <EffectBox key={`effectBox-${effect.id}`} {...effect} />
      ))}
    </div>
  )
}
