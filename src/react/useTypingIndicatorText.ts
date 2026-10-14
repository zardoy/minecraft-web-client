import { useEffect, useMemo } from 'react'
import { useSnapshot } from 'valtio'
import { gameAdditionalState } from '../globalState'

export const useTypingIndicatorText = () => {
  const { typingUsers } = useSnapshot(gameAdditionalState)

  const typingIndicatorText = useMemo(() => {
    const activeTypingUsers = typingUsers.filter(user => !user.timestamp || Date.now() - user.timestamp < 2000)
    if (activeTypingUsers.length === 0) return ''
    if (activeTypingUsers.length === 1) return `${activeTypingUsers[0]?.username || 'Someone'} is typing...`
    if (activeTypingUsers.length === 2) return `${activeTypingUsers[0]?.username || 'Someone'} and ${activeTypingUsers[1]?.username || 'Someone'} are typing...`
    const usernames = activeTypingUsers.slice(0, -1).map(user => user?.username || 'Someone').join(', ')
    const lastUser = activeTypingUsers.at(-1)?.username || 'Someone'
    return `${usernames} and ${lastUser} are typing...`
  }, [typingUsers])

  // Cleanup stale typing users every second
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      const hasExpired = gameAdditionalState.typingUsers.some(user => user.timestamp && now - user.timestamp >= 2000)
      if (hasExpired) {
        gameAdditionalState.typingUsers = gameAdditionalState.typingUsers.filter(user => !user.timestamp || now - user.timestamp < 2000)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  return typingIndicatorText
}
