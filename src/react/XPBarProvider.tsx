import { useState, useMemo } from 'react'
import { GameMode } from 'mineflayer'
import XPBar from './XPBar'

export default () => {
  const [progress, setProgress] = useState(0)
  const [level, setLevel] = useState(0)
  const [gamemode, setGamemode] = useState<GameMode | ''>(bot.game.gameMode)

  useMemo(() => {
    const onXpUpdate = () => {
      setProgress(bot.experience.progress)
      setLevel(bot.experience.level)
    }
    onXpUpdate()

    bot.on('experience', onXpUpdate)

    bot.on('game', () => {
      setGamemode(prev => bot.game.gameMode)
    })
  }, [])

  return <XPBar progress={progress} level={level} gamemode={gamemode} />
}
