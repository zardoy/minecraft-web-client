import type { Meta, StoryObj } from '@storybook/react'

import Tabs from './Tabs'

const meta: Meta<typeof Tabs> = {
  component: Tabs,
  args: {
    tabs: ['Tab 1', 'Tab 2'],
    activeTab: 'Tab 1'
  }
}

export default meta
type Story = StoryObj<typeof Tabs>

export const Primary: Story = {
  args: {
    fullSize: true
  }
}
