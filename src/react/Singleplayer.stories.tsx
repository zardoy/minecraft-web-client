import type { Meta, StoryObj } from '@storybook/react'
import Singleplayer from './Singleplayer'

const meta: Meta<{ open }> = {
  component: Singleplayer as any,
  render({ open }) {
    return (
      <Singleplayer
        worldData={Array.from({ length: 100 }).map((_, i) => ({
          name: 'test' + i,
          title: 'Test Save ' + i,
          lastPlayed: Date.now() - 600_000,
          size: 100_000
        }))}
        providerActions={{
          local() {}
        }}
        providers={{
          local: 'Local',
          test: 'Test'
        }}
        onWorldAction={() => {}}
        onGeneralAction={() => {}}
      />
    )
  }
}

export default meta
type Story = StoryObj<{ open }>

export const Primary: Story = {
  args: {}
}
