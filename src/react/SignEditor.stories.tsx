import type { Meta, StoryObj } from '@storybook/react'
import { ProseMirrorView } from './prosemirror-markdown'

import SignEditor from './SignEditor'

const meta: Meta<typeof SignEditor> = {
  component: SignEditor,
  render(args) {
    return (
      <SignEditor
        {...args}
        handleClick={result => {
          console.log('handleClick', result)
        }}
      />
    )
  }
}

export default meta
type Story = StoryObj<typeof SignEditor>

export const Primary: Story = {
  args: {
    handleInput() {},
    ProseMirrorView
  },
  parameters: {
    noScaling: true
  }
}
