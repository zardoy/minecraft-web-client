import { expect, test } from 'vitest'
import { createModelViewerSessionToken, isModelLoadCurrent, modelUrlsToLoad } from './modelViewerLifecycle'

test('rejects a completion after the renderer session is disposed', () => {
  const token = createModelViewerSessionToken()

  expect(isModelLoadCurrent(undefined, token, ['model.glb'], 'model.glb')).toBe(false)
})

test('rejects a completion from an old session after a new session starts', () => {
  const oldToken = createModelViewerSessionToken()
  const newToken = createModelViewerSessionToken()

  expect(isModelLoadCurrent(newToken, oldToken, ['model.glb'], 'model.glb')).toBe(false)
})

test('rejects a completion for a URL removed during the same session', () => {
  const token = createModelViewerSessionToken()

  expect(isModelLoadCurrent(token, token, [], 'model.glb')).toBe(false)
})

test('accepts a requested URL for the current session', () => {
  const token = createModelViewerSessionToken()

  expect(isModelLoadCurrent(token, token, ['model.glb'], 'model.glb')).toBe(true)
})

test('reloads the current model list for a newly created scene', () => {
  expect(modelUrlsToLoad(['model.glb'], new Set(), new Set())).toEqual(['model.glb'])
})
