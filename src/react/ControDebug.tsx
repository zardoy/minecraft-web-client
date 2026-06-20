import { useEffect, useState } from 'react'
import { options } from '../optionsStorage'
import { contro } from '../controls'

export default () => {
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set())
  const [actions, setActions] = useState<string[]>([])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setPressedKeys(prev => new Set([...prev, e.code]))
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      setPressedKeys(prev => {
        const newSet = new Set(prev)
        newSet.delete(e.code)
        return newSet
      })
    }

    const handleBlur = () => {
      setPressedKeys(new Set())
    }

    const handleControTrigger = ({ command }) => {
      setActions(prev => [...prev, command])
    }

    const handleControReleased = ({ command }) => {
      setActions(prev => prev.filter(action => action !== command))
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleBlur)

    contro.on('trigger', handleControTrigger)
    contro.on('release', handleControReleased)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleBlur)
      contro.off('trigger', handleControTrigger)
      contro.off('released', handleControReleased)
    }
  }, [])

  if (!options.debugContro) return null

  return (
    <div
      className="debug-contro"
      style={{
        position: 'fixed',
        right: 0,
        top: '50%',
        transform: 'translateY(-50%)',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: '8px',
        fontFamily: 'monospace',
        fontSize: '8px',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        zIndex: 2
      }}
    >
      <div>Keys: {[...pressedKeys].join(', ')}</div>
      <div style={{ color: 'limegreen' }}>Actions: {actions.join(', ')}</div>
    </div>
  )
}
