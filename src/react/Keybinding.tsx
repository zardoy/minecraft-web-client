import { AllKeyCodes } from 'contro-max'
import { useState, useEffect } from 'react'
import triangle from './ps_icons/playstation_triangle_console_controller_gamepad_icon.svg'
import square from './ps_icons/playstation_square_console_controller_gamepad_icon.svg'
import circle from './ps_icons/circle_playstation_console_controller_gamepad_icon.svg'
import cross from './ps_icons/cross_playstation_console_controller_gamepad_icon.svg'
import { parseBindingName } from './parseKeybindingName'

type Props = {
  type: 'keyboard' | 'gamepad'
  val: AllKeyCodes
  isPS?: boolean
}

export default ({ type, val, isPS }: Props) => {
  const [bindName, setBindName] = useState('')

  async function setBind() {
    setBindName(val)
    const bind = type === 'keyboard' ? await parseBindingName(val) : isPS && buttonsMap[val] ? buttonsMap[val] : val
    setBindName(bind)
  }

  useEffect(() => {
    void setBind()
  }, [type, val, isPS])

  return <>{bindName}</>
}

const buttonsMap = {
  A: cross,
  B: circle,
  X: square,
  Y: triangle
}
