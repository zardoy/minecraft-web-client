import type { Meta, StoryObj } from '@storybook/react'

import PlayerListOverlay from './PlayerListOverlay'

const meta: Meta<typeof PlayerListOverlay> = {
  component: PlayerListOverlay
}

export default meta
type Story = StoryObj<typeof PlayerListOverlay>

export const Primary: Story = {
  args: {
    playersLists: [
      [
        { username: 'Player 1', ping: 10, uuid: '1' },
        { username: 'Player 2', ping: 20, uuid: '2' },
        { username: 'Player 3', ping: 420, uuid: '3' },
        { username: 'Player 4', ping: 0, uuid: '4' },
      ] as any
    ],
    clientId: '2',
    tablistHeader: 'Header',
    tablistFooter: 'Footer',
  }
}
