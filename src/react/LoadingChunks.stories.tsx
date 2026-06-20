import type { Meta, StoryObj } from '@storybook/react'

import { useEffect, useState } from 'react'
import LoadingChunks from './LoadingChunks'

const meta: Meta<typeof LoadingChunks> = {
  component: LoadingChunks,
  render(args) {
    const [stateMap, setStateMap] = useState(
      Object.fromEntries(
        args
          .regionFiles!.map(x =>
            x
              .split('.')
              .slice(1, 3)
              .map(Number)
              .map(y => y.toString())
              .join(',')
          )
          .map(x => [x, 'loading'])
      )
    )

    useEffect(() => {
      const interval = setInterval(() => {
        // pick random and set to done
        const random = Math.floor(Math.random() * args.regionFiles!.length)
        const [x, z] = args.regionFiles![random].split('.').slice(1, 3).map(Number)
        setStateMap(prev => ({ ...prev, [`${x},${z}`]: 'done' }))
      }, 1000)
      return () => clearInterval(interval)
    }, [])

    return <LoadingChunks stateMap={stateMap} {...args} />
  }
}

export default meta
type Story = StoryObj<typeof LoadingChunks>

export const Primary: Story = {
  args: {
    regionFiles: ['r.-1.-1.mca', 'r.-1.0.mca', 'r.0.-1.mca', 'r.0.0.mca', 'r.0.1.mca'],
    playerChunk: {
      x: -1,
      z: 0
    },
    displayText: true
  }
}
