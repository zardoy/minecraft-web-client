import type { Meta, StoryObj } from '@storybook/react'

import DeathScreen from './DeathScreen'

const meta: Meta<typeof DeathScreen> = {
  component: DeathScreen
}

export default meta
type Story = StoryObj<typeof DeathScreen>

export const Primary: Story = {
  args: {
    dieReasonMessage: [
      {
        text: 'test'
      }
    ],
    respawnCallback() {},
    disconnectCallback() {}
  }
}
