import { useEffect, useState } from 'react'
import './Crosshair.css'
import { proxy, useSnapshot } from 'valtio'
import SharedHudVars from './SharedHudVars'

// todo move to mineflayer
export const itemBeingUsed = proxy({
  name: null as string | null,
  hand: 0 as 0 | 1
})

export default () => {
  const { name: usingItem, hand } = useSnapshot(itemBeingUsed)

  const [displayIndicator, setDisplayIndicator] = useState(false)
  const [indicatorProgress, setIndicatorProgress] = useState(0)
  const [alternativeIndicator, setAlternativeIndicator] = useState(false)
  const boxMaxTimeMs = 1000
  // todo add sword indicator
  const indicatorSize = 20

  useEffect(() => {
    bot.on('heldItemChanged' as any, () => {
      const displayBar = (item: import('prismarine-item').Item | null) => {
        const itemName = item?.name
        if (!itemName) return
        return loadedData.foodsArray.map(food => food.name).includes(itemName) || itemName === 'bow' || itemName === 'shield' || itemName === 'crossbow'
      }
      setDisplayIndicator(displayBar(bot.heldItem) || displayBar(bot.inventory.slots[45]) || false)
    })
  }, [])

  useEffect(() => {
    setAlternativeIndicator(usingItem === 'shield')
    if (!usingItem) return
    const startTime = Date.now()
    let maxTime = 0
    if (usingItem === 'bow' || usingItem === 'crossbow') {
      maxTime = 1000
    }
    const isFood = loadedData.foodsArray.some(food => food.name === usingItem)
    if (isFood) {
      maxTime = 32 * 50
    }
    if (!maxTime) return

    const id = setInterval(() => {
      const progress = (Date.now() - startTime) / boxMaxTimeMs
      if (progress >= 1) {
        clearInterval(id)
      } else {
        setIndicatorProgress(progress)
      }
    }, 1000 / 60)
    return () => {
      setIndicatorProgress(0)
      clearInterval(id)
    }
  }, [usingItem])

  return (
    <SharedHudVars>
      <div className="crosshair" />
      {displayIndicator && (
        <div
          className="crosshair-indicator"
          style={{
            //@ts-expect-error
            '--crosshair-indicator-size': `${indicatorSize}px`,
            borderLeft: `solid ${indicatorSize * indicatorProgress}px white`,
            backgroundColor: alternativeIndicator ? 'dodgerblue' : undefined
          }}
        />
      )}
    </SharedHudVars>
  )
}
