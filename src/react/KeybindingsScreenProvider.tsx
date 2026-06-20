import { createContext, useState } from 'react'
import { contro, updateBinds } from '../controls'
import KeybindingsScreen from './KeybindingsScreen'
import { useIsModalActive } from './utilsApp'

const bindingActions = {
  updateBinds
}

export const BindingActionsContext = createContext(bindingActions)

export default () => {
  const [bindActions, setBindActions] = useState(bindingActions)
  const isModalActive = useIsModalActive('keybindings')

  if (!isModalActive) return null

  const hasPsGamepad = [...(navigator.getGamepads?.() ?? [])].some(gp => gp?.id.match(/playstation|dualsense|dualshock/i)) // todo: use last used gamepad detection
  return (
    <BindingActionsContext.Provider value={bindActions}>
      <KeybindingsScreen isPS={hasPsGamepad} contro={contro} />
    </BindingActionsContext.Provider>
  )
}
