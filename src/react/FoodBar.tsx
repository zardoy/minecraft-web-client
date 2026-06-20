import { useRef, useState, useEffect } from 'react'
import SharedHudVars from './SharedHudVars'
import './FoodBar.css'
import { barEffectAdded, barEffectEnded } from './BarsCommon'

export type FoodBarProps = {
  gameMode?: string
  food: number
  effectToAdd?: number | null
  effectToRemove?: number | null
  resetEffects?: () => void
  style?: React.CSSProperties
}

export default ({ gameMode, food, effectToAdd, effectToRemove, resetEffects, style }: FoodBarProps) => {
  const foodRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (foodRef.current) {
      foodRef.current.classList.toggle('creative', gameMode === 'creative' || gameMode === 'spectator')
    }
  }, [gameMode])

  useEffect(() => {
    const foodbar = foodRef.current
    if (foodbar) {
      foodbar.classList.toggle('low', food <= 5)

      const foods = foodbar.children

      for (const food of foods) {
        food.classList.remove('full')
        food.classList.remove('half')
      }

      for (let i = 0; i < Math.ceil(food / 2); i++) {
        if (i >= foods.length) break

        if (food % 2 !== 0 && Math.ceil(food / 2) === i + 1) {
          foods[i].classList.add('half')
        } else {
          foods[i].classList.add('full')
        }
      }
    }
  }, [food])

  useEffect(() => {
    if (effectToAdd) {
      barEffectAdded(foodRef.current, effectToAdd)
    }
    if (effectToRemove) {
      barEffectEnded(foodRef.current, effectToRemove)
    }
    resetEffects?.()
  }, [effectToAdd, effectToRemove])

  return (
    <SharedHudVars>
      <div ref={foodRef} className="foodbar" style={style}>
        {Array.from({ length: 10 }, () => 0).map((num, index) => (
          <div key={`food-${index}`} className="food" />
        ))}
      </div>
    </SharedHudVars>
  )
}
