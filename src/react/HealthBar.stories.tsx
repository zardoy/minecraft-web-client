import type { Meta, StoryObj } from '@storybook/react'

import HealthBar from './HealthBar'

const meta: Meta<typeof HealthBar> = {
  component: HealthBar
}

export default meta
type Story = StoryObj<typeof HealthBar>

export const Primary: Story = {
  args: {
    gameMode: 'survival',
    isHardcore: true,
    damaged: false,
    healthValue: 10,
    effectToAdd: 19,
    effectToRemove: 20
  }
}
