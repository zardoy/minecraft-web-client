import { expect, test } from 'vitest'

import { computeBlockStateHash } from './blockHash'

test('computeBlockStateHash uses a stable 8-character hash across array inputs', () => {
  const values = [1, 2, 255, 1024, 4095, 17]

  expect(computeBlockStateHash(values)).toBe('c8ebb195')
  expect(computeBlockStateHash(new Uint16Array(values))).toBe('c8ebb195')
})
