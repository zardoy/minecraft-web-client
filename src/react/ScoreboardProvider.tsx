import { useMemo, useState } from 'react'
import Scoreboard from './Scoreboard'
import type { ScoreboardItems } from './Scoreboard'

export default function ScoreboardProvider() {
  const [title, setTitle] = useState('Scoreboard')
  const [items, setItems] = useState<ScoreboardItems>([])
  const [open, setOpen] = useState(false)

  useMemo(() => {
    // useMemo instead of useEffect to register them asap and not after the initial dom render
    const updateSidebarScoreboard = () => {
      addStatPerSec('scoreboard')
      if (bot.scoreboard.sidebar) {
        setTitle(bot.scoreboard.sidebar.title)
        setItems([...bot.scoreboard.sidebar.items])
        setOpen(true)
      } else {
        setOpen(false)
      }
    }

    bot.on('scoreboardCreated', updateSidebarScoreboard) // not used atm but still good to have
    bot.on('scoreboardTitleChanged', updateSidebarScoreboard)
    bot.on('scoreUpdated', updateSidebarScoreboard)
    bot.on('scoreRemoved', updateSidebarScoreboard)
    bot.on('scoreboardDeleted', updateSidebarScoreboard)
    bot.on('scoreboardPosition', () => {
      void Promise.resolve().then(() => {
        updateSidebarScoreboard()
      }) // mineflayer bug: wait for the next tick to get the correct scoreboard position
    })
  }, [])

  return <Scoreboard title={title} items={items} open={open} />
}
