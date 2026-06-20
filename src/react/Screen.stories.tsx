import type { Meta, StoryObj } from '@storybook/react'

import Screen from './Screen'
import Button from './Button'

const meta: Meta<typeof Screen> = {
  component: Screen,
  render: () => (
    <Screen title="test">
      <div className="screen-items">
        {Array.from({ length: 10 }).map((_, i) => (
          <Button key={i} inScreen>
            test {i}
          </Button>
        ))}
      </div>
    </Screen>
  )
}

export default meta
type Story = StoryObj<typeof Screen>

export const Primary: Story = {
  args: {}
}
