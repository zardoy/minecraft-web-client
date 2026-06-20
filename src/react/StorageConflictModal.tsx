import { useSnapshot } from 'valtio'
import { activeModalStack, hideCurrentModal } from '../globalState'
import { resolveStorageConflicts, getStorageConflicts } from './appStorageProvider'
import { useIsModalActive } from './utilsApp'
import Screen from './Screen'
import Button from './Button'

const formatTimestamp = (timestamp?: number) => {
  if (!timestamp) return 'Unknown time'
  return new Date(timestamp).toLocaleString()
}

export default () => {
  const isModalActive = useIsModalActive('storage-conflict')
  const conflicts = getStorageConflicts()

  if (!isModalActive /*  || conflicts.length === 0 */) return null

  const clampText = (text: string) => {
    if (typeof text !== 'string') text = JSON.stringify(text)
    return text.length > 30 ? text.slice(0, 30) + '...' : text
  }

  const conflictText = conflicts
    .map(conflict => {
      const localTime = formatTimestamp(conflict.localStorageTimestamp)
      const cookieTime = formatTimestamp(conflict.cookieTimestamp)
      return `${conflict.key}: LocalStorage (${localTime}, ${clampText(conflict.localStorageValue)}) vs Cookie (${cookieTime}, ${clampText(conflict.cookieValue)})`
    })
    .join('\n')

  return (
    <div>
      <div
        style={{
          background: '#dcb58f',
          border: '2px solid #654321',
          padding: '20px',
          margin: '10px',
          color: '#FFFFFF',
          fontFamily: 'minecraft, monospace',
          textAlign: 'center',
          zIndex: 1000,
          position: 'fixed',
          left: 0,
          right: 0
        }}
      >
        <div
          style={{
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#000000',
            marginBottom: '15px'
          }}
        >
          Data Conflict Found
        </div>

        <div
          style={{
            fontSize: '12px',
            marginBottom: '20px',
            whiteSpace: 'pre-line',
            // backgroundColor: 'rgba(0, 0, 0, 0.5)',
            color: '#642323',
            padding: '10px'
            // border: '1px solid #654321'
          }}
        >
          You have conflicting data between localStorage (old) and cookies (new, domain-synced) for the following settings:
          {'\n\n'}
          {conflictText}
          {'\n\n'}
          Please choose which version to keep:
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', fontSize: '8px', color: 'black' }}>
          <div
            onClick={() => {
              resolveStorageConflicts(true) // Use localStorage
              hideCurrentModal()
            }}
            style={{
              border: '1px solid #654321',
              padding: '8px 16px',
              cursor: 'pointer'
            }}
          >
            Use Local Storage & Disable Cookie Sync
          </div>

          <div
            onClick={() => {
              resolveStorageConflicts(false) // Use cookies
              hideCurrentModal()
            }}
            style={{
              border: '1px solid #654321',
              padding: '8px 16px',
              cursor: 'pointer'
            }}
          >
            Use Cookie Data & Remove Local Data
          </div>
        </div>
      </div>
    </div>
  )
}
