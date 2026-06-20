import { LeftTouchArea, RightTouchArea, useInterfaceState } from '@dimaka/interface'
import { css } from '@emotion/css'
import { useSnapshot } from 'valtio'
import { contro } from '../controls'
import { miscUiState, activeModalStack } from '../globalState'
import { watchValue, options } from '../optionsStorage'
import { useUsingTouch } from './utilsApp'

// todo
useInterfaceState.setState({
  isFlying: false,
  uiCustomization: {
    touchButtonSize: 40
  },
  updateCoord([coord, state]) {
    const coordToAction = [
      ['z', -1, 'KeyW'],
      ['z', 1, 'KeyS'],
      ['x', -1, 'KeyA'],
      ['x', 1, 'KeyD'],
      ['y', 1, 'Space'], // todo jump
      ['y', -1, 'ShiftLeft'] // todo jump
    ]
    // todo refactor
    const actionAndState =
      state === 0 ? coordToAction.filter(([axis]) => axis === coord) : coordToAction.find(([axis, value]) => axis === coord && value === state)
    if (!bot) return
    if (state === 0) {
      // @ts-expect-error
      for (const action of actionAndState) {
        contro.pressedKeyOrButtonChanged({ code: action[2] }, false)
      }
    } else {
      //@ts-expect-error
      contro.pressedKeyOrButtonChanged({ code: actionAndState[2] }, true)
    }
  }
})

watchValue(options, o => {
  useInterfaceState.setState({
    uiCustomization: {
      touchButtonSize: o.touchButtonsSize
    }
  })
})

export default () => {
  // todo setting
  const usingTouch = useUsingTouch()
  const { usingGamepadInput } = useSnapshot(miscUiState)
  const modals = useSnapshot(activeModalStack)
  const { touchMovementType } = useSnapshot(options)

  if (!usingTouch || usingGamepadInput || touchMovementType !== 'classic') return null
  return (
    <div
      style={{ zIndex: modals.length ? 7 : 8 }}
      className={css`
        position: fixed;
        bottom: 0;
        /* height: 100%; */
        display: flex;
        width: 100%;
        justify-content: space-between;
        align-items: flex-end;
        pointer-events: none;
        touch-action: none;
        & > div {
          pointer-events: auto;
        }
      `}
    >
      <LeftTouchArea />
      <div />
      <RightTouchArea />
    </div>
  )
}
