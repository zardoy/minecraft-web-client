import type { Meta, StoryObj } from '@storybook/react'

import { CSSProperties } from 'react'
import Select from './Select'

const meta: Meta<typeof Select> = {
  component: Select
}

export default meta
type Story = StoryObj<typeof Select>

export const Primary: Story = {
  args: {
    initialOptions: [
      { value: '1', label: 'option 1' },
      { value: '2', label: 'option 2' },
      { value: '3', label: 'option 3' }
    ],
    updateOptions(options) {},
    getCssOnInput(input) {
      console.log('input:', input)
      if (input === 'option 3') return { border: '1px solid yellow' } as CSSProperties
    }
  }
}
