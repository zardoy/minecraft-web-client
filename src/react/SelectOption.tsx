import { proxy, useSnapshot } from 'valtio'
import { useEffect, useRef } from 'react'
import { noCase } from 'change-case'
import { titleCase } from 'title-case'
import { hideCurrentModal, showModal } from '../globalState'
import { parseFormattedMessagePacket } from '../botUtils'
import Screen from './Screen'
import { useIsModalActive } from './utilsApp'
import Button from './Button'
import MessageFormattedString from './MessageFormattedString'
import Input, { InputWithLabel } from './Input'

const state = proxy({
  title: '',
  options: [] as string[],
  showCancel: true,
  minecraftJsonMessage: null as null | Record<string, any>,
  behavior: 'resolve-close' as 'resolve-close' | 'close-resolve',
  inputs: {} as Record<string, InputOption>,
  inputsConfirmButton: ''
})

let resolve
export const showOptionsModal = async <T extends string> (
  title: string,
  options: T[],
  { cancel = true, minecraftJsonMessage }: { cancel?: boolean, minecraftJsonMessage? } = {}
): Promise<T | undefined> => {
  showModal({ reactType: 'general-select' })
  let minecraftJsonMessageParsed
  if (minecraftJsonMessage) {
    const parseResult = parseFormattedMessagePacket(minecraftJsonMessage)
    minecraftJsonMessageParsed = parseResult.formatted
    if (parseResult.plain) {
      title += ` (${parseResult.plain})`
    }
  }
  return new Promise((_resolve) => {
    resolve = _resolve
    Object.assign(state, {
      title,
      options,
      showCancel: cancel,
      minecraftJsonMessage: minecraftJsonMessageParsed,
      inputs: {},
      inputsConfirmButton: ''
    })
  })
}

export type InputOption = {
  type: 'text' | 'checkbox' | 'button'
  defaultValue?: string | boolean
  label?: string
  placeholder?: string
  onButtonClick?: () => void
}
export const showInputsModal = async <T extends Record<string, InputOption>>(
  title: string,
  inputs: T,
  {
    cancel = true,
    minecraftJsonMessage,
    showConfirm = true,
    confirmLabel = 'Confirm',
  }: {
    cancel?: boolean,
    minecraftJsonMessage?
    showConfirm?: boolean
    confirmLabel?: string
  } = {}
): Promise<{
  [K in keyof T]: T[K] extends { type: 'text' }
    ? string
    : T[K] extends { type: 'checkbox' }
      ? boolean
      : T[K] extends { type: 'button' }
        ? string
        : never
}> => {
  showModal({ reactType: 'general-select' })
  let minecraftJsonMessageParsed
  if (minecraftJsonMessage) {
    const parseResult = parseFormattedMessagePacket(minecraftJsonMessage)
    minecraftJsonMessageParsed = parseResult.formatted
    if (parseResult.plain) {
      title += ` (${parseResult.plain})`
    }
  }
  return new Promise((_resolve) => {
    resolve = _resolve
    Object.assign(state, {
      title,
      inputs,
      showCancel: cancel,
      minecraftJsonMessage: minecraftJsonMessageParsed,
      options: [],
      inputsConfirmButton: showConfirm ? confirmLabel : ''
    })
  })
}

export default () => {
  const { title, options, showCancel, minecraftJsonMessage, inputs, inputsConfirmButton } = useSnapshot(state)
  const isModalActive = useIsModalActive('general-select')
  const inputValues = useRef({})

  useEffect(() => {
    inputValues.current = Object.fromEntries(Object.entries(inputs).map(([key, input]) => [key, input.defaultValue ?? (input.type === 'checkbox' ? false : '')]))
  }, [inputs])

  if (!isModalActive) return

  const resolveClose = (value: any) => {
    if (state.behavior === 'resolve-close') {
      resolve(value)
      hideCurrentModal()
    } else {
      hideCurrentModal()
      resolve(value)
    }
  }

  return <Screen title={title} backdrop>
    {minecraftJsonMessage && <div style={{ textAlign: 'center', }}>
      <MessageFormattedString message={minecraftJsonMessage} />
    </div>}
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      {options.length > 0 && <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {options.map(option => <Button
          key={option} onClick={() => {
            resolveClose(option)
          }}
        >{option}
        </Button>)}
      </div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {Object.entries(inputs).map(([key, input]) => {
          const label = input.label ?? titleCase(noCase(key))
          return <div key={key}>
            {input.type === 'text' && (
              <InputWithLabel
                label={label}
                autoFocus
                type='text'
                defaultValue={input.defaultValue as string}
                placeholder={input.placeholder}
                onChange={(e) => {
                  inputValues.current[key] = e.target.value
                }}
              />
            )}
            {input.type === 'checkbox' && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                <input
                  type='checkbox'
                  style={{ marginBottom: -1, }}
                  defaultChecked={input.defaultValue as boolean}
                  onChange={(e) => {
                    inputValues.current[key] = e.target.checked
                  }}
                />
                {label}
              </label>
            )}
            {input.type === 'button' && (
              <Button
                onClick={() => {
                  resolveClose(inputValues.current)
                  input.onButtonClick?.()
                }}
              >{label}
              </Button>
            )}
          </div>
        })}
      </div>
      {inputs && inputsConfirmButton && (
        <Button
          // style={{ marginTop: 30 }}
          onClick={() => {
            resolveClose(inputValues.current)
          }}
        >
          {inputsConfirmButton}
        </Button>
      )}
      {showCancel && (
        <Button
          // style={{ marginTop: 30 }}
          onClick={() => {
            resolveClose(undefined)
          }}
        >
          Cancel
        </Button>
      )}
    </div>
  </Screen>
}
