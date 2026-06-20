import type { Meta, StoryObj } from '@storybook/react'

import Slider from './Slider'

const meta: Meta<typeof Slider> = {
  component: Slider,
  args: {
    label: 'happiness',
    value: 0,
    updateValue(value) {
      console.log('updateValue', value)
    }
  }
}

export default meta
type Story = StoryObj<typeof Slider>

export const Primary: Story = {
  args: {
    updateOnDragEnd: true,
    disabledReason: undefined
  }
}

export const Disabled: Story = {
  args: {
    disabledReason: 'you are not happy enough'
  }
}
