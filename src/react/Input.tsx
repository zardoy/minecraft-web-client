import React, { CSSProperties, useEffect, useRef, useState } from 'react'
import { isMobile } from 'prismarine-viewer/viewer/lib/simpleUtils'
import styles from './input.module.css'

interface Props extends React.ComponentProps<'input'> {
  rootStyles?: React.CSSProperties
  autoFocus?: boolean
  inputRef?: React.RefObject<HTMLInputElement>
  validateInput?: (value: string) => CSSProperties | undefined
}

export default ({ autoFocus, rootStyles, inputRef, validateInput, defaultValue, ...inputProps }: Props) => {
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


  return <div id='input-container' className={styles.container} style={rootStyles}>
    <input
      ref={ref}
      className={styles.input}
      autoComplete='off'
      autoCapitalize='off'
      autoCorrect='off'
      autoSave='off'
      spellCheck='false'
      style={{ ...validationStyle }}
      {...inputProps}
      value={value}
      onChange={(e) => {
        setValidationStyle(validateInput?.(e.target.value) ?? {})
        setValue(e.target.value)
        inputProps.onChange?.(e)
      }}
    />
  </div>
}
