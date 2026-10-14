import { useRef, useState, useMemo } from 'react'
import { GameMode } from 'mineflayer'
import { useSnapshot } from 'valtio'
import { options } from '../optionsStorage'
import { armor } from './armorValues'
import HealthBar from './HealthBar'
import FoodBar from './FoodBar'
import ArmorBar from './ArmorBar'
import BreathBar from './BreathBar'
import './HealthBar.css'

export default () => {
  const { disabledUiParts } = useSnapshot(options)

  const [damaged, setDamaged] = useState(false)
  const [healthValue, setHealthValue] = useState(bot.health)
  const [food, setFood] = useState(bot.food)
  const [oxygen, setOxygen] = useState(bot.oxygenLevel)
  const [armorValue, setArmorValue] = useState(0)
  const [gameMode, setGameMode] = useState<GameMode | ''>(bot.game.gameMode)
  const [isHardcore, setIsHardcore] = useState(false)
  const [effectToAdd, setEffectToAdd] = useState<number | null>(null)
  const [effectToRemove, setEffectToRemove] = useState<number | null>(null)
  const hurtTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const getEffectClass = (effect) => {
    switch (effect) {
      case 19:
        return 'poisoned'
      case 20:
        return 'withered'
      case 22:
        return 'absorption'
      default:
        return ''
    }
  }

  const onDamage = () => {
    setDamaged(prev => true)
    if (hurtTimeout.current) clearTimeout(hurtTimeout.current)
    hurtTimeout.current = setTimeout(() => {
      setDamaged(prev => false)
    }, 1000)
  }

  const updateHealth = (hValue) => {
    setHealthValue(prev => hValue)
  }

  useMemo(() => {
    bot.on('entityHurt', (entity) => {
      if (entity !== bot.entity) return
      onDamage()
    })

    bot.on('game', () => {
      setGameMode(prev => bot.game.gameMode)
      setIsHardcore(prev => bot.game.hardcore)
    })

    bot.on('entityEffect', (entity, effect) => {
      if (entity !== bot.entity) return
      setEffectToAdd(prev => effect.id)
    })

    bot.on('entityEffectEnd', (entity, effect) => {
      if (entity !== bot.entity) return
      setEffectToRemove(prev => effect.id)
    })

    bot.on('health', () => {
      if (bot.health < healthValue) onDamage()
      updateHealth(bot.health)
      setFood(prev => bot.food)
    })

    bot.on('breath', () => {
      setOxygen(prev => bot.oxygenLevel)
    })

    const upArmour = () => {
      const armorSlots = new Set([5, 6, 7, 8])
      let points = 0
      for (const slotIndex of armorSlots) {
        const item = bot.inventory.slots[slotIndex] ?? null
        if (!item) continue
        const armorName = item.name.split('_')
        points += armor[armorName[0]]?.[armorName[1]] ?? 0
      }
      setArmorValue(points)
    }
    bot.inventory.on('updateSlot', upArmour)
    upArmour()
  }, [])

  return <div className='hud-bars-container'>
    {!disabledUiParts.includes('health-bar') && <HealthBar
      gameMode={gameMode}
      isHardcore={isHardcore}
      damaged={damaged}
      healthValue={healthValue}
      effectToAdd={effectToAdd}
      effectToRemove={effectToRemove}
      resetEffects={() => {
        setEffectToAdd(null)
        setEffectToRemove(null)
      }}
    />}
    {!disabledUiParts.includes('armor-bar') && <ArmorBar
      armorValue={armorValue}
      style={gameMode !== 'survival' && gameMode !== 'adventure' ? { display: 'none' } : { display: 'flex' }}
    />}
    {!disabledUiParts.includes('food-bar') && <FoodBar
      gameMode={gameMode}
      food={food}
      effectToAdd={effectToAdd}
      effectToRemove={effectToRemove}
      resetEffects={() => {
        setEffectToAdd(null)
        setEffectToRemove(null)
      }}
    />}
    {!disabledUiParts.includes('breath-bar') && <BreathBar
      oxygen={gameMode !== 'survival' && gameMode !== 'adventure' ? 0 : oxygen}
    />}
  </div>
}
