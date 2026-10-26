import { expect, test } from 'vitest'
import { releaseWebGLRenderer } from './webglLifecycle'

test('releases a temporary renderer in context-loss order', () => {
  const calls: string[] = []
  const renderer = {
    forceContextLoss: () => calls.push('forceContextLoss'),
    dispose: () => calls.push('dispose'),
    domElement: {
      remove: () => calls.push('remove')
    }
  }

  releaseWebGLRenderer(renderer)

  expect(calls).toEqual(['forceContextLoss', 'dispose', 'remove'])
})
