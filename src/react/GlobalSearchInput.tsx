import { useSnapshot } from 'valtio'
import { miscUiState } from '../globalState'
import Input from './Input'

function InnerSearch() {
  const { currentTouch } = useSnapshot(miscUiState)

  return (
    <div
      style={{
        position: 'fixed',
        top: 5,
        left: 0,
        right: 0,
        margin: 'auto',
        zIndex: 11,
        width: 'min-content',
        transform: 'scale(1.5)'
      }}
    >
      <Input
        autoFocus={currentTouch === false}
        placeholder="Search..."
        onChange={({ target: { value } }) => {
          customEvents.emit('search', value)
        }}
      />
    </div>
  )
}

// todo remove component as its not possible to reuse this component atm
export default () => {
  const { displaySearchInput } = useSnapshot(miscUiState)

  return displaySearchInput ? <InnerSearch /> : null
}
