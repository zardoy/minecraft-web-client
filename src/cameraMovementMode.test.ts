import { expect, test } from 'vitest'
import { getCameraMovementMode } from './cameraMovementMode'

test('minecart vehicle selects server-vehicle camera mode', () => {
  expect(getCameraMovementMode({ vehicle: { name: 'minecart' } })).toBe('server-vehicle')
  expect(getCameraMovementMode({ vehicle: { name: 'chest_minecart' } })).toBe('server-vehicle')
})

test('walking player uses local-player camera mode', () => {
  expect(getCameraMovementMode({ vehicle: null })).toBe('local-player')
  expect(getCameraMovementMode({ vehicle: { name: 'boat' } })).toBe('local-player')
  expect(getCameraMovementMode({ vehicle: { name: 'horse' } })).toBe('local-player')
})
