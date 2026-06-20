import type { Meta, StoryObj } from '@storybook/react'

import { ChatMessage } from 'prismarine-chat'
import { BossBar } from 'mineflayer'
import BossBarOverlay from './BossBarOverlay'

const meta: Meta<typeof BossBarOverlay> = {
  component: BossBarOverlay
}

export default meta
type Story = StoryObj<typeof BossBarOverlay>

export const Primary: Story = {
  args: {
    bar: {
      entityUUID: 'uuid',
      title: { text: 'Boss', translate: 'test' } as ChatMessage & { text: string; translate: string },
      health: 100,
      dividers: 2,
      color: 'red',
      shouldDarkenSky: false,
      isDragonBar: false,
      createFog: false,
      shouldCreateFog: false,
      _title: { text: 'Boss', translate: 'entity.minecraft.ender_dragon' },
      _color: 'red',
      _dividers: 2,
      _health: 100,
      lastUpdated: 0
    }
  }
}
