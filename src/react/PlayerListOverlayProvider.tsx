import { proxy, useSnapshot } from 'valtio'
import { useState, useEffect, useMemo } from 'react'
import { lastConnectOptions } from '../appStatus'
import PlayerListOverlay from './PlayerListOverlay'
import './PlayerListOverlay.css'

const MAX_COLUMNS = 4
const MAX_ROWS_PER_COL = 10

type Players = typeof bot.players

export const tabListState = proxy({
  isOpen: false,
})

export default () => {
  const { isOpen } = useSnapshot(tabListState)

  const serverIp = lastConnectOptions.value?.server
  const [clientId, setClientId] = useState(bot._client.uuid)
  const [players, setPlayers] = useState<Players>({})
  const [counter, setCounter] = useState(0)

  useEffect(() => {
    function requestUpdate () {
      setPlayers(bot?.players ?? {})
    }

    bot.on('playerUpdated', () => requestUpdate())
    bot.on('playerJoined', () => requestUpdate())
    bot.on('playerLeft', () => requestUpdate())
    requestUpdate()
    const interval = setInterval(() => {
      requestUpdate()
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    setPlayers(bot.players)
    if (bot.player) {
      setClientId(bot.player.uuid)
    } else {
      bot._client.on('player_info', () => {
        if (bot.player?.uuid) {
          setClientId(bot.player?.uuid)
        }
      })
    }

    const playerlistHeader = () => setCounter(prev => prev + 1)
    bot._client.on('playerlist_header', playerlistHeader)

    return () => {
      bot?._client.removeListener('playerlist_header', playerlistHeader)
    }
  }, [serverIp])

  const playersArray = Object.values(players).sort((a, b) => {
    if (a.username > b.username) return 1
    if (a.username < b.username) return -1
    return 0
  })

  // Calculate optimal column distribution
  const totalPlayers = playersArray.length
  const numColumns = Math.min(MAX_COLUMNS, Math.ceil(totalPlayers / MAX_ROWS_PER_COL))
  const playersPerColumn = Math.ceil(totalPlayers / numColumns)

  const lists = [] as Array<typeof playersArray>

  for (let i = 0; i < numColumns; i++) {
    const startIdx = i * playersPerColumn
    const endIdx = Math.min(startIdx + playersPerColumn, totalPlayers)
    if (startIdx < totalPlayers) {
      lists.push(playersArray.slice(startIdx, endIdx))
    }
  }

  if (!isOpen) return null

  return <PlayerListOverlay
    playersLists={lists}
    clientId={clientId}
    tablistHeader={bot.tablist.header}
    tablistFooter={bot.tablist.footer}
    serverIP={serverIp ?? ''}
  />
}
