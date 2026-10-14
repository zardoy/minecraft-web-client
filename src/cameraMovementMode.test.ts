import { expect, test } from 'vitest'
import { getCameraMovementMode, shouldSnapCameraOnMount } from './cameraMovementMode'

test('minecart vehicle selects server-vehicle camera mode', () => {
  expect(getCameraMovementMode({ vehicle: { name: 'minecart' } })).toBe('server-vehicle')
  expect(getCameraMovementMode({ vehicle: { name: 'chest_minecart' } })).toBe('server-vehicle')
})

test('walking player uses local-player camera mode', () => {
  expect(getCameraMovementMode({ vehicle: null })).toBe('local-player')
  expect(getCameraMovementMode({ vehicle: { name: 'boat' } })).toBe('local-player')
  expect(getCameraMovementMode({ vehicle: { name: 'horse' } })).toBe('local-player')
})

test.each([
  'boat',
  'oak_boat',
  'bamboo_raft',
  'chest_boat',
  'minecart',
  'chest_minecart'
])('boat and minecart mounts snap camera for %s', name => {
  expect(shouldSnapCameraOnMount(name)).toBe(true)
})

test.each(['horse', 'pig', undefined])('other mounts keep camera tween for %s', name => {
  expect(shouldSnapCameraOnMount(name)).toBe(false)
})
