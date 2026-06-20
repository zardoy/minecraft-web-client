import type { Meta, StoryObj } from '@storybook/react'
import icons from 'mc-assets/dist/other-textures/latest/gui/icons.png'

import ArmorBar from './ArmorBar'

const meta: Meta<typeof ArmorBar> = {
  component: ArmorBar
}

export default meta
type Story = StoryObj<typeof ArmorBar>

export const Primary: Story = {
  args: {
    armorValue: 10
  }
}
