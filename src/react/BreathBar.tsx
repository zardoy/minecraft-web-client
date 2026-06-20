import { useRef, useEffect } from 'react'
import SharedHudVars from './SharedHudVars'
import './BreathBar.css'

export type BreathBarProps = {
  oxygen: number
}

export default ({ oxygen }: BreathBarProps) => {
  const breathRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const breathbar = breathRef.current
    if (breathbar && oxygen < 20) {
      breathbar.style.display = 'flex'
      breathbar.classList.toggle('low', oxygen <= 5)

      const breaths = breathbar.children

      for (const breath of breaths) {
        breath.classList.remove('full')
        breath.classList.remove('half')
      }

      for (let i = 0; i < Math.ceil(oxygen / 2); i++) {
        if (i >= breaths.length) break

        if (oxygen % 2 !== 0 && Math.ceil(oxygen / 2) === i + 1) {
          breaths[i].classList.add('half')
        } else {
          breaths[i].classList.add('full')
        }
      }
    } else if (breathbar && oxygen >= 20) {
      breathbar.style.display = 'none'
    }
  }, [oxygen])

  return (
    <SharedHudVars>
      <div ref={breathRef} className="breathbar">
        {Array.from({ length: 10 }, () => 0).map((num, index) => (
          <div key={`breath-${index}`} className="breath" />
        ))}
      </div>
    </SharedHudVars>
  )
}
