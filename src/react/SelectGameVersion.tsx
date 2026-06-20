import React, { CSSProperties } from 'react'
import Select from './Select'

type Version = { value: string; label: string }

export default ({
  versions,
  selected,
  onChange,
  updateOptions,
  containerStyle
}: {
  versions: Version[]
  selected?: Version
  onChange?: (newValue: string) => void
  updateOptions?: (newSel: string) => void
} & Pick<React.ComponentProps<typeof Select>, 'containerStyle' | 'placeholder' | 'disabled'>) => {
  return (
    <Select
      initialOptions={versions}
      defaultValue={selected}
      updateOptions={newSel => {
        updateOptions?.(newSel)
      }}
      onValueChange={onChange}
      containerStyle={containerStyle ?? { width: '190px' }}
      getCssOnInput={value => {
        if (!versions || !value) return {}
        const parsedsupportedVersions = versions.map(x => x.value.split('.').map(Number))
        const parsedValue = value.split('.').map(Number)

        const compareVersions = (v1, v2) => {
          for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
            const num1 = v1[i] || 0
            const num2 = v2[i] || 0
            if (num1 > num2) return 1
            if (num1 < num2) return -1
          }
          return 0
        }

        parsedsupportedVersions.sort(compareVersions)
        const minVersion = parsedsupportedVersions[0]
        const maxVersion = parsedsupportedVersions.at(-1)

        const isWithinRange = compareVersions(parsedValue, minVersion) >= 0 && compareVersions(parsedValue, maxVersion) <= 0
        if (!isWithinRange) return { border: '1px solid red' }
        if (!versions.some(x => x.value === value)) return { border: '1px solid yellow' }
      }}
    />
  )
}
