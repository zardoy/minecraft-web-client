import type { Meta, StoryObj } from '@storybook/react'
import { proxy, useSnapshot } from 'valtio'
import { useEffect } from 'react'
import ReplayPanel, { PacketData } from './ReplayPanel'

const meta: Meta<typeof ReplayPanel> = {
  component: ReplayPanel,
  title: 'ReplayPanel'
}

export default meta
type Story = StoryObj<typeof ReplayPanel>

const mockPackets = proxy([
  {
    name: 'position',
    data: { x: 100.123, y: 64.456, z: -200.789 },
    isFromClient: true,
    isUpcoming: false,
    position: 1,
    timestamp: 1_234_567_890
  },
  {
    name: 'chat',
    data: { message: 'Hello, world!' },
    isFromClient: true,
    isUpcoming: false,
    position: 2,
    timestamp: 1_234_567_890
  },
  {
    name: 'block_change',
    data: { blockId: 1, position: { x: 100, y: 64, z: -200 } },
    isFromClient: false,
    isUpcoming: true,
    position: 3,
    timestamp: 1_234_567_890
  },
  {
    name: 'entity_move',
    data: { entityId: 1, x: 100, y: 64, z: -200 },
    isFromClient: false,
    isUpcoming: false,
    actualVersion: { x: 101, y: 64, z: -201 },
    position: 4,
    timestamp: 1_234_567_890
  }
] satisfies PacketData[])

const ReplayPanelWithToggle = (props: Parameters<typeof ReplayPanel>[0]) => {
  const packets = useSnapshot(mockPackets)

  useEffect(() => {
    const interval = setInterval(() => {
      for (const [index, packet] of mockPackets.entries()) {
        packet.isUpcoming = !packet.isUpcoming
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  return <ReplayPanel {...props} packets={packets} />
}

export const Primary: Story = {
  render: () => (
    <ReplayPanelWithToggle
      replayName="Test Replay"
      clientPacketsAutocomplete={[]}
      serverPacketsAutocomplete={[]}
      isPlaying={false}
      progress={{ current: 0, total: 100 }}
      speed={1}
      defaultFilter=""
      customButtons={{}}
      onPlayPause={() => {}}
      onRestart={() => {}}
      onSpeedChange={() => {}}
      onCustomButtonToggle={() => {}}
      onFilterChange={() => {}}
      packets={mockPackets}
    />
  )
}

export const Playing: Story = {
  render: () => (
    <ReplayPanelWithToggle
      replayName="Test Replay"
      clientPacketsAutocomplete={[]}
      serverPacketsAutocomplete={[]}
      isPlaying={true}
      progress={{ current: 50, total: 100 }}
      speed={1}
      defaultFilter=""
      customButtons={{}}
      onPlayPause={() => {}}
      onRestart={() => {}}
      onSpeedChange={() => {}}
      onCustomButtonToggle={() => {}}
      onFilterChange={() => {}}
      packets={mockPackets}
    />
  )
}
