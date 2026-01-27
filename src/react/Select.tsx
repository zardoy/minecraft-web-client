import { useState, CSSProperties } from 'react'
import Creatable from 'react-select/creatable'
import Input from './Input'
import './Select.css'
import styles from './select.module.css'
import { withInjectableUi } from './extendableSystem'


export interface OptionStorage {
  value: string,
  label: string
}

interface Props {
  initialOptions: OptionStorage[]
  updateOptions: (options: string) => void
  getCssOnInput?: (input: string) => CSSProperties | undefined
  onValueChange?: (newVal: string) => void
  defaultValue?: { value: string, label: string }
  placeholder?: string
  containerStyle?: CSSProperties
  disabled?: boolean
}

const SelectBase = ({
  initialOptions,
  updateOptions,
  getCssOnInput,
  onValueChange,
  defaultValue,
  containerStyle,
  placeholder,
  disabled
}: Props) => {
  const [inputValue, setInputValue] = useState<string | undefined>(defaultValue?.label ?? '')
  const [currValue, setCurrValue] = useState<string | undefined>(defaultValue?.label ?? '')
  const [inputStyle, setInputStyle] = useState<CSSProperties>({})
  const [isFirstClick, setIsFirstClick] = useState(true)

  return <Creatable
    options={initialOptions}
    defaultValue={defaultValue}
    blurInputOnSelect={true}
    hideSelectedOptions={false}
    maxMenuHeight={100}
    isClearable={true}
    formatCreateLabel={(value) => {
      return 'Use "' + value + '"'
    }}
    isDisabled={disabled}
    placeholder={placeholder ?? ''}
    onChange={(e, action) => {
      console.log('value:', e?.value)
      setCurrValue(e?.label)
      setInputValue(e?.label)
      onValueChange?.(e?.value ?? '')
      updateOptions?.(e?.value ?? '')
      setInputStyle(getCssOnInput?.(e?.value ?? '') ?? {})
    }}
    onInputChange={(e) => {
      setIsFirstClick(false)
      setInputValue(e)
    }}
    inputValue={inputValue}
    onFocus={(state) => {
      setInputValue(currValue)
    }}
    filterOption={(option, value) => {
      return isFirstClick || option.label.includes(value)
    }}
    onMenuOpen={() => {
      setIsFirstClick(true)
    }}
    menuPortalTarget={document.body}
    classNames={{
      control (state) {
        return styles.container
      },
      input (state) {
        return styles.input
      },
      option (state) {
        return styles.container
      }
    }}
    styles={{
      menuPortal (base, state) { return { ...base, zIndex: 10, transform: 'scale(var(--guiScale))', transformOrigin: 'top left' } },
      container (base, state) { return { ...base, position: 'relative', zIndex: 10 } },
      control (base, state) { return { ...containerStyle, ...inputStyle } },
      menu (base, state) { return { position: 'absolute', zIndex: 10 } },
      option (base, state) {
        return {
          boxSizing: 'border-box',
          padding: '3px',
          backgroundColor: 'black',
          border: state.isFocused ? '1px solid white' : '1px solid grey',
          height: 'fit-content',
          ...containerStyle
        }
      },
      input (base, state) { return {} },
      indicatorsContainer (base, state) { return { display: 'none' } },
      placeholder (base, state) { return { ...base, padding: '3px', position: 'absolute' } },
      singleValue (base, state) { return { ...base, margin: '0px', position: 'absolute', color: 'white' } },
      valueContainer (base, state) { return { ...base, padding: '3px' } },
      noOptionsMessage (base, state) { return { display: 'none' } }
    }}
  />
}

export default withInjectableUi(SelectBase, 'select')
