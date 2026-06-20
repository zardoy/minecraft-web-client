import { proxy, subscribe, useSnapshot } from 'valtio'
import { activeModalStack, hideCurrentModal } from '../globalState'
import Screen from './Screen'
import Button from './Button'
import { hardcodedKnownModals, watchedModalsFromHooks } from './utilsApp'

const componentActive = proxy({
  enabled: false
})

const checkModalAvailability = () => {
  const last = activeModalStack.at(-1)
  let withWildCardModal = false
  for (const modal of watchedModalsFromHooks.value) {
    if (modal.endsWith('*') && last?.reactType.startsWith(modal.slice(0, -1))) {
      withWildCardModal = true
      break
    }
  }

  componentActive.enabled =
    !!last && !hardcodedKnownModals.some(x => last.reactType.startsWith(x)) && !watchedModalsFromHooks.value.includes(last.reactType) && !withWildCardModal
}

subscribe(activeModalStack, () => {
  checkModalAvailability()
})
subscribe(watchedModalsFromHooks, () => {
  checkModalAvailability()
})

export default () => {
  const { enabled } = useSnapshot(componentActive)
  const lastModal = useSnapshot(activeModalStack).at(-1)?.reactType

  if (!enabled || watchedModalsFromHooks.value.includes(lastModal!)) return null
  return (
    <Screen
      title={`Error: Modal (route) ${lastModal} is is unavailable or doesn't exist`}
      style={{
        zIndex: -1
      }}
      backdrop={false}
    >
      <Button
        style={{ marginTop: 30 }}
        onClick={() => {
          hideCurrentModal()
        }}
      >
        Back
      </Button>
    </Screen>
  )
}
