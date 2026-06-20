import type { Meta, StoryObj } from '@storybook/react'

import MessageFormattedString from './MessageFormattedString'

const meta: Meta<typeof MessageFormattedString> = {
  component: MessageFormattedString
}

export default meta
type Story = StoryObj<typeof MessageFormattedString>

export const Primary: Story = {
  args: {
    // red text using minecraft styling symbol
    message: '\u00A7cYou died!',
    fallbackColor: 'white'
  }
}
