import type { Meta, StoryObj } from '@storybook/react'
import SignInMessage from './SignInMessage'

const meta: Meta<{ open }> = {
  component: SignInMessage as any,
  render({ open }) {
    return <SignInMessage />
  }
}

export default meta
type Story = StoryObj<{ open }>

export const Primary: Story = {
  args: {}
}
