import type { Meta, StoryObj } from '@storybook/react'

import FoodBar from './FoodBar'

const meta: Meta<typeof FoodBar> = {
  component: FoodBar
}

export default meta
type Story = StoryObj<typeof FoodBar>

export const Primary: Story = {
  args: {
    gameMode: 'survival',
    food: 10,
    effectToAdd: 19,
    effectToRemove: 20
  }
}
