import type { Meta, StoryObj } from '@storybook/react'

import ButtonWithTooltip from './ButtonWithTooltip'

const meta: Meta<typeof ButtonWithTooltip> = {
  component: ButtonWithTooltip
}

export default meta
type Story = StoryObj<typeof ButtonWithTooltip>

export const Primary: Story = {
  args: {
    label: 'test',
    initialTooltip: {
      content: 'hi there',
      localStorageKey: null
    }
  }
}
