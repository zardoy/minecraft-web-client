import React, { CSSProperties, useEffect, useMemo, useRef, useState } from 'react'
import { isMobile } from 'renderer/viewer/lib/simpleUtils'
import styles from './input.module.css'
import { withInjectableUi } from './extendableSystem'

interface Props extends Omit<React.ComponentProps<'input'>, 'width'> {
  rootStyles?: React.CSSProperties
  autoFocus?: boolean
  inputRef?: React.RefObject<HTMLInputElement>
  validateInput?: (value: string) => CSSProperties | undefined
  width?: number
}

const InputBase = ({ autoFocus, rootStyles, inputRef, validateInput, defaultValue, width, ...inputProps }: Props) => {
  if (width) rootStyles = { ...rootStyles, width }

  const ref = useRef<HTMLInputElement>(null!)
  const [validationStyle, setValidationStyle] = useState<CSSProperties>({})
  const [value, setValue] = useState(defaultValue ?? '')

  useEffect(() => {
    setValue(inputProps.value === '' || inputProps.value ? inputProps.value : value)
  }, [inputProps.value])

  useEffect(() => {
    if (inputRef) (inputRef as any).current = ref.current
    if (!autoFocus || isMobile()) return // Don't make screen keyboard popup on mobile
    ref.current.focus()
  }, [])


  useEffect(() => {
    setValidationStyle(validateInput?.(value as any) ?? {})
  }, [value, validateInput])

  return <div id='input-container' className={styles.container} style={rootStyles}>
    <input
      ref={ref}
      autoComplete='off'
      autoCapitalize='off'
      autoCorrect='off'
      autoSave='off'
      spellCheck='false'
      style={{ ...validationStyle }}
      {...inputProps}
      className={styles.input + ' ' + (inputProps.className ?? '')}
      value={value}
      onChange={(e) => {
        setValue(e.target.value)
        inputProps.onChange?.(e)
      }}
    />
  </div>
}

const Input = withInjectableUi(InputBase, 'input')

export default Input

export const INPUT_LABEL_WIDTH = 190

export const InputWithLabel = ({ label, span, ...props }: React.ComponentProps<typeof Input> & { label, span? }) => {
  return <div style={{
    display: 'flex',
    flexDirection: 'column',
    gridRow: span ? 'span 2 / span 2' : undefined,
  }}
  >
    <label style={{ fontSize: 12, marginBottom: 1, color: 'lightgray' }}>{label}</label>
    <InputBase rootStyles={{ width: INPUT_LABEL_WIDTH }} {...props} />
  </div>
}
