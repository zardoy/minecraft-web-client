import { proxy, useSnapshot } from 'valtio'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { isMobile } from 'minecraft-renderer/src/lib/simpleUtils'
import { noCase } from 'change-case'
import { titleCase } from 'title-case'
import { hideCurrentModal, showModal } from '../globalState'
import { parseFormattedMessagePacket } from '../botUtils'
import { useIsModalActive } from './utilsApp'
import FlatButton from './ui/FlatButton'
import PixelartIcon from './PixelartIcon'
import styles from './selectOption.module.css'
import MessageFormattedString from './MessageFormattedString'
import { InputWithLabel } from './Input'

const state = proxy({
  title: '',
  options: [] as string[],
  descriptions: [] as string[],
  showCancel: true,
  minecraftJsonMessage: null as null | Record<string, any>,
  behavior: 'resolve-close' as 'resolve-close' | 'close-resolve',
  inputs: {} as Record<string, InputOption>,
  inputsConfirmButton: '',
  hoveredOptionIndex: -1
})

let resolve
export const showOptionsModal = async <T extends string> (
  title: string,
  options: T[],
  { cancel = true, descriptions = [], minecraftJsonMessage, hoveredOptionIndex = -1 }: Partial<Pick<typeof state, 'descriptions' | 'minecraftJsonMessage' | 'hoveredOptionIndex'>> & { cancel?: boolean } = {}
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
      descriptions,
      showCancel: cancel,
      minecraftJsonMessage: minecraftJsonMessageParsed,
      inputs: {},
      inputsConfirmButton: '',
      hoveredOptionIndex
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
      descriptions: [],
      inputsConfirmButton: showConfirm ? confirmLabel : '',
      hoveredOptionIndex: -1
    })
  })
}

/** title + list of choices (the current one marked) + description of the pointed choice + Cancel; or a few inputs with Confirm */
export default () => {
  const { title, options, descriptions, showCancel, minecraftJsonMessage, inputs, inputsConfirmButton, hoveredOptionIndex } = useSnapshot(state)
  const isModalActive = useIsModalActive('general-select')
  const inputValues = useRef({})

  useEffect(() => {
    inputValues.current = Object.fromEntries(Object.entries(inputs).map(([key, input]) => [key, input.defaultValue ?? (input.type === 'checkbox' ? false : '')]))
  }, [inputs])

  if (!isModalActive) return null

  // keyed by the content: a new question starts with its current choice in view
  return <OptionsPanel
    key={`${title}\n${options.join('\n')}`}
    title={title}
    options={options as string[]}
    descriptions={descriptions as string[]}
    current={hoveredOptionIndex}
    showCancel={showCancel}
    minecraftJsonMessage={minecraftJsonMessage}
    inputs={inputs as Record<string, InputOption>}
    inputsConfirmButton={inputsConfirmButton}
    inputValues={inputValues}
  />
}

const OptionsPanel = ({ title, options, descriptions, current, showCancel, minecraftJsonMessage, inputs, inputsConfirmButton, inputValues }: {
  title: string
  options: string[]
  descriptions: string[]
  /** the choice that is set now (callers pass it as hoveredOptionIndex) */
  current: number
  showCancel: boolean
  minecraftJsonMessage: Record<string, any> | null
  inputs: Record<string, InputOption>
  inputsConfirmButton: string
  inputValues: React.MutableRefObject<Record<string, unknown>>
}) => {
  const [pointed, setPointed] = useState(current)
  const listRef = useRef<HTMLDivElement>(null)

  const resolveClose = (value: any) => {
    if (state.behavior === 'resolve-close') {
      resolve(value)
      hideCurrentModal()
    } else {
      hideCurrentModal()
      resolve(value)
    }
  }

  // open with the current choice in view (and focused on desktop, so the arrow keys start there)
  useLayoutEffect(() => {
    const item = listRef.current?.querySelectorAll<HTMLButtonElement>('[role=option]')[current === -1 ? 0 : current]
    if (!item) return
    item.scrollIntoView({ block: 'center' })
    if (!isMobile()) item.focus({ preventScroll: true })
  }, [])

  const moveFocus = (dir: 1 | -1) => {
    const items = [...listRef.current?.querySelectorAll<HTMLButtonElement>('[role=option]') ?? []]
    const index = items.indexOf(document.activeElement as HTMLButtonElement)
    const next = items[Math.max(0, Math.min(items.length - 1, (index === -1 ? (current === -1 ? -1 : current) : index) + dir))]
    next?.focus()
  }

  const hasInputs = Object.keys(inputs).length > 0
  const description = descriptions[pointed] ?? descriptions[current]
  const hasDescriptions = descriptions.some(Boolean)
  // a message without choices: the only button acknowledges it
  const cancelLabel = options.length === 0 && !hasInputs ? 'OK' : 'Cancel'

  return <>
    <div className='backdrop' />
    <div className={`fullscreen ${styles.root} settings-screen select-option-screen`}>
      <div className={styles.panel} role='dialog' aria-modal aria-labelledby='select-option-title'>
        <div className={`${styles.title} ${title.length > 70 ? styles.titleLong : ''}`} id='select-option-title'>{translate(title)}</div>
        {minecraftJsonMessage && <div className={styles.message}>
          <MessageFormattedString message={minecraftJsonMessage} />
        </div>}
        {options.length > 0 && <div
          ref={listRef}
          className={styles.list}
          role='listbox'
          aria-labelledby='select-option-title'
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault()
              moveFocus(e.key === 'ArrowDown' ? 1 : -1)
            }
          }}
        >
          {options.map((option, index) => <button
            key={option}
            type='button'
            role='option'
            aria-selected={index === current}
            className={`${styles.option} ${index === current ? styles.optionCurrent : ''}`}
            onClick={() => resolveClose(option)}
            onMouseEnter={() => setPointed(index)}
            onFocus={() => setPointed(index)}
          >
            <span className={styles.check}>{index === current && <PixelartIcon iconName='check' />}</span>
            <span className={styles.optionText}>{translate(option)}</span>
          </button>)}
        </div>}
        {hasInputs && <div className={styles.inputs}>
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
                <label className={styles.checkbox}>
                  <input
                    type='checkbox'
                    defaultChecked={input.defaultValue as boolean}
                    onChange={(e) => {
                      inputValues.current[key] = e.target.checked
                    }}
                  />
                  {label}
                </label>
              )}
              {input.type === 'button' && (
                <FlatButton
                  label={label}
                  onClick={() => {
                    resolveClose(inputValues.current)
                    input.onButtonClick?.()
                  }}
                />
              )}
            </div>
          })}
        </div>}
        {/* reserved while the list has descriptions: pointing at another choice does not move anything */}
        {hasDescriptions && <div className={styles.description}>{description ?? ''}</div>}
        {(showCancel || (hasInputs && inputsConfirmButton)) && <div className={styles.footer}>
          {showCancel && <FlatButton label={cancelLabel} className={styles.footerButton} onClick={() => resolveClose(undefined)} />}
          {hasInputs && inputsConfirmButton && <FlatButton variant='primary' label={inputsConfirmButton} className={styles.footerButton} onClick={() => resolveClose(inputValues.current)} />}
        </div>}
      </div>
    </div>
  </>
}
