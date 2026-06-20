import type { Meta, StoryObj } from '@storybook/react'
import DiveTransition from './DiveTransition'

const meta: Meta<{ open }> = {
  component: DiveTransition as any,
  render({ open }) {
    return <DiveTransition open={open}>hello</DiveTransition>
  }
}

export default meta
type Story = StoryObj<{ open }>

export const Primary: Story = {
  args: {
    open: false
  }
}
