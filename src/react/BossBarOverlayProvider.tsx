import { useState, useEffect } from 'react'
import { useSnapshot } from 'valtio'
import { miscUiState } from '../globalState'
import './BossBarOverlay.css'
import BossBar, { BossBarType } from './BossBarOverlay'

export default () => {
  const { currentTouch } = useSnapshot(miscUiState)
  const [bossBars, setBossBars] = useState(new Map<string, BossBarType>())
  const addBossBar = (bossBar: BossBarType) => {
    setBossBars(
      prevBossBars =>
        new Map(
          prevBossBars.set(bossBar.entityUUID, {
            ...bossBar,
            lastUpdated: Date.now()
          })
        )
    )
  }

  const removeBossBar = (bossBar: BossBarType) => {
    setBossBars(prevBossBars => {
      const newBossBars = new Map(prevBossBars)
      newBossBars.delete(bossBar.entityUUID)
      return newBossBars
    })
  }

  useEffect(() => {
    bot.on('bossBarCreated', bossBar => {
      addBossBar(bossBar as BossBarType)
    })
    bot.on('bossBarUpdated', bossBar => {
      if (!bossBar) return
      addBossBar(bossBar as BossBarType)
    })
    bot.on('bossBarDeleted', bossBar => {
      if (!bossBar) return
      removeBossBar(bossBar as BossBarType)
    })
  }, [])

  return (
    <div className={`bossBars ${currentTouch ? 'mobile' : ''}`} id="bossBars">
      {[...bossBars.values()].map(bar => (
        <BossBar key={`${bar.entityUUID}-${bar.lastUpdated}`} bar={bar} />
      ))}
    </div>
  )
}
