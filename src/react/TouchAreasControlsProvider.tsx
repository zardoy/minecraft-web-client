import { useSnapshot } from 'valtio'
import { activeModalStack, hideModal } from '../globalState'
import { options } from '../optionsStorage'
import TouchAreasControls from './TouchAreasControls'
import { useIsModalActive, useUsingTouch } from './utilsApp'

export default () => {
  const usingTouch = useUsingTouch()
  const hasModals = useSnapshot(activeModalStack).length !== 0
  const setupActive = useIsModalActive('touch-buttons-setup')

  return (
    <TouchAreasControls
      foregroundGameActive={!!bot && !!usingTouch && !hasModals}
      setupActive={setupActive}
      closeButtonsSetup={newPositions => {
        if (newPositions) {
          options.touchControlsPositions = newPositions
        }
        hideModal()
      }}
    />
  )
}
