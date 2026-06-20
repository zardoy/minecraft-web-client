import { hideCurrentModal } from '../globalState'
import Button from './Button'
import { useIsModalActive } from './utilsApp'

export default () => {
  const isModalActive = useIsModalActive('bed')

  if (!isModalActive) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center'
      }}
    >
      <Button
        onClick={() => {
          void bot.wake()
          hideCurrentModal()
        }}
      >
        Cancel
      </Button>
    </div>
  )
}
