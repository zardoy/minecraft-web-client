import React from 'react'

import type { Preview } from '@storybook/react'

import './storybook.css'
import '../src/styles.css'
import '../src/scaleInterface'

const preview: Preview = {
  decorators: [
    (Story, c) => {
      const noScaling = c.parameters.noScaling
      return (
        <div id={noScaling ? '' : 'ui-root'}>
          <Story />
        </div>
      )
    }
  ],
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/
      }
    }
  }
}

export default preview
